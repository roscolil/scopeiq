import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import {
  PageHeaderSkeleton,
  ProjectListSkeleton,
  ProjectRowsSkeleton,
  DocumentListSkeleton,
} from '@/components/skeletons'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  FileText,
  FolderPlus,
  Folders,
  BarChart3,
  ClipboardList,
  Calendar,
  Settings,
  Users,
  Bell,
  Clock,
  Plus,
  FileUp,
  Eye,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Project, Document } from '@/types'
import { projectService, documentService } from '@/services/hybrid'
import { routes } from '@/utils/navigation'

const Dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  let companyId = decodeURIComponent(
    window.location.pathname.split('/')[1] || 'Your Company',
  )
  companyId = companyId.charAt(0).toUpperCase() + companyId.slice(1)

  // State for real data
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  // Load projects and documents
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load projects with documents
        setIsLoadingProjects(true)
        setIsLoadingDocuments(true)

        const projectsData = await projectService.getAllProjectsWithDocuments()

        // Transform to our Project type
        const transformedProjects: Project[] = (projectsData || []).map(
          project => ({
            id: project.id,
            name: project.name || 'Untitled Project',
            description: project.description || '',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            documents: project.documents || [],
            address: '',
            companyId: companyId.toLowerCase(),
            streetNumber: '',
            streetName: '',
            suburb: '',
            state: '',
            postcode: '',
          }),
        )

        setProjects(transformedProjects)

        // Extract all documents from all projects
        const allDocuments: Document[] = []
        transformedProjects.forEach(project => {
          if (project.documents) {
            allDocuments.push(
              ...project.documents.map(doc => ({
                ...doc,
                projectId: project.id,
              })),
            )
          }
        })

        setDocuments(allDocuments)
      } catch (error) {
        // Check if it's a "no projects exist" scenario vs actual error
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        if (
          errorMessage.includes('NoSuchKey') ||
          errorMessage.includes('The specified key does not exist')
        ) {
          setProjects([])
          setDocuments([])
        } else {
          // This is an actual error
          toast({
            title: 'Loading Error',
            description: 'Failed to load dashboard data. Please try again.',
            variant: 'destructive',
          })
        }
      } finally {
        setIsLoadingProjects(false)
        setIsLoadingDocuments(false)
      }
    }

    loadData()
  }, [companyId, toast])

  const upcomingTasks = [
    {
      id: 1,
      title: 'Client meeting',
      date: 'Today, 2:00 PM',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Finalize quote #1082',
      date: 'Tomorrow, 10:00 AM',
      priority: 'Medium',
    },
    {
      id: 3,
      title: 'Review project specs',
      date: 'May 22, 2025',
      priority: 'Low',
    },
  ]

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

        {/* Extra floating orbs */}
        <div className="absolute top-1/3 left-1/5 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-cyan-500/12 rounded-full blur-lg opacity-70"></div>
        <div className="absolute bottom-1/3 right-1/5 w-40 h-40 bg-gradient-to-bl from-cyan-500/12 to-blue-500/15 rounded-full blur-lg opacity-60"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight capitalize text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
                {companyId} Dashboard
              </h1>
              <p className="text-gray-400 mt-2">
                Welcome back! Here's an overview of your projects and
                activities.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate(`/${companyId.toLowerCase()}/settings`)}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
              {/* <Avatar>
                <AvatarImage src="/placeholder-avatar.png" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar> */}
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {projects.length}
                </div>
                <p className="text-xs text-slate-600">Total projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {documents.length}
                </div>
                <p className="text-xs text-slate-600">Total documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">8</div>
                <p className="text-xs text-slate-600">+1 from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Recent Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {
                    documents.filter(doc => {
                      const docDate = new Date(doc.createdAt || '')
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return docDate > weekAgo
                    }).length
                  }
                </div>
                <p className="text-xs text-slate-600">This week</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {/* Recent Projects */}
                <Card className="md:col-span-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folders className="h-5 w-5 text-primary" />
                        <CardTitle>Recent Projects</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/${companyId}/projects`)}
                      >
                        View all
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingProjects ? (
                      <ProjectRowsSkeleton itemCount={3} />
                    ) : projects.length > 0 ? (
                      projects.slice(0, 3).map(project => (
                        <div
                          key={project.id}
                          className="space-y-2 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200 cursor-pointer"
                          onClick={() =>
                            navigate(
                              routes.company.project.details(
                                companyId.toLowerCase(),
                                project.id,
                                project.name,
                              ),
                            )
                          }
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-slate-800">
                                {project.name}
                              </div>
                              <div className="text-xs text-slate-600">
                                {project.documents?.length || 0} documents
                              </div>
                            </div>
                            <div className="text-sm text-slate-600">
                              {project.createdAt
                                ? new Date(
                                    project.createdAt,
                                  ).toLocaleDateString()
                                : 'Recently'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {project.documents?.length || 0} files
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation()
                                navigate(
                                  routes.company.project.details(
                                    companyId.toLowerCase(),
                                    project.id,
                                    project.name,
                                  ),
                                )
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Folders className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-400">No projects yet</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/${companyId}/projects/new`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </CardFooter>
                </Card>

                {/* Tasks and Calendar */}
                <Card className="md:col-span-3">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <CardTitle>Upcoming Tasks</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">{task.title}</div>
                            <div className="flex items-center text-xs text-gray-400">
                              <Clock className="h-3 w-3 mr-1" /> {task.date}
                            </div>
                          </div>
                          <Badge
                            variant={
                              task.priority === 'High'
                                ? 'destructive'
                                : task.priority === 'Medium'
                                  ? 'default'
                                  : 'outline'
                            }
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Calendar
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Quick Actions */}
              {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col"
                onClick={() => navigate(`/${companyId}/projects/new`)}
              >
                <FolderPlus className="h-6 w-6 mb-2" />
                New Project
              </Button>
              <Button variant="outline" className="h-24 flex flex-col">
                <FileUp className="h-6 w-6 mb-2" />
                Upload Document
              </Button>
              <Button variant="outline" className="h-24 flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                Team Members
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col"
                onClick={() => navigate(`/${companyId}/settings`)}
              >
                <Settings className="h-6 w-6 mb-2" />
                Settings
              </Button>
            </div> */}
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Projects</CardTitle>
                    <Button
                      onClick={() =>
                        navigate(`/${companyId.toLowerCase()}/projects`)
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingProjects ? (
                    <ProjectListSkeleton itemCount={6} />
                  ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map(project => (
                        <Card
                          key={project.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {project.description || 'No description provided'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex items-center text-sm text-gray-400">
                              <FileText className="h-4 w-4 mr-1" />
                              <span>
                                {project.documents?.length || 0}{' '}
                                {project.documents?.length === 1
                                  ? 'document'
                                  : 'documents'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Created:{' '}
                              {project.createdAt
                                ? new Date(
                                    project.createdAt,
                                  ).toLocaleDateString()
                                : 'Unknown'}
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
                                    companyId.toLowerCase(),
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
                  ) : (
                    <div className="text-center py-8">
                      <Folders className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">
                        No projects yet
                      </p>
                      <p className="text-gray-400 mb-4">
                        Create your first project to get started.
                      </p>
                      <Button
                        onClick={() =>
                          navigate(`/${companyId.toLowerCase()}/projects`)
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Documents</CardTitle>
                    <Button
                      onClick={() =>
                        navigate(`/${companyId.toLowerCase()}/documents`)
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingDocuments ? (
                    <DocumentListSkeleton itemCount={6} />
                  ) : documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documents.slice(0, 6).map(document => {
                        const project = projects.find(
                          p => p.id === document.projectId,
                        )
                        const getFileIcon = (type: string) => {
                          if (type.includes('pdf')) {
                            return <FileText className="h-6 w-6 text-red-500" />
                          } else if (type.includes('image')) {
                            return (
                              <FileText className="h-6 w-6 text-blue-500" />
                            )
                          }
                          return <FileText className="h-6 w-6 text-gray-500" />
                        }

                        return (
                          <Card
                            key={document.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start gap-3">
                                {getFileIcon(document.type)}
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {document.name}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {project?.name || 'Unknown Project'}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>
                                  {typeof document.size === 'number'
                                    ? `${Math.round(document.size / 1024)} KB`
                                    : document.size}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {document.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {document.createdAt
                                  ? new Date(
                                      document.createdAt,
                                    ).toLocaleDateString()
                                  : 'Recently'}
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  if (project) {
                                    const route =
                                      routes.company.project.document(
                                        companyId.toLowerCase(),
                                        project.id,
                                        document.id,
                                        project.name,
                                        document.name,
                                      )
                                    navigate(route)
                                  } else {
                                    // If project is not found, show error
                                    toast({
                                      title: 'Navigation Error',
                                      description:
                                        'Could not find the associated project for this document.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </CardFooter>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">
                        No documents yet
                      </p>
                      <p className="text-gray-400 mb-4">
                        Upload documents to your projects to see them here.
                      </p>
                      <Button
                        onClick={() =>
                          navigate(`/${companyId.toLowerCase()}/projects`)
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Go to Projects
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  )
}

export default Dashboard
