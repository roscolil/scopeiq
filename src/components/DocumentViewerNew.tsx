import { useEffect, useState } from 'react'
import { FileText, File, FileImage, Download, BrainCircuit } from 'lucide-react'
import { AIActions } from './AIActions'
import { Spinner } from './Spinner'
import { Document as DocumentType } from '@/types'
import { documentService } from '@/services/s3-api'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'

// Utility functions
const formatFileSize = (size: string | number): string => {
  if (typeof size === 'string') return size
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let fileSize = size

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }

  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

interface DocumentViewerProps {
  documentId: string
  projectId: string
  companyId: string
  viewMode?: 'document' | 'ai'
}

export const DocumentViewer = ({
  documentId,
  projectId,
  companyId,
  viewMode = 'document',
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch document from API
  useEffect(() => {
    if (!documentId) {
      console.error('No documentId provided to DocumentViewer')
      setError('No document ID provided')
      setIsLoading(false)
      return
    }

    console.log(
      'DocumentViewer: Attempting to fetch document with ID:',
      documentId,
    )
    console.log('DocumentViewer: projectId:', projectId)
    console.log('DocumentViewer: companyId:', companyId)

    const fetchDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log(
          'DocumentViewer: Calling documentService.getDocument with ID:',
          documentId,
        )

        // Fetch document from API
        const documentData = await documentService.getDocument(documentId)

        console.log('DocumentViewer: Response from getDocument:', documentData)

        if (documentData) {
          console.log('Found document:', documentData)
          console.log('Document URL:', documentData.url)
          console.log('Document name:', documentData.name)
          console.log('Document ID:', documentData.id)
          setDocument(documentData)

          let documentContent = ''
          if (documentData.type.includes('image')) {
            documentContent =
              '[This is an image file. Preview available in Document view.]'
          } else if (documentData.type.includes('pdf')) {
            documentContent =
              documentData.content ||
              'This is a PDF document that was uploaded. Content extraction is in progress.\n\nThe full text will be available once processing is complete.\n\nYou can use the AI actions below to analyze this document.'
          } else if (
            documentData.type.includes('word') ||
            documentData.type.includes('doc')
          ) {
            documentContent =
              documentData.content ||
              'This is a Word document that was uploaded. Content extraction is in progress.\n\nThe full text will be available once processing is complete.\n\nYou can use the AI actions below to analyze this document.'
          } else if (
            documentData.type.includes('excel') ||
            documentData.type.includes('sheet') ||
            documentData.type.includes('xls')
          ) {
            documentContent =
              documentData.content ||
              'This is a spreadsheet that was uploaded. Content extraction is in progress.\n\nThe data will be available once processing is complete.\n\nYou can use the AI actions below to analyze this document.'
          } else if (
            documentData.type.includes('text') ||
            documentData.type.includes('txt')
          ) {
            documentContent =
              documentData.content ||
              'This is a text document that was uploaded. Content is being processed.\n\nYou can use the AI actions below to analyze this document.'
          } else {
            documentContent =
              documentData.content ||
              'This document has been uploaded and is being processed. Content will be available shortly.'
          }

          setContent(documentContent)
        } else {
          setError('Document not found')
        }
      } catch (error) {
        console.error('Error fetching document:', error)
        setError('Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, projectId, companyId])

  const getFileIcon = () => {
    if (!document) return <File className="h-5 w-5 text-primary" />

    if (document.type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    } else if (document.type.includes('image')) {
      return <FileImage className="h-5 w-5 text-blue-500" />
    } else if (
      document.type.includes('word') ||
      document.type.includes('doc')
    ) {
      return <FileText className="h-5 w-5 text-blue-700" />
    } else if (
      document.type.includes('excel') ||
      document.type.includes('sheet') ||
      document.type.includes('xls')
    ) {
      return <FileText className="h-5 w-5 text-green-600" />
    } else if (
      document.type.includes('text') ||
      document.type.includes('txt')
    ) {
      return <FileText className="h-5 w-5 text-gray-600" />
    } else {
      return <File className="h-5 w-5 text-primary" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="md" text="Loading document content..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <p className="text-lg font-medium mb-2 text-red-600">
          Error Loading Document
        </p>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">Document Not Found</p>
        <p className="text-muted-foreground">
          The requested document could not be found.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {viewMode === 'document' ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              {getFileIcon()}
              <h2 className="text-lg font-medium">{document.name}</h2>
            </div>
          </div>

          <div className="p-5">
            {/* Document Info Panel */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getFileIcon()}
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">File Name</div>
                    <div className="font-medium">{document.name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">File Size</div>
                    <div className="font-medium">
                      {formatFileSize(document.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Date</div>
                    <div className="font-medium">
                      {document.createdAt
                        ? formatDate(document.createdAt)
                        : 'Unknown date'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Status</div>
                    <div className="font-medium capitalize">
                      {document.status}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Preview */}
            <div className="p-4 bg-background rounded-md border">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium">
                  {document?.name || 'Document'}
                </h3>
                {document?.type && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    {document.type.split('/')[1]?.toUpperCase() ||
                      document.type}
                  </span>
                )}
              </div>

              {/* Document content based on type */}
              {document?.type?.includes('image') ? (
                <div className="flex justify-center">
                  <img
                    src={document.url}
                    alt={document.name || 'Document image'}
                    className="max-w-full max-h-[600px] object-contain"
                  />
                </div>
              ) : document?.type?.includes('pdf') ? (
                <div className="text-center">
                  <p className="mb-4">PDF Document</p>
                  <Button
                    onClick={() => window.open(document.url, '_blank')}
                    className="mb-4"
                  >
                    Open PDF in New Tab
                  </Button>
                  <div className="bg-muted p-4 rounded text-sm">
                    <p>
                      PDF content preview is not available directly in the
                      browser.
                    </p>
                    <p>
                      Please use the button above to view the PDF in a new tab.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm">
                  {document?.content ||
                    `This document (${document?.name || 'Unknown'}) has been uploaded successfully.
                   
Content extraction is in progress.
       
You can use the AI Analysis tab to analyze this document.`}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Analyze this document using AI-powered tools
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {viewMode === 'ai' && documentId && projectId && (
        <AIActions documentId={documentId} projectId={projectId} />
      )}
    </div>
  )
}
