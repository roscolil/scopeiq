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
export class PythonAPIClient {
  private baseURL: string
  private apiKey?: string

  constructor() {
    this.baseURL =
      import.meta.env.VITE_PYTHON_AI_BACKEND_URL || 'http://localhost:8000'
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<PythonAPIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data
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

    const url = `${this.baseURL}/api/v1/documents/upload`

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
      `/api/v1/documents/${documentId}/progress`,
    )
  }

  /**
   * Chat conversation with AI
   */
  async chatConversation(
    request: ChatRequest,
  ): Promise<PythonAPIResponse<ChatResponse>> {
    return this.makeRequest<ChatResponse>('/api/v1/chat/conversation', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PythonAPIResponse<HealthCheckResponse>> {
    return this.makeRequest<HealthCheckResponse>('/api/v1/health')
  }
}

// Export singleton instance
export const pythonAPIClient = new PythonAPIClient()
