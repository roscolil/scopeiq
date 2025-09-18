import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

interface PDFViewerProps {
  document: {
    id: string
    name: string
    url?: string | null
    s3Url?: string | null
    type: string
    content?: string | null
  }
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ document }) => {
  const [embedError, setEmbedError] = useState(false)

  // Add null check for document
  if (!document) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Document not found or still loading.
        </AlertDescription>
      </Alert>
    )
  }

  const primaryUrl = document.url || document.s3Url
  const fallbackUrl = document.url ? document.s3Url : document.url

  if (!primaryUrl) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No PDF URL available. The document may still be processing.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      {/* <CardHeader> */}
      {/* <CardTitle className="text-lg flex items-center gap-2">
          📄 {document.name}
        </CardTitle> */}
      {/* </CardHeader> */}
      <CardContent className="space-y-4 pt-6">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              window.open(primaryUrl, '_blank')
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>

          {/* <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch(primaryUrl)

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
                }

                const blob = await response.blob()
                const blobUrl = window.URL.createObjectURL(blob)

                const link = window.document.createElement('a')
                link.href = blobUrl
                link.download = document.name
                window.document.body?.appendChild(link)
                link.click()
                window.document.body?.removeChild(link)

                window.URL.revokeObjectURL(blobUrl)
              } catch (error) {
                console.error('PDF download failed:', error)
                // Fallback to direct link
                const link = window.document.createElement('a')
                link.href = primaryUrl
                link.download = document.name
                link.target = '_blank'
                link.click()
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button> */}

          {fallbackUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(fallbackUrl, '_blank')
              }}
            >
              Try Alternate URL
            </Button>
          )}
        </div>

        {/* PDF Embed - Uses inline URL with Content-Disposition: inline */}
        {!embedError ? (
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={`${primaryUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-[600px]"
              title={document.name}
              onError={() => {
                setEmbedError(true)
              }}
            />
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Could not embed PDF directly. This might be due to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>CORS restrictions from the PDF server</li>
                <li>Expired or invalid URL</li>
                <li>PDF file is corrupted or not accessible</li>
              </ul>
              <div className="mt-3">
                <strong>Debug info:</strong>
                <pre className="text-xs mt-1 p-2 bg-gray-100 rounded">
                  Primary URL: {primaryUrl}
                  {fallbackUrl && `\nFallback URL: ${fallbackUrl}`}
                </pre>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Reset button if embed failed */}
        {embedError && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmbedError(false)}
          >
            Try Embed Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
