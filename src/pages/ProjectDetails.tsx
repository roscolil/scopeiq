import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
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

// Sample project for when there's no existing project data
const createDefaultProject = (projectId: string): Project => ({
  id: projectId,
  name: 'New Project',
  description: 'Project description',
  createdAt: new Date().toISOString(),
  documentIds: [],
  companyId: 'company-1',
  address: '',
  streetNumber: '',
  streetName: '',
  suburb: '',
  state: '',
  postcode: '',
})

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [project, setProject] = useState<Project | null>(null)
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [showAITools, setShowAITools] = useState(true)
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()

  useEffect(() => {
    // Create or retrieve project
    if (projectId) {
      // Check localStorage for existing project
      const storedProjects = localStorage.getItem('projects')
      let currentProject: Project | null = null

      if (storedProjects) {
        try {
          const projects = JSON.parse(storedProjects) as Project[]
          currentProject = projects.find(p => p.id === projectId) || null
        } catch (error) {
          console.error('Error parsing stored projects:', error)
        }
      }

      // If no project exists, create a default one
      if (!currentProject) {
        currentProject = createDefaultProject(projectId)

        // Save the new project
        const projects = storedProjects
          ? (JSON.parse(storedProjects) as Project[])
          : []
        projects.push(currentProject)
        localStorage.setItem('projects', JSON.stringify(projects))
      }

      setProject(currentProject)

      // Load uploaded documents for this project
      const storedDocuments = localStorage.getItem('uploadedDocuments')
      let uploadedDocs: Document[] = []

      if (storedDocuments) {
        try {
          const allUploadedDocs = JSON.parse(storedDocuments) as Document[]
          // Filter for documents that belong to this project
          uploadedDocs = allUploadedDocs.filter(
            doc => doc.projectId === projectId,
          )
        } catch (error) {
          console.error('Error parsing stored documents:', error)
        }
      }

      // Set documents
      setProjectDocuments(uploadedDocs)
    }
  }, [projectId])

  const handleUpdateProject = (data: {
    address: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    postcode?: string
    name: string
    description: string
  }) => {
    if (!project) return

    const updatedProject = {
      ...project,
      ...data,
    }

    setProject(updatedProject)
    setIsEditDialogOpen(false)

    // Update in localStorage
    const storedProjects = localStorage.getItem('projects')
    if (storedProjects) {
      try {
        const projects = JSON.parse(storedProjects) as Project[]
        const updatedProjects = projects.map(p =>
          p.id === project.id ? updatedProject : p,
        )
        localStorage.setItem('projects', JSON.stringify(updatedProjects))
      } catch (error) {
        console.error('Error updating stored projects:', error)
      }
    }

    toast({
      title: 'Project updated',
      description: 'Your project has been updated successfully.',
    })
  }

  const handleDeleteProject = () => {
    if (!project) return

    // Remove project from localStorage
    const storedProjects = localStorage.getItem('projects')
    if (storedProjects) {
      try {
        const projects = JSON.parse(storedProjects) as Project[]
        const filteredProjects = projects.filter(p => p.id !== project.id)
        localStorage.setItem('projects', JSON.stringify(filteredProjects))
      } catch (error) {
        console.error('Error deleting project from storage:', error)
      }
    }

    // Remove all project documents from localStorage
    const storedDocuments = localStorage.getItem('uploadedDocuments')
    if (storedDocuments) {
      try {
        const documents = JSON.parse(storedDocuments) as Document[]
        const remainingDocs = documents.filter(
          doc => doc.projectId !== project.id,
        )
        localStorage.setItem('uploadedDocuments', JSON.stringify(remainingDocs))
      } catch (error) {
        console.error('Error removing project documents:', error)
      }
    }

    toast({
      title: 'Project deleted',
      description: 'Your project has been deleted successfully.',
    })

    navigate('/projects')
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

  const handleDeleteDocument = (documentId: string) => {
    // Update state to remove the document
    setProjectDocuments(prev => prev.filter(doc => doc.id !== documentId))

    // Update localStorage
    const storedDocuments = localStorage.getItem('uploadedDocuments')
    if (storedDocuments) {
      try {
        const documents = JSON.parse(storedDocuments) as Document[]
        const updatedDocuments = documents.filter(doc => doc.id !== documentId)
        localStorage.setItem(
          'uploadedDocuments',
          JSON.stringify(updatedDocuments),
        )
      } catch (error) {
        console.error('Error updating stored documents:', error)
      }
    }

    toast({
      title: 'Document deleted',
      description: 'The document has been removed from this project.',
    })
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center">
          <p>Project not found</p>
          <Button
            onClick={() => navigate(`/${companyId.toLowerCase()}/projects`)}
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
            onClick={() => navigate(`/${companyId}/projects`)}
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
            <AIActions documentId="" projectId={project.id} />
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

        {projectDocuments.length > 0 ? (
          <DocumentList
            documents={projectDocuments}
            onDelete={handleDeleteDocument}
            projectId={project.id}
            companyId={companyId || 'default-company'}
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
