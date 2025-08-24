import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { databaseDocumentService } from '@/services/data/database'

interface DocumentInfo {
  id: string
  name: string
  projectId: string
  s3Key: string
  status: string
}

export const DocumentIDFinder: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('DocumentIDFinder: Loading all documents...')
      const allDocs = await databaseDocumentService.getAllDocuments()
      console.log('DocumentIDFinder: Found documents:', allDocs)

      const docInfo: DocumentInfo[] = allDocs.map(doc => ({
        id: doc.id,
        name: doc.name,
        projectId: doc.projectId,
        s3Key: doc.s3Key,
        status: doc.status,
      }))

      setDocuments(docInfo)
    } catch (err) {
      console.error('DocumentIDFinder: Error loading documents:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text)
    })
  }

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>Document ID Finder</CardTitle>
        <p className="text-sm text-gray-600">
          Find the actual document IDs to use for testing. Click on an ID to
          copy it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={loadDocuments} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Documents'}
        </Button>

        {error && (
          <div className="p-3 border border-red-300 rounded bg-red-50">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {documents.length === 0 && !loading && !error && (
          <div className="p-3 border border-yellow-300 rounded bg-yellow-50">
            <p className="text-yellow-700">No documents found in database</p>
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">
              Found {documents.length} documents:
            </h4>
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="border rounded p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Name:</strong> {doc.name}
                    </div>
                    <div>
                      <strong>Status:</strong> {doc.status}
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong>Document ID:</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">
                        {doc.id}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(doc.id)}
                        className="text-xs"
                      >
                        Copy ID
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong>Project ID:</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">
                        {doc.projectId}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(doc.projectId)}
                        className="text-xs"
                      >
                        Copy Project ID
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong>S3 Key:</strong>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all ml-2">
                      {doc.s3Key}
                    </code>
                  </div>

                  {doc.name.toLowerCase().includes('pitch') && (
                    <div className="text-sm text-blue-600 font-medium">
                      🎯 This might be your document! Use the ID above for
                      testing.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
