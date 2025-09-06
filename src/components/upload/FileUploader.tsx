import { useState, useCallback, useRef } from 'react'
import React from 'react'
import {
  processEmbeddingOnly,
  extractTextFromFile,
} from '@/services/ai/embedding'
import { useToast } from '@/hooks/use-toast'
import { uploadDocumentToS3 } from '@/services/file/documentUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  RotateCcw,
  Server,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document } from '@/types'
import { documentService } from '@/services/data/hybrid'

// Python backend imports
import { usePythonDocumentUpload } from '@/hooks/usePythonDocumentUpload'
import { checkPythonBackendHealth } from '@/services/file/python-document-upload'
import { getPythonBackendConfig } from '@/config/python-backend'

interface FileUploaderProps {
  projectId: string
  companyId: string
  onUploadComplete: (uploadedFile: Document) => void
}

interface FileUploadItem {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  processingMessage?: string
  documentId?: string // Database document ID
  pythonDocumentId?: string // Python backend document ID
  backend?: 'python' | 'existing'
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
  const [processingMessages, setProcessingMessages] = useState<
    Record<string, string>
  >({})
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null)
  const [currentBackend, setCurrentBackend] = useState<'python' | 'existing'>(
    'python',
  )

  // Ref to store mapping between Python document IDs and file items for immediate access
  const pythonDocumentMapping = useRef<
    Map<string, { fileItemId: string; databaseDocumentId: string }>
  >(new Map())

  const { toast } = useToast()

  // Python document upload hook
  const pythonUpload = usePythonDocumentUpload({
    projectId,
    companyId,
    onUploadComplete: async result => {
      console.log('FileUploader received upload complete result:', result)

      // Use the ref mapping to find the file item and database document ID
      const mapping = pythonDocumentMapping.current.get(result.documentId)
      if (!mapping) {
        console.error(
          'Could not find mapping for Python document ID:',
          result.documentId,
        )
        console.log(
          'Available mappings:',
          Array.from(pythonDocumentMapping.current.entries()),
        )

        // Try to find the file item by Python document ID as fallback
        const fileItem = selectedFiles.find(
          f => f.pythonDocumentId === result.documentId,
        )
        if (!fileItem) {
          console.error(
            'Could not find file item for Python document ID:',
            result.documentId,
          )
          return
        }

        // Create a basic document record without database ID
        const document: Document = {
          id: result.documentId, // Use Python document ID as fallback
          name: fileItem.file.name,
          type: fileItem.file.type,
          size: fileItem.file.size,
          status:
            result.processingStatus === 'completed'
              ? 'processed'
              : 'processing',
          url: result.s3Url,
          key: result.s3Key,
          content: '',
          projectId: projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        onUploadComplete(document)
        return
      }

      // Find the file item using the stored file item ID
      const fileItem = selectedFiles.find(f => f.id === mapping.fileItemId)
      if (!fileItem) {
        console.error('Could not find file item for ID:', mapping.fileItemId)
        return
      }

      // Update the file item status
      setSelectedFiles(prev =>
        prev.map(file =>
          file.id === mapping.fileItemId
            ? {
                ...file,
                status:
                  result.processingStatus === 'completed'
                    ? 'completed'
                    : 'processing',
                progress: result.processingStatus === 'completed' ? 100 : 75,
                processingMessage: result.message,
              }
            : file,
        ),
      )

      // Create document record for the parent component using the database document ID
      const document: Document = {
        id: mapping.databaseDocumentId, // Use the database document ID from mapping
        name: fileItem.file.name,
        type: fileItem.file.type,
        size: fileItem.file.size,
        status:
          result.processingStatus === 'completed' ? 'processed' : 'processing',
        url: result.s3Url,
        key: result.s3Key,
        content: '',
        projectId: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update the database document status if processing is completed
      if (result.processingStatus === 'completed') {
        try {
          await documentService.updateDocument(
            companyId,
            projectId,
            mapping.databaseDocumentId, // Use the database document ID from mapping
            {
              status: 'processed',
            },
          )
        } catch (error) {
          console.error('Failed to update document status in database:', error)
        }
      }

      onUploadComplete(document)
    },
    onUploadError: error => {
      toast({
        title: 'Upload failed',
        description: error,
        variant: 'destructive',
      })
    },
    onStatusUpdate: status => {
      // Update processing messages for all uploading files
      setProcessingMessages(prev => ({
        ...prev,
        [status]: status,
      }))
    },
  })

  // Update file progress based on Python upload progress
  React.useEffect(() => {
    if (currentBackend === 'python' && pythonUpload.uploadProgress) {
      // Find the currently uploading file and update its progress
      setSelectedFiles(prev =>
        prev.map(file => {
          if (file.status === 'uploading' && file.backend === 'python') {
            return {
              ...file,
              progress: pythonUpload.uploadProgress.percentage,
              processingMessage: pythonUpload.uploadProgress.stage,
            }
          }
          return file
        }),
      )
    }
  }, [pythonUpload.uploadProgress, currentBackend])

  // Check backend health on component mount
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const config = getPythonBackendConfig()
        console.log('Python backend config:', config)
        const isHealthy = await checkPythonBackendHealth()
        console.log('Python backend health check result:', isHealthy)
        setBackendHealth(isHealthy)
        setCurrentBackend(isHealthy ? 'python' : 'existing')
      } catch (error) {
        console.error('Backend health check failed:', error)
        setBackendHealth(false)
        setCurrentBackend('existing')
      }
    }

    checkHealth()
  }, [])

  // Capture console logs for processing progress (for existing backend)
  React.useEffect(() => {
    if (currentBackend === 'existing') {
      const originalConsoleLog = console.log

      console.log = (...args: unknown[]) => {
        const message = String(args.join(' '))

        // Capture processing messages
        if (
          message.includes('Processing chunk batch') ||
          message.includes('Created') ||
          message.includes('chunks') ||
          message.includes('embedding') ||
          message.includes('processing')
        ) {
          // Try to find which file this message is for
          const currentUploadingFile = selectedFiles.find(
            f => f.status === 'uploading',
          )
          if (currentUploadingFile) {
            setProcessingMessages(prev => ({
              ...prev,
              [currentUploadingFile.id]: message,
            }))

            // Update the file item with the processing message
            setSelectedFiles(prev =>
              prev.map(file =>
                file.id === currentUploadingFile.id
                  ? { ...file, processingMessage: message }
                  : file,
              ),
            )
          }
        }

        // Call original console.log
        originalConsoleLog.apply(console, args)
      }

      return () => {
        console.log = originalConsoleLog
      }
    }
  }, [selectedFiles, currentBackend])

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
          backend: currentBackend,
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
          ? { ...f, status: 'uploading' as const, progress: 10 }
          : f,
      ),
    )

    try {
      console.log(
        'Uploading file with backend:',
        currentBackend,
        'health:',
        backendHealth,
      )
      if (currentBackend === 'python' && backendHealth) {
        // Use Python backend
        console.log('Using Python backend for upload')
        const result = await pythonUpload.uploadDocument(
          fileItem.file,
          fileItem.file.name,
        )

        if (!result) {
          throw new Error('Upload failed')
        }

        // Create database record for the document first
        const newDocument = await documentService.createDocument(
          companyId,
          projectId,
          {
            name: fileItem.file.name,
            type: fileItem.file.type,
            size: fileItem.file.size,
            status:
              result.processingStatus === 'completed'
                ? 'processed'
                : 'processing',
            url: result.s3Url,
            s3Key: result.s3Key,
          },
        )

        // Store mapping in ref for immediate access by completion handler
        pythonDocumentMapping.current.set(result.documentId, {
          fileItemId: fileItem.id,
          databaseDocumentId: newDocument.id,
        })

        // Update file with both Python and database document IDs
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? {
                  ...f,
                  pythonDocumentId: result.documentId, // Store Python backend ID
                  documentId: newDocument.id, // Store database ID
                  status:
                    result.processingStatus === 'completed'
                      ? ('completed' as const)
                      : ('processing' as const),
                  progress: result.processingStatus === 'completed' ? 100 : 75,
                  processingMessage: result.message,
                }
              : f,
          ),
        )

        // Create document record for the parent component
        const document: Document = {
          id: newDocument.id, // Use database ID
          projectId: projectId,
          name: fileItem.file.name,
          type: fileItem.file.type,
          size: fileItem.file.size,
          status:
            result.processingStatus === 'completed'
              ? 'processed'
              : 'processing',
          url: result.s3Url,
          key: result.s3Key,
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        onUploadComplete(document)
        return
      } else {
        // Fallback to existing upload method
        console.log('Fallback to existing upload method')
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

        // Process embedding in background - console logs will show progress
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
              const failedDocument = {
                ...newDocument,
                status: 'failed' as const,
              }
              onUploadComplete(failedDocument as Document)
            } catch (updateError) {
              // Failed to update document status
            }
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
                error: formatErrorMessage(error),
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

  const retryAllFailed = async () => {
    const failedFiles = selectedFiles.filter(file => file.status === 'failed')

    if (failedFiles.length === 0) return

    toast({
      title: 'Retrying failed uploads',
      description: `Retrying ${failedFiles.length} failed upload(s)...`,
    })

    // Reset all failed files to pending
    setSelectedFiles(prev =>
      prev.map(file =>
        file.status === 'failed'
          ? {
              ...file,
              status: 'pending' as const,
              error: undefined,
              progress: 0,
            }
          : file,
      ),
    )

    // Small delay to show the status change
    await new Promise(resolve => setTimeout(resolve, 200))

    // Retry all failed uploads sequentially
    let retrySuccessCount = 0
    let retryFailCount = 0

    for (const fileItem of failedFiles) {
      try {
        await uploadSingleFile(fileItem)
        retrySuccessCount++
      } catch (error) {
        console.error(`Error retrying file ${fileItem.file.name}:`, error)
        retryFailCount++
      }
    }

    // Show summary of retry results
    if (retrySuccessCount > 0 && retryFailCount === 0) {
      toast({
        title: 'All retries successful',
        description: `${retrySuccessCount} file(s) uploaded successfully.`,
      })
    } else if (retrySuccessCount > 0 && retryFailCount > 0) {
      toast({
        title: 'Partial retry success',
        description: `${retrySuccessCount} succeeded, ${retryFailCount} still failed.`,
        variant: 'default',
      })
    } else {
      toast({
        title: 'Retry failed',
        description: 'All retry attempts failed. Please check your connection.',
        variant: 'destructive',
      })
    }
  }

  const removeFile = (id: string) => {
    // Clean up mapping when file is removed
    const fileToRemove = selectedFiles.find(f => f.id === id)
    if (fileToRemove?.pythonDocumentId) {
      pythonDocumentMapping.current.delete(fileToRemove.pythonDocumentId)
    }

    setSelectedFiles(prev => prev.filter(file => file.id !== id))
  }

  const retryFile = async (id: string) => {
    const fileItem = selectedFiles.find(file => file.id === id)
    if (!fileItem) return

    try {
      // Reset the file status to pending
      setSelectedFiles(prev =>
        prev.map(file =>
          file.id === id
            ? {
                ...file,
                status: 'pending' as const,
                error: undefined,
                progress: 0,
              }
            : file,
        ),
      )

      // Small delay to show the status change
      await new Promise(resolve => setTimeout(resolve, 100))

      // Retry the upload
      await uploadSingleFile(fileItem)

      toast({
        title: 'Retry started',
        description: `Retrying upload for ${fileItem.file.name}`,
      })
    } catch (error) {
      console.error('Error retrying file upload:', error)
      toast({
        title: 'Retry failed',
        description: 'Could not retry the upload. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      // Make error messages more user-friendly
      const message = error.message.toLowerCase()

      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.'
      }
      if (message.includes('unauthorized') || message.includes('forbidden')) {
        return 'Authorization error. Please sign in again.'
      }
      if (message.includes('too large') || message.includes('size')) {
        return 'File too large. Please use a smaller file.'
      }
      if (message.includes('timeout')) {
        return 'Upload timed out. Please try again.'
      }
      if (message.includes('cors') || message.includes('origin')) {
        return 'Server configuration error. Please contact support.'
      }

      // Return original message if no specific pattern matched
      return error.message
    }

    return 'Upload failed. Please try again.'
  }

  const removeAllFiles = () => {
    // Clean up all mappings when all files are removed
    pythonDocumentMapping.current.clear()
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
      // case 'uploading':
      //   return (
      //     <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
      //   )
      // default:
      //   return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
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

  const getBackendBadge = () => {
    if (backendHealth === null) {
      return <Badge variant="secondary">Checking backend...</Badge>
    }

    return (
      <Badge variant={backendHealth ? 'default' : 'destructive'}>
        <Server className="h-3 w-3 mr-1" />
        {backendHealth ? 'Python Backend' : 'Existing Backend'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Backend Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Upload Documents</h3>
        {getBackendBadge()}
      </div>

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
              {selectedFiles.some(f => f.status === 'failed') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryAllFailed}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Retry Failed
                </Button>
              )}
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
                <span>Upload Progress</span>
                <span>
                  Uploading{' '}
                  {selectedFiles.filter(f => f.status === 'uploading').length}{' '}
                  of {selectedFiles.length} files
                </span>
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
                        <span>Uploading to secure storage</span>
                      </>
                    )}
                    {fileItem.status === 'uploading' &&
                      fileItem.processingMessage && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium">
                            {fileItem.processingMessage.includes(
                              'Processing chunk batch',
                            )
                              ? fileItem.processingMessage.replace(
                                  'Processing chunk batch ',
                                  'Batch ',
                                )
                              : fileItem.processingMessage.length > 40
                                ? fileItem.processingMessage.substring(0, 40) +
                                  '...'
                                : fileItem.processingMessage}
                          </span>
                        </>
                      )}
                    {fileItem.status === 'failed' && fileItem.error && (
                      <div className="flex items-start gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-600 text-xs leading-tight">
                          {fileItem.error}
                        </span>
                      </div>
                    )}
                  </div>

                  {fileItem.status === 'uploading' && (
                    <Progress
                      value={fileItem.progress}
                      className="w-full h-1 mt-1"
                    />
                  )}
                </div>

                <div className="flex gap-1">
                  {fileItem.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryFile(fileItem.id)}
                      className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                      title="Retry upload"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileItem.id)}
                    disabled={fileItem.status === 'uploading'}
                    className="h-8 w-8 p-0"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
