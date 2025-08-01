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
import { routes } from '@/utils/navigation'

interface ProjectListProps {
  projects: Project[]
  companyId: string
}

export const ProjectList = ({ projects, companyId }: ProjectListProps) => {
  const navigate = useNavigate()

  if (projects.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-secondary/20">
        <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No projects yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first project to get started
        </p>
        <Button
          onClick={() => navigate(routes.company.projects.new(companyId))}
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
            <CardTitle className="text-lg font-medium">
              {project.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <FileText className="h-4 w-4 mr-1" />
              <span>{project.documentIds.length} documents</span>
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
                navigate(routes.company.project.details(companyId, project.id))
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
