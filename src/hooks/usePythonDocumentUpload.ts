/**
 * React hook for Python backend document upload functionality
 */

import { useState, useCallback } from 'react'
import {
  uploadDocumentToPythonBackend,
  getDocumentProcessingProgress,
  checkPythonBackendHealth,
  type PythonUploadResult,
} from '@/services/file/python-document-upload'
import type { DocumentProcessingStatus } from '@/services/ai/python-api-client'

export interface UsePythonDocumentUploadOptions {
  projectId: string
  companyId: string
  onUploadComplete?: (result: PythonUploadResult) => void
  onStorageComplete?: (result: PythonUploadResult) => void // NEW: Called when storage upload finishes
  onUploadError?: (error: string) => void
  onStatusUpdate?: (status: string) => void
}

export interface UploadProgress {
  percentage: number
  stage: string
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled'
  error?: string
}

export function usePythonDocumentUpload(
  options: UsePythonDocumentUploadOptions,
) {
  const {
    projectId,
    companyId,
    onUploadComplete,
    onStorageComplete,
    onUploadError,
    onStatusUpdate,
  } = options

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percentage: 0,
    stage: '',
    status: 'uploading',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<
    PythonUploadResult[]
  >([])
  const [processingDocuments, setProcessingDocuments] = useState<
    Map<string, DocumentProcessingStatus>
  >(new Map())
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(
    null,
  )

  const checkBackendHealth = useCallback(async () => {
    try {
      const isAvailable = await checkPythonBackendHealth()
      setIsBackendAvailable(isAvailable)
      return isAvailable
    } catch (error) {
      console.error('Backend health check failed:', error)
      setIsBackendAvailable(false)
      return false
    }
  }, [])

  const uploadDocument = useCallback(
    async (
      file: File,
      documentName?: string,
    ): Promise<PythonUploadResult | null> => {
      setIsUploading(true)
      setUploadProgress({
        percentage: 0,
        stage: 'Preparing upload...',
        status: 'uploading',
      })

      try {
        const result = await uploadDocumentToPythonBackend(
          file,
          projectId,
          companyId,
          {
            documentName,
            onProgress: progress => {
              setUploadProgress(prev => ({
                ...prev,
                percentage: progress,
              }))
            },
            onStatusUpdate: status => {
              setUploadProgress(prev => ({
                ...prev,
                stage: status,
              }))
              onStatusUpdate?.(status)
            },
            onStorageComplete: storageResult => {
              // Storage upload complete - update progress and call callback
              setUploadProgress({
                percentage: 50, // Storage upload complete
                stage: 'Perparing document for content extraction...',
                status: 'uploading', // Still uploading stage for modal
              })
              onStorageComplete?.(storageResult)
            },
            onError: error => {
              setUploadProgress(prev => ({
                ...prev,
                status: 'failed',
                error,
              }))
              onUploadError?.(error)
            },
          },
        )

        setUploadProgress({
          percentage: 100,
          stage: 'Upload completed',
          status: 'completed',
        })

        setUploadedDocuments(prev => [...prev, result])
        onUploadComplete?.(result)

        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'
        setUploadProgress(prev => ({
          ...prev,
          status: 'failed',
          error: errorMessage,
        }))
        onUploadError?.(errorMessage)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [
      projectId,
      companyId,
      onUploadComplete,
      onStorageComplete,
      onUploadError,
      onStatusUpdate,
    ],
  )

  const getDocumentProgress = useCallback(
    async (documentId: string): Promise<DocumentProcessingStatus | null> => {
      try {
        const progress = await getDocumentProcessingProgress(documentId)
        setProcessingDocuments(prev => new Map(prev.set(documentId, progress)))
        return progress
      } catch (error) {
        console.error('Failed to get document progress:', error)
        return null
      }
    },
    [],
  )

  const clearUploadProgress = useCallback(() => {
    setUploadProgress({
      percentage: 0,
      stage: '',
      status: 'uploading',
    })
  }, [])

  const clearUploadedDocuments = useCallback(() => {
    setUploadedDocuments([])
    setProcessingDocuments(new Map())
  }, [])

  const refreshDocumentProgress = useCallback(
    async (documentId: string) => {
      return getDocumentProgress(documentId)
    },
    [getDocumentProgress],
  )

  // Auto-check backend health on mount
  useState(() => {
    checkBackendHealth()
  })

  return {
    // State
    uploadProgress,
    isUploading,
    uploadedDocuments,
    processingDocuments,
    isBackendAvailable,

    // Actions
    uploadDocument,
    getDocumentProgress,
    checkBackendHealth,
    clearUploadProgress,
    clearUploadedDocuments,
    refreshDocumentProgress,
  }
}
