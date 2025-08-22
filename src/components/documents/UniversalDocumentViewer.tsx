import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Document, Page, pdfjs } from 'react-pdf'
import { cn } from '@/lib/utils'

// Try different worker sources to handle "Failed to fetch" errors
try {
  // Only set if not already set
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // Use jsdelivr as the most reliable CDN
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@' +
      pdfjs.version +
      '/build/pdf.worker.min.js'
  }
} catch (error) {
  console.error('Error configuring PDF.js worker:', error)
}

interface UniversalDocumentViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  className?: string
}

// Use function declaration rather than arrow function for better compatibility
function UniversalDocumentViewer({
  fileUrl,
  fileName,
  fileType,
  className,
}: UniversalDocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docxContent, setDocxContent] = useState<string>('')
  const [fileUrlTest, setFileUrlTest] = useState<{
    url: string
    working: boolean
  } | null>(null)
  const [debugInfo, setDebugInfo] = useState<{
    detectedType: string
    fileExtension: string
    mimeType: string
    urlStatus: string
  }>({
    detectedType: '',
    fileExtension: '',
    mimeType: fileType,
    urlStatus: 'Not tested',
  })

  // Extract file extension from name
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''

  // Determine viewer type based on file type and extension
  const getViewerType = () => {
    const type = fileType.toLowerCase()
    const ext = fileExtension.toLowerCase()

    if (type.includes('pdf') || ext === 'pdf') {
      return 'pdf'
    } else if (
      type.includes('word') ||
      type.includes('document') ||
      ext === 'doc' ||
      ext === 'docx'
    ) {
      return 'docx'
    } else if (
      type.includes('excel') ||
      type.includes('sheet') ||
      ext === 'xls' ||
      ext === 'xlsx'
    ) {
      return 'office'
    } else if (
      type.includes('presentation') ||
      ext === 'ppt' ||
      ext === 'pptx'
    ) {
      return 'office'
    } else if (
      type.includes('image') ||
      ext === 'jpg' ||
      ext === 'jpeg' ||
      ext === 'png' ||
      ext === 'gif' ||
      ext === 'webp'
    ) {
      return 'image'
    } else if (
      type.includes('text') ||
      type.includes('plain') ||
      ext === 'txt'
    ) {
      return 'text'
    } else {
      return 'unknown'
    }
  }

  const viewerType = getViewerType()

  useEffect(() => {
    // Use functional updates to avoid dependency on debugInfo
    setDebugInfo(prev => ({
      ...prev,
      detectedType: viewerType,
      fileExtension,
      mimeType: fileType,
    }))

    // Test if the URL is accessible
    const testFileUrl = async () => {
      try {
        const response = await fetch(fileUrl, { method: 'HEAD' })
        setFileUrlTest({
          url: fileUrl,
          working: response.ok,
        })
        setDebugInfo(prev => ({
          ...prev,
          urlStatus: response.ok ? 'Accessible' : `Error: ${response.status}`,
        }))
      } catch (error: unknown) {
        setFileUrlTest({
          url: fileUrl,
          working: false,
        })
        setDebugInfo(prev => ({
          ...prev,
          urlStatus: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }))
      }
    }

    testFileUrl()

    // For DOCX files, we need to fetch and convert the content
    const fetchDocxContent = async () => {
      if (viewerType === 'docx') {
        try {
          setIsLoading(true)
          const response = await fetch(fileUrl)
          const blob = await response.blob()
          // Simplified DOCX handling - just show a download link
          setDocxContent(`
            <div class="docx-fallback">
              <p>DOCX preview is not fully supported.</p>
              <p>Please <a href="${fileUrl}" download="${fileName}">download the file</a> to view it in your preferred application.</p>
            </div>
          `)
          setError(null)
        } catch (err: unknown) {
          console.error('Error loading DOCX:', err)
          setError(
            `Error loading document: ${err instanceof Error ? err.message : 'Unknown error'}`,
          )
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchDocxContent()
  }, [fileUrl, viewerType, fileType, fileExtension, fileName])

  // File icon based on type
  const getFileIcon = () => {
    switch (viewerType) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'office':
        return <FileText className="h-4 w-4 text-green-500" />
      case 'image':
        return <ImageIcon className="h-4 w-4 text-purple-500" />
      case 'text':
        return <FileText className="h-4 w-4 text-gray-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  // PDF document loading handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error('Error loading PDF:', err)
    setError(`Error loading document: ${err.message}`)
    setIsLoading(false)
  }

  // Page navigation for PDFs
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1))
  const goToNextPage = () =>
    setPageNumber(prev => Math.min(prev + 1, numPages || 1))

  // Render the appropriate viewer based on file type
  const renderViewer = () => {
    switch (viewerType) {
      case 'pdf':
        return (
          <div className="pdf-viewer">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-500">
                Page {pageNumber} of {numPages || '?'}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={pageNumber >= (numPages || 1)}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="relative border rounded-md overflow-hidden bg-white">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex justify-center p-4">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                }
                error={
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load PDF. Please check if the file is
                      accessible.
                    </AlertDescription>
                  </Alert>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={550}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          </div>
        )

      case 'docx':
        return (
          <div className="docx-viewer">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div
                className="docx-content border rounded-md p-4 bg-white prose max-w-none"
                dangerouslySetInnerHTML={{ __html: docxContent }}
              />
            )}
          </div>
        )

      case 'image':
        return (
          <div className="image-viewer border rounded-md overflow-hidden bg-white">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full h-auto"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Failed to load image')
                setIsLoading(false)
              }}
            />
          </div>
        )

      case 'text':
        return (
          <div className="text-viewer">
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[600px] border rounded-md bg-white"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Failed to load text file')
                setIsLoading(false)
              }}
            />
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-gray-50">
            <File className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500 mb-4">
              This file type cannot be previewed
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in new tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = fileUrl
                  link.download = fileName
                  link.click()
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={cn('universal-document-viewer', className)}>
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading && viewerType !== 'pdf' ? (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <p className="text-center text-gray-500 flex flex-col items-center">
              <RefreshCw className="h-6 w-6 animate-spin mb-2" />
              {viewerType !== 'unknown'
                ? `Loading ${viewerType.toUpperCase()} document...`
                : 'Detecting document type...'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="document-content">
          <div className="document-header flex items-center gap-2 mb-2">
            {getFileIcon()}
            <span className="text-sm font-medium">
              {viewerType.toUpperCase()} Document
            </span>
            {fileUrlTest && (
              <span className="ml-auto flex items-center text-xs">
                {fileUrlTest.working ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-600">File accessible</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-600">URL issue</span>
                  </>
                )}
              </span>
            )}
          </div>

          {renderViewer()}
        </div>
      )}
    </div>
  )
}

// Make sure to export both as named and default export
export { UniversalDocumentViewer }
export default UniversalDocumentViewer
