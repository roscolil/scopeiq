import { useEffect, useCallback } from 'react'
import { Document } from '@/types'
import { documentService } from '@/services/data/hybrid'

interface UseDocumentStatusPollingProps {
  documents: Document[]
  projectId: string
  companyId: string
  onDocumentUpdate: (updatedDocument: Document) => void
  enabled?: boolean
  intervalMs?: number
}

/**
 * Hook that polls for document status updates for processing documents
 * Provides subtle real-time feedback without overwhelming the UI
 */
export const useDocumentStatusPolling = ({
  documents,
  projectId,
  companyId,
  onDocumentUpdate,
  enabled = true,
  intervalMs = 3000, // Poll every 3 seconds
}: UseDocumentStatusPollingProps) => {
  const checkProcessingDocuments = useCallback(async () => {
    if (!enabled || !companyId || !projectId) return

    // Find documents that are still processing
    const processingDocs = documents.filter(doc => doc.status === 'processing')

    if (processingDocs.length === 0) return

    // Check status for each processing document
    for (const doc of processingDocs) {
      try {
        const updatedDoc = await documentService.getDocument(
          companyId,
          projectId,
          doc.id,
        )

        // If status changed, notify parent component
        if (updatedDoc && updatedDoc.status !== doc.status) {
          onDocumentUpdate(updatedDoc)
        }
      } catch (error) {
        // Silently continue - don't spam errors for polling
        console.debug(`Status check failed for document ${doc.id}:`, error)
      }
    }
  }, [documents, projectId, companyId, onDocumentUpdate, enabled])

  useEffect(() => {
    if (!enabled) return

    // Don't poll if no processing documents
    const hasProcessingDocs = documents.some(doc => doc.status === 'processing')
    if (!hasProcessingDocs) return

    // Initial check
    checkProcessingDocuments()

    // Set up polling interval
    const interval = setInterval(checkProcessingDocuments, intervalMs)

    return () => clearInterval(interval)
  }, [checkProcessingDocuments, intervalMs, enabled, documents])
}
