import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PDFDiagnostic } from '@/components/PDFDiagnostic'
import { URLTroubleshooter } from '@/components/URLTroubleshooter'
import { DocumentURLGenerator } from '@/components/DocumentURLGenerator'
import { CORSTestComponent } from '@/components/CORSTestComponent'
import { UploadCORSDiagnostic } from '@/components/UploadCORSDiagnostic'
import { UploadCORSHelp } from '@/components/UploadCORSHelp'
import { PDFViewingCORSDiagnostic } from '@/components/PDFViewingCORSDiagnostic'
import { DocumentURLRefresher } from '@/components/DocumentURLRefresher'
import S3KeyDiagnostic from '@/components/S3KeyDiagnostic'

interface DocumentForDiagnostic {
  id: string
  name: string
  url?: string | null
  s3Url?: string | null
  type: string
}

export default function SimplePDFDiagnosticTest() {
  const [documentId, setDocumentId] = useState('')
  const [document, setDocument] = useState<DocumentForDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    {
      id: 'sample-3',
      name: 'Sample S3 PDF (Likely Access Denied)',
      url: 'https://s3.amazonaws.com/example-bucket/test.pdf',
      type: 'application/pdf',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 PDF Access Diagnostic Tool
          </h1>
          <p className="text-gray-600">
            Diagnose PDF access issues and CORS problems
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🧪 Test Sample Documents</CardTitle>
            <p className="text-gray-600">
              Test with different types of URLs to see how they behave
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {sampleDocuments.map(sample => (
                <Button
                  key={sample.id}
                  variant="outline"
                  onClick={() => setDocument(sample)}
                  className="w-full justify-start text-left h-auto p-4"
                >
                  <div>
                    <div className="font-medium">{sample.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {sample.url}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <URLTroubleshooter />

        <PDFViewingCORSDiagnostic />

        <DocumentURLRefresher />

        <S3KeyDiagnostic />

        <UploadCORSHelp />

        <UploadCORSDiagnostic />

        <CORSTestComponent />

        <DocumentURLGenerator />

        <Card>
          <CardHeader>
            <CardTitle>📝 Test Custom URL</CardTitle>
            <p className="text-gray-600">Enter your own PDF URL to test</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  PDF URL:
                </label>
                <Input
                  value={documentId}
                  onChange={e => setDocumentId(e.target.value)}
                  placeholder="https://your-domain.com/path/to/document.pdf"
                  className="w-full"
                />
              </div>
              <Button
                onClick={() => {
                  if (documentId.trim()) {
                    setDocument({
                      id: 'custom',
                      name: 'Custom PDF Test',
                      url: documentId.trim(),
                      type: 'application/pdf',
                    })
                  }
                }}
                disabled={!documentId.trim()}
                className="w-full"
              >
                Test Custom URL
              </Button>
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
                    <strong>URL:</strong> {document.url || 'None'}
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
                <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
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
                <h4 className="font-semibold text-blue-600">🔧 Quick Fixes:</h4>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-700">
                  <li>Run diagnostic above to identify specific issue</li>
                  <li>
                    Try opening URL in new tab to bypass some CORS restrictions
                  </li>
                  <li>
                    Check if URL works in incognito mode (rules out cache
                    issues)
                  </li>
                  <li>
                    Verify S3 bucket CORS configuration allows your domain
                  </li>
                  <li>
                    For expired URLs, re-upload document to generate new ones
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-green-600">
                  ✅ What Should Work:
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
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
    </div>
  )
}
