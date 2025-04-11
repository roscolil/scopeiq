
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Project } from "@/types";

// Mock projects data (in a real app, this would come from API/context)
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

interface ProjectSelectorProps {
  currentProjectId: string;
  onProjectChange?: (projectId: string) => void;
}

export const ProjectSelector = ({ 
  currentProjectId, 
  onProjectChange 
}: ProjectSelectorProps) => {
  const [selectedProject, setSelectedProject] = useState<string>(currentProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  
  useEffect(() => {
    // In a real app, this would be a fetch call or context
    setProjects(mockProjects);
  }, []);
  
  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    if (onProjectChange) {
      onProjectChange(value);
    }
  };
  
  return (
    <div className="space-y-2 mb-4">
      <Label htmlFor="project-select">Select Project</Label>
      <Select 
        value={selectedProject} 
        onValueChange={handleProjectChange}
      >
        <SelectTrigger id="project-select" className="w-full">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
