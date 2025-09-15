import { useState, useCallback } from 'react'
import React from 'react'
import { useToast } from '@/hooks/use-toast'
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

interface FileUploaderPythonProps {
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
  documentId?: string
  backend?: 'python' | 'existing'
}

export const FileUploaderPython = (props: FileUploaderPythonProps) => {
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

  const { toast } = useToast()

  // Python document upload hook
  const pythonUpload = usePythonDocumentUpload({
    projectId,
    companyId,
    onUploadComplete: result => {
      // Find the corresponding file item and update it
      setSelectedFiles(prev =>
        prev.map(file =>
          file.documentId === result.documentId
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

      // Create document record for the parent component
      const document: Document = {
        id: result.documentId,
        name:
          selectedFiles.find(f => f.documentId === result.documentId)?.file
            .name || 'Unknown',
        type: 'application/pdf',
        size: 0, // Will be updated when processing completes
        status:
          result.processingStatus === 'completed' ? 'processed' : 'processing',
        url: result.s3Url,
        key: result.s3Key,
        content: '',
        projectId: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  // Check backend health on component mount
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const config = getPythonBackendConfig()
        const isHealthy = await checkPythonBackendHealth()
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

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.includes('pdf')) {
      return 'Only PDF files are supported'
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return 'File size must be less than 100MB'
    }

    return null
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const newFiles: FileUploadItem[] = []
    let hasErrors = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)

      if (validationError) {
        hasErrors = true
        toast({
          title: 'Invalid file',
          description: `${file.name}: ${validationError}`,
          variant: 'destructive',
        })
        continue
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        status: 'pending',
        progress: 0,
        backend: currentBackend,
      })
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles])
      toast({
        title: 'Files selected',
        description: `${newFiles.length} file(s) ready to upload.`,
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
      if (currentBackend === 'python' && backendHealth) {
        // Use Python backend
        const result = await pythonUpload.uploadDocument(
          fileItem.file,
          fileItem.file.name,
        )

        // Update file with document ID
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? {
                  ...f,
                  documentId: result.documentId,
                  status: 'processing' as const,
                }
              : f,
          ),
        )

        // Create document record immediately
        const document: Document = {
          id: result.documentId,
          name: fileItem.file.name,
          type: fileItem.file.type,
          size: fileItem.file.size,
          status: 'processing',
          url: result.s3Url,
          key: result.s3Key,
          content: '',
          projectId: projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        onUploadComplete(document)
      } else {
        // Fallback to existing upload method
        toast({
          title: 'Python backend unavailable',
          description: 'Falling back to existing upload method',
          variant: 'destructive',
        })

        // You could implement fallback logic here
        throw new Error(
          'Python backend not available and fallback not implemented',
        )
      }
    } catch (error) {
      console.error('Upload failed:', error)

      // Update file status to failed
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

      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadStartTime(Date.now())

    try {
      // Upload files sequentially to avoid overwhelming the backend
      for (const fileItem of selectedFiles.filter(
        f => f.status === 'pending',
      )) {
        await uploadSingleFile(fileItem)
      }

      toast({
        title: 'Upload completed',
        description: 'All files have been uploaded successfully',
      })
    } catch (error) {
      console.error('Upload process failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setProcessingMessages({})
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <FileText className="h-4 w-4" />
    if (file.type.includes('image')) return <FileImage className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return null
    }
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
    <div className="space-y-4">
      {/* Backend Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Upload Documents</h3>
        {getBackendBadge()}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400',
        )}
        onDragOver={e => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragging(false)
          handleFileSelect(e.dataTransfer.files)
        }}
      >
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports PDF files up to 100MB
        </p>
        <Input
          type="file"
          multiple
          accept=".pdf"
          onChange={e => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <Button asChild>
          <label htmlFor="file-upload" className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Select Files
          </label>
        </Button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFiles}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  selectedFiles.every(f => f.status !== 'pending')
                }
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload All
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedFiles.map(fileItem => (
              <div
                key={fileItem.id}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {getFileIcon(fileItem.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {fileItem.processingMessage && (
                    <p className="text-xs text-blue-600 mt-1">
                      {fileItem.processingMessage}
                    </p>
                  )}
                  {fileItem.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {fileItem.error}
                    </p>
                  )}
                  {fileItem.status === 'uploading' ||
                  fileItem.status === 'processing' ? (
                    <Progress value={fileItem.progress} className="mt-2" />
                  ) : null}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(fileItem.status)}
                  {fileItem.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileItem.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
