import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
// import { DocumentViewer } from '@/components/documents/DocumentViewerNew'
import { UniversalViewer } from '@/components/documents/UniversalViewer'
import {
  PageHeaderSkeleton,
  DocumentViewerSkeleton,
} from '@/components/shared/skeletons'
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
import { ArrowLeft, Download, Share2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { routes, createSlug } from '@/utils/ui/navigation'
import { Document as DocumentType } from '@/types'
import { documentService, projectService } from '@/services/data/hybrid'
import { documentDeletionEvents } from '@/services/utils/document-events'

const Viewer = () => {
  const { companyId, projectId, documentId } = useParams<{
    companyId: string // Company ID
    projectId: string // Project slug (from project name)
    documentId: string // Document slug (from document name)
  }>()

  const navigate = useNavigate()
  const { toast } = useToast()

  // Removed viewMode / AI Analysis – only showing document body
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [resolvedProject, setResolvedProject] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection caught:', event.reason)
      // Prevent the default browser behavior
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  const [isDeleting, setIsDeleting] = useState(false)

  // Removed hash-based toggle logic

  // Fetch document info from API
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      if (!documentId || !projectId) {
        console.log('Viewer: Missing params', {
          documentId,
          projectId,
          companyId,
        })
        return
      }

      console.log('📄 Viewer: Starting to fetch document', {
        documentId,
        projectId,
        companyId,
      })

      try {
        setIsLoading(true)

        // Check if component is still mounted
        if (!isMounted) return

        // First resolve the project slug to get the actual project
        console.log('🔍 Viewer: Resolving project...', projectId)
        const projectData = await projectService.resolveProject(projectId!)

        if (!isMounted) return

        if (!projectData) {
          console.warn('Viewer: Project not found', projectId)
          setProjectName('Unknown Project')
          setIsLoading(false)
          return
        }

        console.log('✅ Viewer: Project resolved', {
          id: projectData.id,
          name: projectData.name,
        })
        setProjectName(projectData.name)
        setResolvedProject({ id: projectData.id, name: projectData.name })

        // Now try to get the document by ID first
        let documentData = null
        console.log('🔍 Viewer: Trying direct document lookup...', {
          companyId,
          projectId: projectData.id,
          documentId,
        })
        try {
          documentData = await documentService.getDocument(
            companyId!,
            projectData.id,
            documentId!,
          )
          if (documentData) {
            console.log(
              '✅ Viewer: Document found by direct ID',
              documentData.name,
            )
          }
        } catch (error) {
          console.error('Viewer: Error in getDocument call:', error)
        }

        // If not found by direct ID, search by slug/name in the project
        if (!documentData) {
          console.log(
            '🔍 Viewer: Document not found by ID, searching by slug...',
          )
          try {
            const allProjectDocuments =
              await documentService.getDocumentsByProject(projectData.id)

            console.log(
              '📋 Viewer: Found',
              allProjectDocuments.length,
              'documents in project',
            )

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

              const matches = matchesViewer || matchesNavigation || matchesId
              if (matches) {
                console.log('✅ Viewer: Document matched!', {
                  documentName: doc.name,
                  matchType: matchesId
                    ? 'ID'
                    : matchesNavigation
                      ? 'navigation slug'
                      : 'viewer slug',
                })
              }
              return matches
            })

            if (documentData) {
              console.log(
                '✅ Viewer: Document found by slug',
                documentData.name,
              )
            } else {
              console.warn(
                '❌ Viewer: No document matched. Searched documentId:',
                documentId,
              )
              console.log(
                'Available documents:',
                allProjectDocuments.map(d => ({
                  id: d.id,
                  name: d.name,
                  slug: createSlug(d.name),
                })),
              )
            }
          } catch (error) {
            console.error('Viewer: Error searching documents by slug:', error)
          }
        }

        if (!isMounted) return

        if (documentData) {
          console.log('✅ Viewer: Setting document', documentData)

          // Check if the S3 URL might be expired and refresh it
          if (documentData.url) {
            console.log('🔗 Viewer: Document has URL, checking if fresh...')
            // Refresh the document to get a fresh presigned URL
            try {
              const refreshedDoc = await documentService.getDocument(
                companyId!,
                projectData.id,
                documentData.id,
              )
              if (refreshedDoc && refreshedDoc.url) {
                console.log('✅ Viewer: URL refreshed successfully')
                setDocument(refreshedDoc)
              } else {
                console.log(
                  '⚠️ Viewer: Using original document (refresh failed)',
                )
                setDocument(documentData)
              }
            } catch (refreshError) {
              console.warn(
                'Viewer: URL refresh failed, using original:',
                refreshError,
              )
              setDocument(documentData)
            }
          } else {
            console.log('⚠️ Viewer: Document has no URL')
            setDocument(documentData)
          }
        } else {
          console.error('❌ Viewer: Document not found after all attempts')
          toast({
            title: 'Document not found',
            description: 'The requested document could not be found.',
            variant: 'destructive',
          })
        }

        if (!isMounted) return

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
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [documentId, projectId, companyId, toast])

  if (!documentId || !projectId || !companyId) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found - Missing parameters</p>
          <p className="text-sm text-gray-400">
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
        <div className="container mx-auto px-4 py-8 space-y-6">
          <PageHeaderSkeleton showBackButton={true} showActions={3} />
          <DocumentViewerSkeleton />
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

  // const handleDownload = async () => {
  //   if (document?.url) {
  //     try {
  //       // Fetch the file as a blob to force download behavior
  //       console.log('Fetching file from URL:', document.url)
  //       const response = await fetch(document.url)

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`)
  //       }

  //       const blob = await response.blob()
  //       console.log('File fetched successfully, size:', blob.size)

  //       // Create object URL for the blob
  //       const blobUrl = window.URL.createObjectURL(blob)

  //       // Create temporary anchor element to trigger download
  //       const link = window.document.createElement('a')
  //       link.href = blobUrl
  //       link.download = document.name || 'document' // Force download instead of opening in new tab

  //       // Temporarily add to DOM and click
  //       window.document.body?.appendChild(link)
  //       link.click()
  //       window.document.body?.removeChild(link)

  //       // Clean up the object URL
  //       window.URL.revokeObjectURL(blobUrl)

  //       toast({
  //         title: 'Download started',
  //         description: 'Your document download has been initiated.',
  //       })
  //     } catch (error) {
  //       console.error('Error downloading document:', error)

  //       // Fallback: try the direct link approach
  //       console.log('Falling back to direct link approach')
  //       try {
  //         const link = window.document.createElement('a')
  //         link.href = document.url
  //         link.download = document.name || 'document'
  //         link.target = '_blank' // As fallback, open in new tab
  //         window.document.body?.appendChild(link)
  //         link.click()
  //         window.document.body?.removeChild(link)

  //         toast({
  //           title: 'Download started',
  //           description:
  //             'Your document download has been initiated (fallback method).',
  //         })
  //       } catch (fallbackError) {
  //         console.error('Fallback download also failed:', fallbackError)
  //         toast({
  //           title: 'Download failed',
  //           description: 'Unable to download the document. Please try again.',
  //           variant: 'destructive',
  //         })
  //       }
  //     }
  //   } else {
  //     toast({
  //       title: 'Download failed',
  //       description: 'Document URL is not available.',
  //       variant: 'destructive',
  //     })
  //   }
  // }

  // const handleShare = () => {
  //   const shareUrl = window.location.href

  //   // Try to use the clipboard API
  //   if (navigator.clipboard) {
  //     navigator.clipboard
  //       .writeText(shareUrl)
  //       .then(() => {
  //         toast({
  //           title: 'Share link copied',
  //           description: 'The link has been copied to your clipboard.',
  //         })
  //       })
  //       .catch(() => {
  //         // Fallback
  //         prompt('Copy this link to share the document:', shareUrl)
  //       })
  //   } else {
  //     // Fallback for browsers without clipboard API
  //     prompt('Copy this link to share the document:', shareUrl)
  //   }
  // }

  const handleDelete = async () => {
    if (!document || !resolvedProject || !companyId) return
    try {
      setIsDeleting(true)
      const start = performance.now()

      await documentService.deleteDocument(
        companyId,
        resolvedProject.id,
        document.id,
      )

      // Broadcast deletion event so project lists can prune without full refetch delay
      documentDeletionEvents.emitDeletion({
        projectId: resolvedProject.id,
        documentId: document.id,
        companyId,
        name: document.name,
      })

      // Invalidate cached documents for the project (ProjectDetails uses this key pattern)
      try {
        localStorage.removeItem(`documents_${resolvedProject.id}`)
      } catch (e) {
        // ignore cache removal errors (quota / private mode)
      }

      toast({
        title: 'Document deleted',
        description: `"${document.name}" has been permanently deleted.`,
      })

      // Ensure deleting state is visible for a minimum duration
      const MIN_VISIBLE_MS = 600
      const elapsed = performance.now() - start
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

      setTimeout(() => {
        if (companyId && projectId) {
          navigate(
            routes.company.project.details(companyId, projectId, projectName),
          )
        } else if (companyId) {
          navigate(routes.company.projects.list(companyId))
        } else {
          navigate('/')
        }
      }, remaining)
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the document. Please try again.',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  // Removed tab change handler

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid gradient background layers with more variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-slate-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/6 to-violet-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-4">
          {isDeleting && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm text-white"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-lg font-semibold tracking-wide">
                  Deleting document…
                </p>
                <p className="text-xs text-white/60 max-w-sm text-center">
                  {document?.name
                    ? `Removing "${document.name}" and cleaning associated data`
                    : 'Removing file and cleaning associated data'}
                </p>
              </div>
            </div>
          )}
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
              className="flex items-center space-x-2 hover:scale-105 transition-all duration-200"
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
              <h1 className="text-2xl font-bold truncate max-w-lg text-white">
                {document?.name || 'Document'}
              </h1>
              <p className="text-sm text-gray-400">
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
                <p className="text-xs text-gray-400 mt-1">
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
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button> */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button> */}

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
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-900">
                      Delete Document
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600">
                      Are you sure you want to delete "
                      {document?.name || 'this document'}"? This action will
                      permanently remove the document from your project and
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={isDeleting}
                      className="bg-gray-100 text-gray-900 hover:bg-gray-200"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                          Deleting…
                        </span>
                      ) : (
                        'Delete Document'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Tabs & AI analysis removed – simplified viewer */}

          <div className="mt-0 border rounded-lg bg-white/5 p-2 backdrop-blur-sm">
            <UniversalViewer document={document} />
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Viewer
