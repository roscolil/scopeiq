/**
 * Python Backend Document Upload Service
 * Handles file uploads through the Python AI backend
 */

import {
  pythonAPIClient,
  type DocumentUploadRequest,
  type DocumentUploadResponse,
  type DocumentProcessingStatus,
} from '../ai/python-api-client'
import { broadcastProcessingMessage } from '../utils/processing-messages'

export interface PythonUploadResult {
  documentId: string
  originalFilename: string
  sanitizedFilename: string
  s3Key: string
  s3Url: string
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed'
  estimatedProcessingTime?: number
  message: string
}

export interface PythonUploadOptions {
  onProgress?: (progress: number) => void
  onStatusUpdate?: (status: string) => void
  onError?: (error: string) => void
  onStorageComplete?: (result: PythonUploadResult) => void // NEW: Called when storage upload finishes
  documentName?: string
}

/**
 * Upload document to Python backend for processing
 */
export async function uploadDocumentToPythonBackend(
  file: File,
  projectId: string,
  companyId: string,
  options: PythonUploadOptions = {},
): Promise<PythonUploadResult> {
  const {
    onProgress,
    onStatusUpdate,
    onError,
    onStorageComplete,
    documentName,
  } = options

  try {
    onProgress?.(5)
    onStatusUpdate?.('Preparing file for upload...')

    // Validate file
    if (!file) {
      throw new Error('No file provided')
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      throw new Error('File size exceeds 100MB limit')
    }

    onProgress?.(10)
    onStatusUpdate?.('Uploading to Python backend...')

    // Prepare upload request
    const uploadRequest: DocumentUploadRequest = {
      file,
      project_id: projectId,
      company_id: companyId,
      document_name: documentName || file.name,
    }

    onProgress?.(20)

    // Upload to Python backend
    const response = await pythonAPIClient.uploadDocument(uploadRequest)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Upload failed')
    }

    const uploadData = response.data
    onProgress?.(50)
    onStatusUpdate?.('File uploaded, extracting text...')

    // Create storage upload result
    const storageResult = {
      documentId: uploadData.document_id,
      originalFilename: uploadData.original_filename,
      sanitizedFilename: uploadData.sanitized_filename,
      s3Key: uploadData.s3_key,
      s3Url: uploadData.s3_url,
      processingStatus: 'uploaded' as const, // Storage upload complete, processing may be ongoing
      estimatedProcessingTime: uploadData.estimated_processing_time,
      message: 'Storage upload completed',
    }

    // Call storage complete callback immediately - this allows modal to close
    onStorageComplete?.(storageResult)

    // Start monitoring processing status (this continues in background)
    let finalProcessingStatus = uploadData.processing_status
    console.log('Initial processing status:', uploadData.processing_status)

    if (uploadData.processing_status === 'processing') {
      onProgress?.(60)
      finalProcessingStatus = await monitorProcessingStatus(
        uploadData.document_id,
        {
          onProgress,
          onStatusUpdate,
          onError,
        },
      )
      console.log(
        'Final processing status after monitoring:',
        finalProcessingStatus,
      )
    }

    onProgress?.(100)
    onStatusUpdate?.('Processing completed')

    const result = {
      documentId: uploadData.document_id,
      originalFilename: uploadData.original_filename,
      sanitizedFilename: uploadData.sanitized_filename,
      s3Key: uploadData.s3_key,
      s3Url: uploadData.s3_url,
      processingStatus: finalProcessingStatus,
      estimatedProcessingTime: uploadData.estimated_processing_time,
      message: uploadData.message,
    }

    console.log('Returning upload result:', result)
    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Upload failed'
    onError?.(errorMessage)
    onStatusUpdate?.(`Error: ${errorMessage}`)
    throw error
  }
}

/**
 * Monitor document processing status
 */
async function monitorProcessingStatus(
  documentId: string,
  options: {
    onProgress?: (progress: number) => void
    onStatusUpdate?: (status: string) => void
    onError?: (error: string) => void
  },
): Promise<'completed' | 'failed' | 'processing'> {
  const { onProgress, onStatusUpdate, onError } = options
  const maxAttempts = 60 // 5 minutes with 5-second intervals
  let attempts = 0

  const checkStatus = async (): Promise<
    'completed' | 'failed' | 'processing'
  > => {
    try {
      attempts++
      const response = await pythonAPIClient.getDocumentProgress(documentId)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get processing status')
      }

      const status = response.data
      console.log(
        `Status check ${attempts} for document ${documentId}:`,
        status,
      )
      onStatusUpdate?.(status.current_stage)
      onProgress?.(60 + status.progress_percentage * 0.4) // 60-100% range

      // Broadcast processing message
      broadcastProcessingMessage.progress(
        status.current_stage,
        status.progress_percentage,
        documentId,
        undefined,
        status.current_stage,
      )

      if (status.status === 'completed') {
        onProgress?.(100)
        onStatusUpdate?.('Processing completed successfully')
        broadcastProcessingMessage.success(
          'Document processing completed successfully',
          documentId,
        )
        return 'completed'
      }

      if (status.status === 'failed') {
        const errorMsg = status.error_message || 'Processing failed'
        onError?.(errorMsg)
        onStatusUpdate?.(`Error: ${errorMsg}`)
        broadcastProcessingMessage.error(errorMsg, documentId)
        return 'failed'
      }

      if (status.status === 'processing' && attempts < maxAttempts) {
        // Continue monitoring with a delay
        await new Promise(resolve => setTimeout(resolve, 5000))
        return checkStatus()
      } else if (attempts >= maxAttempts) {
        const timeoutError = 'Processing timeout - please check status manually'
        onError?.(timeoutError)
        onStatusUpdate?.(timeoutError)
        broadcastProcessingMessage.error(timeoutError, documentId)
        return 'failed'
      }

      return 'processing'
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Status check failed'
      onError?.(errorMessage)
      onStatusUpdate?.(`Error: ${errorMessage}`)
      broadcastProcessingMessage.error(errorMessage, documentId)
      return 'failed'
    }
  }

  // Start monitoring with initial delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  return checkStatus()
}

/**
 * Get document processing progress
 */
export async function getDocumentProcessingProgress(
  documentId: string,
): Promise<DocumentProcessingStatus> {
  const response = await pythonAPIClient.getDocumentProgress(documentId)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get processing progress')
  }

  return response.data
}

/**
 * Check if Python backend is available
 */
export async function checkPythonBackendHealth(): Promise<boolean> {
  try {
    const response = await pythonAPIClient.healthCheck()
    return response.success && response.data?.status === 'healthy'
  } catch (error) {
    console.warn('Python backend health check failed:', error)
    return false
  }
}

/**
 * Enhanced upload with fallback to existing service
 */
export async function uploadDocumentWithFallback(
  file: File,
  projectId: string,
  companyId: string,
  options: PythonUploadOptions = {},
): Promise<PythonUploadResult> {
  // First, check if Python backend is available
  const isPythonBackendAvailable = await checkPythonBackendHealth()

  if (isPythonBackendAvailable) {
    try {
      return await uploadDocumentToPythonBackend(
        file,
        projectId,
        companyId,
        options,
      )
    } catch (error) {
      console.warn(
        'Python backend upload failed, falling back to existing service:',
        error,
      )
      // Fallback to existing upload service
      // This would need to be implemented based on your existing uploadDocumentToS3 function
      throw new Error('Python backend unavailable and fallback not implemented')
    }
  } else {
    throw new Error('Python backend is not available')
  }
}
