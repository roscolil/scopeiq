import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { documentService } from '@/services/hybrid'
import { PDFDiagnostic } from '@/components/PDFDiagnostic'
import { Layout } from '@/components/Layout'

interface DocumentForDiagnostic {
  id: string
  name: string
  url?: string | null
  s3Url?: string | null
  type: string
}

export default function PDFDiagnosticTest() {
  const [documentId, setDocumentId] = useState('')
  const [document, setDocument] = useState<DocumentForDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDocument = async () => {
    if (!documentId.trim()) {
      setError('Please enter a document ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Try to get the document - we'll use a simplified approach
      // since we don't have the full project context
      const allDocs = await documentService.getAllDocuments()
      const doc = allDocs.find(d => d.id === documentId)

      if (doc) {
        setDocument(doc)
      } else {
        setError(
          'Document not found. Make sure the document ID is correct and you have access to it.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const sampleDocuments = [
    {
      id: 'sample-1',
      name: 'Sample PDF (Valid URL)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'application/pdf',
    },
    {
      id: 'sample-2',
      name: 'Sample PDF (CORS Error)',
      url: 'https://example.com/test.pdf',
      type: 'application/pdf',
    },
  ]

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔧 PDF Access Diagnostic Tool</CardTitle>
            <p className="text-gray-600">
              Diagnose PDF access issues by testing with your documents or
              sample URLs
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription>
                ⚠️ This is a diagnostic tool. Some features may require
                authentication.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter Document ID to Test:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={documentId}
                    onChange={e => setDocumentId(e.target.value)}
                    placeholder="Enter document ID (UUID format)"
                    className="flex-1"
                  />
                  <Button onClick={loadDocument} disabled={loading}>
                    {loading ? 'Loading...' : 'Load Document'}
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

              <div>
                <label className="block text-sm font-medium mb-2">
                  Or test with sample documents:
                </label>
                <div className="space-y-2">
                  {sampleDocuments.map(sample => (
                    <Button
                      key={sample.id}
                      variant="outline"
                      onClick={() => setDocument(sample)}
                      className="w-full justify-start"
                    >
                      Test: {sample.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {document && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📄 Document Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <strong>Name:</strong> {document.name}
                  </div>
                  <div>
                    <strong>ID:</strong> {document.id}
                  </div>
                  <div>
                    <strong>Type:</strong> {document.type}
                  </div>
                  <div>
                    <strong>Primary URL:</strong> {document.url || 'None'}
                  </div>
                  <div>
                    <strong>S3 URL:</strong> {document.s3Url || 'None'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <PDFDiagnostic document={document} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>💡 Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-red-600">
                  🚫 "Access Denied" Errors:
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    <strong>CORS Policy:</strong> S3 bucket needs CORS
                    configuration for browser access
                  </li>
                  <li>
                    <strong>Expired URLs:</strong> Pre-signed URLs have time
                    limits (usually 1 hour)
                  </li>
                  <li>
                    <strong>Authentication:</strong> URL may require AWS
                    credentials or session tokens
                  </li>
                  <li>
                    <strong>Bucket Permissions:</strong> File may be private
                    without proper access
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600">
                  🔧 Troubleshooting Steps:
                </h4>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>
                    Run the diagnostic above to identify the specific issue
                  </li>
                  <li>
                    Check if URL is accessible in a new tab (bypasses some CORS
                    restrictions)
                  </li>
                  <li>Verify CORS configuration on your S3 bucket</li>
                  <li>
                    For expired URLs, re-upload the document to generate new
                    URLs
                  </li>
                  <li>Check browser console for detailed error messages</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-green-600">
                  ✅ What Should Work:
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Valid HTTPS URLs with proper CORS headers</li>
                  <li>Non-expired pre-signed S3 URLs</li>
                  <li>Public S3 objects with read permissions</li>
                  <li>PDF files with correct Content-Type headers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
