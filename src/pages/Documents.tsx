import React, { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DocumentList } from '@/components/documents/DocumentList'
import { FileUploader } from '@/components/upload/FileUploader'
import {
  DocumentListSkeleton,
  PageHeaderSkeleton,
  ProjectsWithDocumentsSkeleton,
} from '@/components/shared/skeletons'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Filter, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Document } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/utils/navigation'
import { documentService, projectService } from '@/services/hybrid'

const Documents = () => {
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId?: string
  }>()
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [projectsWithDocuments, setProjectsWithDocuments] = React.useState<
    Array<{
      id: string
      name: string
      description?: string
      createdAt: string
      updatedAt?: string
      companyId: string
      documents: Document[]
    }>
  >([])
  const [projectName, setProjectName] = React.useState<string>('')
  const [companyName, setCompanyName] = React.useState<string>('')
  const [isProjectLoading, setIsProjectLoading] = React.useState(true)
  const [isDocumentsLoading, setIsDocumentsLoading] = React.useState(true)
  const [expectedDocumentCount, setExpectedDocumentCount] = React.useState(5) // Default for "All Documents" tab
  const [expectedProjectCount, setExpectedProjectCount] = React.useState(2) // Default for "By Project" tab
  const [resolvedProject, setResolvedProject] = React.useState<{
    id: string
    name: string
  } | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  // Caching utilities for documents
  const getCachedDocuments = useCallback(() => {
    if (!companyId || typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(`documents_${companyId}`)
      const timestamp = localStorage.getItem(`documents_timestamp_${companyId}`)
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        // Cache valid for 5 minutes
        if (age < 5 * 60 * 1000) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.warn('Error reading cached documents:', error)
    }
    return null
  }, [companyId])

  const setCachedDocuments = useCallback(
    (documentsData: Document[]) => {
      if (!companyId || typeof window === 'undefined') return
      try {
        localStorage.setItem(
          `documents_${companyId}`,
          JSON.stringify(documentsData),
        )
        localStorage.setItem(
          `documents_timestamp_${companyId}`,
          Date.now().toString(),
        )
      } catch (error) {
        console.warn('Error caching documents:', error)
      }
    },
    [companyId],
  )

  // Caching utilities for projects with documents
  const getCachedProjectsWithDocs = useCallback(() => {
    if (!companyId || typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(`projectsWithDocs_${companyId}`)
      const timestamp = localStorage.getItem(
        `projectsWithDocs_timestamp_${companyId}`,
      )
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        // Cache valid for 5 minutes
        if (age < 5 * 60 * 1000) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.warn('Error reading cached projects with docs:', error)
    }
    return null
  }, [companyId])

  const setCachedProjectsWithDocs = useCallback(
    (
      projectsData: Array<{
        id: string
        name: string
        description?: string
        createdAt: string
        updatedAt?: string
        companyId: string
        documents: Document[]
      }>,
    ) => {
      if (!companyId || typeof window === 'undefined') return
      try {
        localStorage.setItem(
          `projectsWithDocs_${companyId}`,
          JSON.stringify(projectsData),
        )
        localStorage.setItem(
          `projectsWithDocs_timestamp_${companyId}`,
          Date.now().toString(),
        )
      } catch (error) {
        console.warn('Error caching projects with docs:', error)
      }
    },
    [companyId],
  )

  // Load cached data immediately on mount
  React.useEffect(() => {
    if (companyId) {
      const cachedDocs = getCachedDocuments()
      const cachedProjects = getCachedProjectsWithDocs()

      if (cachedDocs) {
        setDocuments(cachedDocs)
        setIsDocumentsLoading(false)
        setExpectedDocumentCount(Math.max(cachedDocs.length, 1))
      }

      if (cachedProjects) {
        setProjectsWithDocuments(cachedProjects)
        setIsProjectLoading(false)
        setExpectedProjectCount(Math.max(cachedProjects.length, 1))
      }
    }
  }, [companyId, getCachedDocuments, getCachedProjectsWithDocs])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)

  // Load cached counts from localStorage
  React.useEffect(() => {
    if (companyId && typeof window !== 'undefined') {
      const cachedDocuments = localStorage.getItem(`documentCount_${companyId}`)
      const cachedProjects = localStorage.getItem(
        `projectWithDocsCount_${companyId}`,
      )

      if (cachedDocuments) {
        setExpectedDocumentCount(parseInt(cachedDocuments, 10))
      }
      if (cachedProjects) {
        setExpectedProjectCount(parseInt(cachedProjects, 10))
      }
    }
  }, [companyId])

  React.useEffect(() => {
    const loadData = async () => {
      if (!companyId) return

      try {
        // Check if we need to show loading state
        const cachedDocs = getCachedDocuments()
        const cachedProjects = getCachedProjectsWithDocs()

        if (!cachedDocs) {
          setIsDocumentsLoading(true)
        }
        if (!cachedProjects) {
          setIsProjectLoading(true)
        }

        // Set company name (using companyId as name for now)
        setCompanyName(companyId)

        if (projectId) {
          // Single project view - load documents for specific project
          console.log('Documents page resolving project slug/ID:', projectId)
          const project = await projectService.resolveProject(projectId)
          console.log('Documents page resolved project data:', project)

          if (project) {
            setProjectName(project.name)
            setResolvedProject(project)
            setIsProjectLoading(false) // Project loaded first

            // Fetch documents for this project using the resolved project ID
            const projectDocuments =
              await documentService.getDocumentsByProject(project.id)
            setDocuments(projectDocuments)
            setIsDocumentsLoading(false) // Documents loaded second
          } else {
            setProjectName('Unknown Project')
            setDocuments([])
            setIsProjectLoading(false)
            setIsDocumentsLoading(false)
          }
        } else {
          // All projects view - load all projects with their documents
          const allProjectsWithDocs =
            await projectService.getAllProjectsWithDocuments()
          setProjectsWithDocuments(allProjectsWithDocs)
          setCachedProjectsWithDocs(allProjectsWithDocs) // Cache the fresh data
          setIsProjectLoading(false) // Projects loaded first

          // Cache the project count for future skeleton display
          const projectCount = Math.max(allProjectsWithDocs.length, 1)
          setExpectedProjectCount(projectCount)

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `projectWithDocsCount_${companyId}`,
              projectCount.toString(),
            )
          }

          // Also set a flat list of all documents for the general documents tab
          const allDocuments = await documentService.getAllDocuments()
          setDocuments(allDocuments)
          setCachedDocuments(allDocuments) // Cache the fresh data
          setIsDocumentsLoading(false) // Documents loaded second

          // Cache the document count for future skeleton display
          const documentCount = Math.max(allDocuments.length, 1)
          setExpectedDocumentCount(documentCount)

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `documentCount_${companyId}`,
              documentCount.toString(),
            )
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: 'Error loading data',
          description: 'Failed to load documents.',
          variant: 'destructive',
        })
        setIsProjectLoading(false)
        setIsDocumentsLoading(false)
      }
    }

    loadData()
  }, [
    projectId,
    companyId,
    toast,
    getCachedDocuments,
    getCachedProjectsWithDocs,
    setCachedDocuments,
    setCachedProjectsWithDocs,
  ])

  // Add live document status polling
  React.useEffect(() => {
    if (!companyId) return

    const pollDocumentStatuses = async () => {
      try {
        if (projectId && resolvedProject) {
          // Single project view - poll documents for specific project
          const projectDocuments = await documentService.getDocumentsByProject(
            resolvedProject.id,
          )

          // Only update if there are actual status changes
          setDocuments(prev => {
            const hasChanges = prev.some((prevDoc, index) => {
              const newDoc = projectDocuments.find(d => d.id === prevDoc.id)
              return newDoc && newDoc.status !== prevDoc.status
            })
            return hasChanges ? projectDocuments : prev
          })
        } else {
          // All projects view - poll all projects with their documents
          const allProjectsWithDocs =
            await projectService.getAllProjectsWithDocuments()

          // Only update if there are actual status changes
          setProjectsWithDocuments(prev => {
            const hasChanges = prev.some(prevProject => {
              const newProject = allProjectsWithDocs.find(
                p => p.id === prevProject.id,
              )
              if (!newProject) return false

              return prevProject.documents.some(prevDoc => {
                const newDoc = newProject.documents.find(
                  d => d.id === prevDoc.id,
                )
                return newDoc && newDoc.status !== prevDoc.status
              })
            })
            return hasChanges ? allProjectsWithDocs : prev
          })

          // Also update the flat list of all documents
          const allDocuments = await documentService.getAllDocuments()
          setDocuments(prev => {
            const hasChanges = prev.some((prevDoc, index) => {
              const newDoc = allDocuments.find(d => d.id === prevDoc.id)
              return newDoc && newDoc.status !== prevDoc.status
            })
            return hasChanges ? allDocuments : prev
          })
        }
      } catch (error) {
        console.error('Error polling document statuses:', error)
      }
    }

    // Determine polling interval based on document statuses
    const allDocs = projectId
      ? documents
      : documents.concat(projectsWithDocuments.flatMap(p => p.documents))
    const hasProcessingDocs = allDocs.some(doc => doc.status === 'processing')
    const hasFailedDocs = allDocs.some(doc => doc.status === 'failed')

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
  }, [companyId, projectId, resolvedProject, documents, projectsWithDocuments])

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Find the document to get its projectId
      const documentToDelete =
        documents.find(doc => doc.id === documentId) ||
        projectsWithDocuments
          .flatMap(p => p.documents)
          .find(doc => doc.id === documentId)

      if (!documentToDelete || !companyId) {
        throw new Error('Document or company information not found')
      }

      // Delete from API using hybrid service
      await documentService.deleteDocument(
        companyId,
        documentToDelete.projectId,
        documentId,
      )

      // Update state to remove the document
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))

      // Show success toast
      toast({
        title: 'Document deleted',
        description: 'The document has been removed from this project.',
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      // Show error toast
      toast({
        title: 'Error deleting document',
        description: 'There was a problem removing the document.',
        variant: 'destructive',
      })
    }
  }

  if (isProjectLoading) {
    // return (
    //   <Layout>
    //     <div className="space-y-6">
    //       <PageHeaderSkeleton />
    //     </div>
    //   </Layout>
    // )
  }

  // Single project view
  if (projectId) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(
                  routes.company.project.details(
                    companyId || '',
                    projectId || '',
                    projectName,
                  ),
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Project
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {projectName ? `${projectName} Documents` : 'Project Documents'}
            </h1>

            <div className="flex gap-2">
              <Dialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>
                  <FileUploader
                    projectId={resolvedProject?.id || projectId}
                    companyId={companyId || 'default-company'}
                    onUploadComplete={doc => {
                      // Add the uploaded document to the current list
                      setDocuments(prev => [...prev, doc])

                      // Close the dialog
                      setIsUploadDialogOpen(false)

                      // Show success toast
                      // toast({
                      //   title: 'Document uploaded',
                      //   description: `${doc.name} has been added to this project.`,
                      // })
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Progressive loading for documents */}
          {isDocumentsLoading ? (
            <DocumentListSkeleton itemCount={3} />
          ) : documents.length > 0 ? (
            <DocumentList
              documents={documents}
              projectId={resolvedProject?.id || projectId}
              companyId={companyId || 'default-company'}
              projectName={projectName}
              onDelete={handleDeleteDocument}
            />
          ) : (
            <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
              <p className="text-gray-400 mb-4">
                No documents in this project yet
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                Upload Document
              </Button>
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // All projects view
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
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  routes.company.projects.list(companyId || 'default-company'),
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Projects
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
              All Documents
            </h1>
          </div>

          <Tabs defaultValue="by-project" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="by-project">By Project</TabsTrigger>
              <TabsTrigger value="all-documents">All Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="by-project">
              {/* Progressive loading for projects */}
              {isDocumentsLoading ? (
                <ProjectsWithDocumentsSkeleton
                  itemCount={expectedProjectCount}
                />
              ) : projectsWithDocuments.length > 0 ? (
                <div className="space-y-6">
                  {projectsWithDocuments.map(project => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-gray-400">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {project.documents.length} document
                            {project.documents.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              routes.company.project.details(
                                companyId || 'default-company',
                                project.id,
                                project.name,
                              ),
                            )
                          }
                        >
                          View Project
                        </Button>
                      </div>

                      {project.documents.length > 0 ? (
                        <DocumentList
                          documents={project.documents}
                          projectId={project.id}
                          companyId={companyId || 'default-company'}
                          projectName={project.name}
                          onDelete={handleDeleteDocument}
                        />
                      ) : (
                        <div className="text-center p-4 border rounded bg-secondary/10">
                          <p className="text-sm text-gray-400">
                            No documents in this project yet
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border rounded-lg bg-secondary/20">
                  <p className="text-gray-400 mb-4">No projects found</p>
                  <Button
                    onClick={() =>
                      navigate(
                        routes.company.projects.list(
                          companyId || 'default-company',
                        ),
                      )
                    }
                  >
                    Create Project
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-documents">
              {/* Progressive loading for all documents */}
              {isDocumentsLoading ? (
                <DocumentListSkeleton itemCount={expectedDocumentCount} />
              ) : documents.length > 0 ? (
                <DocumentList
                  documents={documents}
                  projectId=""
                  companyId={companyId || 'default-company'}
                  projectName=""
                  onDelete={handleDeleteDocument}
                />
              ) : (
                <div className="text-center p-8 border rounded-lg bg-secondary/20">
                  <p className="text-gray-400 mb-4">No documents found</p>
                  <Button
                    onClick={() =>
                      navigate(
                        routes.company.projects.list(
                          companyId || 'default-company',
                        ),
                      )
                    }
                  >
                    Create a Project and Upload Documents
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  )
}

export default Documents
