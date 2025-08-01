import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Project } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileText, Folder, MoreVertical, Trash2 } from 'lucide-react'
import { routes } from '@/utils/navigation'
import { useToast } from '@/hooks/use-toast'
import { projectService } from '@/services/s3-api'

interface ProjectListProps {
  projects: Project[]
  companyId: string
  onCreateProject?: () => void
  onProjectDeleted?: (projectId: string) => void
}

export const ProjectList = ({
  projects,
  companyId,
  onCreateProject,
  onProjectDeleted,
}: ProjectListProps) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  )

  const handleDeleteProject = async (project: Project) => {
    try {
      setDeletingProjectId(project.id)
      await projectService.deleteProject(project.id)

      if (onProjectDeleted) {
        onProjectDeleted(project.id)
      }

      toast({
        title: 'Project deleted',
        description: `"${project.name}" has been permanently deleted.`,
      })
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the project. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeletingProjectId(null)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-secondary/20">
        <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No projects yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first project to get started
        </p>
        <Button
          onClick={() => {
            if (onCreateProject) {
              onCreateProject()
            } else {
              navigate(routes.company.projects.list(companyId))
            }
          }}
        >
          Create Project
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(project => (
        <Card key={project.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg font-medium">
                  {project.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={e => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{project.name}"? This
                          action will permanently delete the project and all its
                          documents. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteProject(project)}
                          disabled={deletingProjectId === project.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingProjectId === project.id
                            ? 'Deleting...'
                            : 'Delete Project'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <FileText className="h-4 w-4 mr-1" />
              <span>
                {project.documents?.length || 0}{' '}
                {project.documents?.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Created on {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                navigate(
                  routes.company.project.details(
                    companyId,
                    project.id,
                    project.name,
                  ),
                )
              }
            >
              View Project
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
