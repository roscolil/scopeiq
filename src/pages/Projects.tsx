import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProjectList } from '@/components/ProjectList'
import { Spinner } from '@/components/Spinner'
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
import { fetchUserAttributes } from 'aws-amplify/auth'
import { projectService } from '@/services/hybrid'

const Projects = () => {
  console.log('Projects component: Rendering')

  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [attrs, setAttrs] = useState<Record<string, string>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { companyId } = useParams<{
    companyId: string
  }>()

  console.log('Projects component: companyId from params:', companyId)

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      console.log(
        'Projects page: Starting to load projects for companyId:',
        companyId,
      )
      try {
        setLoading(true)
        const projectsData = await projectService.getAllProjectsWithDocuments()
        console.log(
          'Projects page: Loaded projects with documents from API:',
          projectsData,
        )

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

        console.log('Projects page: Transformed projects:', transformedProjects)
        setProjects(transformedProjects)
      } catch (error) {
        console.error('Projects page: Error loading projects:', error)
        // Fallback to empty array
        setProjects([])
      } finally {
        console.log('Projects page: Finished loading, setting loading to false')
        setLoading(false)
      }
    }

    console.log('Projects page: useEffect triggered with companyId:', companyId)
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

        console.log('Projects: Project added to state and dialog closed')
      }
    } catch (error) {
      console.error('Projects: Error creating project:', error)
      throw error // Re-throw to let ProjectForm handle the error display
    }
  }

  const handleProjectDeleted = (projectId: string) => {
    console.log('Projects: Removing deleted project from state:', projectId)
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
          <div className="flex justify-center items-center min-h-[300px]">
            <Spinner size="lg" text="Loading projects..." />
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
