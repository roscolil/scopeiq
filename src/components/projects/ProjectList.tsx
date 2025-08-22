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
import { projectService } from '@/services/hybrid'

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
      await projectService.deleteProject(companyId, project.id)

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
      <div className="relative text-center py-24 px-8">
        <div className="max-w-2xl mx-auto">
          {/* Animated icon with gradient background */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-2xl rounded-full"></div>
            <div className="relative p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl inline-block">
              <Folder className="h-16 w-16 text-emerald-400 mx-auto" />
            </div>
          </div>

          {/* Gradient heading */}
          <h3 className="text-4xl font-bold mb-4 text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
            No projects yet
          </h3>

          <p className="text-lg text-gray-400 mb-12 leading-relaxed max-w-lg mx-auto">
            Create your first project to start organizing and analyzing your
            documents with AI-powered insights.
          </p>

          {onCreateProject && (
            <Button
              onClick={onCreateProject}
              size="lg"
              className="px-12 py-6 text-lg font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-105 border-0"
            >
              <span className="text-white">Create Your First Project</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map(project => (
        <Card
          key={project.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() =>
            navigate(
              routes.company.project.details(
                companyId.toLowerCase(),
                project.id,
              ),
            )
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Folder className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {/* <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-emerald-600">Active</span>
                  </div> */}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        onSelect={e => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-900">
                          Delete Project
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                          Are you sure you want to delete "{project.name}"? This
                          action will permanently delete the project and all its
                          documents. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-100 text-gray-900 hover:bg-gray-200">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteProject(project)}
                          disabled={deletingProjectId === project.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
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

          <CardContent className="pb-3">
            {project.description && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-600" />
                <span className="text-sm text-slate-700">
                  {project.documents?.length || 0} documents
                </span>
              </div>

              <div className="text-xs text-slate-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                navigate(
                  routes.company.project.details(
                    companyId.toLowerCase(),
                    project.id,
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
