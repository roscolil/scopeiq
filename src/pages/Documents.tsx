import React from 'react'
import { Layout } from '@/components/Layout'
import { DocumentList } from '@/components/DocumentList'
import { FileUploader } from '@/components/FileUploader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Filter } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const Documents = () => {
  const [documents, setDocuments] = React.useState([
    {
      id: 'doc-1',
      name: 'Business Proposal.pdf',
      type: 'application/pdf',
      size: '2.4 MB',
      date: 'Apr 9, 2025',
      status: 'processed' as const,
    },
    {
      id: 'doc-2',
      name: 'Financial Report.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: '1.8 MB',
      date: 'Apr 8, 2025',
      status: 'processed' as const,
    },
    {
      id: 'doc-3',
      name: 'Contract Agreement.pdf',
      type: 'application/pdf',
      size: '3.2 MB',
      date: 'Apr 5, 2025',
      status: 'processing' as const,
    },
    {
      id: 'doc-4',
      name: 'Project Timeline.png',
      type: 'image/png',
      size: '0.8 MB',
      date: 'Apr 2, 2025',
      status: 'failed' as const,
    },
  ])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">My Documents</h1>

          <div className="flex gap-2">
            {/* <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button> */}

            <Dialog>
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
                <FileUploader />
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
        <DocumentList documents={documents} />
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
