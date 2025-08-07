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
  AlertDialogAction,
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
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Document } from '@/types'
import { routes } from '@/utils/navigation'

interface DocumentListProps {
  documents: Document[]
  onDelete?: (documentId: string) => void
  projectId: string
  companyId: string
  projectName?: string
}

export const DocumentList = ({
  documents,
  onDelete,
  projectId,
  companyId,
  projectName,
}: DocumentListProps) => {
  const navigate = useNavigate()

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
          <Badge variant="secondary" className="bg-amber-500">
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

  const deleteDocument = (id: string) => {
    if (onDelete) {
      onDelete(id)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-400">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        documents.map(doc => (
          <Card key={doc.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  {getFileIcon(doc.type)}
                  <div>
                    <CardTitle className="text-base font-medium">
                      {doc.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {typeof doc.size === 'number'
                        ? `${(doc.size / 1024).toFixed(2)} KB`
                        : doc.size}{' '}
                      •{' '}
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString()
                        : 'No date'}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => viewDocument(doc.id, doc.name)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={e => e.preventDefault()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{doc.name}"? This
                            action cannot be undone and the document will be
                            permanently removed from your project.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDocument(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Document
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              {getStatusBadge(doc.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => viewDocument(doc.id, doc.name)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )
}
