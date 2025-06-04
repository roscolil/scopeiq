import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProjectList } from '@/components/ProjectList'
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

const Projects = () => {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [attrs, setAttrs] = useState<Record<string, string>>({})
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'project-1',
      name: 'Construction Site A',
      description:
        'Main construction project for Site A including all blueprints and specifications.',
      createdAt: new Date(2025, 3, 8).toISOString(),
      documentIds: ['doc-1', 'doc-3'],
      address: '123 Main St, Springfield',
      companyId: 'company-1',
      streetNumber: '123',
      streetName: 'Main St',
      suburb: 'Springfield',
      state: 'VIC',
      postcode: '3000',
    },
    {
      id: 'project-2',
      name: 'Renovation Plan B',
      description: 'Renovation project for existing building B.',
      createdAt: new Date(2025, 3, 5).toISOString(),
      documentIds: ['doc-2'],
      address: '456 Side Rd, Shelbyville',
      companyId: 'company-1',
      streetNumber: '456',
      streetName: 'Side Rd',
      suburb: 'Shelbyville',
      state: 'NSW',
      postcode: '2000',
    },
    {
      id: 'project-3',
      name: 'Maintenance Schedule',
      description:
        'Regular maintenance schedule and documentation for all sites.',
      createdAt: new Date(2025, 3, 1).toISOString(),
      documentIds: ['doc-4'],
      address: '789 High St, Capital City',
      companyId: 'company-1',
      streetNumber: '789',
      streetName: 'High St',
      suburb: 'Capital City',
      state: 'QLD',
      postcode: '4000',
    },
  ])

  const handleCreateProject = (projectData: {
    address: string
    name: string
    description: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    state?: string
    postcode?: string
  }) => {
    const newProject: Project = {
      ...projectData,
      id: `project-${projects.length + 1}`,
      createdAt: new Date().toISOString(),
      documentIds: [],
      companyId: companyId, // or use companyId if dynamic
      streetNumber: projectData.streetNumber || '',
      streetName: projectData.streetName || '',
      suburb: projectData.suburb || '',
      state: projectData.state || '',
      postcode: projectData.postcode || '',
    }

    setProjects([...projects, newProject])
    setIsDialogOpen(false)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>

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

        <ProjectList projects={projects} companyId={companyId.toLowerCase()} />
      </div>
    </Layout>
  )
}

export default Projects
