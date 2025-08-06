import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
import {
  DocumentListSkeleton,
  PageHeaderSkeleton,
} from '@/components/skeletons'
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
  const [resolvedProject, setResolvedProject] = React.useState<{
    id: string
    name: string
  } | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      if (!companyId) return

      try {
        setIsProjectLoading(true)
        setIsDocumentsLoading(true)

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
          setIsProjectLoading(false) // Projects loaded first

          // Also set a flat list of all documents for the general documents tab
          const allDocuments = await documentService.getAllDocuments()
          setDocuments(allDocuments)
          setIsDocumentsLoading(false) // Documents loaded second
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
  }, [projectId, companyId, toast])

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
    return (
      <Layout>
        <div className="space-y-6">
          <PageHeaderSkeleton />
        </div>
      </Layout>
    )
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
                      toast({
                        title: 'Document uploaded',
                        description: `${doc.name} has been added to this project.`,
                      })
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
              <p className="text-muted-foreground mb-4">
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
        {/* Enhanced Stripe-inspired gradient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100/80 to-purple-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/70 via-blue-100/50 to-indigo-100/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/60 via-indigo-100/30 to-purple-200/50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/50 via-transparent to-blue-200/40"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-primary/15 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-accent/15 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-violet-200/25 to-cyan-200/25 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-sky-200/20 to-indigo-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-purple-200/25 to-blue-200/20 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
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
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text">
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
                <DocumentListSkeleton itemCount={3} />
              ) : projectsWithDocuments.length > 0 ? (
                <div className="space-y-6">
                  {projectsWithDocuments.map(project => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
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
                          <p className="text-sm text-muted-foreground">
                            No documents in this project yet
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border rounded-lg bg-secondary/20">
                  <p className="text-muted-foreground mb-4">
                    No projects found
                  </p>
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
                <DocumentListSkeleton itemCount={5} />
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
                  <p className="text-muted-foreground mb-4">
                    No documents found
                  </p>
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
