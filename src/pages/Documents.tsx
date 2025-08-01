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
import { documentService, projectService } from '@/services/s3-api'

const Documents = () => {
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [projectName, setProjectName] = React.useState<string>('')
  const [companyName, setCompanyName] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [resolvedProject, setResolvedProject] = React.useState<{
    id: string
    name: string
  } | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      if (!projectId || !companyId) return

      try {
        setLoading(true)

        // Fetch project details using slug resolution
        console.log('Documents page resolving project slug/ID:', projectId)
        const project = await projectService.resolveProject(projectId)
        console.log('Documents page resolved project data:', project)

        if (project) {
          console.log('Documents page setting project name to:', project.name)
          setProjectName(project.name)
          setResolvedProject(project)
        } else {
          console.log(
            'Documents page: No project found for slug/ID:',
            projectId,
          )
          setProjectName('Unknown Project')
        }

        // Set company name (using companyId as name for now)
        setCompanyName(companyId)

        // Fetch documents for this project using the resolved project ID
        if (project) {
          const projectDocuments = await documentService.getDocumentsByProject(
            project.id,
          )
          setDocuments(projectDocuments)
        } else {
          setDocuments([])
        }

        // Debug: Also fetch all documents to see what's in the database
        console.log('Documents page: Fetching all documents for debugging...')
        const allDocuments = await documentService.getAllDocuments()
        console.log('Documents page: All documents in database:', allDocuments)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: 'Error loading data',
          description: 'Failed to load project documents.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId, companyId, toast])

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Delete from API
      await documentService.deleteDocument(documentId)

      // Update state to remove the document
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))

      // Show success toast
      toast({
        title: 'Document deleted',
        description: 'The document has been removed from this project.',
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      // Show error toast
      toast({
        title: 'Error deleting document',
        description: 'There was a problem removing the document.',
        variant: 'destructive',
      })
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
                  projectName,
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
            projectId={resolvedProject?.id || projectId || 'default-project'}
            companyId={companyId || 'default-company'}
            projectName={projectName}
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

        {loading ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : documents.length > 0 ? (
          <DocumentList
            documents={documents}
            projectId={projectId || 'default-project'}
            companyId={companyId || 'default-company'}
            projectName={projectName}
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
      </div>
    </Layout>
  )
}

export default Documents
