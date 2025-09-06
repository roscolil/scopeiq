/**
 * Python Backend Chat Service
 * Handles conversational AI through the Python backend
 */

import {
  pythonAPIClient,
  type ChatRequest,
  type ChatResponse,
} from './python-api-client'

export interface ChatOptions {
  includeSearchResults?: boolean
  searchType?: 'semantic' | 'intelligent' | 'hybrid'
  topK?: number
  onProgress?: (stage: string) => void
}

export interface ChatResult {
  response: string
  metadata: {
    sourcesUsed: string[]
  }
}

/**
 * Enhanced chat conversation using Python backend
 */
export async function chatWithPythonBackend(
  query: string,
  projectId: string,
  options: ChatOptions & {
    documentId?: string
    conversationHistory?: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: string
    }>
    contextType?: 'document' | 'project'
  } = {},
): Promise<ChatResult> {
  const {
    documentId,
    conversationHistory = [],
    contextType = 'project',
    includeSearchResults = true,
    searchType = 'hybrid',
    topK = 10,
    onProgress,
  } = options

  try {
    onProgress?.('Preparing chat request...')

    // Prepare chat request
    const chatRequest: ChatRequest = {
      query,
      project_id: projectId,
      document_id: documentId,
      conversation_history: conversationHistory,
      context_type: contextType,
      include_search_results: includeSearchResults,
    }

    onProgress?.('Sending request to Python backend...')

    // Send chat request to Python backend
    const response = await pythonAPIClient.chatConversation(chatRequest)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Chat request failed')
    }

    const chatData = response.data
    onProgress?.('Processing response...')

    return {
      response: chatData.response,
      metadata: {
        sourcesUsed: chatData.metadata.sources_used,
      },
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Chat request failed'
    onProgress?.(`Error: ${errorMessage}`)
    throw error
  }
}

/**
 * Enhanced AI query handler with Python backend integration
 */
export async function handlePythonAIQuery({
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
}): Promise<{
  response: string
  metadata: {
    sourcesUsed?: string[]
  }
}> {
  try {
    onProgress?.('Analyzing query...')

    // Handle as AI question with enhanced context
    onProgress?.('Getting enhanced context...')

    const chatResult = await chatWithPythonBackend(query, projectId, {
      documentId: queryScope === 'document' ? documentId : undefined,
      contextType: queryScope,
      includeSearchResults: true,
      searchType: 'hybrid',
      onProgress,
    })

    onProgress?.('Generating response...')

    return {
      response: chatResult.response,
      metadata: {
        sourcesUsed: chatResult.metadata.sourcesUsed,
      },
    }
  } catch (error) {
    console.error('Python AI query failed:', error)
    throw error
  }
}

/**
 * Check if Python backend is available for chat
 */
export async function isPythonChatAvailable(): Promise<boolean> {
  try {
    const response = await pythonAPIClient.healthCheck()
    return response.success && response.data?.status === 'healthy'
  } catch (error) {
    console.warn('Python backend health check failed:', error)
    return false
  }
}

/**
 * Enhanced chat with fallback to existing service
 */
export async function chatWithFallback(
  query: string,
  projectId: string,
  options: ChatOptions & {
    documentId?: string
    conversationHistory?: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: string
    }>
    contextType?: 'document' | 'project'
    fallbackToExisting?: boolean
  } = {},
): Promise<ChatResult> {
  const { fallbackToExisting = true, ...chatOptions } = options

  // Check if Python backend is available
  const isPythonAvailable = await isPythonChatAvailable()

  if (isPythonAvailable) {
    try {
      return await chatWithPythonBackend(query, projectId, chatOptions)
    } catch (error) {
      console.warn('Python backend chat failed:', error)
      if (fallbackToExisting) {
        // Fallback to existing chat service
        throw new Error(
          'Python backend unavailable and fallback not implemented',
        )
      } else {
        throw error
      }
    }
  } else {
    if (fallbackToExisting) {
      throw new Error('Python backend is not available')
    } else {
      throw new Error('Python backend is not available')
    }
  }
}
