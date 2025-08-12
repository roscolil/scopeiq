/**
 * Loop-Safe AI Workflow Voice Integration Service
 * Prevents voice prompts from triggering speech recognition loops
 */

import { novaSonic, NovaSonicOptions } from '@/services/nova-sonic'
import { VoiceId } from '@aws-sdk/client-polly'

export interface VoiceWorkflowConfig {
  enabled: boolean
  voice: VoiceId
  announceStages: boolean
  readResults: boolean
  maxResultLength: number
  preventLoops: boolean
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

class LoopSafeAIWorkflowVoiceService {
  private config: VoiceWorkflowConfig = {
    enabled: true,
    voice: 'Joanna',
    announceStages: true,
    readResults: false,
    maxResultLength: 200,
    preventLoops: true,
  }

  private isPlayingAudio = false
  private voiceQueue: Array<{
    text: string
    options?: Partial<NovaSonicOptions>
  }> = []
  private isProcessingQueue = false
  private voiceListeners: Set<() => void> = new Set()

  private stageAnnouncements: Record<string, string> = {
    starting: 'Processing your request.',
    searching: 'Searching your documents.',
    analyzing: 'Analyzing with AI.',
    processing: 'Processing your query.',
    complete: 'Analysis complete.',
    error: 'Request failed. Please try again.',

    found_results: 'Found {count} documents.',
    no_results: 'No documents found.',
    document_scope: 'Searching current document.',
    project_scope: 'Searching entire project.',

    listening: 'Listening for your question.',
    transcript_received: 'Processing your voice input.',

    ai_answer_ready: 'Answer ready.',
    search_results_ready: 'Results ready.',

    document_processing: 'Document processing. Switching to project search.',
    document_failed: 'Document failed. Searching project instead.',
    no_project: 'Project required for search.',

    copied: 'Copied to clipboard.',
    scope_changed: 'Search scope changed.',
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
   * Check if currently playing audio (to prevent loops)
   */
  isPlayingVoice(): boolean {
    return this.isPlayingAudio
  }

  /**
   * Add listener for voice state changes
   */
  addVoiceStateListener(listener: () => void) {
    this.voiceListeners.add(listener)
    return () => this.voiceListeners.delete(listener)
  }

  /**
   * Notify listeners of voice state changes
   */
  private notifyVoiceStateChange() {
    this.voiceListeners.forEach(listener => listener())
  }

  /**
   * Speak text with loop prevention
   */
  private async speakSafe(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    if (!this.config.enabled || !novaSonic.isAvailable()) {
      return false
    }

    // Add to queue if currently playing audio
    if (this.isPlayingAudio) {
      console.log('Voice already playing, queuing:', text.substring(0, 50))
      this.voiceQueue.push({ text, options })
      return true
    }

    try {
      this.isPlayingAudio = true
      this.notifyVoiceStateChange()

      console.log('🔊 Speaking (loop-safe):', text.substring(0, 50))

      await novaSonic.speak(text, {
        voice: this.config.voice,
        engine: 'neural',
        ...options,
      })

      // Small delay to ensure audio has finished
      await new Promise(resolve => setTimeout(resolve, 200))

      return true
    } catch (error) {
      console.warn('Voice synthesis failed:', error)
      return false
    } finally {
      this.isPlayingAudio = false
      this.notifyVoiceStateChange()

      // Process next item in queue
      this.processVoiceQueue()
    }
  }

  /**
   * Process queued voice items
   */
  private async processVoiceQueue() {
    if (this.isProcessingQueue || this.voiceQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.voiceQueue.length > 0 && !this.isPlayingAudio) {
      const item = this.voiceQueue.shift()
      if (item) {
        await this.speakSafe(item.text, item.options)
        // Brief pause between queued items
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Announce workflow stage with loop prevention
   */
  async announceStage(stage: WorkflowStage): Promise<boolean> {
    if (!this.config.announceStages || !this.config.preventLoops) {
      return false
    }

    let announcement = this.stageAnnouncements[stage.stage]

    if (!announcement) {
      console.warn(`No announcement configured for stage: ${stage.stage}`)
      return false
    }

    // Replace placeholders with dynamic data
    if (stage.details) {
      announcement = announcement.replace('{count}', stage.details)
    }

    return await this.speakSafe(announcement)
  }

  /**
   * Announce custom message with loop prevention
   */
  async announce(key: string, data?: Record<string, string>): Promise<boolean> {
    if (!this.config.preventLoops) {
      return false
    }

    let message = this.stageAnnouncements[key]

    if (!message) {
      // If no predefined message, use the key as the message (but limit length)
      message = key.length > 50 ? key.substring(0, 50) + '...' : key
    }

    // Replace placeholders with data
    if (data) {
      Object.entries(data).forEach(([placeholder, value]) => {
        message = message.replace(`{${placeholder}}`, value)
      })
    }

    return await this.speakSafe(message)
  }

  /**
   * Read AI result aloud with loop prevention
   */
  async readResult(
    text: string,
    type: 'ai' | 'search' = 'ai',
  ): Promise<boolean> {
    if (!this.config.readResults || !this.config.preventLoops) {
      return false
    }

    // Check if text is too long
    if (text.length > this.config.maxResultLength) {
      const summary = `Answer ready. ${text.substring(0, 80)}... Full answer on screen.`
      return await this.speakSafe(summary)
    }

    const prefix = type === 'ai' ? "Here's your answer: " : 'Search results: '
    return await this.speakSafe(prefix + text)
  }

  /**
   * Comprehensive workflow integration with loop prevention
   */
  async integrateAIWorkflow(config: {
    query: string
    projectId: string
    documentId?: string
    scope: 'document' | 'project'
  }) {
    const { query, projectId, documentId, scope } = config

    // Start workflow (only if not already playing audio)
    if (!this.isPlayingAudio) {
      await this.announceStage({ stage: 'starting' })
    }

    // Return stage announcement functions with loop prevention
    return {
      announceSearching: () => {
        if (!this.isPlayingAudio) {
          return this.announceStage({ stage: 'searching' })
        }
        return Promise.resolve(false)
      },
      announceAnalyzing: () => {
        if (!this.isPlayingAudio) {
          return this.announceStage({ stage: 'analyzing' })
        }
        return Promise.resolve(false)
      },
      announceProcessing: () => {
        if (!this.isPlayingAudio) {
          return this.announceStage({ stage: 'processing' })
        }
        return Promise.resolve(false)
      },
      announceComplete: () => {
        if (!this.isPlayingAudio) {
          return this.announceStage({ stage: 'complete' })
        }
        return Promise.resolve(false)
      },
      announceError: (error?: string) => {
        if (!this.isPlayingAudio) {
          return this.announceStage({ stage: 'error', details: error })
        }
        return Promise.resolve(false)
      },
      announceResults: (count: number) => {
        if (!this.isPlayingAudio) {
          return this.announce('found_results', { count: count.toString() })
        }
        return Promise.resolve(false)
      },
      announceNoResults: () => {
        if (!this.isPlayingAudio) {
          return this.announce('no_results')
        }
        return Promise.resolve(false)
      },
      readAIAnswer: (answer: string) => this.readResult(answer, 'ai'),
      readSearchResults: (results: string) =>
        this.readResult(results, 'search'),
    }
  }

  /**
   * Voice input integration with loop prevention
   */
  async integrateVoiceInput() {
    return {
      announceListening: () => {
        if (!this.isPlayingAudio) {
          return this.announce('listening')
        }
        return Promise.resolve(false)
      },
      announceTranscriptReceived: () => {
        if (!this.isPlayingAudio) {
          return this.announce('transcript_received')
        }
        return Promise.resolve(false)
      },
      isVoicePlaying: () => this.isPlayingAudio,
    }
  }

  /**
   * Clear voice queue (useful for stopping all pending voice)
   */
  clearVoiceQueue() {
    this.voiceQueue.length = 0
    console.log('Voice queue cleared')
  }

  /**
   * Enable/disable loop prevention
   */
  setLoopPrevention(enabled: boolean) {
    this.config.preventLoops = enabled
    if (!enabled) {
      this.clearVoiceQueue()
    }
  }

  /**
   * Test voice functionality
   */
  async testVoice(): Promise<boolean> {
    return await this.speakSafe(
      'Voice integration test. Loop prevention is active.',
    )
  }

  /**
   * Enable/disable voice completely
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled
    if (!enabled) {
      this.clearVoiceQueue()
    }
  }

  /**
   * Check if voice is available
   */
  isAvailable(): boolean {
    return this.config.enabled && novaSonic.isAvailable()
  }
}

// Export singleton instance
export const loopSafeAiWorkflowVoice = new LoopSafeAIWorkflowVoiceService()

// Export class for custom instances
export { LoopSafeAIWorkflowVoiceService }

// Also export as the main service (backward compatible)
export const aiWorkflowVoice = loopSafeAiWorkflowVoice
