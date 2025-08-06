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
      <div className="relative min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mb-16">
        {/* Dramatic gradient background with more intensity */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100/80 to-purple-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/60 via-blue-100/40 to-indigo-100/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/60 via-indigo-100/30 to-purple-200/50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/50 via-transparent to-blue-200/40"></div>

        {/* Enhanced floating gradient orbs */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-gradient-to-br from-primary/15 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-gradient-to-tr from-accent/15 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-gradient-to-l from-cyan-200/40 to-indigo-200/40 rounded-full blur-xl"></div>

        <div className="relative text-center py-24 px-8">
          <div className="max-w-2xl mx-auto">
            {/* Animated icon with gradient background */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl rounded-full"></div>
              <div className="relative p-8 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-2xl inline-block">
                <Folder className="h-16 w-16 text-transparent bg-gradient-to-br from-primary via-blue-600 to-accent bg-clip-text mx-auto" />
              </div>
            </div>

            {/* Gradient heading */}
            <h3 className="text-4xl font-bold mb-4 text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text">
              No projects yet
            </h3>

            <p className="text-lg text-slate-700 mb-12 leading-relaxed max-w-lg mx-auto">
              Create your first project to start organizing and analyzing your
              documents with AI-powered insights.
            </p>

            {onCreateProject && (
              <Button
                onClick={onCreateProject}
                size="lg"
                className="px-12 py-6 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-accent hover:shadow-2xl hover:shadow-primary/25 transition-all duration-500 hover:scale-105 border-0"
              >
                <span className="text-white">Create Your First Project</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mb-16">
      {/* Enhanced Stripe-inspired gradient background with more intensity */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100/70 to-purple-100/80"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/70 via-blue-100/50 to-indigo-100/70"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-200/50 via-transparent to-purple-200/40"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-blue-200/50"></div>

      {/* Multiple floating gradient orbs for depth */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-primary/20 to-accent/15 rounded-full blur-3xl"></div>
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-blue-200/25 to-purple-200/25 rounded-full blur-2xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-gradient-to-l from-cyan-200/30 to-indigo-200/30 rounded-full blur-xl"></div>
      <div className="absolute top-2/3 left-10 w-48 h-48 bg-gradient-to-br from-violet-200/20 to-blue-200/25 rounded-full blur-2xl"></div>
      <div className="absolute top-10 left-1/2 w-56 h-56 bg-gradient-to-tr from-sky-200/20 to-purple-200/20 rounded-full blur-xl"></div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
        {projects.map(project => (
          <Card
            key={project.id}
            className="group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 border-0 bg-white/80 backdrop-blur-sm"
            onClick={() =>
              navigate(
                routes.company.project.details(
                  companyId.toLowerCase(),
                  project.id,
                ),
              )
            }
          >
            {/* Card gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 group-hover:from-white/95 group-hover:via-white/80 group-hover:to-white/60 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-2xl group-hover:from-primary/10 group-hover:to-accent/20 transition-all duration-500"></div>

            <div className="relative z-10">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      {/* Enhanced icon with gradient */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-lg rounded-xl"></div>
                        <div className="relative p-3 bg-gradient-to-br from-primary/10 via-blue-50 to-accent/10 rounded-xl border border-white/50 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-500">
                          <Folder className="h-6 w-6 text-transparent bg-gradient-to-br from-primary to-accent bg-clip-text" />
                        </div>
                      </div>
                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-emerald-600">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Gradient heading */}
                    <CardTitle className="text-xl font-bold mb-3 text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text group-hover:from-primary group-hover:via-blue-700 group-hover:to-accent transition-all duration-500">
                      {project.name}
                    </CardTitle>

                    {project.description && (
                      <CardDescription className="text-sm leading-relaxed text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                        {project.description}
                      </CardDescription>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/80 hover:shadow-lg rounded-xl"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4 text-slate-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white/95 backdrop-blur-md border border-white/50 shadow-xl"
                    >
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
                        <AlertDialogContent className="bg-white/95 backdrop-blur-md border border-white/50">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                              Delete Project
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                              Are you sure you want to delete "{project.name}"?
                              This action will permanently delete the project
                              and all its documents. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/80 hover:bg-white">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project)}
                              disabled={deletingProjectId === project.id}
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
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

              <CardContent className="pb-6">
                <div className="space-y-4">
                  {/* Document count with enhanced styling */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-accent/10 to-blue-100/50 rounded-lg group-hover:from-accent/20 group-hover:to-blue-100 transition-all duration-300">
                      <FileText className="h-4 w-4 text-transparent bg-gradient-to-br from-accent to-blue-600 bg-clip-text" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {project.documents?.length || 0} documents
                      </span>
                      <span className="text-xs text-slate-500">
                        Created{' '}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Processing Status</span>
                      <span>Ready</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full w-full"></div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:text-white group-hover:border-0 transition-all duration-500 rounded-xl font-semibold"
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
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
