import { useState } from 'react'
import React from 'react'
import { processEmbeddingOnly, extractTextFromFile } from '@/services/embedding'
import { useToast } from '@/hooks/use-toast'
import { uploadDocumentToS3 } from '@/services/documentUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Upload, X, FileText, FileImage, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document } from '@/types'
import { documentService } from '@/services/hybrid'

interface FileUploaderProps {
  projectId: string
  companyId: string
  onUploadComplete: (uploadedFile: Document) => void
}
export const FileUploader = (props: FileUploaderProps) => {
  const { projectId, companyId, onUploadComplete } = props
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStartTime, setUploadStartTime] = useState<number>(0)
  const { toast } = useToast()

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/rtf',
      'application/rtf',
      'image/jpeg',
      'image/png',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description:
          'Please upload PDF, Word (.doc/.docx), text (.txt/.rtf), or image files only.',
        variant: 'destructive',
      })
      return
    }
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload files smaller than 50MB.',
        variant: 'destructive',
      })
      return
    }
    // Just set the selected file, don't upload automatically
    setSelectedFile(file)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStartTime(Date.now())

    try {
      // Use real progress tracking instead of simulation
      const result = await uploadDocumentToS3(
        file,
        projectId,
        companyId,
        progress => {
          setUploadProgress(progress)
        },
      )

      console.log('Creating document record with name:', file.name)
      console.log('Document creation data:', {
        name: file.name,
        type: file.type,
        size: result.size,
        status: 'processing',
        url: result.url,
        projectId: projectId,
      })

      const newDocument = await documentService.createDocument(
        companyId,
        projectId,
        {
          name: file.name, // Use the original file name
          type: file.type,
          size: result.size,
          status: 'processing',
          url: result.url,
          s3Key: result.key, // Pass the actual S3 key from upload
        },
      )

      // Test: Immediately try to fetch the document we just created
      if (newDocument?.id) {
        try {
          const fetchTest = await documentService.getDocument(
            companyId,
            projectId,
            newDocument.id,
          )
        } catch (testError) {
          console.error(
            'Testing: Failed to fetch document immediately after creation:',
            testError,
          )
        }
      }

      onUploadComplete(newDocument as Document)
      toast({
        title: 'Upload Successful',
        description: `${file.name} has been uploaded and is being processed for AI search.`,
      })

      // Extract text from file and process embedding directly (client-side)
      if (newDocument?.id) {
        try {
          console.log('Extracting text from file for embedding...')

          // For PDF files, ensure PDF.js worker is loaded
          if (file.type.includes('pdf')) {
            try {
              const pdfjs = await import('pdfjs-dist')
              if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                // Set directly to jsdelivr CDN - most reliable approach
                pdfjs.GlobalWorkerOptions.workerSrc =
                  'https://cdn.jsdelivr.net/npm/pdfjs-dist@' +
                  pdfjs.version +
                  '/build/pdf.worker.min.js'

                // Give the worker time to load
                await new Promise(resolve => setTimeout(resolve, 500))
                console.log('PDF.js worker set to jsdelivr CDN')
              }
            } catch (pdfError) {
              console.error('Error configuring PDF.js worker:', pdfError)
            }
          }

          const fileText = await extractTextFromFile(file)
          if (fileText && fileText.trim().length > 0) {
            console.log(`Extracted ${fileText.length} characters of text`)
            // Process embedding directly without database status updates
            await processEmbeddingOnly(projectId, newDocument.id, fileText, {
              name: file.name,
              type: file.type,
              url: result.url,
              s3Key: result.key,
              companyId,
              size: result.size,
            })

            // Update document status to 'processed' after successful embedding
            try {
              await documentService.updateDocument(
                companyId,
                projectId,
                newDocument.id,
                {
                  status: 'processed',
                },
              )
              console.log('Document status updated to processed')
            } catch (statusError) {
              console.warn(
                'Could not update document status to processed:',
                statusError,
              )
            }

            toast({
              title: 'AI Search Ready',
              description: `${file.name} is now available for semantic search.`,
            })
          } else {
            // Update document status to 'failed' if no text found
            try {
              await documentService.updateDocument(
                companyId,
                projectId,
                newDocument.id,
                {
                  status: 'failed',
                },
              )
              console.log('Document status updated to failed (no text content)')
            } catch (statusError) {
              console.warn(
                'Could not update document status to failed:',
                statusError,
              )
            }

            toast({
              title: 'Processing Info',
              description: 'Document uploaded but no text found for AI search.',
              variant: 'default',
            })
          }
        } catch (embeddingError) {
          console.error('Embedding processing failed:', embeddingError)

          // Update document status to 'failed' when embedding processing fails
          try {
            await documentService.updateDocument(
              companyId,
              projectId,
              newDocument.id,
              {
                status: 'failed',
              },
            )
            console.log('Document status updated to failed (embedding error)')
          } catch (statusError) {
            console.warn(
              'Could not update document status to failed:',
              statusError,
            )
          }

          toast({
            title: 'Processing Failed',
            description:
              'Document uploaded but AI processing failed. You can try re-uploading.',
            variant: 'destructive',
          })
        }
      }

      // Reset state after a successful upload
      setSelectedFile(null)
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = 'Failed to upload file. Please try again.'
      // if (error instanceof Error) {
      //   if (error.message.includes('credentials')) {
      //     errorMessage = 'AWS credentials are not configured properly.'
      //   } else if (error.message.includes('bucket')) {
      //     errorMessage =
      //       'S3 bucket is not accessible. Please check configuration.'
      //   } else if (error.message.includes('readableStream')) {
      //     errorMessage =
      //       'File processing error. Please try a different file format.'
      //   } else {
      //     errorMessage = error.message
      //   }
      // }
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      })
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  // Helper functions for upload progress display
  const getUploadStatusText = (progress: number): string => {
    if (progress < 15) return 'Preparing file...'
    if (progress < 25) return 'Initializing upload...'
    if (progress < 75) return 'Uploading to S3...'
    if (progress < 100) return 'Finalizing...'
    return 'Upload complete!'
  }

  const getUploadPhaseText = (progress: number): string => {
    if (progress < 15) return 'Processing file data and validating format'
    if (progress < 25)
      return 'Generating secure upload path and preparing request'
    if (progress < 75) return 'Transferring file data to cloud storage'
    if (progress < 100) return 'Generating access URLs and completing upload'
    return 'File successfully uploaded and ready for processing'
  }

  const getUploadStats = (): { elapsedTime: string; estimatedTime: string } => {
    if (!uploadStartTime || uploadProgress === 0) {
      return { elapsedTime: '0s', estimatedTime: 'calculating...' }
    }

    const elapsed = (Date.now() - uploadStartTime) / 1000
    const rate = uploadProgress / elapsed
    const remaining = rate > 0 ? (100 - uploadProgress) / rate : 0

    return {
      elapsedTime: `${elapsed.toFixed(1)}s`,
      estimatedTime:
        remaining > 0 ? `${remaining.toFixed(1)}s remaining` : 'almost done',
    }
  }

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-10 w-10 text-gray-400" />
    if (selectedFile.type.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />
    } else if (selectedFile.type.includes('image')) {
      return <FileImage className="h-10 w-10 text-blue-500" />
    } else {
      return <File className="h-10 w-10 text-green-500" />
    }
  }

  // Add this function
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 md:p-8 transition-all duration-300 ease-in-out relative overflow-hidden',
          isDragging
            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 scale-[1.02] shadow-lg'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40',
          selectedFile
            ? 'bg-gradient-to-br from-secondary/30 to-secondary/50 border-border/50'
            : 'bg-gradient-to-br from-background/50 to-muted/20 hover:to-muted/30',
        )}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center justify-center gap-4">
          <div
            className={cn(
              'p-4 rounded-full transition-all duration-300',
              isDragging
                ? 'bg-primary/20 scale-110'
                : selectedFile
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-muted/50 hover:bg-muted/70',
            )}
          >
            {getFileIcon()}
          </div>

          {selectedFile ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium truncate max-w-[250px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={removeFile}
                  className="hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  onClick={() => uploadFile(selectedFile)}
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Drag & drop your document here
                </p>
                <p className="text-xs text-muted-foreground">
                  Support for PDF, DOCX, TXT, JPG, PNG (max 50MB)
                </p>
              </div>
              <label htmlFor="file-upload" className="flex justify-center">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.doc,.jpg,.jpeg,.png"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 border-dashed"
                  asChild
                >
                  <span>Browse files</span>
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Upload Progress */}
      {isUploading && (
        <div className="space-y-4 p-6 bg-gradient-to-r from-secondary/20 to-secondary/30 rounded-xl border border-border/50 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {getUploadStatusText(uploadProgress)}
            </span>
            <span className="text-sm text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md">
              {uploadProgress}%
            </span>
          </div>
          <Progress value={uploadProgress} className="w-full h-3 bg-muted/50" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            {getUploadPhaseText(uploadProgress)}
          </div>
          {selectedFile && (
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <span className="truncate max-w-[200px] font-medium">
                  {selectedFile.name}
                </span>
                <span className="text-border">•</span>
                <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="bg-background/50 px-2 py-0.5 rounded">
                  {getUploadStats().elapsedTime}
                </span>
                <span className="text-border">•</span>
                <span className="bg-background/50 px-2 py-0.5 rounded">
                  {getUploadStats().estimatedTime}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
