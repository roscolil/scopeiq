/**
 * Upload Flow Test Component
 * This component helps test the new background processing upload flow
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { semanticSearch } from '@/services/embedding'
import { processEmbeddingOnly } from '@/services/embedding-simple'
import { Spinner } from '@/components/Spinner'

const UploadFlowTest = () => {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setTestResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ])
  }

  const testSearch = async () => {
    setIsLoading(true)
    addResult('🔍 Testing semantic search...')

    try {
      const testProjectId = 'test-project-123'
      const testQuery = 'test document'

      addResult(`Searching project "${testProjectId}" for "${testQuery}"`)

      const results = await semanticSearch({
        projectId: testProjectId,
        query: testQuery,
        topK: 5,
      })

      addResult(
        `Search completed. Results: ${JSON.stringify(results, null, 2)}`,
      )

      if (results.ids && results.ids[0] && results.ids[0].length > 0) {
        addResult(`✅ Found ${results.ids[0].length} documents`)
      } else {
        addResult(
          '❌ No documents found - this might mean no embeddings exist yet',
        )
      }
    } catch (error) {
      addResult(
        `❌ Search failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  const testBackgroundProcessing = async () => {
    setIsLoading(true)
    addResult('🔧 Testing embedding processing...')

    try {
      const testData = {
        projectId: 'test-project-123',
        documentId: 'test-doc-' + Date.now(),
        content:
          'This is a test document for semantic search. It contains information about project testing and background processing.',
        metadata: {
          name: 'Test Document.txt',
          type: 'text/plain',
          url: 'https://test-url.com/test-file.txt',
          s3Key: 'test-documents/test-file.txt',
          companyId: 'test-company',
          size: 1024,
        },
      }

      addResult('Starting embedding processing...')

      await processEmbeddingOnly(
        testData.projectId,
        testData.documentId,
        testData.content,
        testData.metadata,
      )

      addResult('✅ Embedding processing completed successfully')
    } catch (error) {
      addResult(
        `❌ Embedding processing failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>🧪 Upload Flow Test Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use this dashboard to test the new background processing upload flow
            and semantic search functionality.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={testSearch} disabled={isLoading} variant="outline">
            {isLoading ? <Spinner size="sm" /> : '🔍'} Test Search
          </Button>

          <Button
            onClick={testBackgroundProcessing}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? <Spinner size="sm" /> : '🔧'} Test Background
            Processing
          </Button>

          <Button onClick={clearResults} variant="outline">
            🧹 Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UploadFlowTest
