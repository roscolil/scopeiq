import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProjectList } from '@/components/ProjectList'
import { PageHeaderSkeleton, ProjectListSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'
import { Project } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProjectForm } from '@/components/ProjectForm'
import { projectService } from '@/services/hybrid'

const Projects = () => {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { companyId } = useParams<{
    companyId: string
  }>()

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        const projectsData = await projectService.getAllProjectsWithDocuments()

        // Transform API data to our Project type
        const transformedProjects: Project[] = (projectsData || []).map(
          project => ({
            id: project.id,
            name: project.name || 'Untitled Project',
            description: project.description || '',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            documents: project.documents || [], // Include the documents array
            // Add any required fields from our Project type
            address: '',
            companyId: companyId || 'default-company',
            streetNumber: '',
            streetName: '',
            suburb: '',
            state: '',
            postcode: '',
          }),
        )

        setProjects(transformedProjects)
      } catch (error) {
        console.error('Projects page: Error loading projects:', error)
        // Fallback to empty array
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [companyId])

  const handleCreateProject = async (projectData: {
    address: string
    name: string
    description: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    state?: string
    postcode?: string
  }) => {
    console.log('Projects: Creating project with data:', projectData)

    try {
      // Create project using API
      const newProject = await projectService.createProject(companyId!, {
        name: projectData.name,
        description: projectData.description || '',
      })

      if (newProject) {
        console.log('Projects: Project created successfully:', newProject)

        // Transform and add to local state
        const transformedProject: Project = {
          id: newProject.id,
          name: newProject.name || 'Untitled Project',
          description: newProject.description || '',
          createdAt: newProject.createdAt,
          updatedAt: newProject.updatedAt,
          documents: [], // New projects start with no documents
          address: projectData.address,
          companyId: companyId || 'default-company',
          streetNumber: projectData.streetNumber || '',
          streetName: projectData.streetName || '',
          suburb: projectData.suburb || '',
          state: projectData.state || '',
          postcode: projectData.postcode || '',
        }

        setProjects(prev => [...prev, transformedProject])
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Projects: Error creating project:', error)
      throw error // Re-throw to let ProjectForm handle the error display
    }
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Projects for {companyId && `(${companyId})`}
          </h1>

          <div className="flex gap-2">
            {/* <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button> */}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <ProjectForm onSubmit={handleCreateProject} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <PageHeaderSkeleton />
            <ProjectListSkeleton itemCount={6} />
          </div>
        ) : (
          <ProjectList
            projects={projects}
            companyId={(companyId || 'default-company').toLowerCase()}
            onCreateProject={() => setIsDialogOpen(true)}
            onProjectDeleted={handleProjectDeleted}
          />
        )}
      </div>
    </Layout>
  )
}

export default Projects
