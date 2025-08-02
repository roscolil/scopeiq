import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
import { Spinner } from '@/components/Spinner'
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
  const [loading, setLoading] = React.useState(true)
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
        setLoading(true)

        // Set company name (using companyId as name for now)
        setCompanyName(companyId)

        if (projectId) {
          // Single project view - load documents for specific project
          console.log('Documents page resolving project slug/ID:', projectId)
          const project = await projectService.resolveProject(projectId)
          console.log('Documents page resolved project data:', project)

          if (project) {
            console.log('Documents page setting project name to:', project.name)
            setProjectName(project.name)
            setResolvedProject(project)

            // Fetch documents for this project using the resolved project ID
            const projectDocuments =
              await documentService.getDocumentsByProject(project.id)
            setDocuments(projectDocuments)
          } else {
            console.log(
              'Documents page: No project found for slug/ID:',
              projectId,
            )
            setProjectName('Unknown Project')
            setDocuments([])
          }
        } else {
          // All projects view - load all projects with their documents
          console.log('Documents page: Loading all projects with documents...')
          const allProjectsWithDocs =
            await projectService.getAllProjectsWithDocuments()
          console.log(
            'Documents page: Loaded projects with documents:',
            allProjectsWithDocs,
          )
          setProjectsWithDocuments(allProjectsWithDocs)

          // Also set a flat list of all documents for the general documents tab
          const allDocuments = await documentService.getAllDocuments()
          console.log(
            'Documents page: All documents in database:',
            allDocuments,
          )
          setDocuments(allDocuments)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: 'Error loading data',
          description: 'Failed to load documents.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId, companyId, toast])

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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner
            size="lg"
            text={
              projectId
                ? 'Loading project documents...'
                : 'Loading all documents...'
            }
          />
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

          {documents.length > 0 ? (
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
          <h1 className="text-2xl font-bold tracking-tight">All Documents</h1>
        </div>

        <Tabs defaultValue="by-project" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="by-project">By Project</TabsTrigger>
            <TabsTrigger value="all-documents">All Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="by-project">
            {projectsWithDocuments.length > 0 ? (
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
                <p className="text-muted-foreground mb-4">No projects found</p>
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
            {documents.length > 0 ? (
              <DocumentList
                documents={documents}
                projectId=""
                companyId={companyId || 'default-company'}
                projectName=""
                onDelete={handleDeleteDocument}
              />
            ) : (
              <div className="text-center p-8 border rounded-lg bg-secondary/20">
                <p className="text-muted-foreground mb-4">No documents found</p>
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
  )
}

export default Documents
