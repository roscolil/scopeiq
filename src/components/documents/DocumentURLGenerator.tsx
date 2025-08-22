import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, RefreshCw } from 'lucide-react'

export const DocumentURLGenerator: React.FC = () => {
  const [documentId, setDocumentId] = useState('')
  const [urls, setUrls] = useState<{
    url: string
    s3Url: string
    status: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateFreshURLs = async () => {
    if (!documentId.trim()) {
      setError('Please enter a document ID')
      return
    }

    setLoading(true)
    setError('')
    setUrls(null)

    try {
      // This would call your backend API to regenerate URLs
      // For now, we'll simulate what should happen

      // In a real implementation, this would:
      // 1. Look up the document in the database
      // 2. Generate new pre-signed URLs with longer expiration
      // 3. Update the database with new URLs
      // 4. Return the fresh URLs

      setError(
        'URL generation not implemented yet. This component shows what needs to be built.',
      )

      // Mock what the response should look like:
      const mockUrls = {
        url: `https://your-bucket.s3.amazonaws.com/documents/${documentId}.pdf?X-Amz-Algorithm=...`,
        s3Url: `https://your-bucket.s3.amazonaws.com/documents/${documentId}.pdf?X-Amz-Algorithm=...`,
        status: 'Fresh URLs generated with 24-hour expiration',
      }

      // Uncomment when API is ready:
      // setUrls(mockUrls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate URLs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔄 Document URL Regenerator
        </CardTitle>
        <p className="text-sm text-gray-600">
          Generate fresh, non-expired URLs for your documents
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <strong>Purpose:</strong> If your URLs are expired or invalid, this
            tool will generate fresh ones with longer expiration times.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Document ID:</label>
          <div className="flex gap-2">
            <Input
              value={documentId}
              onChange={e => setDocumentId(e.target.value)}
              placeholder="Enter document UUID"
              className="flex-1"
            />
            <Button
              onClick={generateFreshURLs}
              disabled={loading || !documentId.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? 'Generating...' : 'Generate Fresh URLs'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {urls && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                <strong>✅ Success:</strong> {urls.status}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Primary URL:
                </label>
                <div className="flex gap-2">
                  <Input value={urls.url} readOnly className="flex-1 text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(urls.url)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  S3 URL:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={urls.s3Url}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(urls.s3Url)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            <strong>🚧 To implement this feature, you need to:</strong>
            <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
              <li>Create an API endpoint that accepts a document ID</li>
              <li>Look up the document in your database to get S3 key</li>
              <li>
                Generate new pre-signed URLs with longer expiration (24+ hours)
              </li>
              <li>Update the database with the new URLs</li>
              <li>Return the fresh URLs to the frontend</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">
            💡 Backend Implementation Example:
          </h4>
          <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
            {`// API Route: POST /api/documents/:id/regenerate-urls
const regenerateDocumentURLs = async (documentId) => {
  // 1. Get document from database
  const doc = await db.documents.findById(documentId)
  
  // 2. Generate new pre-signed URLs (24 hour expiry)
  const newUrl = await generateSignedUrl(doc.s3Key, 86400)
  
  // 3. Update database
  await db.documents.update(documentId, {
    url: newUrl,
    s3Url: newUrl,
    updatedAt: new Date()
  })
  
  return { url: newUrl, s3Url: newUrl }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
