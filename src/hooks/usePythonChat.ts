/**
 * React hook for Python backend chat functionality
 */

import { useState, useCallback } from 'react'
import {
  chatWithPythonBackend,
  handlePythonAIQuery,
} from '@/services/ai/python-chat-service'
import type { ChatResult } from '@/services/ai/python-chat-service'

export interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  metadata?: {
    searchMethod?: string
    confidence?: number
    intelligentSearch?: boolean
    structuredResults?: boolean
    sourcesUsed?: string[]
    processingTimeMs?: number
  }
}

export interface UsePythonChatOptions {
  projectId: string
  documentId?: string
  contextType?: 'document' | 'project'
  searchType?: 'semantic' | 'intelligent' | 'hybrid'
  includeSearchResults?: boolean
}

export function usePythonChat(options: UsePythonChatOptions) {
  const {
    projectId,
    documentId,
    contextType = 'project',
    searchType = 'hybrid',
    includeSearchResults = true,
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState<string>('')

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const sendMessage = useCallback(
    async (
      query: string,
      onProgress?: (stage: string) => void,
    ): Promise<ChatResult | null> => {
      setLoading(true)
      setError(null)
      setCurrentStage('')

      try {
        // Add user message
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: query,
          timestamp: new Date(),
        }
        addMessage(userMessage)

        // Convert existing messages to conversation history format
        const conversationHistory = messages.map(msg => ({
          role:
            msg.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }))

        // Send chat request
        const result = await chatWithPythonBackend(query, projectId, {
          documentId,
          conversationHistory,
          contextType,
          includeSearchResults,
          searchType,
          onProgress: stage => {
            setCurrentStage(stage)
            onProgress?.(stage)
          },
        })

        // Add AI response
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: result.response,
          timestamp: new Date(),
          metadata: {
            sourcesUsed: result.metadata.sourcesUsed,
          },
        }
        addMessage(aiMessage)

        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Chat request failed'
        setError(errorMessage)

        // Add error message
        const errorMessageObj: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        }
        addMessage(errorMessageObj)

        return null
      } finally {
        setLoading(false)
        setCurrentStage('')
      }
    },
    [
      projectId,
      documentId,
      contextType,
      includeSearchResults,
      searchType,
      messages,
      addMessage,
    ],
  )

  const handleQuery = useCallback(
    async (
      query: string,
      onProgress?: (stage: string) => void,
    ): Promise<{
      type: 'ai'
      response: string
      conversationId?: string
      metadata: {
        sourcesUsed?: string[]
      }
    } | null> => {
      setLoading(true)
      setError(null)
      setCurrentStage('')

      try {
        const result = await handlePythonAIQuery({
          query,
          projectId,
          documentId,
          queryScope: contextType,
          onProgress: stage => {
            setCurrentStage(stage)
            onProgress?.(stage)
          },
        })

        // Add messages to chat history if it's an AI response
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: query,
          timestamp: new Date(),
        }
        addMessage(userMessage)

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: result.response,
          timestamp: new Date(),
          metadata: result.metadata,
        }
        addMessage(aiMessage)

        return {
          type: 'ai',
          response: result.response,
          metadata: result.metadata,
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Query request failed'
        setError(errorMessage)
        return null
      } finally {
        setLoading(false)
        setCurrentStage('')
      }
    },
    [projectId, documentId, contextType, addMessage],
  )

  return {
    messages,
    loading,
    error,
    currentStage,
    sendMessage,
    handleQuery,
    clearMessages,
    addMessage,
  }
}
