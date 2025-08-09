import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import {
  PageHeaderSkeleton,
  ProjectListSkeleton,
  ProjectRowsSkeleton,
  DocumentListSkeleton,
  NumberSkeleton,
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
  Loader2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Project, Document } from '@/types'
import { projectService, documentService } from '@/services/hybrid'
import { companyService, Company } from '@/services/company'
import { routes, createSlug } from '@/utils/navigation'
import { useAuth } from '@/hooks/aws-auth'

const Dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  // Get company ID from authenticated user
  const companyId = user?.companyId || 'default'

  // Cache key for stats
  const STATS_CACHE_KEY = `dashboardStats_${companyId}`
  const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

  // Utility functions for stats caching
  const getCachedStats = useCallback(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(STATS_CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS

      return isExpired ? null : data
    } catch {
      return null
    }
  }, [STATS_CACHE_KEY, CACHE_EXPIRY_MS])

  const setCachedStatsData = useCallback(
    (stats: {
      projectCount: number
      documentCount: number
      recentDocumentCount: number
    }) => {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(
          STATS_CACHE_KEY,
          JSON.stringify({
            data: stats,
            timestamp: Date.now(),
          }),
        )
      } catch {
        // Silently fail if localStorage is unavailable
      }
    },
    [STATS_CACHE_KEY],
  )

  // Cache key for company data
  const COMPANY_CACHE_KEY = `companyData_${companyId}`

  // Utility functions for company caching
  const getCachedCompany = useCallback(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(COMPANY_CACHE_KEY)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS

      return isExpired ? null : data
    } catch {
      return null
    }
  }, [COMPANY_CACHE_KEY, CACHE_EXPIRY_MS])

  const setCachedCompanyData = useCallback(
    (companyData: Company) => {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(
          COMPANY_CACHE_KEY,
          JSON.stringify({
            data: companyData,
            timestamp: Date.now(),
          }),
        )
      } catch {
        // Silently fail if localStorage is unavailable
      }
    },
    [COMPANY_CACHE_KEY],
  )

  // State for company and other data
  const [company, setCompany] = useState<Company | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingCompany, setIsLoadingCompany] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true) // Start as true
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true) // Start as true
  const [isLoadingStats, setIsLoadingStats] = useState(true) // New loading state for stats
  const [expectedProjectCount, setExpectedProjectCount] = useState(3) // Default to 3

  // Cached stats state
  const [cachedStats, setCachedStats] = useState({
    projectCount: 0,
    documentCount: 0,
    recentDocumentCount: 0,
  })

  // Load cached project count from localStorage
  useEffect(() => {
    if (companyId && typeof window !== 'undefined') {
      const cached = localStorage.getItem(`projectCount_${companyId}`)
      if (cached) {
        setExpectedProjectCount(parseInt(cached, 10))
      }
    }
  }, [companyId])

  // Load cached stats immediately on mount
  useEffect(() => {
    if (companyId) {
      const cached = getCachedStats()
      if (cached) {
        setCachedStats(cached)
        setIsLoadingStats(false) // Show cached data immediately
      } else {
        setIsLoadingStats(true) // No cache, show loading
      }
    }
  }, [companyId, getCachedStats])

  // Load cached company data immediately on mount
  useEffect(() => {
    if (companyId) {
      const cached = getCachedCompany()
      if (cached) {
        setCompany(cached)
        setIsLoadingCompany(false) // Show cached data immediately
      } else {
        setIsLoadingCompany(true) // No cache, show loading
      }
    }
  }, [companyId, getCachedCompany])

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId || companyId === 'default') {
        const defaultCompany = {
          id: companyId,
          name: user?.name?.split("'s")[0] || 'Your Company',
          description: 'Default company',
        }
        setCompany(defaultCompany)
        setCachedCompanyData(defaultCompany)
        setIsLoadingCompany(false)
        return
      }

      // Check if we already have cached data and fresh data is loading in background
      const cached = getCachedCompany()

      try {
        // If no cache, show loading state
        if (!cached) {
          setIsLoadingCompany(true)
        }

        const companyData = await companyService.getCompanyById(companyId)

        if (companyData) {
          setCompany(companyData)
          setCachedCompanyData(companyData) // Cache the fresh data
        } else {
          // Fallback to derived name if company not found
          const fallbackCompany = {
            id: companyId,
            name: user?.name?.split("'s")[0] || 'Your Company',
            description: 'Company details not found',
          }
          setCompany(fallbackCompany)
          setCachedCompanyData(fallbackCompany)
        }
      } catch (error) {
        console.error('Error loading company:', error)
        // Fallback to derived name on error
        const errorCompany = {
          id: companyId,
          name: user?.name?.split("'s")[0] || 'Your Company',
          description: 'Error loading company details',
        }
        setCompany(errorCompany)
        setCachedCompanyData(errorCompany)
      } finally {
        setIsLoadingCompany(false)
      }
    }

    loadCompany()
  }, [companyId, user?.name, getCachedCompany, setCachedCompanyData])

  // Load projects and documents
  useEffect(() => {
    const loadData = async () => {
      try {
        // If we don't have cached stats, show loading state
        const cached = getCachedStats()
        if (!cached) {
          setIsLoadingStats(true)
        }

        // Load projects with documents - loading states already initialized as true
        const projectsData = await projectService.getAllProjectsWithDocuments()

        // Transform to our Project type
        const transformedProjects: Project[] = (projectsData || []).map(
          project => {
            return {
              id: project.id,
              name: project.name || 'Untitled Project',
              description: project.description || '',
              slug: project.slug,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              documents: project.documents || [],
              address: '',
              companyId: companyId,
              streetNumber: '',
              streetName: '',
              suburb: '',
              state: '',
              postcode: '',
            }
          },
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

        // Calculate recent documents (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const recentDocuments = allDocuments.filter(
          doc => doc.createdAt && new Date(doc.createdAt) > sevenDaysAgo,
        )

        // Update stats and cache them
        const newStats = {
          projectCount: transformedProjects.length,
          documentCount: allDocuments.length,
          recentDocumentCount: recentDocuments.length,
        }

        setCachedStats(newStats)
        setCachedStatsData(newStats)
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
        setIsLoadingStats(false) // Finish loading stats
      }
    }

    loadData()
  }, [companyId, toast, setCachedStatsData, getCachedStats])

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
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                {isLoadingCompany ? (
                  <PageHeaderSkeleton />
                ) : (
                  <>
                    <h1 className="text-4xl font-bold tracking-tight capitalize text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
                      {company?.id || 'Your Company'} Dashboard
                      {/* {company?.id && company.id !== 'default' && (
                        <span className="ml-3 text-lg font-normal text-cyan-400/80 font-mono">
                          ({company.id.slice(0, 8)}...)
                        </span>
                      )} */}
                    </h1>
                    <p className="text-gray-400 mt-2">
                      Welcome back! Here's an overview of your projects and
                      activities.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Settings Button */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                className="h-12 px-4 border border-white/20 hover:border-white/40 rounded-lg hover:bg-white/10 transition-all text-white hover:text-emerald-400 active:bg-white/20 touch-manipulation"
                onClick={() => navigate(routes.company.settings(companyId))}
              >
                <Settings className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Settings</span>
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Active Projects Card */}
            <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Active Projects
                </CardTitle>
                <Folders className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {isLoadingStats ? (
                  <NumberSkeleton
                    className="mb-1"
                    color="bg-blue-200 dark:bg-blue-800"
                  />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {cachedStats.projectCount}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-blue-600/70 dark:text-blue-400/70">
                  Total projects
                </p>
              </CardContent>
            </Card>

            {/* Documents Card */}
            <Card className="bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Documents
                </CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {isLoadingStats ? (
                  <NumberSkeleton
                    className="mb-1"
                    color="bg-green-200 dark:bg-green-800"
                  />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-300">
                    {cachedStats.documentCount}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-green-600/70 dark:text-green-400/70">
                  Total documents
                </p>
              </CardContent>
            </Card>

            {/* Team Members Card - Static for now */}
            <Card className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                  8
                </div>
                <p className="text-[10px] sm:text-xs text-purple-600/70 dark:text-purple-400/70">
                  +1 from last month
                </p>
              </CardContent>
            </Card>

            {/* Recent Documents Card */}
            <Card className="bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 dark:from-yellow-950/20 dark:to-yellow-900/10 border-yellow-200/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Recent Documents
                </CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {isLoadingStats ? (
                  <NumberSkeleton
                    className="mb-1"
                    color="bg-yellow-200 dark:bg-yellow-800"
                  />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {cachedStats.recentDocumentCount}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-yellow-600/70 dark:text-yellow-400/70">
                  This week
                </p>
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
                        onClick={() =>
                          navigate(routes.company.projects.list(companyId))
                        }
                      >
                        View all
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingProjects ? (
                      <ProjectRowsSkeleton itemCount={3} />
                    ) : projects.length > 0 ? (
                      projects.slice(0, 3).map((project, index) => (
                        <div key={project.id}>
                          <div
                            className="space-y-2 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200 cursor-pointer"
                            onClick={() => {
                              // Use existing slug or generate from name
                              const projectSlug =
                                project.slug ||
                                createSlug(
                                  project.name ||
                                    `project-${project.id.slice(0, 8)}`,
                                )

                              navigate(
                                routes.company.project.details(
                                  companyId,
                                  project.id,
                                  projectSlug,
                                ),
                              )
                            }}
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
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                              >
                                {project.documents?.length || 0} files
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation()
                                  // Use existing slug or generate from name
                                  const projectSlug =
                                    project.slug ||
                                    createSlug(
                                      project.name ||
                                        `project-${project.id.slice(0, 8)}`,
                                    )

                                  navigate(
                                    routes.company.project.details(
                                      companyId,
                                      project.id,
                                      projectSlug,
                                    ),
                                  )
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                          {index < projects.slice(0, 3).length - 1 && (
                            <div className="border-b border-gray-300 mx-3"></div>
                          )}
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
                      onClick={() =>
                        navigate(
                          `${routes.company.projects.list(companyId)}?new=true`,
                        )
                      }
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
                onClick={() => navigate(`${routes.company.projects.list(companyId)}?new=true`)}
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
                onClick={() => navigate(routes.company.settings(companyId))}
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
                        navigate(
                          `${routes.company.projects.list(companyId)}?new=true`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingProjects ? (
                    <ProjectListSkeleton itemCount={expectedProjectCount} />
                  ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map(project => (
                        <Card
                          key={project.id}
                          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1"
                          onClick={() => {
                            // Use existing slug or generate from name
                            const projectSlug =
                              project.slug ||
                              createSlug(
                                project.name ||
                                  `project-${project.id.slice(0, 8)}`,
                              )

                            navigate(
                              routes.company.project.details(
                                companyId,
                                project.id,
                                projectSlug,
                              ),
                            )
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                  <Folders className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">
                                    {project.name}
                                  </CardTitle>
                                  {/* <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs text-emerald-600">
                                      Active
                                    </span>
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
                                Created{' '}
                                {project.createdAt
                                  ? new Date(
                                      project.createdAt,
                                    ).toLocaleDateString()
                                  : 'Unknown'}
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={e => {
                                e.stopPropagation()
                                // Use existing slug or generate from name
                                const projectSlug =
                                  project.slug ||
                                  createSlug(
                                    project.name ||
                                      `project-${project.id.slice(0, 8)}`,
                                  )

                                navigate(
                                  routes.company.project.details(
                                    companyId,
                                    project.id,
                                    projectSlug,
                                  ),
                                )
                              }}
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
                          navigate(
                            `${routes.company.projects.list(companyId)}?new=true`,
                          )
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
                        navigate(routes.company.documents.all(companyId))
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
                    <div className="space-y-3">
                      {documents.slice(0, 6).map(document => {
                        const project = projects.find(
                          p => p.id === document.projectId,
                        )
                        const getFileIcon = (type: string) => {
                          if (type.includes('pdf')) {
                            return <FileText className="h-8 w-8 text-red-500" />
                          } else if (type.includes('image')) {
                            return (
                              <FileText className="h-8 w-8 text-blue-500" />
                            )
                          }
                          return <FileText className="h-8 w-8 text-green-500" />
                        }

                        const getStatusBadge = (status: Document['status']) => {
                          switch (status) {
                            case 'processed':
                              return (
                                <Badge
                                  variant="default"
                                  className="bg-green-500"
                                >
                                  AI Ready
                                </Badge>
                              )
                            case 'processing':
                              return (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500 flex items-center gap-1"
                                >
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Processing
                                </Badge>
                              )
                            case 'failed':
                              return <Badge variant="destructive">Failed</Badge>
                            default:
                              return null
                          }
                        }

                        return (
                          <Card key={document.id} className="overflow-hidden">
                            <CardHeader className="p-4 pb-0">
                              <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                  {getFileIcon(document.type)}
                                  <div>
                                    <CardTitle className="text-base font-medium">
                                      {document.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                      {project?.name || 'Unknown Project'} •{' '}
                                      {typeof document.size === 'number'
                                        ? `${(document.size / 1024).toFixed(2)} KB`
                                        : document.size}{' '}
                                      •{' '}
                                      {document.createdAt
                                        ? new Date(
                                            document.createdAt,
                                          ).toLocaleDateString()
                                        : 'Recently'}
                                    </CardDescription>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0 flex justify-between items-center">
                              {getStatusBadge(document.status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (project) {
                                    const route =
                                      routes.company.project.document(
                                        companyId,
                                        project.id,
                                        document.id,
                                        project.name,
                                        document.name,
                                      )
                                    navigate(route)
                                  } else {
                                    toast({
                                      title: 'Navigation Error',
                                      description:
                                        'Could not find the associated project for this document.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
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
                          navigate(routes.company.projects.list(companyId))
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
