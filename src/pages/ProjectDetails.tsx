import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
import {
  PageHeaderSkeleton,
  DocumentListSkeleton,
  AIActionsSkeleton,
} from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Plus, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ProjectForm } from '@/components/ProjectForm'
import { Project, Document } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { AIActions } from '@/components/AIActions'
import { useIsMobile } from '@/hooks/use-mobile'
import { ProjectSelector } from '@/components/ProjectSelector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routes } from '@/utils/navigation'
import { projectService, documentService } from '@/services/hybrid'

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

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !companyId) return

      try {
        setIsProjectLoading(true)
        setIsDocumentsLoading(true)

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
          setProject(transformedProject)
          setIsProjectLoading(false) // Project loaded first

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
          setProjectDocuments(transformedDocuments)
          setIsDocumentsLoading(false) // Documents loaded second
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
  }, [projectId, companyId, toast])

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

        // Only update if there are actual status changes to avoid unnecessary re-renders
        setProjectDocuments(prev => {
          const hasChanges = prev.some((prevDoc, index) => {
            const newDoc = transformedDocuments.find(d => d.id === prevDoc.id)
            return newDoc && newDoc.status !== prevDoc.status
          })
          return hasChanges ? transformedDocuments : prev
        })
      } catch (error) {
        console.error('Error polling document statuses:', error)
      }
    }

    // Determine polling interval based on document statuses
    const hasProcessingDocs = projectDocuments.some(
      doc => doc.status === 'processing',
    )
    const hasFailedDocs = projectDocuments.some(doc => doc.status === 'failed')

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
  }, [project?.id, projectDocuments])

  const handleUpdateProject = async (data: {
    address: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    postcode?: string
    name: string
    description: string
  }) => {
    if (!project) return

    try {
      const updatedProject = await projectService.updateProject(
        companyId!,
        project.id,
        {
          name: data.name,
          description: data.description,
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
    // Add the uploaded document to the project's document list
    setProjectDocuments(prev => [...prev, uploadedDocument])

    // Close the dialog
    setIsUploadDialogOpen(false)

    toast({
      title: 'Document uploaded successfully',
      description: `${uploadedDocument.name} has been added to this project.`,
    })
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Find the document to get its projectId (should be the current project)
      const documentToDelete = projectDocuments.find(
        doc => doc.id === documentId,
      )

      if (!documentToDelete || !companyId || !project) {
        throw new Error('Document, company, or project information not found')
      }

      await documentService.deleteDocument(companyId, project.id, documentId)

      // Update the local state to remove the document
      setProjectDocuments(prev => prev.filter(doc => doc.id !== documentId))

      toast({
        title: 'Document deleted',
        description: 'The document has been removed from this project.',
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Delete failed',
        description:
          'There was an error deleting the document. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isProjectLoading) {
    // Show only the essential page structure with project header skeleton
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageHeaderSkeleton showBackButton={true} showActions={2} />
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
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(routes.company.projects.list(companyId || ''))
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {project.description}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Created on {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>

          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                >
                  Actions <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAITools(!showAITools)}>
                  {showAITools ? 'Hide AI Tools' : 'Show AI Tools'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
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
            </div>
          )}
        </div>

        {showAITools && (
          <div className="mb-2 md:mb-4">
            <AIActions
              documentId=""
              projectId={project.id}
              companyId={companyId || 'default-company'}
            />
          </div>
        )}

        {isMobile && (
          <>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
          <h2 className="text-lg md:text-xl font-semibold">Documents</h2>

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

        {/* Progressive loading for documents */}
        {isDocumentsLoading ? (
          <DocumentListSkeleton itemCount={3} />
        ) : projectDocuments.length > 0 ? (
          <DocumentList
            documents={projectDocuments}
            onDelete={handleDeleteDocument}
            projectId={project.id}
            companyId={companyId || 'default-company'}
            projectName={project.name}
          />
        ) : (
          <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
            <p className="text-muted-foreground mb-4">
              No documents in this project yet
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              Add Document
            </Button>
          </div>
        )}
      </div>
    </Layout>
  )
}
export default ProjectDetails
