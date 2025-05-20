import React from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
  FileUp
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProfileHome = () => {
  const navigate = useNavigate();
  const companyName = decodeURIComponent(window.location.pathname.split("/")[1] || "Your Company");

  // Mock data for dashboard
  const recentProjects = [
    { id: 1, name: "Kitchen Renovation", date: "May 15, 2025", progress: 75 },
    { id: 2, name: "Office Building", date: "May 10, 2025", progress: 30 },
    { id: 3, name: "Bathroom Remodel", date: "May 3, 2025", progress: 100 },
  ];

  const upcomingTasks = [
    { id: 1, title: "Client meeting", date: "Today, 2:00 PM", priority: "High" },
    { id: 2, title: "Finalize quote #1082", date: "Tomorrow, 10:00 AM", priority: "Medium" },
    { id: 3, title: "Review project specs", date: "May 22, 2025", priority: "Low" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{companyName} Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your projects and activities.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder-avatar.png" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87</div>
              <p className="text-xs text-muted-foreground">+15 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">6 due today</p>
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
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/${companyName}/projects`)}>
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">Updated: {project.date}</div>
                        </div>
                        <span className="text-sm">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} />
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => navigate(`/${companyName}/projects/new`)}>
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
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" /> {task.date}
                          </div>
                        </div>
                        <Badge variant={task.priority === "High" ? "destructive" : 
                                       task.priority === "Medium" ? "default" : 
                                       "outline"}>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-24 flex flex-col" onClick={() => navigate(`/${companyName}/projects/new`)}>
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
              <Button variant="outline" className="h-24 flex flex-col">
                <Settings className="h-6 w-6 mb-2" />
                Settings
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Projects</CardTitle>
                  <Button onClick={() => navigate(`/${companyName}/projects/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Manage all your construction projects in one place.</p>
                <div className="mt-4 text-center py-8">
                  <Folders className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Button onClick={() => navigate(`/${companyName}/projects`)} className="mt-2">
                    View All Projects
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button>
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Access all your documents across projects.</p>
                <div className="mt-4 text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Button className="mt-2">
                    View All Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProfileHome;
