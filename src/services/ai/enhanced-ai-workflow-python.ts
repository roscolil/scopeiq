/**
 * Enhanced AI Workflow with Python Backend Integration
 * Drop-in replacement for existing AI workflow that can use Python backend
 */

import { handlePythonAIQuery } from './python-chat-service'
import { handleEnhancedAIQuery } from './enhanced-ai-workflow'
import { isPythonChatAvailable } from './python-chat-service'

export interface EnhancedAIWorkflowOptions {
  usePythonBackend?: boolean
  fallbackToExisting?: boolean
  onBackendSwitch?: (backend: 'python' | 'existing') => void
}

/**
 * Enhanced AI query handler with Python backend integration
 * This is a drop-in replacement for the existing handleEnhancedAIQuery
 */
export async function handleEnhancedAIQueryWithPython({
  query,
  projectId,
  documentId,
  projectName,
  document,
  queryScope = 'project',
  onProgress,
  options = {},
}: {
  query: string
  projectId: string
  documentId?: string
  projectName?: string
  document?: unknown
  queryScope?: 'document' | 'project'
  onProgress?: (stage: string) => void
  options?: EnhancedAIWorkflowOptions
}) {
  const {
    usePythonBackend = true,
    fallbackToExisting = true,
    onBackendSwitch,
  } = options

  try {
    // Check if we should use Python backend
    if (usePythonBackend) {
      const isPythonAvailable = await isPythonChatAvailable()

      if (isPythonAvailable) {
        onBackendSwitch?.('python')
        onProgress?.('Using Python backend...')

        return await handlePythonAIQuery({
          query,
          projectId,
          documentId,
          projectName,
          document,
          queryScope,
          onProgress,
        })
      } else if (fallbackToExisting) {
        console.warn(
          'Python backend not available, falling back to existing service',
        )
        onBackendSwitch?.('existing')
        onProgress?.('Using existing backend...')

        return await handleEnhancedAIQuery({
          query,
          projectId,
          documentId,
          projectName,
          document,
          queryScope,
          onProgress,
        })
      } else {
        throw new Error(
          'Python backend is not available and fallback is disabled',
        )
      }
    } else {
      // Use existing service directly
      onBackendSwitch?.('existing')
      onProgress?.('Using existing backend...')

      return await handleEnhancedAIQuery({
        query,
        projectId,
        documentId,
        projectName,
        document,
        queryScope,
        onProgress,
      })
    }
  } catch (error) {
    console.error('Enhanced AI query failed:', error)

    // If Python backend failed and fallback is enabled, try existing service
    if (usePythonBackend && fallbackToExisting) {
      try {
        console.warn(
          'Python backend failed, attempting fallback to existing service',
        )
        onBackendSwitch?.('existing')
        onProgress?.('Falling back to existing backend...')

        return await handleEnhancedAIQuery({
          query,
          projectId,
          documentId,
          projectName,
          document,
          queryScope,
          onProgress,
        })
      } catch (fallbackError) {
        console.error(
          'Both Python and existing backends failed:',
          fallbackError,
        )
        throw fallbackError
      }
    } else {
      throw error
    }
  }
}

/**
 * Backend selection utility
 */
export async function selectOptimalBackend(): Promise<'python' | 'existing'> {
  try {
    const isPythonAvailable = await isPythonChatAvailable()
    return isPythonAvailable ? 'python' : 'existing'
  } catch (error) {
    console.warn('Failed to check Python backend availability:', error)
    return 'existing'
  }
}

/**
 * Configuration for backend selection
 */
export interface BackendConfig {
  enableFallback: boolean
  pythonBackendUrl?: string
}

/**
 * Get backend configuration from environment
 */
export function getBackendConfig(): BackendConfig {
  return {
    enableFallback: import.meta.env.VITE_ENABLE_AI_BACKEND_FALLBACK !== 'false',
    pythonBackendUrl: import.meta.env.VITE_PYTHON_AI_BACKEND_URL,
  }
}

/**
 * Enhanced AI response with smart backend selection
 */
export async function enhancedAIResponseWithSmartBackend({
  query,
  projectId,
  documentId,
  projectName,
  document,
  queryScope = 'project',
  onProgress,
}: {
  query: string
  projectId: string
  documentId?: string
  projectName?: string
  document?: unknown
  queryScope?: 'document' | 'project'
  onProgress?: (stage: string) => void
}) {
  return await handleEnhancedAIQueryWithPython({
    query,
    projectId,
    documentId,
    projectName,
    document,
    queryScope,
    onProgress,
  })
}
