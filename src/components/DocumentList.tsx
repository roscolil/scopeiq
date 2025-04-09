
import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image, 
  File, 
  MoreVertical,
  Eye,
  Download,
  Trash2
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  status: "processed" | "processing" | "failed";
}

interface DocumentListProps {
  documents: Document[];
}

export const DocumentList = ({ documents }: DocumentListProps) => {
  const navigate = useNavigate();
  
  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (type.includes("image")) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else {
      return <File className="h-8 w-8 text-green-500" />;
    }
  };
  
  const getStatusBadge = (status: Document["status"]) => {
    switch (status) {
      case "processed":
        return <Badge variant="default" className="bg-green-500">Processed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-amber-500">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };
  
  const viewDocument = (id: string) => {
    navigate(`/viewer/${id}`);
  };
  
  const deleteDocument = (id: string) => {
    console.log(`Delete document ${id}`);
  };
  
  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        documents.map((doc) => (
          <Card key={doc.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  {getFileIcon(doc.type)}
                  <div>
                    <CardTitle className="text-base font-medium">{doc.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {doc.size} • {doc.date}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewDocument(doc.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              {getStatusBadge(doc.status)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => viewDocument(doc.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
};
