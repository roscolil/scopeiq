import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProjectList } from '@/components/ProjectList'
import { PageHeaderSkeleton, ProjectListSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { companyId } = useParams<{
    companyId: string
  }>()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [expectedProjectCount, setExpectedProjectCount] = useState(3) // Default to 3

  // Load cached project count from localStorage
  useEffect(() => {
    if (companyId && typeof window !== 'undefined') {
      const cached = localStorage.getItem(`projectCount_${companyId}`)
      if (cached) {
        setExpectedProjectCount(parseInt(cached, 10))
      }
    }
  }, [companyId])

  // Check if we should auto-open the new project dialog
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsDialogOpen(true)
      // Clear the URL parameter
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])
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

        // Store the project count for future skeleton display
        const projectCount = Math.max(transformedProjects.length, 1) // At least 1 to show something
        setExpectedProjectCount(projectCount)

        // Cache the count in localStorage for next visit
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `projectCount_${companyId}`,
            projectCount.toString(),
          )
        }
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
    slug?: string
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
        slug: projectData.slug,
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
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid blue gradient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/95 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-blue-950/80 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-950/60 via-indigo-950/80 to-blue-950/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/15 to-indigo-400/25"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-blue-600/20"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-indigo-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-blue-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-indigo-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-indigo-500/6 to-blue-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-blue-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
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
            <ProjectListSkeleton itemCount={expectedProjectCount} />
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
    </>
  )
}

export default Projects
