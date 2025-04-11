
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DocumentList } from "@/components/DocumentList";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus,
  ChevronDown 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/ProjectForm";
import { Project, Document } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AIActions } from "@/components/AIActions";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "Construction Site A",
    description: "Main construction project for Site A including all blueprints and specifications.",
    createdAt: new Date(2025, 3, 8).toISOString(),
    documentIds: ["doc-1", "doc-3"]
  },
  {
    id: "project-2",
    name: "Renovation Plan B",
    description: "Renovation project for existing building B.",
    createdAt: new Date(2025, 3, 5).toISOString(),
    documentIds: ["doc-2"]
  },
  {
    id: "project-3",
    name: "Maintenance Schedule",
    description: "Regular maintenance schedule and documentation for all sites.",
    createdAt: new Date(2025, 3, 1).toISOString(),
    documentIds: ["doc-4"]
  }
];

const mockDocuments: Document[] = [
  {
    id: "doc-1",
    name: "Business Proposal.pdf",
    type: "application/pdf",
    size: "2.4 MB",
    date: "Apr 9, 2025",
    status: "processed",
    projectId: "project-1"
  },
  {
    id: "doc-2",
    name: "Financial Report.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: "1.8 MB",
    date: "Apr 8, 2025",
    status: "processed",
    projectId: "project-2"
  },
  {
    id: "doc-3",
    name: "Contract Agreement.pdf",
    type: "application/pdf",
    size: "3.2 MB",
    date: "Apr 5, 2025",
    status: "processing",
    projectId: "project-1"
  },
  {
    id: "doc-4",
    name: "Project Timeline.png",
    type: "image/png",
    size: "0.8 MB",
    date: "Apr 2, 2025",
    status: "failed",
    projectId: "project-3"
  }
];

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [project, setProject] = useState<Project | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  
  useEffect(() => {
    const foundProject = mockProjects.find(p => p.id === id) || null;
    setProject(foundProject);
    
    if (foundProject) {
      const projectDocs = mockDocuments.filter(doc => doc.projectId === id);
      setProjectDocuments(projectDocs);
    }
  }, [id]);
  
  const handleUpdateProject = (projectData: Omit<Project, "id" | "createdAt" | "documentIds">) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      ...projectData
    };
    
    setProject(updatedProject);
    setIsEditDialogOpen(false);
    
    toast({
      title: "Project updated",
      description: "Your project has been updated successfully."
    });
  };
  
  const handleDeleteProject = () => {
    toast({
      title: "Project deleted",
      description: "Your project has been deleted successfully."
    });
    
    navigate("/projects");
  };
  
  const handleUploadDocument = () => {
    setIsUploadDialogOpen(false);
    
    toast({
      title: "Document uploaded",
      description: "Your document has been uploaded to this project."
    });
  };
  
  if (!project) {
    return (
      <Layout>
        <div className="text-center">
          <p>Project not found</p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {project.description}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Created on {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full md:w-auto">
                  Actions <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAITools(!showAITools)}>
                  {showAITools ? "Hide AI Tools" : "Show AI Tools"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAITools(!showAITools)}
              >
                {showAITools ? "Hide AI Tools" : "Show AI Tools"}
              </Button>
              
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
                  <ProjectForm 
                    onSubmit={handleUpdateProject} 
                    defaultValues={{
                      name: project.name,
                      description: project.description
                    }}
                  />
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this project? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteProject}>
                      Delete Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        
        {showAITools && (
          <div className="mb-2 md:mb-4">
            <AIActions documentId="" projectId={project.id} />
          </div>
        )}
        
        {/* Edit/Delete Dialogs for mobile - separate from dropdown */}
        {isMobile && (
          <>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <ProjectForm 
                  onSubmit={handleUpdateProject} 
                  defaultValues={{
                    name: project.name,
                    description: project.description
                  }}
                />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this project? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteProject}>
                    Delete Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
        
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-lg md:text-xl font-semibold">Documents</h2>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document to Project</DialogTitle>
              </DialogHeader>
              <ProjectSelector currentProjectId={project.id} />
              <FileUploader />
              <DialogFooter>
                <Button onClick={handleUploadDocument}>
                  Upload to Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {projectDocuments.length > 0 ? (
          <DocumentList documents={projectDocuments} />
        ) : (
          <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
            <p className="text-muted-foreground mb-4">No documents in this project yet</p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              Add Document
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectDetails;
