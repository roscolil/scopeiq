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
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { FileTypeIcon } from '@/components/documents/FileTypeIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Document } from '@/types'
import { routes } from '@/utils/ui/navigation'
import { cn } from '@/lib/utils'
import { processEmbeddingOnly } from '@/services/ai/embedding'
import { documentService } from '@/services/data/hybrid'
import { useToast } from '@/hooks/use-toast'
import {
  processingMessageBroadcaster,
  type ProcessingMessage,
} from '@/services/utils/processing-messages'

interface DocumentListProps {
  documents: Document[]
  onDelete?: (documentId: string) => void | Promise<void>
  onCancelProcessing?: (documentId: string) => void
  onRetryProcessing?: (documentId: string) => void | Promise<void>
  projectId: string
  companyId: string
  projectName?: string
  /** Enable pagination automatically when documents length exceeds this number (default 5) */
  paginationThreshold?: number
  /** Page size when pagination active (default 10) */
  pageSize?: number
}

export const DocumentList = ({
  documents,
  onDelete,
  onCancelProcessing,
  onRetryProcessing,
  projectId,
  companyId,
  projectName,
  paginationThreshold = 5,
  pageSize = 5,
}: DocumentListProps) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [documentToDelete, setDocumentToDelete] =
    React.useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [, forceUpdate] = React.useState(0)
  const [processingMessages, setProcessingMessages] = React.useState<
    ProcessingMessage[]
  >([])
  const [page, setPage] = React.useState(1)

  // Reset to first page whenever document list changes length (new upload/delete)
  React.useEffect(() => {
    setPage(1)
  }, [documents.length])

  const paginationEnabled = documents.length > paginationThreshold
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(documents.length / pageSize))
    : 1
  const safePage = Math.min(page, totalPages)
  const startIndex = paginationEnabled ? (safePage - 1) * pageSize : 0
  const endIndex = paginationEnabled ? startIndex + pageSize : documents.length
  const visibleDocuments = paginationEnabled
    ? documents.slice(startIndex, endIndex)
    : documents

  const goToPage = (p: number) => {
    setPage(prev => {
      const next = Math.min(Math.max(1, p), totalPages)
      if (next !== prev) {
        // Smooth scroll to top of list for better UX
        requestAnimationFrame(() => {
          const el = document.getElementById('document-list-top')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      }
      return next
    })
  }

  // Subscribe to processing messages
  React.useEffect(() => {
    const unsubscribe = processingMessageBroadcaster.subscribe(message => {
      // Only show messages for documents in this project
      if (!message.projectId || message.projectId === projectId) {
        setProcessingMessages(prev => {
          const newMessages = [...prev, message]
          // Keep only the last 10 messages
          return newMessages.slice(-10)
        })
      }
    })

    // Load recent messages for this project on mount
    const recentMessages = processingMessageBroadcaster.getRecentMessages(
      undefined,
      projectId,
      5,
    )
    setProcessingMessages(recentMessages)

    return unsubscribe
  }, [projectId])

  // Removed old getFileIcon - unified via FileTypeIcon

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

  const retryProcessing = async (document: Document) => {
    if (!document.content) {
      toast({
        title: 'Cannot retry processing',
        description:
          'Document content is not available. Please re-upload the file.',
        variant: 'destructive',
      })
      return
    }

    try {
      toast({
        title: 'Retrying processing',
        description: `Processing ${document.name}...`,
      })

      // Update document status to processing
      await documentService.updateDocument(companyId, projectId, document.id, {
        status: 'processing',
      })

      // Call the retry callback if provided
      if (onRetryProcessing) {
        await onRetryProcessing(document.id)
      }

      // Retry the embedding process
      await processEmbeddingOnly(document.content, projectId, document.id, {
        name: document.name,
        type: document.type,
        size: document.size,
      })

      // Update document status to processed
      await documentService.updateDocument(companyId, projectId, document.id, {
        status: 'processed',
      })

      toast({
        title: 'Processing completed',
        description: `${document.name} has been successfully processed.`,
      })

      // Force a re-render to show updated status
      forceUpdate(prev => prev + 1)
    } catch (error) {
      console.error('Error retrying document processing:', error)

      // Update document status back to failed
      await documentService.updateDocument(companyId, projectId, document.id, {
        status: 'failed',
      })

      toast({
        title: 'Processing failed again',
        description:
          'The document processing failed. Please check the document and try again.',
        variant: 'destructive',
      })

      // Force a re-render to show updated status
      forceUpdate(prev => prev + 1)
    }
  }

  const getProcessingInfo = (document: Document) => {
    // Find the most recent processing message for this document
    const relevantMessage = processingMessages
      .slice() // Create a copy to avoid mutating
      .reverse() // Get most recent first
      .find(
        msg =>
          msg.documentId === document.id ||
          (msg.type === 'progress' &&
            (msg.message.includes('chunk batch') ||
              msg.message.includes('Created') ||
              msg.message.includes('Processing'))),
      )

    if (relevantMessage) {
      // Extract batch information if available
      if (relevantMessage.details?.batchInfo) {
        const { current, total } = relevantMessage.details.batchInfo
        return `Processing batch ${current} of ${total}`
      }

      // Return the message, truncated if needed
      return relevantMessage.message.length > 50
        ? relevantMessage.message.substring(0, 50) + '...'
        : relevantMessage.message
    }

    return 'Processing document...'
  }

  const getProcessingProgress = (document: Document) => {
    // Find the most recent progress message for this document
    const progressMessage = processingMessages
      .slice()
      .reverse()
      .find(
        msg =>
          msg.documentId === document.id &&
          msg.type === 'progress' &&
          msg.details?.progress !== undefined,
      )

    return progressMessage?.details?.progress
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
      <div id="document-list-top" className="grid grid-cols-1 gap-4">
        {visibleDocuments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-400">No documents found</p>
            </CardContent>
          </Card>
        ) : (
          visibleDocuments.map(doc => (
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
                      <FileTypeIcon
                        mimeType={doc.type}
                        fileName={doc.name}
                        size={32}
                      />
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
                      {doc.status === 'failed' && (
                        <DropdownMenuItem
                          onClick={() => retryProcessing(doc)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Processing
                        </DropdownMenuItem>
                      )}
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
                    <div className="text-xs text-amber-700 flex ml-2 items-center gap-2 font-medium">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="truncate">
                          {getProcessingInfo(doc)}
                        </span>
                        {getProcessingProgress(doc) !== undefined && (
                          <div className="flex items-center gap-1 ml-1">
                            <div className="w-16 h-1 bg-amber-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 transition-all duration-300"
                                style={{
                                  width: `${getProcessingProgress(doc)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-amber-600">
                              {getProcessingProgress(doc)}%
                            </span>
                          </div>
                        )}
                      </div>
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

      {paginationEnabled && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(endIndex, documents.length)} of{' '}
            {documents.length}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => goToPage(safePage - 1)}
              className="h-7 px-2"
            >
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                // Show first, last, current, neighbors; collapse middle with ellipsis logic
                if (totalPages <= 7) return true
                if (p === 1 || p === totalPages) return true
                if (Math.abs(p - safePage) <= 1) return true
                if (safePage <= 3 && p <= 5) return true
                if (safePage >= totalPages - 2 && p >= totalPages - 4)
                  return true
                return false
              })
              .map((p, idx, arr) => {
                const prevVal = arr[idx - 1]
                const showEllipsis = prevVal && p - (prevVal as number) > 1
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-1 text-muted-foreground">…</span>
                    )}
                    <Button
                      variant={p === safePage ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-7 px-3', p === safePage && 'font-bold')}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                )
              })}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => goToPage(safePage + 1)}
              className="h-7 px-2"
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
