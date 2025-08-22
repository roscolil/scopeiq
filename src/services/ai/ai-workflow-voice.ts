/**
 * AI Workflow Voice Integration Service
 * Seamlessly integrates AWS Polly voice prompts with OpenAI/Pinecone workflows
 */

import { novaSonic, NovaSonicOptions } from '@/services/api/nova-sonic'
import { VoiceId } from '@aws-sdk/client-polly'

export interface VoiceWorkflowConfig {
  enabled: boolean
  voice: VoiceId
  announceStages: boolean
  readResults: boolean
  maxResultLength: number
}

export interface WorkflowStage {
  stage:
    | 'starting'
    | 'searching'
    | 'analyzing'
    | 'processing'
    | 'complete'
    | 'error'
  details?: string
  data?: Record<string, unknown>
}

class AIWorkflowVoiceService {
  private config: VoiceWorkflowConfig = {
    enabled: true,
    voice: 'Joanna',
    announceStages: true,
    readResults: false,
    maxResultLength: 200,
  }

  private stageAnnouncements: Record<string, string> = {
    starting: 'Processing your request. Let me search through your documents.',
    searching:
      'Searching your knowledge base with AI-powered semantic analysis.',
    analyzing:
      'Analyzing the results with GPT-4 to provide you with the best answer.',
    processing: 'Processing your query through the vector database.',
    complete: 'Analysis complete. Your results are ready.',
    error: 'I encountered an issue processing your request. Please try again.',

    // Dynamic announcements with placeholders
    found_results: 'Found {count} relevant documents in your knowledge base.',
    no_results:
      'No relevant documents found for your query. You may want to try rephrasing your question.',
    document_scope: 'Searching within the current document only.',
    project_scope: 'Searching across your entire project.',

    // Voice input feedback
    listening: "I'm listening. Please speak your question clearly.",
    transcript_received: 'I heard your question. Let me search for an answer.',
    processing_voice: 'Processing your voice input.',

    // Result announcements
    ai_answer_ready: "I've analyzed your documents and found an answer.",
    search_results_ready:
      "I've found several relevant document sections for you.",

    // Error handling
    document_processing:
      'This document is still being processed. Switching to project-wide search.',
    document_failed:
      'Document processing failed. Searching across the project instead.',
    no_project: 'Project ID is required for search functionality.',

    // Success confirmations
    copied: 'Content copied to your clipboard.',
    scope_changed: 'Search scope changed to {scope}.',
  }

  /**
   * Update voice configuration
   */
  configure(config: Partial<VoiceWorkflowConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceWorkflowConfig {
    return { ...this.config }
  }

  /**
   * Speak text if voice is enabled
   */
  private async speakIfEnabled(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    if (!this.config.enabled || !novaSonic.isAvailable()) {
      return false
    }

    try {
      await novaSonic.speak(text, {
        voice: this.config.voice,
        engine: 'neural',
        ...options,
      })
      return true
    } catch (error) {
      console.warn('Voice synthesis failed:', error)
      return false
    }
  }

  /**
   * Announce workflow stage
   */
  async announceStage(stage: WorkflowStage): Promise<boolean> {
    if (!this.config.announceStages) return false

    let announcement = this.stageAnnouncements[stage.stage]

    if (!announcement) {
      console.warn(`No announcement configured for stage: ${stage.stage}`)
      return false
    }

    // Replace placeholders with dynamic data
    if (stage.details) {
      announcement = announcement.replace('{count}', stage.details)
      announcement = announcement.replace('{scope}', stage.details)
    }

    return await this.speakIfEnabled(announcement)
  }

  /**
   * Announce custom message
   */
  async announce(key: string, data?: Record<string, string>): Promise<boolean> {
    let message = this.stageAnnouncements[key]

    if (!message) {
      // If no predefined message, use the key as the message
      message = key
    }

    // Replace placeholders with data
    if (data) {
      Object.entries(data).forEach(([placeholder, value]) => {
        message = message.replace(`{${placeholder}}`, value)
      })
    }

    return await this.speakIfEnabled(message)
  }

  /**
   * Read AI result aloud if configured
   */
  async readResult(
    text: string,
    type: 'ai' | 'search' = 'ai',
  ): Promise<boolean> {
    if (!this.config.readResults) return false

    // Check if text is too long
    if (text.length > this.config.maxResultLength) {
      const summary = `Here's what I found: ${text.substring(0, 100)}... The full answer is displayed on screen.`
      return await this.speakIfEnabled(summary)
    }

    const prefix =
      type === 'ai' ? "Here's what I found: " : 'Here are the search results: '
    return await this.speakIfEnabled(prefix + text)
  }

  /**
   * Comprehensive workflow integration for AI queries
   */
  async integrateAIWorkflow(config: {
    query: string
    projectId: string
    documentId?: string
    scope: 'document' | 'project'
  }) {
    const { query, projectId, documentId, scope } = config

    // Start workflow
    await this.announceStage({ stage: 'starting' })

    // Announce scope
    if (scope === 'document' && documentId) {
      await this.announce('document_scope')
    } else {
      await this.announce('project_scope')
    }

    // Return stage announcement functions for the caller to use
    return {
      announceSearching: () => this.announceStage({ stage: 'searching' }),
      announceAnalyzing: () => this.announceStage({ stage: 'analyzing' }),
      announceProcessing: () => this.announceStage({ stage: 'processing' }),
      announceComplete: () => this.announceStage({ stage: 'complete' }),
      announceError: (error?: string) =>
        this.announceStage({
          stage: 'error',
          details: error,
        }),
      announceResults: (count: number) =>
        this.announce('found_results', {
          count: count.toString(),
        }),
      announceNoResults: () => this.announce('no_results'),
      readAIAnswer: (answer: string) => this.readResult(answer, 'ai'),
      readSearchResults: (results: string) =>
        this.readResult(results, 'search'),
    }
  }

  /**
   * Voice input integration
   */
  async integrateVoiceInput() {
    return {
      announceListening: () => this.announce('listening'),
      announceTranscriptReceived: () => this.announce('transcript_received'),
      announceProcessingVoice: () => this.announce('processing_voice'),
    }
  }

  /**
   * Document status integration
   */
  async handleDocumentStatus(status: 'processing' | 'failed' | 'processed') {
    switch (status) {
      case 'processing':
        return this.announce('document_processing')
      case 'failed':
        return this.announce('document_failed')
      case 'processed':
        return true // No announcement needed
    }
  }

  /**
   * UI action integration
   */
  async integrateUIActions() {
    return {
      announceCopied: () => this.announce('copied'),
      announceScopeChange: (scope: string) =>
        this.announce('scope_changed', { scope }),
      announceNoProject: () => this.announce('no_project'),
    }
  }

  /**
   * Test voice functionality
   */
  async testVoice(): Promise<boolean> {
    return await this.speakIfEnabled(
      'Voice integration is working correctly. AWS Polly is ready to assist you with your document analysis workflow.',
    )
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): VoiceId[] {
    return novaSonic.getAvailableVoices()
  }

  /**
   * Enable/disable voice completely
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled
  }

  /**
   * Check if voice is available
   */
  isAvailable(): boolean {
    return this.config.enabled && novaSonic.isAvailable()
  }
}

// Export singleton instance
export const aiWorkflowVoice = new AIWorkflowVoiceService()

// Export class for custom instances
export { AIWorkflowVoiceService }
