/**
 * Python AI Backend API Client
 * Handles communication with the separate Python AI service
 */

// Types for Python API requests and responses
export interface PythonAPIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DocumentUploadRequest {
  file: File
  project_id: string
  company_id: string
  document_name?: string
}

export interface DocumentUploadResponse {
  document_id: string
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed'
  original_filename: string
  sanitized_filename: string
  s3_key: string
  s3_url: string
  estimated_processing_time?: number
  message: string
}

export interface DocumentProcessingStatus {
  document_id: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  current_stage: string
  error_message?: string
  processing_results?: {
    chunks_created: number
    embeddings_generated: number
    enhanced_analysis_completed: boolean
    search_ready: boolean
  }
}

export interface ChatRequest {
  query: string
  project_id: string
  document_id?: string
  conversation_history?: ChatMessage[]
  context_type: 'document' | 'project'
  include_search_results?: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    search_results_used?: boolean
    confidence?: number
    sources?: string[]
  }
}

export interface ChatResponse {
  response: string
  metadata: {
    sources_used: string[]
  }
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  services: {
    database: 'up' | 'down'
    ai_models: 'up' | 'down'
  }
  uptime_seconds: number
}

/**
 * Python AI Backend API Client
 */
import { getEnvironmentConfig } from '@/config/python-backend'

export class PythonAPIClient {
  private baseURL: string
  private apiKey?: string
  private versionPrefix: string

  constructor() {
    // Use centralized python backend config (ensures consistency with taxonomy service + env overrides)
    const cfg = getEnvironmentConfig()
    this.baseURL = cfg.baseURL.replace(/\/$/, '') // normalize no trailing slash
    this.versionPrefix = (
      import.meta.env.VITE_TAXONOMY_API_VERSION_PREFIX || '/api/v1'
    ).replace(/\/$/, '')
  }

  private buildUrl(endpoint: string): string {
    if (!endpoint.startsWith('/')) return `${this.baseURL}/${endpoint}`
    return `${this.baseURL}${endpoint}`
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<PythonAPIResponse<T>> {
    const url = this.buildUrl(endpoint)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Auth temporarily disabled for diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[pythonAPIClient] auth disabled', { endpoint })
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const respClone = response.clone()
        let body = ''
        try {
          body = await respClone.text()
        } catch (e) {
          console.debug('[pythonAPIClient] body read failed', { url, e })
        }
        console.warn('[pythonAPIClient] non-ok', {
          url,
          status: response.status,
          statusText: response.statusText,
          body,
          headers: (() => {
            const h: Record<string, string> = {}
            response.headers.forEach((v, k) => {
              h[k] = v
            })
            return h
          })(),
        })
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        )
      }

      try {
        const data = await response.json()
        return data
      } catch (parseErr) {
        console.error('[pythonAPIClient] JSON parse error', { url, parseErr })
        throw parseErr
      }
    } catch (error) {
      console.error('Python API request failed:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Upload a document for processing
   */
  async uploadDocument(
    request: DocumentUploadRequest,
  ): Promise<PythonAPIResponse<DocumentUploadResponse>> {
    const formData = new FormData()
    formData.append('file', request.file)
    formData.append('project_id', request.project_id)
    formData.append('company_id', request.company_id)

    if (request.document_name) {
      formData.append('document_name', request.document_name)
    }

    const url = this.buildUrl(`${this.versionPrefix}/documents/upload`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: this.apiKey
          ? {
              Authorization: `Bearer ${this.apiKey}`,
            }
          : {},
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Document upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * Get document processing progress
   */
  async getDocumentProgress(
    documentId: string,
  ): Promise<PythonAPIResponse<DocumentProcessingStatus>> {
    return this.makeRequest<DocumentProcessingStatus>(
      `${this.versionPrefix}/documents/${documentId}/progress`,
    )
  }

  /**
   * Chat conversation with AI
   */
  async chatConversation(
    request: ChatRequest,
  ): Promise<PythonAPIResponse<ChatResponse>> {
    return this.makeRequest<ChatResponse>(
      `${this.versionPrefix}/chat/conversation`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    )
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PythonAPIResponse<HealthCheckResponse>> {
    return this.makeRequest<HealthCheckResponse>(`${this.versionPrefix}/health`)
  }
}

// Export singleton instance
export const pythonAPIClient = new PythonAPIClient()
