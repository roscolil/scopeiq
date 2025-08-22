import { useEffect, useState } from 'react'
import {
  FileText,
  File,
  FileImage,
  Loader2,
  Brain,
  AlertCircle,
} from 'lucide-react'
import { DocumentViewerSkeleton } from '@/components/shared/skeletons'
import { PDFViewer } from './PDFViewer'
import { AIActions } from '@/components/ai/AIActions'
import { Document as DocumentType } from '@/types'
import { documentService } from '@/services/data/hybrid'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Text File Viewer Component
const TextFileViewer = ({ document }: { document: DocumentType }) => {
  const [textContent, setTextContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTextContent = async () => {
      if (!document?.url) {
        setError('No file URL available')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // If we already have content, use it
        if (document.content) {
          setTextContent(document.content)
          setIsLoading(false)
          return
        }

        // Otherwise, fetch the file content directly
        const response = await fetch(document.url)
        if (!response.ok) {
          throw new Error('Failed to fetch file content')
        }

        const text = await response.text()
        setTextContent(text)
      } catch (err) {
        console.error('Error fetching text file:', err)
        setError('Failed to load text file content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTextContent()
  }, [document])

  if (isLoading) {
    return (
      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm">
        <div className="text-gray-400 italic">Loading text content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm">
        <div className="text-destructive italic">{error}</div>
      </div>
    )
  }

  return (
    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm font-mono">
      {textContent ? (
        <div className="whitespace-pre-wrap">{textContent}</div>
      ) : (
        <div className="text-gray-400 italic">
          This text file appears to be empty.
        </div>
      )}
    </div>
  )
}

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
  document?: DocumentType | null
}

export const DocumentViewer = ({
  documentId,
  projectId,
  companyId,
  viewMode = 'document',
  document: preResolvedDocument,
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch document from API
  useEffect(() => {
    // If we already have the document from parent, use it
    if (preResolvedDocument) {
      setDocument(preResolvedDocument)
      setIsLoading(false)

      // Set content based on document type
      let documentContent = ''
      if (preResolvedDocument.type.includes('image')) {
        documentContent =
          '[This is an image file. Preview available in Document view.]'
      } else if (preResolvedDocument.type.includes('pdf')) {
        documentContent =
          preResolvedDocument.content ||
          'This is a PDF document that was uploaded. Advanced AI text analysis is in progress using OCR and semantic processing.\n\nThe full text content and searchable structure will be available once processing is complete.'
      } else if (
        preResolvedDocument.type.includes('text') ||
        preResolvedDocument.type.includes('txt') ||
        preResolvedDocument.type.includes('rtf') ||
        preResolvedDocument.type.includes('plain')
      ) {
        documentContent =
          preResolvedDocument.content ||
          'Advanced text processing and content analysis is in progress...'
      } else {
        documentContent =
          preResolvedDocument.content || 'Document content not available.'
      }
      setContent(documentContent)
      return
    }

    // Otherwise, fetch the document
    if (!documentId) {
      setError('No document ID provided')
      setIsLoading(false)
      return
    }

    const fetchDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch document from API using hybrid service
        const documentData = await documentService.getDocument(
          companyId,
          projectId,
          documentId,
        )

        if (documentData) {
          setDocument(documentData)

          let documentContent = ''
          if (documentData.type.includes('image')) {
            documentContent =
              '[This is an image file. Preview available in Document view.]'
          } else if (documentData.type.includes('pdf')) {
            documentContent =
              documentData.content ||
              'This is a PDF document that was uploaded. Advanced AI text analysis is in progress using OCR and semantic processing.\n\nThe full text content and searchable structure will be available once processing is complete.'
          } else if (
            documentData.type.includes('word') ||
            documentData.type.includes('doc')
          ) {
            documentContent =
              documentData.content ||
              'This is a Word document that was uploaded. Advanced document parsing and content analysis is in progress.\n\nThe formatted text content will be available once processing is complete.'
          } else if (
            documentData.type.includes('excel') ||
            documentData.type.includes('sheet') ||
            documentData.type.includes('xls')
          ) {
            documentContent =
              documentData.content ||
              'This is a spreadsheet that was uploaded. Advanced data analysis and table structure processing is in progress.\n\nThe structured data and content will be available once processing is complete.'
          } else if (
            documentData.type.includes('text') ||
            documentData.type.includes('txt') ||
            documentData.type.includes('rtf') ||
            documentData.type.includes('plain')
          ) {
            documentContent =
              documentData.content ||
              'This is a text document that was uploaded. Advanced content analysis and semantic processing is in progress.'
          } else {
            documentContent =
              documentData.content ||
              'This document has been uploaded and is being processed with advanced AI analysis. Structured content and searchable text will be available shortly.'
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
  }, [documentId, projectId, companyId, preResolvedDocument])

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
      document.type.includes('txt') ||
      document.type.includes('rtf') ||
      document.type.includes('plain')
    ) {
      return <FileText className="h-5 w-5 text-gray-600" />
    } else {
      return <File className="h-5 w-5 text-primary" />
    }
  }

  if (isLoading) {
    return <DocumentViewerSkeleton />
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <p className="text-lg font-medium mb-2 text-red-600">
          Error Loading Document
        </p>
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">Document Not Found</p>
        <p className="text-gray-400">
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
                    <div className="text-gray-400 mb-1">File Name</div>
                    <div className="font-medium">{document.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">File Size</div>
                    <div className="font-medium">
                      {formatFileSize(document.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Date</div>
                    <div className="font-medium">
                      {document.createdAt
                        ? formatDate(document.createdAt)
                        : 'Unknown date'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Status</div>
                    <div className="font-medium capitalize flex items-center gap-1">
                      {document.status === 'processing' && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      )}
                      {document.status}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Preview */}
            <div className="p-4 bg-background rounded-md border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">
                    {document?.name || 'Document'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {document?.type && (
                    <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">
                      {document.type.split('/')[1]?.toUpperCase() ||
                        document.type}
                    </span>
                  )}
                </div>
              </div>

              {/* Document content based on type */}
              {document?.type?.includes('image') ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <img
                      src={document.url}
                      alt={document.name || 'Document image'}
                      className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
                    />
                  </div>

                  {/* AI Analysis Results for Images */}
                  {document.content && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                          AI Image Analysis
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          GPT-4 Turbo Vision
                        </Badge>
                        {document.content.includes(
                          'STANDALONE IMAGE ANALYSIS',
                        ) && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            Standalone Image
                          </Badge>
                        )}
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {document.content}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Processing status for images */}
                  {!document.content && document.status === 'processing' && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span className="font-medium text-amber-900 dark:text-amber-100">
                          Analyzing Image with AI
                        </span>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        GPT-4 Turbo Vision is processing this image to extract
                        text, identify objects, and provide
                        construction-specific insights. This usually takes 1-2
                        minutes.
                      </p>
                    </div>
                  )}

                  {!document.content && document.status === 'failed' && (
                    <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-900 dark:text-red-100">
                          Image Analysis Failed
                        </span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Failed to analyze this image. Please try re-uploading
                        the image or contact support if the issue persists.
                      </p>
                    </div>
                  )}
                </div>
              ) : document?.type?.includes('pdf') ? (
                <div className="space-y-4">
                  <PDFViewer document={document} />

                  {/* PDF Image Detection Notice */}
                  {document.content?.includes('IMAGE DETECTED ON PAGE') && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FileImage className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-900 dark:text-amber-100">
                          Images Detected in PDF
                        </span>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        This PDF contains embedded images (blueprints, diagrams,
                        or photos). For complete analysis of visual content,
                        consider extracting and uploading images separately.
                      </p>
                    </div>
                  )}
                </div>
              ) : document?.type?.includes('text') ||
                document?.type?.includes('txt') ||
                document?.type?.includes('rtf') ||
                document?.type?.includes('plain') ? (
                <TextFileViewer document={document} />
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
                <Brain className="h-5 w-5 text-primary" />
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
        <AIActions
          documentId={documentId}
          projectId={projectId}
          companyId={companyId}
        />
      )}
    </div>
  )
}
