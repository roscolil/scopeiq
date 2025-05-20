import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const Projects = () => {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'project-1',
      name: 'Construction Site A',
      description:
        'Main construction project for Site A including all blueprints and specifications.',
      createdAt: new Date(2025, 3, 8).toISOString(),
      documentIds: ['doc-1', 'doc-3'],
    },
    {
      id: 'project-2',
      name: 'Renovation Plan B',
      description: 'Renovation project for existing building B.',
      createdAt: new Date(2025, 3, 5).toISOString(),
      documentIds: ['doc-2'],
    },
    {
      id: 'project-3',
      name: 'Maintenance Schedule',
      description:
        'Regular maintenance schedule and documentation for all sites.',
      createdAt: new Date(2025, 3, 1).toISOString(),
      documentIds: ['doc-4'],
    },
  ])

  const handleCreateProject = (projectData: {
    address: string
    name: string
    description: string
  }) => {
    const newProject: Project = {
      ...projectData,
      id: `project-${projects.length + 1}`,
      createdAt: new Date().toISOString(),
      documentIds: [],
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

        <ProjectList projects={projects} />
      </div>
    </Layout>
  )
}

export default Projects
