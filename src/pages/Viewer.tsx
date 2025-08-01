import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentViewer } from '@/components/DocumentViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/utils/navigation'

const Viewer = () => {
  const { companyId, projectId, documentId } = useParams<{
    companyId: string
    projectId: string
    documentId: string
  }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  if (!documentId || !projectId || !companyId) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found</p>
          <Button
            onClick={() =>
              navigate(routes.company.projects.list(companyId || ''))
            }
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  const handleDownload = () => {
    toast({
      title: 'Download started',
      description: 'Your document is being prepared for download.',
    })
  }

  const handleShare = () => {
    toast({
      title: 'Share link copied',
      description: 'The link has been copied to your clipboard.',
    })
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
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
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        <DocumentViewer
          documentId={documentId}
          projectId={projectId}
          companyId={companyId}
        />
      </div>
    </Layout>
  )
}

export default Viewer
