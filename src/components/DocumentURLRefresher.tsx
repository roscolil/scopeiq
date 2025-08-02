import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { documentService } from '@/services/hybrid'

interface RefreshResult {
  success: boolean
  message: string
  newUrl?: string
  error?: string
}

export const DocumentURLRefresher: React.FC = () => {
  const [documentId, setDocumentId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [result, setResult] = useState<RefreshResult | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refreshDocumentUrl = async () => {
    if (!documentId.trim() || !projectId.trim() || !companyId.trim()) {
      setResult({
        success: false,
        message: 'Please provide Document ID, Project ID, and Company ID',
        error: 'Missing required fields',
      })
      return
    }

    setRefreshing(true)
    setResult(null)

    try {
      console.log(`Refreshing URL for document: ${documentId}`)

      // Call the refresh function we just added
      const refreshedDocument = await documentService.refreshDocumentUrl(
        companyId.trim(),
        projectId.trim(),
        documentId.trim(),
      )

      if (refreshedDocument) {
        setResult({
          success: true,
          message: 'Document URL refreshed successfully!',
          newUrl: refreshedDocument.url,
        })
      } else {
        setResult({
          success: false,
          message: 'Document not found or could not be refreshed',
          error: 'Document not found',
        })
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      setResult({
        success: false,
        message: 'Failed to refresh document URL',
        error: errorMessage,
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Document URL Refresher
        </CardTitle>
        <p className="text-sm text-gray-600">
          Generate fresh pre-signed URLs for documents with expired access
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>🔄 Use this tool when:</strong> Getting "access denied"
            errors due to expired URLs. This generates fresh pre-signed URLs
            that are valid for 1 hour.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Document ID:
            </label>
            <Input
              value={documentId}
              onChange={e => setDocumentId(e.target.value)}
              placeholder="e.g., doc_1754147783169_..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Project ID:
            </label>
            <Input
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              placeholder="e.g., 30e71972-d005-40c7..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Company ID:
            </label>
            <Input
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              placeholder="e.g., test"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={refreshDocumentUrl}
            disabled={
              refreshing ||
              !documentId.trim() ||
              !projectId.trim() ||
              !companyId.trim()
            }
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshing ? 'Refreshing...' : 'Refresh URL'}
          </Button>
        </div>

        {result && (
          <Alert
            className={
              result.success
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div
                  className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}
                >
                  {result.message}
                </div>
                {result.newUrl && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-green-700 mb-1">
                      New URL:
                    </div>
                    <div className="text-xs bg-white p-2 rounded border break-all">
                      {result.newUrl}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ✅ This URL will work for 1 hour
                    </div>
                  </div>
                )}
                {result.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>💡 Pro Tip:</strong> After refreshing, all existing
            bookmarks or links to this document will need to use the new URL.
            The system will automatically use fresh URLs when you access
            documents through the app.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to find your IDs:</h4>
          <ul className="text-sm space-y-1">
            <li>
              • <strong>Document ID:</strong> Found in the URL when viewing a
              document
            </li>
            <li>
              • <strong>Project ID:</strong> Found in the project URL or project
              settings
            </li>
            <li>
              • <strong>Company ID:</strong> Usually your organization
              identifier (often "test" for testing)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
