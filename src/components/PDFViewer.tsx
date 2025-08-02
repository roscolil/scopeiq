import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'

interface PDFViewerProps {
  document: {
    id: string
    name: string
    url?: string | null
    s3Url?: string | null
    type: string
  }
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ document }) => {
  const [embedError, setEmbedError] = useState(false)
  const [testing, setTesting] = useState(false)
  const [urlTest, setUrlTest] = useState<{
    url: string
    working: boolean
  } | null>(null)

  const testPDFUrl = async (url: string) => {
    setTesting(true)
    try {
      const response = await fetch(url, { method: 'HEAD' })
      setUrlTest({ url, working: response.ok })
    } catch (error) {
      console.error('URL test failed:', error)
      setUrlTest({ url, working: false })
    } finally {
      setTesting(false)
    }
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
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📄 {document.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Testing */}
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => testPDFUrl(primaryUrl)}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test PDF URL'}
          </Button>
          {urlTest && (
            <div className="flex items-center gap-2 text-sm">
              {urlTest.working ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span>URL {urlTest.working ? 'accessible' : 'failed'}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              console.log('Opening PDF URL:', primaryUrl)
              window.open(primaryUrl, '_blank')
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              try {
                console.log('Downloading PDF from URL:', primaryUrl)
                const response = await fetch(primaryUrl)

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
                }

                const blob = await response.blob()
                const blobUrl = window.URL.createObjectURL(blob)

                const link = window.document.createElement('a')
                link.href = blobUrl
                link.download = document.name
                document.body?.appendChild(link)
                link.click()
                document.body?.removeChild(link)

                window.URL.revokeObjectURL(blobUrl)
                console.log('PDF download initiated for:', document.name)
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
          </Button>

          {fallbackUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Trying fallback URL:', fallbackUrl)
                window.open(fallbackUrl, '_blank')
              }}
            >
              Try Alternate URL
            </Button>
          )}
        </div>

        {/* PDF Embed */}
        {!embedError ? (
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={`${primaryUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-[600px]"
              title={document.name}
              onError={() => {
                console.error('PDF iframe failed to load')
                console.error('Primary URL:', primaryUrl)
                console.error('Fallback URL:', fallbackUrl)
                setEmbedError(true)
              }}
              onLoad={() => {
                console.log('PDF iframe loaded successfully')
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
