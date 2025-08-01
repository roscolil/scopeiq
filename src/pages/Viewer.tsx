import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DocumentViewer } from '@/components/DocumentViewerNew'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Download,
  Share2,
  FileText,
  BrainCircuit,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/utils/navigation'
import { Document as DocumentType } from '@/types'
import { documentService, projectService } from '@/services/s3-api'

const Viewer = () => {
  const { companyId, projectId, documentId } = useParams<{
    companyId: string // Company ID
    projectId: string // Project slug (from project name)
    documentId: string // Document slug (from document name)
  }>()

  console.log('Viewer: URL params received (all slugs except companyId):')
  console.log('  - companyId:', companyId)
  console.log('  - projectId (slug):', projectId)
  console.log('  - documentId (slug):', documentId)
  console.log('Viewer: Current URL:', window.location.href)

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<'document' | 'ai'>('ai')
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // React to hash changes for AI/Document toggle
  useEffect(() => {
    const hash = location.hash
    if (hash === '#document') {
      setViewMode('document')
    } else {
      // Default to 'ai' when no hash or #ai hash
      setViewMode('ai')
    }
  }, [location.hash])

  // Fetch document info from API
  useEffect(() => {
    const fetchData = async () => {
      if (!documentId || !projectId) return

      console.log('Viewer fetchData called with:')
      console.log('  - documentId (slug):', documentId)
      console.log('  - projectId (slug):', projectId)
      console.log('  - companyId:', companyId)

      try {
        setIsLoading(true)

        // Fetch document data using slug resolution
        // The documentId from URL is actually a document slug (document name)
        console.log('Viewer: Resolving document slug to actual document...')
        const documentData = await documentService.getDocument(documentId)
        if (documentData) {
          console.log('Viewer: Document resolved successfully:', {
            id: documentData.id,
            name: documentData.name,
            slug: documentId,
          })
          setDocument(documentData)
        } else {
          console.log('Viewer: Document not found for slug:', documentId)
          toast({
            title: 'Document not found',
            description: 'The requested document could not be found.',
            variant: 'destructive',
          })
        }

        // Fetch project data using slug resolution
        // The projectId from URL is actually a project slug (project name)
        if (projectId) {
          console.log('Viewer: Resolving project slug to actual project...')
          const projectData = await projectService.resolveProject(projectId)

          if (projectData) {
            console.log('Viewer: Project resolved successfully:', {
              id: projectData.id,
              name: projectData.name,
              slug: projectId,
            })
            setProjectName(projectData.name)
          } else {
            console.log('Viewer: No project found for slug:', projectId)
            setProjectName('Unknown Project')
          }

          // Use companyId as company name for now (can be enhanced with actual company data later)
          setCompanyName(companyId || 'Your Company')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error loading data',
          description:
            'Failed to load the document information. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [documentId, projectId, companyId, toast])

  if (!documentId || !projectId || !companyId) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found - Missing parameters</p>
          <p className="text-sm text-muted-foreground">
            Company: {companyName || companyId || 'missing'}, Project:{' '}
            {projectName || projectId || 'missing'}, Document:{' '}
            {document?.name || documentId || 'missing'}
          </p>
          <Button
            onClick={() => {
              if (companyId) {
                navigate(routes.company.projects.list(companyId))
              } else {
                navigate('/')
              }
            }}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" text="Loading document..." />
        </div>
      </Layout>
    )
  }

  if (!document) {
    return (
      <Layout>
        <div className="text-center">
          <p>Document not found</p>
          <Button
            onClick={() => {
              if (companyId && projectId) {
                navigate(routes.company.project.details(companyId, projectId))
              } else {
                navigate('/')
              }
            }}
            className="mt-4"
          >
            Back to Project
          </Button>
        </div>
      </Layout>
    )
  }

  const handleDownload = () => {
    if (document?.url) {
      window.open(document.url, '_blank')
      toast({
        title: 'Download started',
        description: 'Your document is being prepared for download.',
      })
    } else {
      toast({
        title: 'Download failed',
        description: 'Document URL is not available.',
        variant: 'destructive',
      })
    }
  }

  const handleShare = () => {
    const shareUrl = window.location.href

    // Try to use the clipboard API
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          toast({
            title: 'Share link copied',
            description: 'The link has been copied to your clipboard.',
          })
        })
        .catch(() => {
          // Fallback
          prompt('Copy this link to share the document:', shareUrl)
        })
    } else {
      // Fallback for browsers without clipboard API
      prompt('Copy this link to share the document:', shareUrl)
    }
  }

  const handleTabChange = (value: string) => {
    setViewMode(value as 'document' | 'ai')

    // Update URL hash for bookmarking/sharing
    if (value === 'document') {
      window.history.replaceState(null, '', `${location.pathname}#document`)
    } else {
      // For 'ai' mode, remove hash (since it's the default)
      window.history.replaceState(null, '', location.pathname)
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (companyId && projectId) {
                navigate(
                  routes.company.project.details(
                    companyId,
                    projectId,
                    projectName,
                  ),
                )
              } else if (companyId) {
                navigate(routes.company.projects.list(companyId))
              } else {
                navigate('/')
              }
            }}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              {projectName ? `Back to ${projectName}` : 'Back to Project'}
            </span>
          </Button>
        </div>

        {/* Improve the document header with more details */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold truncate max-w-lg">
              {document?.name || 'Document'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {companyName && projectName ? (
                <>
                  <span className="font-medium">{companyName}</span> /{' '}
                  <span>{projectName}</span>
                </>
              ) : (
                'Loading project details...'
              )}
            </p>
            {document?.size && (
              <p className="text-xs text-muted-foreground mt-1">
                Size:{' '}
                {typeof document.size === 'number'
                  ? `${Math.round(document.size / 1024)} KB`
                  : document.size}
                {document.type &&
                  ` • Type: ${document.type.split('/')[1] || document.type}`}
              </p>
            )}
          </div>

          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Update the view toggle to include document type info */}
        <div className="bg-muted rounded-md p-1 mb-6">
          <div className="flex space-x-1">
            <button
              className={`flex-1 px-3 py-2 text-sm rounded-sm flex items-center justify-center space-x-2 ${
                viewMode === 'ai' ? 'bg-background shadow-sm' : ''
              }`}
              onClick={() => setViewMode('ai')}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>AI Analysis</span>
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm rounded-sm flex items-center justify-center space-x-2 ${
                viewMode === 'document' ? 'bg-background shadow-sm' : ''
              }`}
              onClick={() => setViewMode('document')}
            >
              <FileText className="h-4 w-4" />
              <span>
                {document?.type?.includes('pdf')
                  ? 'PDF Document'
                  : document?.type?.includes('image')
                    ? 'Image'
                    : document?.type?.includes('text')
                      ? 'Text Document'
                      : 'Document'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-0">
          <DocumentViewer
            documentId={documentId}
            projectId={projectId}
            companyId={companyId}
            viewMode={viewMode}
          />
        </div>
      </div>
    </Layout>
  )
}

export default Viewer
