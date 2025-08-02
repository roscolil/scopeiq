import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { documentService, projectService } from '@/services/hybrid'
import { createSlug } from '@/utils/navigation'

interface TestStep {
  step: number
  action: string
  input?: unknown
  success?: boolean
  result?: unknown
  error?: string
}

interface TestResults {
  urlParams: { companyId: string; projectSlug: string; documentSlug: string }
  steps: TestStep[]
  resolvedProject?: { id: string; name: string }
  directDocument?: { id: string; name: string }
  allProjectDocuments?: { id: string; name: string }[]
  foundBySlug?: { id: string; name: string }
}

export const ViewerDebugger: React.FC = () => {
  const [companyId, setCompanyId] = useState('scopeiq-mvp')
  const [projectSlug, setProjectSlug] = useState('')
  const [documentSlug, setDocumentSlug] = useState('')
  const [results, setResults] = useState<TestResults | null>(null)
  const [loading, setLoading] = useState(false)

  const testViewerFlow = async () => {
    if (!projectSlug || !documentSlug) return

    setLoading(true)
    const testResults: TestResults = {
      urlParams: { companyId, projectSlug, documentSlug },
      steps: [],
    }

    try {
      // Step 1: Resolve project slug
      console.log('ViewerDebugger: Step 1 - Resolve project slug')
      testResults.steps.push({
        step: 1,
        action: 'Resolve project slug',
        input: projectSlug,
      })

      try {
        const projectData = await projectService.resolveProject(projectSlug)
        testResults.steps[0].success = true
        testResults.steps[0].result = projectData
        testResults.resolvedProject = projectData
      } catch (error) {
        testResults.steps[0].success = false
        testResults.steps[0].error =
          error instanceof Error ? error.message : String(error)
      }

      if (testResults.resolvedProject) {
        // Step 2: Try direct document lookup
        console.log('ViewerDebugger: Step 2 - Direct document lookup')
        testResults.steps.push({
          step: 2,
          action: 'Direct document lookup',
          input: {
            companyId,
            projectId: testResults.resolvedProject.id,
            documentId: documentSlug,
          },
        })

        try {
          const directDoc = await documentService.getDocument(
            companyId,
            testResults.resolvedProject.id,
            documentSlug,
          )
          testResults.steps[1].success = true
          testResults.steps[1].result = directDoc
          testResults.directDocument = directDoc
        } catch (error) {
          testResults.steps[1].success = false
          testResults.steps[1].error =
            error instanceof Error ? error.message : String(error)
        }

        // Step 3: Get all project documents
        console.log('ViewerDebugger: Step 3 - Get all project documents')
        testResults.steps.push({
          step: 3,
          action: 'Get all project documents',
          input: testResults.resolvedProject.id,
        })

        try {
          const allProjectDocs = await documentService.getDocumentsByProject(
            testResults.resolvedProject.id,
          )
          testResults.steps[2].success = true
          testResults.steps[2].result = allProjectDocs
          testResults.allProjectDocuments = allProjectDocs

          // Step 4: Search by slug
          console.log('ViewerDebugger: Step 4 - Search by slug')
          testResults.steps.push({
            step: 4,
            action: 'Search by slug',
            input: documentSlug,
          })

          // Show slug generation for each document
          const documentSlugComparisons = allProjectDocs.map(doc => {
            const viewerSlug = doc.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
            const navigationSlug = createSlug(doc.name)

            return {
              id: doc.id,
              name: doc.name,
              viewerSlug,
              navigationSlug,
              matchesViewer: viewerSlug === documentSlug,
              matchesNavigation: navigationSlug === documentSlug,
              matchesId: doc.id === documentSlug,
            }
          })

          console.log(
            'ViewerDebugger: Slug comparison details:',
            documentSlugComparisons,
          )

          const foundBySlug = allProjectDocs.find(doc => {
            const docSlug = doc.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
            const navigationSlug = createSlug(doc.name)
            return (
              docSlug === documentSlug ||
              navigationSlug === documentSlug ||
              doc.id === documentSlug
            )
          })

          testResults.steps[3].success = true
          testResults.steps[3].result = {
            foundDocument: foundBySlug,
            slugComparisons: documentSlugComparisons,
          }
          testResults.foundBySlug = foundBySlug
        } catch (error) {
          testResults.steps[2].success = false
          testResults.steps[2].error =
            error instanceof Error ? error.message : String(error)
        }
      }

      setResults(testResults)
    } catch (error) {
      console.error('ViewerDebugger: Test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>Viewer Flow Debugger</CardTitle>
        <p className="text-sm text-gray-600">
          Test the exact flow that the Viewer page uses to resolve documents
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border rounded px-2 py-1"
            placeholder="Company ID"
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Project Slug"
            value={projectSlug}
            onChange={e => setProjectSlug(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Document Slug"
            value={documentSlug}
            onChange={e => setDocumentSlug(e.target.value)}
          />
        </div>

        <Button
          onClick={testViewerFlow}
          disabled={loading || !projectSlug || !documentSlug}
          className="w-full"
        >
          {loading ? 'Testing Viewer Flow...' : 'Test Viewer Flow'}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold">URL Parameters:</h4>
              <pre className="text-sm">
                {JSON.stringify(results.urlParams, null, 2)}
              </pre>
            </div>

            {results.steps.map((step: TestStep, index: number) => (
              <div key={index} className="border rounded p-3">
                <h4 className="font-semibold">
                  Step {step.step}: {step.action}
                  {step.success ? ' ✅' : ' ❌'}
                </h4>

                {step.input && (
                  <div className="mt-2">
                    <strong>Input:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                      {typeof step.input === 'string'
                        ? step.input
                        : JSON.stringify(step.input, null, 2)}
                    </pre>
                  </div>
                )}

                {step.success && step.result && (
                  <div className="mt-2">
                    <strong>Result:</strong>
                    <pre className="text-xs bg-green-50 p-2 rounded mt-1 max-h-40 overflow-y-auto">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                )}

                {!step.success && step.error && (
                  <div className="mt-2">
                    <strong>Error:</strong>
                    <pre className="text-xs bg-red-50 p-2 rounded mt-1 text-red-700">
                      {step.error}
                    </pre>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-semibold">Final Result:</h4>
              <p className="text-sm">
                Document found:{' '}
                {results.foundBySlug || results.directDocument
                  ? '✅ Yes'
                  : '❌ No'}
              </p>
              {results.foundBySlug && (
                <p className="text-sm">
                  Found by slug search: {results.foundBySlug.name}
                </p>
              )}
              {results.directDocument && (
                <p className="text-sm">
                  Found by direct lookup: {results.directDocument.name}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
