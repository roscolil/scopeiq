import { useNavigate } from 'react-router-dom'
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
import { FileText, Folder } from 'lucide-react'
import { routes } from '@/utils/ui/navigation'
import { PrefetchProjectLink } from '@/components/shared/PrefetchLinks'
import { EmptyState } from '@/components/shared/EmptyState'

interface ProjectListProps {
  projects: Project[]
  companyId: string
  onCreateProject?: () => void
}

export const ProjectList = ({
  projects,
  companyId,
  onCreateProject,
}: ProjectListProps) => {
  const navigate = useNavigate()

  if (projects.length === 0) {
    return (
      <EmptyState
        variant="projects"
        action={
          onCreateProject
            ? {
                label: 'Create Your First Project',
                onClick: onCreateProject,
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map(project => (
        <PrefetchProjectLink
          key={project.id}
          projectId={project.id}
          includeDocuments={true}
          to={routes.company.project.details(
            companyId.toLowerCase(),
            project.id,
            project.name,
          )}
          className="block"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
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
                onClick={e => {
                  // Prevent the link navigation since the card itself is clickable
                  e.preventDefault()
                  navigate(
                    routes.company.project.details(
                      companyId.toLowerCase(),
                      project.id,
                      project.name,
                    ),
                  )
                }}
              >
                View Project
              </Button>
            </CardFooter>
          </Card>
        </PrefetchProjectLink>
      ))}
    </div>
  )
}
