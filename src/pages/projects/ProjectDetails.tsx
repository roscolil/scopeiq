import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DocumentList } from '@/components/documents/DocumentList'
import { FileUploader } from '@/components/upload/FileUploader'
import {
  ProjectDetailsSkeleton,
  DocumentListSkeleton,
  AIActionsSkeleton,
} from '@/components/shared/skeletons'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Project, Document } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { AIActions } from '@/components/ai/AIActions'
import { useIsMobile } from '@/hooks/use-mobile'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import { useDocumentStatusPolling } from '@/hooks/use-document-status-polling'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routes } from '@/utils/ui/navigation'
import { projectService, documentService } from '@/services/data/hybrid'

const ProjectDetails = () => {
  const { companyId, projectId } = useParams<{
    companyId: string // Company ID
    projectId: string // Project slug (from project name)
  }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [project, setProject] = useState<Project | null>(null)
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([])
  const [isProjectLoading, setIsProjectLoading] = useState(true)
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [showAITools, setShowAITools] = useState(true)

  // Handle document status updates for real-time feedback
  const handleDocumentStatusUpdate = useCallback(
    (updatedDocument: Document) => {
      setProjectDocuments(prev =>
        prev.map(doc =>
          doc.id === updatedDocument.id ? updatedDocument : doc,
        ),
      )

      // Show subtle notification for status changes
      // if (updatedDocument.status === 'processed') {
      //   toast({
      //     title: 'Document Ready',
      //     description: `${updatedDocument.name} is now available for AI search.`,
      //     duration: 3000,
      //   })
      // }
    },
    [],
  )

  // Poll for document status updates
  useDocumentStatusPolling({
    documents: projectDocuments,
    projectId: projectId || '',
    companyId: companyId || '',
    onDocumentUpdate: handleDocumentStatusUpdate,
    enabled:
      projectDocuments?.some(doc => doc.status === 'processing') || false,
  })

  // Cache keys
  const PROJECT_CACHE_KEY = `project_${projectId}`
  const DOCUMENTS_CACHE_KEY = `documents_${projectId}`

  // Caching utilities
  const getCachedProject = useCallback(() => {
    const cached = localStorage.getItem(PROJECT_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const isStale = Date.now() - timestamp > 5 * 60 * 1000 // 5 minutes
      return { data: data as Project, isStale }
    }
    return null
  }, [PROJECT_CACHE_KEY])

  const setCachedProjectData = useCallback(
    (data: Project) => {
      localStorage.setItem(
        PROJECT_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      )
    },
    [PROJECT_CACHE_KEY],
  )

  const getCachedDocuments = useCallback(() => {
    const cached = localStorage.getItem(DOCUMENTS_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Reduce cache validity to 2 minutes for documents to ensure fresher data
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        console.log('📋 Using cached documents data')
        return { data, isStale: false }
      } else {
        console.log('📋 Cached documents data is stale, will refresh')
        return { data, isStale: true }
      }
    }
    console.log('📋 No cached documents data found')
    return null
  }, [DOCUMENTS_CACHE_KEY])

  const setCachedDocumentsData = useCallback(
    (data: Document[]) => {
      localStorage.setItem(
        DOCUMENTS_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      )
    },
    [DOCUMENTS_CACHE_KEY],
  )

  const clearCache = useCallback(() => {
    localStorage.removeItem(PROJECT_CACHE_KEY)
    localStorage.removeItem(DOCUMENTS_CACHE_KEY)
  }, [PROJECT_CACHE_KEY, DOCUMENTS_CACHE_KEY])

  // Load cached data immediately on mount
  useEffect(() => {
    const cachedProject = getCachedProject()
    if (cachedProject && !cachedProject.isStale) {
      console.log('🏗️ Loading cached project data')
      setProject(cachedProject.data)
      setIsProjectLoading(false)
    }

    const cachedDocuments = getCachedDocuments()
    if (cachedDocuments && !cachedDocuments.isStale) {
      console.log('📋 Loading cached documents data')
      setProjectDocuments(cachedDocuments.data || [])
      setIsDocumentsLoading(false)
    } else if (cachedDocuments && cachedDocuments.isStale) {
      // Show stale data immediately but mark for refresh
      console.log('📋 Loading stale cached documents data, will refresh soon')
      setProjectDocuments(cachedDocuments.data || [])
      setIsDocumentsLoading(true) // Keep loading state to trigger refresh
    }
  }, [getCachedProject, getCachedDocuments])

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !companyId) return

      // Check if we need to refresh cached data
      const cachedProject = getCachedProject()
      const cachedDocuments = getCachedDocuments()
      const shouldRefreshProject = !cachedProject || cachedProject.isStale
      const shouldRefreshDocuments = !cachedDocuments || cachedDocuments.isStale

      console.log('🔍 Cache status:', {
        shouldRefreshProject,
        shouldRefreshDocuments,
        hasCachedProject: !!cachedProject,
        hasCachedDocuments: !!cachedDocuments,
      })

      if (!shouldRefreshProject && !shouldRefreshDocuments) {
        console.log('✅ Using cached data, no refresh needed')
        return // No need to refresh
      }

      try {
        if (shouldRefreshProject) {
          setIsProjectLoading(true)
        }
        if (shouldRefreshDocuments) {
          setIsDocumentsLoading(true)
        }

        const projectData = await projectService.resolveProject(projectId)

        if (projectData) {
          // Transform data to our Project type
          const transformedProject: Project = {
            id: projectData.id,
            name: projectData.name || 'Untitled Project',
            description: projectData.description,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt,
            companyId: companyId || projectData.companyId,
          }

          // Cache and update project data
          setCachedProjectData(transformedProject)
          setProject(transformedProject)
          setIsProjectLoading(false)

          const documents = await documentService.getDocumentsByProject(
            projectData.id,
          )
          const transformedDocuments: Document[] = (documents || []).map(
            doc => ({
              id: doc.id,
              name: doc.name || 'Untitled Document',
              type: doc.type || 'unknown',
              size:
                typeof doc.size === 'number'
                  ? doc.size
                  : parseInt(String(doc.size)) || 0,
              status: doc.status || 'processing',
              url: doc.url,
              thumbnailUrl: doc.thumbnailUrl,
              projectId: doc.projectId,
              content: doc.content,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }),
          )

          // Cache and update documents data
          setCachedDocumentsData(transformedDocuments)
          setProjectDocuments(transformedDocuments)
          setIsDocumentsLoading(false)
        } else {
          // Set project to null or show error state
          setProject(null)
          setProjectDocuments([])
          setIsProjectLoading(false)
          setIsDocumentsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching project data:', error)
        toast({
          title: 'Error loading project',
          description: 'Failed to load project data. Please try again.',
          variant: 'destructive',
        })
        setIsProjectLoading(false)
        setIsDocumentsLoading(false)
      }
    }

    fetchProjectData()
  }, [
    projectId,
    companyId,
    toast,
    getCachedProject,
    getCachedDocuments,
    setCachedProjectData,
    setCachedDocumentsData,
  ])

  // Add live document status polling
  useEffect(() => {
    if (!project?.id) return

    const pollDocumentStatuses = async () => {
      try {
        const documents = await documentService.getDocumentsByProject(
          project.id,
        )
        const transformedDocuments: Document[] = (documents || []).map(doc => ({
          id: doc.id,
          name: doc.name || 'Untitled Document',
          type: doc.type || 'unknown',
          size:
            typeof doc.size === 'number'
              ? doc.size
              : parseInt(String(doc.size)) || 0,
          status: doc.status || 'processing',
          url: doc.url,
          thumbnailUrl: doc.thumbnailUrl,
          projectId: doc.projectId,
          content: doc.content,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }))

        // Only update if there are actual changes to avoid unnecessary re-renders
        setProjectDocuments(prev => {
          // Check for status changes
          const hasStatusChanges = prev.some((prevDoc, index) => {
            const newDoc = transformedDocuments.find(d => d.id === prevDoc.id)
            return newDoc && newDoc.status !== prevDoc.status
          })

          // Check for document count changes (additions or deletions)
          const hasCountChanges = prev.length !== transformedDocuments.length

          // Check for completely different document sets (by IDs)
          const prevIds = new Set(prev.map(d => d.id))
          const newIds = new Set(transformedDocuments.map(d => d.id))
          const hasDocumentChanges =
            prevIds.size !== newIds.size ||
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id))

          if (hasStatusChanges || hasCountChanges || hasDocumentChanges) {
            console.log('📊 Document changes detected:', {
              hasStatusChanges,
              hasCountChanges,
              hasDocumentChanges,
              prevCount: prev.length,
              newCount: transformedDocuments.length,
            })
            // Update cache when document list changes
            setCachedDocumentsData(transformedDocuments)
            return transformedDocuments
          }
          return prev
        })
      } catch (error) {
        console.error('Error polling document statuses:', error)
      }
    }

    // Determine polling interval based on document statuses
    const hasProcessingDocs =
      projectDocuments?.some(doc => doc.status === 'processing') || false
    const hasFailedDocs =
      projectDocuments?.some(doc => doc.status === 'failed') || false

    let pollInterval: number
    if (hasProcessingDocs) {
      pollInterval = 5000 // Poll every 5 seconds if any docs are processing
    } else if (hasFailedDocs) {
      pollInterval = 15000 // Poll every 15 seconds if any docs failed
    } else {
      pollInterval = 30000 // Poll every 30 seconds for completed docs
    }

    const intervalId = setInterval(pollDocumentStatuses, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [project?.id, projectDocuments, setCachedDocumentsData])

  const handleUpdateProject = async (data: {
    address: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    postcode?: string
    name: string
    description: string
    slug?: string
  }) => {
    if (!project) return

    try {
      const updatedProject = await projectService.updateProject(
        companyId!,
        project.id,
        {
          name: data.name,
          description: data.description,
          slug: data.slug,
        },
      )

      if (updatedProject) {
        setProject({
          ...project,
          name: updatedProject.name,
          description: updatedProject.description,
          updatedAt: updatedProject.updatedAt,
        })

        toast({
          title: 'Project updated',
          description: 'Your project has been updated successfully.',
        })
      }

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating project:', error)
      toast({
        title: 'Update failed',
        description:
          'There was an error updating your project. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return

    try {
      await projectService.deleteProject(companyId!, project.id)

      toast({
        title: 'Project deleted',
        description: 'Your project has been deleted successfully.',
      })

      navigate(routes.company.projects.list(companyId || ''))
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: 'Delete failed',
        description:
          'There was an error deleting your project. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleUploadDocument = (uploadedDocument: Document) => {
    console.log(
      '📄 Document upload completed:',
      uploadedDocument.name,
      uploadedDocument.id,
    )

    // Check if this document already exists (by ID) - if so, update it; otherwise add it
    const existingDocumentIndex =
      projectDocuments?.findIndex(doc => doc.id === uploadedDocument.id) ?? -1

    let updatedDocuments: Document[]
    if (existingDocumentIndex >= 0) {
      // Update existing document (e.g., status change from processing to processed)
      updatedDocuments = [...(projectDocuments || [])]
      updatedDocuments[existingDocumentIndex] = uploadedDocument
      console.log('📄 Updated existing document in list')
    } else {
      // Add new document
      updatedDocuments = [...(projectDocuments || []), uploadedDocument]
      console.log('📄 Added new document to list')
    }

    setProjectDocuments(updatedDocuments)

    // Clear cache to force fresh data fetch on next load
    // This ensures that after page refresh, we get the latest data from the database
    console.log('🗑️ Clearing cache to ensure fresh data on refresh')
    clearCache()

    // Set cache with fresh data for immediate use
    setCachedDocumentsData(updatedDocuments)

    // Only close the dialog for new documents, not status updates
    if (existingDocumentIndex < 0) {
      setIsUploadDialogOpen(false)

      // Force a refresh of the document list after a short delay
      // This ensures the database has been updated
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing document list from database...')

          // Use the project ID consistently
          const targetProjectId = project?.id || projectId
          if (!targetProjectId) {
            console.error('❌ No project ID available for refresh')
            return
          }

          console.log(
            `🔍 Fetching documents for project ID: ${targetProjectId}`,
          )
          const freshDocuments =
            await documentService.getDocumentsByProject(targetProjectId)

          console.log(`📋 Raw documents from database:`, freshDocuments)

          const transformedDocuments: Document[] = (freshDocuments || []).map(
            doc => ({
              id: doc.id,
              name: doc.name || 'Untitled Document',
              type: doc.type || 'unknown',
              size:
                typeof doc.size === 'number'
                  ? doc.size
                  : parseInt(String(doc.size)) || 0,
              status: doc.status || 'processing',
              url: doc.url,
              thumbnailUrl: doc.thumbnailUrl,
              projectId: doc.projectId,
              content: doc.content,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }),
          )

          console.log(
            `📊 Found ${transformedDocuments.length} documents in database`,
            transformedDocuments.map(d => ({
              id: d.id,
              name: d.name,
              status: d.status,
            })),
          )

          // Only update if we actually got documents or if the count changed
          if (
            transformedDocuments.length > 0 ||
            projectDocuments.length === 0
          ) {
            setProjectDocuments(transformedDocuments)
            setCachedDocumentsData(transformedDocuments)
          } else {
            console.log(
              '⚠️ No documents found in database, keeping current state',
            )
          }
        } catch (error) {
          console.error('❌ Error refreshing document list:', error)
          // If refresh fails, try again after a longer delay
          setTimeout(async () => {
            try {
              console.log('🔄 Retrying document refresh after error...')
              const targetProjectId = project?.id || projectId
              if (targetProjectId) {
                const retryDocuments =
                  await documentService.getDocumentsByProject(targetProjectId)
                const retryTransformed: Document[] = (retryDocuments || []).map(
                  doc => ({
                    id: doc.id,
                    name: doc.name || 'Untitled Document',
                    type: doc.type || 'unknown',
                    size:
                      typeof doc.size === 'number'
                        ? doc.size
                        : parseInt(String(doc.size)) || 0,
                    status: doc.status || 'processing',
                    url: doc.url,
                    thumbnailUrl: doc.thumbnailUrl,
                    projectId: doc.projectId,
                    content: doc.content,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                  }),
                )
                console.log(
                  `📊 Retry found ${retryTransformed.length} documents`,
                )
                setProjectDocuments(retryTransformed)
                setCachedDocumentsData(retryTransformed)
              }
            } catch (retryError) {
              console.error('❌ Retry also failed:', retryError)
            }
          }, 3000) // 3 second delay for retry
        }
      }, 3000) // Increased delay to 3 seconds to ensure database consistency
    }
  }

  const forceRefreshDocuments = async () => {
    if (!project?.id) return

    console.log('🔄 Force refreshing documents from database...')
    setIsDocumentsLoading(true)

    try {
      // Clear cache first
      clearCache()

      // Fetch fresh data from database
      const documents = await documentService.getDocumentsByProject(project.id)
      const transformedDocuments: Document[] = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name || 'Untitled Document',
        type: doc.type || 'unknown',
        size:
          typeof doc.size === 'number'
            ? doc.size
            : parseInt(String(doc.size)) || 0,
        status: doc.status || 'processing',
        url: doc.url,
        thumbnailUrl: doc.thumbnailUrl,
        projectId: doc.projectId,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))

      console.log(
        `📊 Force refresh found ${transformedDocuments.length} documents`,
      )
      setProjectDocuments(transformedDocuments)
      setCachedDocumentsData(transformedDocuments)

      toast({
        title: 'Documents refreshed',
        description: `Found ${transformedDocuments.length} documents in project.`,
      })
    } catch (error) {
      console.error('❌ Error force refreshing documents:', error)
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh documents. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDocumentsLoading(false)
    }

    // toast({
    //   title: 'Document uploaded successfully',
    //   description: `${uploadedDocument.name} has been added to this project.`,
    // })
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Find the document to get its projectId (should be the current project)
      const documentToDelete = projectDocuments?.find(
        doc => doc.id === documentId,
      )

      if (!documentToDelete || !companyId || !project) {
        throw new Error('Document, company, or project information not found')
      }

      await documentService.deleteDocument(companyId, project.id, documentId)

      // Update the local state to remove the document
      const updatedDocuments =
        projectDocuments?.filter(doc => doc.id !== documentId) || []
      setProjectDocuments(updatedDocuments)

      // Immediately update the cache to reflect the deletion
      setCachedDocumentsData(updatedDocuments)

      toast({
        title: 'Document deleted',
        description: 'The document has been removed from this project.',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          'There was an error deleting the document. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelProcessing = async (documentId: string) => {
    try {
      // For now, we'll just update the status to failed to stop the processing indicators
      // In a real implementation, you'd want to actually cancel the background processing
      const documentToCancel = projectDocuments?.find(
        doc => doc.id === documentId,
      )

      if (!documentToCancel || !companyId || !project) {
        throw new Error('Document, company, or project information not found')
      }

      // Update document status to failed (cancelled)
      await documentService.updateDocument(companyId, project.id, documentId, {
        status: 'failed',
      })

      // Update local state
      setProjectDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId ? { ...doc, status: 'failed' as const } : doc,
        ),
      )

      toast({
        title: 'Processing cancelled',
        description: 'Document processing has been cancelled.',
      })
    } catch (error) {
      toast({
        title: 'Cancel failed',
        description:
          'There was an error cancelling the processing. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isProjectLoading) {
    // Show the complete project layout skeleton
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ProjectDetailsSkeleton />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center">
          <p>Project not found</p>
          <Button
            onClick={() =>
              navigate(routes.company.projects.list(companyId || ''))
            }
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

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
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(routes.company.projects.list(companyId || ''))
              }
              className="hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
                {project.name}
              </h1>
              <p className="text-slate-200 mt-2 text-sm md:text-base">
                {project.description}
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Created on {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto h-12 text-base"
                  >
                    Actions <ChevronDown className="h-5 w-5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuItem
                    onClick={() => setShowAITools(!showAITools)}
                    className="p-3 text-base"
                  >
                    {showAITools ? 'Hide AI Tools' : 'Show AI Tools'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEditDialogOpen(true)}
                    className="p-3 text-base"
                  >
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive p-3 text-base"
                  >
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAITools(!showAITools)}
                >
                  {showAITools ? 'Hide AI Tools' : 'Show AI Tools'}
                </Button>

                <Dialog
                  open={isEditDialogOpen}
                  onOpenChange={setIsEditDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    <ProjectForm
                      onSubmit={handleUpdateProject}
                      defaultValues={{
                        address: project.address || '',
                        streetNumber: project.streetNumber || '',
                        streetName: project.streetName || '',
                        suburb: project.suburb || '',
                        postcode: project.postcode || '',
                        name: project.name,
                        description: project.description,
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Project</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this project? This
                        action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteProject}
                      >
                        Delete Project
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {showAITools && (
            <div className="mb-2 md:mb-4">
              <AIActions
                documentId=""
                projectId={project.id}
                projectName={project.name}
                companyId={companyId || 'default-company'}
              />
            </div>
          )}

          {isMobile && (
            <>
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
                  <ProjectForm
                    onSubmit={handleUpdateProject}
                    defaultValues={{
                      address: project.address || '',
                      streetNumber: project.streetNumber || '',
                      streetName: project.streetName || '',
                      suburb: project.suburb || '',
                      postcode: project.postcode || '',
                      name: project.name,
                      description: project.description,
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this project? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteProject}>
                      Delete Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Documents
            </h2>

            <div className="flex gap-2">
              {/* <Button
                size="sm"
                variant="outline"
                onClick={forceRefreshDocuments}
                disabled={isDocumentsLoading}
                className="flex items-center"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isDocumentsLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button> */}

              <Dialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document to Project</DialogTitle>
                    <DialogDescription>
                      Upload a document to {project.name}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Pass the required props to FileUploader */}
                  <FileUploader
                    projectId={project.id}
                    companyId={companyId || 'default-company'}
                    onUploadComplete={handleUploadDocument}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Progressive loading for documents */}
          {isDocumentsLoading ? (
            <DocumentListSkeleton itemCount={3} />
          ) : projectDocuments.length > 0 ? (
            <DocumentList
              documents={projectDocuments}
              onDelete={handleDeleteDocument}
              onCancelProcessing={handleCancelProcessing}
              onRetryProcessing={async () => {
                // Force refresh of documents after retry by clearing cache
                clearCache()
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }}
              projectId={project.id}
              companyId={companyId || 'default-company'}
              projectName={project.name}
            />
          ) : (
            <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
              <p className="text-gray-400 mb-4">
                No documents in this project yet
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                Add Document
              </Button>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}
export default ProjectDetails
