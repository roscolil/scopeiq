import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Filter, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Document } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/utils/navigation'

const Documents = () => {
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [projectName, setProjectName] = React.useState<string>('')
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)

  React.useEffect(() => {
    // Load project data and documents
    if (projectId) {
      // Get project name
      const storedProjects = localStorage.getItem('projects')
      if (storedProjects) {
        try {
          const projects = JSON.parse(storedProjects) as {
            id: string
            name: string
          }[]
          const project = projects.find(p => p.id === projectId)
          if (project) {
            setProjectName(project.name)
          }
        } catch (error) {
          console.error('Error parsing stored projects:', error)
        }
      }

      // Load uploaded documents for this project
      const storedDocuments = localStorage.getItem('uploadedDocuments')
      let uploadedDocs: Document[] = []

      if (storedDocuments) {
        try {
          const allUploadedDocs = JSON.parse(storedDocuments) as Document[]
          // Filter for documents that belong to this project
          uploadedDocs = allUploadedDocs.filter(
            doc => doc.projectId === projectId,
          )
          setDocuments(uploadedDocs)
        } catch (error) {
          console.error('Error parsing stored documents:', error)
        }
      }
    }
  }, [projectId])

  const handleDeleteDocument = (documentId: string) => {
    // Update state to remove the document
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))

    // Update localStorage
    const storedDocuments = localStorage.getItem('uploadedDocuments')
    if (storedDocuments) {
      try {
        const documents = JSON.parse(storedDocuments) as Document[]
        const updatedDocuments = documents.filter(doc => doc.id !== documentId)
        localStorage.setItem(
          'uploadedDocuments',
          JSON.stringify(updatedDocuments),
        )

        // Show success toast
        toast({
          title: 'Document deleted',
          description: 'The document has been removed from this project.',
        })
      } catch (error) {
        console.error('Error updating stored documents:', error)

        // Show error toast
        toast({
          title: 'Error deleting document',
          description: 'There was a problem removing the document.',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                routes.company.project.details(
                  companyId || '',
                  projectId || '',
                ),
              )
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Project
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {projectName ? `${projectName} Documents` : 'Project Documents'}
          </h1>

          <div className="flex gap-2">
            {/* <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button> */}

            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <FileUploader
                  projectId={projectId || 'default-project'}
                  companyId={companyId || 'default-company'}
                  onUploadComplete={doc => {
                    // Add the uploaded document to the current list
                    setDocuments(prev => [...prev, doc])

                    // Close the dialog
                    setIsUploadDialogOpen(false)

                    // Show success toast
                    toast({
                      title: 'Document uploaded',
                      description: `${doc.name} has been added to this project.`,
                    })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value="all"> */}
        {documents.length > 0 ? (
          <DocumentList
            documents={documents}
            projectId={projectId || 'default-project'}
            companyId={companyId || 'default-company'}
            onDelete={handleDeleteDocument}
          />
        ) : (
          <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
            <p className="text-muted-foreground mb-4">
              No documents in this project yet
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              Upload Document
            </Button>
          </div>
        )}
        {/* </TabsContent>

          <TabsContent value="recent">
            <DocumentList documents={documents.slice(0, 2)} />
          </TabsContent>

          <TabsContent value="processed">
            <DocumentList
              documents={documents.filter(doc => doc.status === 'processed')}
            />
          </TabsContent>

          <TabsContent value="failed">
            <DocumentList
              documents={documents.filter(doc => doc.status === 'failed')}
            />
          </TabsContent>
        </Tabs> */}
      </div>
    </Layout>
  )
}

export default Documents
