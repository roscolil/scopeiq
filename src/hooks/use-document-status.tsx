import { useState, useEffect, useCallback } from 'react'
import { Document } from '@/types'
import { documentService } from '@/services/data/hybrid'

interface UseDocumentStatusOptions {
  documentId: string
  projectId: string
  companyId: string
  enabled?: boolean
}

interface UseDocumentStatusReturn {
  document: Document | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Custom hook for monitoring document status with adaptive live updates
 * Provides different polling frequencies based on document status:
 * - Processing: 3 seconds (fast updates)
 * - Failed: 10 seconds (medium updates, might recover)
 * - Processed: 30 seconds (slow updates, stable)
 * - Other: 5 seconds (default)
 */
export const useDocumentStatus = ({
  documentId,
  projectId,
  companyId,
  enabled = true,
}: UseDocumentStatusOptions): UseDocumentStatusReturn => {
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocument = useCallback(async () => {
    if (!documentId || !projectId || !companyId || !enabled) return

    try {
      setError(null)
      const doc = await documentService.getDocument(
        companyId,
        projectId,
        documentId,
      )
      setDocument(doc)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch document status'
      setError(errorMessage)
      console.error('Error fetching document status:', err)
    }
  }, [documentId, projectId, companyId, enabled])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await fetchDocument()
    } finally {
      setIsLoading(false)
    }
  }, [fetchDocument])

  // Set up adaptive polling based on document status
  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    refresh()

    let intervalId: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
      }

      // Determine polling frequency based on current document status
      const currentStatus = document?.status
      let pollInterval: number

      if (currentStatus === 'processing') {
        pollInterval = 3000 // Fast polling for processing documents
      } else if (currentStatus === 'failed') {
        pollInterval = 10000 // Medium polling for failed documents
      } else if (currentStatus === 'processed') {
        pollInterval = 30000 // Slow polling for completed documents
      } else {
        pollInterval = 5000 // Default polling for other states
      }

      intervalId = setInterval(fetchDocument, pollInterval)
    }

    // Start polling
    startPolling()

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [enabled, document?.status, fetchDocument, refresh])

  return {
    document,
    isLoading,
    error,
    refresh,
  }
}
