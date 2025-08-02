import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { documentService } from '@/services/hybrid'
import { useToast } from '@/hooks/use-toast'

interface Document {
  id: string
  name: string
  projectId: string
  status: string
  size: number | string
  type?: string
  url?: string
  s3Key?: string
  content?: string
  createdAt?: string
}

interface TestResult {
  documentId: string
  timestamp: string
  results: {
    hybridService?: {
      success: boolean
      data?: Document
      error?: string
    }
    foundInProject?: {
      success: boolean
      data?: Document
      totalInProject: number
      error?: string
    }
  }
}

interface DocumentDebuggerProps {
  companyId: string
  projectId?: string
}

export const DocumentDebugger: React.FC<DocumentDebuggerProps> = ({
  companyId,
  projectId,
}) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const { toast } = useToast()

  const loadAllDocuments = useCallback(async () => {
    setLoading(true)
    try {
      console.log('DocumentDebugger: Loading all documents...')
      const allDocs = await documentService.getAllDocuments()
      console.log('DocumentDebugger: Found documents:', allDocs)
      setDocuments(allDocs as Document[])
    } catch (error) {
      console.error('DocumentDebugger: Error loading documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const testDocumentRetrieval = async (documentId: string) => {
    const testResult: TestResult = {
      documentId,
      timestamp: new Date().toISOString(),
      results: {},
    }

    try {
      console.log(`DocumentDebugger: Testing retrieval for ${documentId}`)

      // Test 1: Direct database fetch using hybrid service
      try {
        const dbResult = await documentService.getDocument(
          companyId,
          projectId || '',
          documentId,
        )
        testResult.results.hybridService = {
          success: true,
          data: dbResult,
        }
        console.log('DocumentDebugger: Hybrid service result:', dbResult)
      } catch (error) {
        testResult.results.hybridService = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
        console.error('DocumentDebugger: Hybrid service error:', error)
      }

      // Test 2: Check if document exists by listing ALL documents and finding by project
      try {
        const allDocs = await documentService.getAllDocuments()
        console.log(
          'DocumentDebugger: All documents from getAllDocuments:',
          allDocs,
        )

        // Find documents that belong to the specified project
        const docsInProject = allDocs.filter(doc => doc.projectId === projectId)
        console.log(
          `DocumentDebugger: Documents in project ${projectId}:`,
          docsInProject,
        )

        // Find our target document
        const foundInAllDocs = allDocs.find(doc => doc.id === documentId)
        console.log(
          'DocumentDebugger: Target document found in all docs:',
          foundInAllDocs,
        )

        // Check specific project documents using getDocumentsByProject
        let projectDocsResult = null
        if (projectId) {
          try {
            const projectDocs =
              await documentService.getDocumentsByProject(projectId)
            console.log(
              'DocumentDebugger: getDocumentsByProject result:',
              projectDocs,
            )
            projectDocsResult = projectDocs.find(doc => doc.id === documentId)
          } catch (projError) {
            console.error(
              'DocumentDebugger: getDocumentsByProject error:',
              projError,
            )
          }
        }

        testResult.results.foundInProject = {
          success: !!projectDocsResult,
          data: projectDocsResult,
          totalInProject: docsInProject.length,
          error: !projectDocsResult
            ? `Document not found in project documents. Found in all docs: ${!!foundInAllDocs}. Project of found doc: ${foundInAllDocs?.projectId}`
            : undefined,
        }
      } catch (error) {
        testResult.results.foundInProject = {
          success: false,
          totalInProject: 0,
          error: error instanceof Error ? error.message : String(error),
        }
      }

      setTestResults(prev => [testResult, ...prev.slice(0, 4)]) // Keep last 5 tests
    } catch (error) {
      console.error('DocumentDebugger: Test error:', error)
    }
  }

  useEffect(() => {
    loadAllDocuments()
  }, [loadAllDocuments])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Storage Debugger</CardTitle>
          <p className="text-sm text-muted-foreground">
            Company: {companyId} | Project: {projectId || 'All Projects'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadAllDocuments} disabled={loading}>
              {loading ? 'Loading...' : 'Reload Documents'}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              All Documents ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <p className="text-muted-foreground">No documents found</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div key={doc.id || index} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {doc.id} | Project: {doc.projectId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: {doc.status} | Size: {doc.size} | Type:{' '}
                          {doc.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          URL: {doc.url ? '✅ Present' : '❌ Missing'} |
                          Content: {doc.content ? '✅ Present' : '❌ Missing'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created:{' '}
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleString()
                            : 'No date'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => testDocumentRetrieval(doc.id)}
                        disabled={!doc.id}
                      >
                        Test Retrieval
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {testResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div key={index} className="border rounded p-3 bg-muted/20">
                    <p className="font-medium">Document: {test.documentId}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {test.timestamp}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div>
                        Hybrid Service:{' '}
                        {test.results.hybridService?.success ? (
                          <span className="text-green-600">✅ Success</span>
                        ) : (
                          <span className="text-red-600">
                            ❌ {test.results.hybridService?.error}
                          </span>
                        )}
                      </div>
                      {test.results.foundInProject && (
                        <div>
                          Found in Project:{' '}
                          {test.results.foundInProject.success ? (
                            <span className="text-green-600">
                              ✅ Found (
                              {test.results.foundInProject.totalInProject}{' '}
                              total)
                            </span>
                          ) : (
                            <span className="text-red-600">
                              ❌ Not found in project
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
