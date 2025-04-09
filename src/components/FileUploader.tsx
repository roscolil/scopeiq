
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, FileText, FileImage, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export const FileUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    // Check file type - allow PDF, DOCX, TXT, etc.
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/msword",
      "image/jpeg",
      "image/png"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, DOCX, TXT, JPG, or PNG file.",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    
    // In a real app, this is where you would upload to AWS S3
    toast({
      title: "File selected",
      description: `${file.name} is ready to upload.`,
    });
  };
  
  const removeFile = () => {
    setSelectedFile(null);
  };
  
  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-10 w-10 text-muted-foreground" />;
    
    if (selectedFile.type.includes("pdf")) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (selectedFile.type.includes("image")) {
      return <FileImage className="h-10 w-10 text-blue-500" />;
    } else {
      return <File className="h-10 w-10 text-green-500" />;
    }
  };
  
  const uploadFile = () => {
    if (!selectedFile) return;
    
    // Simulate upload to AWS S3
    toast({
      title: "Upload started",
      description: "Your file is being processed...",
    });
    
    // Simulate processing delay
    setTimeout(() => {
      toast({
        title: "Upload complete",
        description: "Your document has been processed successfully!",
      });
      setSelectedFile(null);
    }, 2000);
  };
  
  return (
    <div className="w-full">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30",
          selectedFile ? "bg-secondary/50" : "bg-transparent"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          {getFileIcon()}
          
          {selectedFile ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={removeFile}>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button size="sm" onClick={uploadFile}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium">Drag & drop your document here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Support for PDF, DOCX, TXT, JPG, PNG (max 10MB)
                </p>
              </div>
              
              <label htmlFor="file-upload">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.doc,.jpg,.jpeg,.png"
                />
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <span>Browse files</span>
                </Button>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
