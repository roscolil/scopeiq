import React, { useState } from 'react'
import { Badge } from './Badge'
import { hybridDocumentService } from '@/services/hybrid'
import { generatePreSignedUrl } from '@/services/documentUpload'
import { databaseDocumentService } from '@/services/database'

interface S3KeyDiagnosticProps {
  className?: string
}

interface KeyCheckResult {
  documentId: string
  documentName: string
  storedKey: string
  keyExists: boolean
  alternativeKey?: string
  alternativeKeyExists?: boolean
  error?: string
}

export default function S3KeyDiagnostic({
  className = '',
}: S3KeyDiagnosticProps) {
  const [projectId, setProjectId] = useState('')
  const [companyId, setCompanyId] = useState('test')
  const [results, setResults] = useState<KeyCheckResult[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)

  const checkS3Keys = async () => {
    if (!projectId.trim()) {
      alert('Please enter a Project ID')
      return
    }

    setIsChecking(true)
    setResults([])

    try {
      // Get all documents for the project
      const documents =
        await hybridDocumentService.getDocumentsByProject(projectId)
      console.log(`Found ${documents.length} documents to check`)

      const checkResults: KeyCheckResult[] = []

      for (const doc of documents) {
        const result: KeyCheckResult = {
          documentId: doc.id,
          documentName: doc.name,
          storedKey: '', // Will be filled from database
          keyExists: false,
        }

        try {
          // Get the raw database document to access s3Key
          const dbDoc = await databaseDocumentService.getDocument(doc.id)
          if (!dbDoc || !dbDoc.s3Key) {
            result.error = 'No S3 key stored in database'
            checkResults.push(result)
            continue
          }

          result.storedKey = dbDoc.s3Key

          // Try to generate a pre-signed URL with the stored key
          try {
            await generatePreSignedUrl(dbDoc.s3Key, 10) // Short expiry for testing
            result.keyExists = true
            console.log(`✅ Key exists: ${dbDoc.s3Key}`)
          } catch (error) {
            result.keyExists = false
            console.log(`❌ Key missing: ${dbDoc.s3Key}`)

            // Try to find the alternative key format (without documentId)
            // Original format: company/project/files/docId_timestamp_filename
            // Upload format: company/project/files/timestamp_filename
            const keyParts = dbDoc.s3Key.split('/')
            if (keyParts.length >= 4) {
              const basePath = keyParts.slice(0, -1).join('/') // company/project/files
              const filename = keyParts[keyParts.length - 1] // docId_timestamp_filename

              // Try to extract the filename without docId prefix
              const underscoreIndex = filename.indexOf('_')
              if (underscoreIndex > 0) {
                const secondUnderscoreIndex = filename.indexOf(
                  '_',
                  underscoreIndex + 1,
                )
                if (secondUnderscoreIndex > 0) {
                  // Extract timestamp_filename part
                  const filenameWithoutDocId = filename.substring(
                    underscoreIndex + 1,
                  )
                  const alternativeKey = `${basePath}/${filenameWithoutDocId}`
                  result.alternativeKey = alternativeKey

                  try {
                    await generatePreSignedUrl(alternativeKey, 10)
                    result.alternativeKeyExists = true
                    console.log(`✅ Alternative key exists: ${alternativeKey}`)
                  } catch {
                    result.alternativeKeyExists = false
                    console.log(
                      `❌ Alternative key also missing: ${alternativeKey}`,
                    )
                  }
                }
              }
            }
          }
        } catch (error) {
          result.error =
            error instanceof Error ? error.message : 'Unknown error'
        }

        checkResults.push(result)
      }

      setResults(checkResults)
    } catch (error) {
      console.error('Error checking S3 keys:', error)
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      setIsChecking(false)
    }
  }

  const fixS3Keys = async () => {
    const fixableResults = results.filter(r => r.alternativeKeyExists)
    if (fixableResults.length === 0) {
      alert('No documents found with fixable S3 key issues')
      return
    }

    if (!confirm(`Fix S3 keys for ${fixableResults.length} documents?`)) {
      return
    }

    setIsFixing(true)

    try {
      for (const result of fixableResults) {
        if (result.alternativeKey) {
          console.log(`Fixing S3 key for document ${result.documentId}`)
          console.log(`From: ${result.storedKey}`)
          console.log(`To: ${result.alternativeKey}`)

          // Update the document with the correct S3 key
          await databaseDocumentService.updateDocument(result.documentId, {
            s3Key: result.alternativeKey,
          })

          // Mark as fixed in results
          result.storedKey = result.alternativeKey
          result.keyExists = true
          result.alternativeKey = undefined
          result.alternativeKeyExists = undefined
        }
      }

      alert(`Successfully fixed S3 keys for ${fixableResults.length} documents`)
      setResults([...results]) // Trigger re-render
    } catch (error) {
      console.error('Error fixing S3 keys:', error)
      alert(
        `Error fixing keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className={`p-6 border rounded-lg bg-white ${className}`}>
      <h3 className="text-lg font-semibold mb-4">S3 Key Diagnostic Tool</h3>
      <p className="text-sm text-gray-600 mb-4">
        Check if stored S3 keys in the database actually exist in S3, and fix
        mismatches.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company ID:</label>
          <input
            type="text"
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., test"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Project ID:</label>
          <input
            type="text"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., 30e71972-d005-40c7-af18-dd1759e0f144"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={checkS3Keys}
            disabled={isChecking}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check S3 Keys'}
          </button>

          {results.some(r => r.alternativeKeyExists) && (
            <button
              onClick={fixS3Keys}
              disabled={isFixing}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isFixing ? 'Fixing...' : 'Fix Found Issues'}
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Results:</h4>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.documentName}</span>
                  <div className="flex gap-2">
                    <Badge variant={result.keyExists ? 'success' : 'error'}>
                      {result.keyExists ? 'Key OK' : 'Key Missing'}
                    </Badge>
                    {result.alternativeKeyExists && (
                      <Badge variant="warning">Alternative Found</Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <strong>Document ID:</strong> {result.documentId}
                  </div>
                  <div>
                    <strong>Stored Key:</strong> {result.storedKey}
                  </div>
                  {result.alternativeKey && (
                    <div>
                      <strong>Alternative Key:</strong> {result.alternativeKey}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-red-600">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <strong>Summary:</strong>
            <div>Total documents: {results.length}</div>
            <div>Keys working: {results.filter(r => r.keyExists).length}</div>
            <div>Keys missing: {results.filter(r => !r.keyExists).length}</div>
            <div>
              Fixable issues:{' '}
              {results.filter(r => r.alternativeKeyExists).length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
