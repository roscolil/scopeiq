import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  Image,
  File,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Document } from '@/types'
import { routes } from '@/utils/ui/navigation'
import { cn } from '@/lib/utils'

interface DocumentListProps {
  documents: Document[]
  onDelete?: (documentId: string) => void | Promise<void>
  onCancelProcessing?: (documentId: string) => void
  projectId: string
  companyId: string
  projectName?: string
}

export const DocumentList = ({
  documents,
  onDelete,
  onCancelProcessing,
  projectId,
  companyId,
  projectName,
}: DocumentListProps) => {
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [documentToDelete, setDocumentToDelete] =
    React.useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [, forceUpdate] = React.useState(0)
  const [consoleMessages, setConsoleMessages] = React.useState<string[]>([])

  // Capture console logs in real-time
  React.useEffect(() => {
    const originalConsoleLog = console.log

    console.log = (...args: unknown[]) => {
      const message = String(args.join(' '))

      // Add any processing-related message to our list
      if (
        message.includes('PDF') ||
        message.includes('embedding') ||
        message.includes('extraction') ||
        message.includes('processing') ||
        message.includes('OCR') ||
        message.includes('Text length') ||
        message.includes('Successfully')
      ) {
        setConsoleMessages(prev => [...prev.slice(-4), message]) // Keep last 5 messages
      }

      // Call original console.log
      originalConsoleLog.apply(console, args)
    }

    return () => {
      console.log = originalConsoleLog
    }
  }, [])

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />
    } else if (type.includes('image')) {
      return <Image className="h-8 w-8 text-blue-500" />
    } else {
      return <File className="h-8 w-8 text-green-500" />
    }
  }

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-500">
            AI Ready
          </Badge>
        )
      case 'processing':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500 flex items-center gap-1"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  const viewDocument = (documentId: string, documentName: string) => {
    // Generate route using project name and document name for slugs
    // The route function will convert these to slugs for the URL
    const route = routes.company.project.document(
      companyId,
      projectId,
      documentId,
      projectName,
      documentName,
    )
    navigate(route)
  }

  const downloadDocument = async (document: Document) => {
    try {
      const downloadUrl = document.url

      if (!downloadUrl) {
        return
      }

      // Fetch the file as a blob to force download behavior
      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()

      // Create object URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Create temporary anchor element to trigger download
      const link = window.document.createElement('a')
      link.href = blobUrl
      link.download = document.name // This forces download instead of opening in tab

      // Temporarily add to DOM and click
      window.document.body?.appendChild(link)
      link.click()
      window.document.body?.removeChild(link)

      // Clean up the object URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading document:', error)

      // Fallback: try the direct link approach
      try {
        const link = window.document.createElement('a')
        link.href = document.url || ''
        link.download = document.name
        link.target = '_blank' // As fallback, open in new tab
        window.document.body?.appendChild(link)
        link.click()
        window.document.body?.removeChild(link)
      } catch (fallbackError) {
        // Silent fallback failure
      }
    }
  }

  const deleteDocument = async (id: string) => {
    if (onDelete) {
      setIsDeleting(true)
      try {
        await onDelete(id)
        setDeleteDialogOpen(false)
        setDocumentToDelete(null)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {documents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-400">No documents found</p>
            </CardContent>
          </Card>
        ) : (
          documents.map(doc => (
            <Card
              key={doc.id}
              className={cn(
                'overflow-hidden transition-all duration-300 relative',
                doc.status === 'processing' &&
                  'ring-2 ring-amber-300 bg-amber-900/20 backdrop-blur-sm',
              )}
            >
              {/* Subtle shimmer overlay for processing documents */}
              {doc.status === 'processing' && (
                <div className="absolute inset-0 shimmer-processing pointer-events-none opacity-15"></div>
              )}
              <CardHeader className="p-4 pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="relative">
                      {getFileIcon(doc.type)}
                      {doc.status === 'processing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 rounded-full animate-pulse">
                          <div className="absolute inset-0 bg-amber-300 rounded-full animate-ping opacity-50"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle
                        className={cn(
                          'text-base font-medium',
                          doc.status === 'processing'
                            ? 'text-white'
                            : 'text-black',
                        )}
                      >
                        {doc.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500">
                        {typeof doc.size === 'number'
                          ? `${(doc.size / 1024).toFixed(2)} KB`
                          : doc.size}{' '}
                        •{' '}
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString()
                          : 'No date'}
                        {/* {doc.status === 'processing' && (
                          <span className="ml-2 text-amber-700 text-xs font-semibold">
                            • {getProcessingInfo(doc)}
                          </span>
                        )} */}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={doc.status === 'processing'}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => viewDocument(doc.id, doc.name)}
                        disabled={doc.status === 'processing'}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(doc)}
                        disabled={doc.status === 'processing'}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  {doc.status === 'processing' && (
                    <div className="text-xs text-amber-700 flex items-center gap-2 font-medium">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                      <span className="ml-1 max-w-xs truncate">
                        {consoleMessages.length > 0
                          ? consoleMessages[consoleMessages.length - 1]
                          : 'Processing document...'}
                      </span>
                    </div>
                  )}
                </div>

                {doc.status === 'processed' && (
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDocument(doc.id, doc.name)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                )}

                {doc.status === 'processing' && onCancelProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancelProcessing(doc.id)}
                    className="h-7 px-3 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800"
                  >
                    Cancel
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog - Outside of DropdownMenu to avoid portal conflicts */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {documentToDelete && (
                <>
                  Are you sure you want to delete "{documentToDelete.name}"?
                  This action cannot be undone and the document will be
                  permanently removed from your project.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-gray-100 text-gray-900 hover:bg-gray-200"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() =>
                documentToDelete && deleteDocument(documentToDelete.id)
              }
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Document'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
