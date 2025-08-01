import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { uploadDocumentToS3 } from '@/services/documentUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Upload, X, FileText, FileImage, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document } from '@/types'
import { documentService } from '@/services/s3-api'

interface FileUploaderProps {
  projectId: string
  companyId: string
  onUploadComplete: (uploadedFile: Document) => void
}

export const FileUploader = ({
  projectId,
  companyId,
  onUploadComplete,
}: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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
      'image/jpeg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload PDF, Word, text, or image files only.',
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

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await uploadDocumentToS3(file, projectId, companyId)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Create document record in the database using the API
      console.log('Creating document record with name:', file.name)
      console.log('Document creation data:', {
        name: file.name,
        type: file.type,
        size: String(result.size),
        status: 'processing',
        url: result.url,
        projectId: projectId,
      })

      const newDocument = await documentService.createDocument({
        name: file.name, // Use the original file name
        type: file.type,
        size: String(result.size),
        status: 'processing',
        url: result.url,
        projectId: projectId,
        companyId: companyId, // Explicitly pass companyId
      })

      console.log('Created document:', newDocument)
      console.log('Created document ID:', newDocument?.id)

      // Test: Immediately try to fetch the document we just created
      if (newDocument?.id) {
        console.log(
          'Testing: Attempting to fetch document immediately after creation...',
        )
        try {
          const fetchTest = await documentService.getDocument(newDocument.id)
          console.log('Testing: Successfully fetched document:', fetchTest)
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
        description: `${file.name} has been uploaded successfully.`,
      })

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

  const getFileIcon = () => {
    if (!selectedFile)
      return <Upload className="h-10 w-10 text-muted-foreground" />

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
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 md:p-6 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30',
          selectedFile ? 'bg-secondary/50' : 'bg-transparent',
        )}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          {getFileIcon()}

          {selectedFile ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={removeFile}>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  onClick={() => uploadFile(selectedFile)}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag & drop your document here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Support for PDF, DOCX, TXT, JPG, PNG (max 50MB)
                </p>
              </div>

              <label htmlFor="file-upload">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange} // Now defined
                  accept=".pdf,.docx,.txt,.doc,.jpg,.jpeg,.png"
                />
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <span>Browse files</span>
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Uploading to S3...</span>
            <span className="text-sm text-muted-foreground">
              {uploadProgress}%
            </span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  )
}
