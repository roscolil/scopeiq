import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentViewer } from '@/components/DocumentViewerNew'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/ui/button'
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
  ArrowLeft,
  Download,
  Share2,
  FileText,
  BrainCircuit,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { routes, createSlug } from '@/utils/navigation'
import { Document as DocumentType } from '@/types'
import { documentService, projectService } from '@/services/hybrid'

const Viewer = () => {
  const { companyId, projectId, documentId } = useParams<{
    companyId: string // Company ID
    projectId: string // Project slug (from project name)
    documentId: string // Document slug (from document name)
  }>()

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<'document' | 'ai'>('ai')
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [resolvedProject, setResolvedProject] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // React to hash changes for AI/Document toggle
  useEffect(() => {
    const hash = location.hash
    if (hash === '#document') {
      setViewMode('document')
    } else {
      // Default to 'ai' when no hash or #ai hash
      setViewMode('ai')
    }
  }, [location.hash])

  // Fetch document info from API
  useEffect(() => {
    const fetchData = async () => {
      if (!documentId || !projectId) return

      try {
        setIsLoading(true)

        // First resolve the project slug to get the actual project
        const projectData = await projectService.resolveProject(projectId!)

        if (!projectData) {
          setProjectName('Unknown Project')
          setIsLoading(false)
          return
        }

        setProjectName(projectData.name)
        setResolvedProject({ id: projectData.id, name: projectData.name })

        // Now try to get the document by ID first
        let documentData = null
        try {
          documentData = await documentService.getDocument(
            companyId!,
            projectData.id,
            documentId!,
          )
        } catch (error) {
          console.error('Viewer: Error in getDocument call:', error)
        }

        // If not found by direct ID, search by slug/name in the project
        if (!documentData) {
          try {
            const allProjectDocuments =
              await documentService.getDocumentsByProject(projectData.id)

            // Create slug from document name and compare
            documentData = allProjectDocuments.find(doc => {
              const viewerSlug = doc.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
              const navigationSlug = createSlug(doc.name)
              const matchesViewer = viewerSlug === documentId
              const matchesNavigation = navigationSlug === documentId
              const matchesId = doc.id === documentId

              return matchesViewer || matchesNavigation || matchesId
            })
          } catch (error) {
            console.error('Viewer: Error searching documents by slug:', error)
          }
        }

        if (documentData) {
          setDocument(documentData)
        } else {
          toast({
            title: 'Document not found',
            description: 'The requested document could not be found.',
            variant: 'destructive',
          })
        }

        // Use companyId as company name for now (can be enhanced with actual company data later)
        setCompanyName(companyId || 'Your Company')
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error loading data',
          description:
            'Failed to load the document information. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [documentId, projectId, companyId, toast])

  if (!documentId || !projectId || !companyId) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found - Missing parameters</p>
          <p className="text-sm text-muted-foreground">
            Company: {companyName || companyId || 'missing'}, Project:{' '}
            {projectName || projectId || 'missing'}, Document:{' '}
            {document?.name || documentId || 'missing'}
          </p>
          <Button
            onClick={() => {
              if (companyId) {
                navigate(routes.company.projects.list(companyId))
              } else {
                navigate('/')
              }
            }}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" text="Loading document..." />
        </div>
      </Layout>
    )
  }

  if (!document) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found</p>
          <p className="text-sm text-gray-600 mt-2">
            Debug info: documentId={documentId}, projectId={projectId},
            companyId={companyId}
          </p>
          <Button
            onClick={() => {
              if (companyId && projectId) {
                navigate(routes.company.project.details(companyId, projectId))
              } else {
                navigate('/')
              }
            }}
            className="mt-4"
          >
            Back to Project
          </Button>
        </div>
      </Layout>
    )
  }

  const handleDownload = async () => {
    if (document?.url) {
      try {
        // Fetch the file as a blob to force download behavior
        console.log('Fetching file from URL:', document.url)
        const response = await fetch(document.url)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        console.log('File fetched successfully, size:', blob.size)

        // Create object URL for the blob
        const blobUrl = window.URL.createObjectURL(blob)

        // Create temporary anchor element to trigger download
        const link = window.document.createElement('a')
        link.href = blobUrl
        link.download = document.name || 'document' // Force download instead of opening in new tab

        // Temporarily add to DOM and click
        document.body?.appendChild(link)
        link.click()
        document.body?.removeChild(link)

        // Clean up the object URL
        window.URL.revokeObjectURL(blobUrl)

        toast({
          title: 'Download started',
          description: 'Your document download has been initiated.',
        })
      } catch (error) {
        console.error('Error downloading document:', error)

        // Fallback: try the direct link approach
        console.log('Falling back to direct link approach')
        try {
          const link = window.document.createElement('a')
          link.href = document.url
          link.download = document.name || 'document'
          link.target = '_blank' // As fallback, open in new tab
          document.body?.appendChild(link)
          link.click()
          document.body?.removeChild(link)

          toast({
            title: 'Download started',
            description:
              'Your document download has been initiated (fallback method).',
          })
        } catch (fallbackError) {
          console.error('Fallback download also failed:', fallbackError)
          toast({
            title: 'Download failed',
            description: 'Unable to download the document. Please try again.',
            variant: 'destructive',
          })
        }
      }
    } else {
      toast({
        title: 'Download failed',
        description: 'Document URL is not available.',
        variant: 'destructive',
      })
    }
  }

  const handleShare = () => {
    const shareUrl = window.location.href

    // Try to use the clipboard API
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          toast({
            title: 'Share link copied',
            description: 'The link has been copied to your clipboard.',
          })
        })
        .catch(() => {
          // Fallback
          prompt('Copy this link to share the document:', shareUrl)
        })
    } else {
      // Fallback for browsers without clipboard API
      prompt('Copy this link to share the document:', shareUrl)
    }
  }

  const handleDelete = async () => {
    if (!document || !resolvedProject || !companyId) return

    try {
      setIsDeleting(true)

      // Delete the document using the hybrid service
      await documentService.deleteDocument(
        companyId,
        resolvedProject.id,
        document.id,
      )

      toast({
        title: 'Document deleted',
        description: `"${document.name}" has been permanently deleted.`,
      })

      // Redirect back to the project details page
      if (companyId && projectId) {
        navigate(
          routes.company.project.details(companyId, projectId, projectName),
        )
      } else if (companyId) {
        navigate(routes.company.projects.list(companyId))
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTabChange = (value: string) => {
    setViewMode(value as 'document' | 'ai')

    // Update URL hash for bookmarking/sharing
    if (value === 'document') {
      window.history.replaceState(null, '', `${location.pathname}#document`)
    } else {
      // For 'ai' mode, remove hash (since it's the default)
      window.history.replaceState(null, '', location.pathname)
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (companyId && projectId) {
                navigate(
                  routes.company.project.details(
                    companyId,
                    projectId,
                    projectName,
                  ),
                )
              } else if (companyId) {
                navigate(routes.company.projects.list(companyId))
              } else {
                navigate('/')
              }
            }}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              {projectName ? `Back to ${projectName}` : 'Back to Project'}
            </span>
          </Button>
        </div>

        {/* Improve the document header with more details */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold truncate max-w-lg">
              {document?.name || 'Document'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {companyName && projectName ? (
                <>
                  <span className="font-medium">{companyName}</span> /{' '}
                  <span>{projectName}</span>
                </>
              ) : (
                'Loading project details...'
              )}
            </p>
            {document?.size && (
              <p className="text-xs text-muted-foreground mt-1">
                Size:{' '}
                {typeof document.size === 'number'
                  ? `${Math.round(document.size / 1024)} KB`
                  : document.size}
                {document.type &&
                  ` • Type: ${document.type.split('/')[1] || document.type}`}
              </p>
            )}
          </div>

          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 text-destructive hover:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{document?.name}"? This
                    action will permanently remove the document from your
                    project and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Document'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Update the view toggle to include document type info */}
        <div className="bg-muted rounded-md p-1 mb-6">
          <div className="flex space-x-1">
            <button
              className={`flex-1 px-3 py-2 text-sm rounded-sm flex items-center justify-center space-x-2 ${
                viewMode === 'ai' ? 'bg-background shadow-sm' : ''
              }`}
              onClick={() => setViewMode('ai')}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>AI Analysis</span>
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm rounded-sm flex items-center justify-center space-x-2 ${
                viewMode === 'document' ? 'bg-background shadow-sm' : ''
              }`}
              onClick={() => setViewMode('document')}
            >
              <FileText className="h-4 w-4" />
              <span>
                {document?.type?.includes('pdf')
                  ? 'PDF Document'
                  : document?.type?.includes('image')
                    ? 'Image'
                    : document?.type?.includes('text')
                      ? 'Text Document'
                      : 'Document'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-0">
          <DocumentViewer
            documentId={document?.id || documentId}
            projectId={resolvedProject?.id || projectId}
            companyId={companyId}
            viewMode={viewMode}
            document={document} // Pass the resolved document data
          />
        </div>
      </div>
    </Layout>
  )
}

export default Viewer
