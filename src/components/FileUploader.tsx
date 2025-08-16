import { useState } from 'react'
import React from 'react'
import { processEmbeddingOnly, extractTextFromFile } from '@/services/embedding'
import { useToast } from '@/hooks/use-toast'
import { uploadDocumentToS3 } from '@/services/documentUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Upload,
  X,
  FileText,
  FileImage,
  File,
  Folder,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document } from '@/types'
import { documentService } from '@/services/hybrid'

interface FileUploaderProps {
  projectId: string
  companyId: string
  onUploadComplete: (uploadedFile: Document) => void
}

interface FileUploadItem {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
}

export const FileUploader = (props: FileUploaderProps) => {
  const { projectId, companyId, onUploadComplete } = props
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStartTime, setUploadStartTime] = useState<number>(0)
  const [progressHistory, setProgressHistory] = useState<
    Array<{ time: number; progress: number }>
  >([])
  const { toast } = useToast()

  const validateFile = (file: File): { valid: boolean; error?: string } => {
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
      return {
        valid: false,
        error:
          'Invalid file type. Please upload PDF, Word, text, or image files only.',
      }
    }

    if (file.size > 50 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File too large. Please upload files smaller than 50MB.',
      }
    }

    return { valid: true }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles: FileUploadItem[] = []
    const invalidFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateFile(file)

      if (validation.valid) {
        newFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${i}`,
          status: 'pending',
          progress: 0,
        })
      } else {
        invalidFiles.push(`${file.name}: ${validation.error}`)
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: 'Some files were invalid',
        description:
          invalidFiles.slice(0, 3).join('\n') +
          (invalidFiles.length > 3
            ? `\n...and ${invalidFiles.length - 3} more`
            : ''),
        variant: 'destructive',
      })
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles])
      toast({
        title: 'Files added',
        description: `${newFiles.length} file${newFiles.length > 1 ? 's' : ''} ready to upload.`,
      })
    }
  }

  const uploadSingleFile = async (fileItem: FileUploadItem) => {
    // Update file status to uploading
    setSelectedFiles(prev =>
      prev.map(f =>
        f.id === fileItem.id
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f,
      ),
    )

    try {
      const result = await uploadDocumentToS3(
        fileItem.file,
        projectId,
        companyId,
        progress => {
          setSelectedFiles(prev =>
            prev.map(f => (f.id === fileItem.id ? { ...f, progress } : f)),
          )
        },
      )

      const newDocument = await documentService.createDocument(
        companyId,
        projectId,
        {
          name: fileItem.file.name,
          type: fileItem.file.type,
          size: result.size,
          status: 'processing',
          url: result.url,
          s3Key: result.key,
        },
      )

      onUploadComplete(newDocument as Document)

      // Update file status to completed
      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'completed' as const, progress: 100 }
            : f,
        ),
      )

      // Process embedding in background
      if (newDocument?.id) {
        try {
          const fileText = await extractTextFromFile(fileItem.file)
          if (fileText && fileText.trim().length > 0) {
            await processEmbeddingOnly(fileText, projectId, newDocument.id, {
              name: fileItem.file.name,
              type: fileItem.file.type,
              url: result.url,
              s3Key: result.key,
              companyId,
              size: result.size,
            })

            await documentService.updateDocument(
              companyId,
              projectId,
              newDocument.id,
              {
                status: 'processed',
                content: fileText,
              },
            )

            // Notify parent component of status update
            const updatedDocument = {
              ...newDocument,
              status: 'processed' as const,
              content: fileText,
            }
            onUploadComplete(updatedDocument as Document)
          } else {
            // No text content extracted, keeping status as processing
          }
        } catch (embeddingError) {
          // Update document status to failed due to processing error
          try {
            await documentService.updateDocument(
              companyId,
              projectId,
              newDocument.id,
              {
                status: 'failed',
              },
            )

            // Notify parent component of status update
            const failedDocument = { ...newDocument, status: 'failed' as const }
            onUploadComplete(failedDocument as Document)
          } catch (updateError) {
            // Failed to update document status
          }
        }
      }
    } catch (error) {
      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f,
        ),
      )
      throw error
    }
  }

  const uploadAllFiles = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadStartTime(Date.now())
    setProgressHistory([{ time: Date.now(), progress: 0 }])

    const pendingFiles = selectedFiles.filter(f => f.status === 'pending')
    let successCount = 0
    let failCount = 0

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const fileItem of pendingFiles) {
        try {
          await uploadSingleFile(fileItem)
          successCount++
        } catch (error) {
          failCount++
        }
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast({
          title: 'All uploads successful',
          description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded.`,
        })
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: 'Partial upload success',
          description: `${successCount} succeeded, ${failCount} failed. Check individual file status.`,
          variant: 'default',
        })
      } else {
        toast({
          title: 'Upload failed',
          description: 'All uploads failed. Please try again.',
          variant: 'destructive',
        })
      }

      // Clear completed files after a delay
      setTimeout(() => {
        setSelectedFiles(prev => prev.filter(f => f.status !== 'completed'))
      }, 3000)
    } finally {
      setIsUploading(false)
      setProgressHistory([])
    }
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const removeAllFiles = () => {
    setSelectedFiles([])
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

    const droppedFiles = e.dataTransfer.files
    handleFileSelect(droppedFiles)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset the input
    e.target.value = ''
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset the input
    e.target.value = ''
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    } else if (file.type.includes('image')) {
      return <FileImage className="h-5 w-5 text-blue-500" />
    } else {
      return <File className="h-5 w-5 text-green-500" />
    }
  }

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        )
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getOverallProgress = () => {
    if (selectedFiles.length === 0) return 0
    const totalProgress = selectedFiles.reduce(
      (sum, file) => sum + file.progress,
      0,
    )
    return Math.round(totalProgress / selectedFiles.length)
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
          selectedFiles.length > 0
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
                : selectedFiles.length > 0
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-muted/50 hover:bg-muted/70',
            )}
          >
            {selectedFiles.length > 0 ? (
              <div className="flex items-center gap-2">
                <Upload className="h-10 w-10 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? 's' : ''} selected
                </span>
              </div>
            ) : (
              <Upload className="h-10 w-10 text-gray-400" />
            )}
          </div>

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                Drag & drop your documents here
              </p>
              <p className="text-xs text-muted-foreground">
                Support for PDF, DOCX, TXT, JPG, PNG (max 50MB each) • Multiple
                files supported
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <label htmlFor="file-upload" className="flex justify-center">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.doc,.jpg,.jpeg,.png"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 border-dashed"
                  asChild
                >
                  <span>
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Files
                  </span>
                </Button>
              </label>

              <label htmlFor="folder-upload" className="flex justify-center">
                <Input
                  id="folder-upload"
                  type="file"
                  className="hidden"
                  // @ts-expect-error - webkitdirectory is not in TypeScript but works in browsers
                  webkitdirectory=""
                  multiple
                  onChange={handleFolderChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 hover:scale-105 border-dashed"
                  asChild
                >
                  <span>
                    <Folder className="h-4 w-4 mr-2" />
                    Browse Folder
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAllFiles}
                className="text-xs"
              >
                Clear All
              </Button>
              <Button
                onClick={uploadAllFiles}
                disabled={
                  isUploading ||
                  selectedFiles.every(f => f.status !== 'pending')
                }
                size="sm"
                className="text-xs"
              >
                {isUploading
                  ? 'Uploading...'
                  : selectedFiles.length === 1
                    ? 'Upload'
                    : 'Upload All'}
              </Button>
            </div>
          </div>

          {/* Overall Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="w-full h-2" />
            </div>
          )}

          {/* Individual File List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map(fileItem => (
              <div
                key={fileItem.id}
                className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border/30"
              >
                {getFileIcon(fileItem.file)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {fileItem.file.name}
                    </p>
                    {getStatusIcon(fileItem.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    {fileItem.status === 'uploading' && (
                      <>
                        <span>•</span>
                        <span>{fileItem.progress}%</span>
                      </>
                    )}
                    {fileItem.status === 'failed' && fileItem.error && (
                      <>
                        <span>•</span>
                        <span className="text-red-500">{fileItem.error}</span>
                      </>
                    )}
                  </div>

                  {fileItem.status === 'uploading' && (
                    <Progress
                      value={fileItem.progress}
                      className="w-full h-1 mt-1"
                    />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(fileItem.id)}
                  disabled={fileItem.status === 'uploading'}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
