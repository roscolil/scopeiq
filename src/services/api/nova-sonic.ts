/**
 * AWS Polly Text-to-Speech Service
 * Provides advanced text-to-speech using AWS Polly
 */

import {
  PollyClient,
  SynthesizeSpeechCommand,
  DescribeVoicesCommand,
  VoiceId,
  OutputFormat,
  Engine,
  LanguageCode,
} from '@aws-sdk/client-polly'
import { getAWSCredentials, getAWSRegion } from '@/utils/aws/aws-config'

interface NovaSonicOptions {
  voice?: VoiceId
  outputFormat?: OutputFormat
  sampleRate?: string
  engine?: Engine
  languageCode?: LanguageCode
}

interface NovaSonicResponse {
  audio: Uint8Array
  success: boolean
  error?: string
}

class NovaSonicService {
  private client: PollyClient | null = null
  // Assume unlocked by default; Safari may still block but we'll attempt silently.
  private audioContextUnlocked: boolean = true
  private userInteractionReceived: boolean = true
  private pendingAudio: HTMLAudioElement | null = null
  // Track the currently playing audio element so we can stop/cancel playback early
  private currentAudio: HTMLAudioElement | null = null
  // Track consecutive playback failures to optionally surface non-intrusive diagnostics
  private consecutivePlaybackFailures = 0
  private lastPlaybackError: string | null = null
  private defaultOptions: Required<NovaSonicOptions> = {
    voice: 'Joanna' as VoiceId,
    outputFormat: 'mp3' as OutputFormat,
    sampleRate: '24000',
    engine: 'neural' as Engine,
    languageCode: 'en-US' as LanguageCode,
  }

  constructor() {
    this.initializeClient()
    this.setupUserInteractionTracking()
  }

  private initializeClient() {
    try {
      const credentials = getAWSCredentials()
      const region = getAWSRegion()

      this.client = new PollyClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      })
    } catch (error) {
      console.error('❌ Failed to initialize AWS Polly service:', error)
    }
  }

  /**
   * Setup user interaction tracking for Safari audio restrictions
   */
  private setupUserInteractionTracking() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // Previously added event listeners for Safari unlock have been removed to streamline
    // auto speech. We still optimistically treat audio as unlocked; Safari may block
    // the first attempt silently, which calling layers already handle by queuing.
    return
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.client !== null
  }

  /**
   * Check if audio context is unlocked for automatic playback
   */
  isAudioUnlocked(): boolean {
    return this.audioContextUnlocked && this.userInteractionReceived
  }

  /**
   * Check if user interaction has been received (required for Safari audio)
   */
  hasUserInteraction(): boolean {
    return this.userInteractionReceived
  }

  /**
   * Manually trigger audio playback (useful for Safari when user clicks a button)
   */
  async playPendingAudio(): Promise<boolean> {
    if (!this.pendingAudio) {
      return false
    }

    try {
      await this.pendingAudio.play()
      this.pendingAudio = null
      return true
    } catch (error) {
      console.error('❌ Failed to play pending audio:', error)
      this.pendingAudio = null
      return false
    }
  }

  /**
   * Get user-friendly status about audio availability
   */
  getAudioStatus(): {
    available: boolean
    needsInteraction: boolean
    message: string
  } {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (!this.client) {
      return {
        available: false,
        needsInteraction: false,
        message: 'Text-to-speech service not available',
      }
    }

    if (isSafari || isIOS) {
      return {
        available: true,
        needsInteraction: false,
        message: 'Audio ready (Safari auto-attempt)',
      }
    }

    return {
      available: true,
      needsInteraction: false,
      message: 'Audio ready',
    }
  }

  /**
   * Enable audio for Safari by simulating user interaction
   * Call this method in response to a user button click
   */
  async enableAudioForSafari(): Promise<boolean> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    if (!isSafari) {
      return true // Already enabled for non-Safari browsers
    }

    try {
      // Create and play silent audio to unlock context
      const silentAudio = new Audio()
      silentAudio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
      silentAudio.volume = 0
      silentAudio.muted = true

      await silentAudio.play()
      this.audioContextUnlocked = true
      this.userInteractionReceived = true

      console.log('✅ Audio enabled for Safari')
      return true
    } catch (error) {
      console.error('❌ Failed to enable audio for Safari:', error)
      return false
    }
  }

  /**
   * Convert text to speech using AWS Polly
   */
  async synthesizeSpeech(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<NovaSonicResponse> {
    if (!this.client) {
      return {
        audio: new Uint8Array(),
        success: false,
        error: 'AWS Polly service not initialized',
      }
    }

    const config = { ...this.defaultOptions, ...options }

    try {
      const command = new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: config.voice,
        OutputFormat: config.outputFormat,
        SampleRate: config.sampleRate,
        Engine: config.engine,
        LanguageCode: config.languageCode,
      })

      console.log('🎵 Requesting speech synthesis from AWS Polly...')
      const response = await this.client.send(command)

      if (!response.AudioStream) {
        throw new Error('No audio data received from AWS Polly')
      }

      // Convert the AWS SDK response body to Uint8Array
      const audioData = new Uint8Array(
        await response.AudioStream!.transformToByteArray(),
      )

      return {
        audio: audioData,
        success: true,
      }
    } catch (error) {
      console.error('❌ AWS Polly synthesis error:', error)
      return {
        audio: new Uint8Array(),
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Play audio directly in the browser with Safari compatibility
   */
  async playAudio(
    audioData: Uint8Array,
    format: string = 'mp3',
  ): Promise<void> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    return new Promise((resolve, reject) => {
      try {
        // Create a blob from the audio data
        const buffer = new ArrayBuffer(audioData.length)
        const view = new Uint8Array(buffer)
        view.set(audioData)
        const blob = new Blob([buffer], { type: `audio/${format}` })
        const audioUrl = URL.createObjectURL(blob)

        // Create audio element
        const audio = new Audio()
        // Store reference for cancellation
        this.currentAudio = audio

        // Safari/iOS specific configuration
        if (isSafari || isIOS) {
          audio.preload = 'auto'
          ;(audio as HTMLAudioElement & { playsInline: boolean }).playsInline =
            true
          audio.controls = false

          // Check if user interaction has occurred
          // We no longer gate on interaction; attempt immediate playback.
        }

        audio.src = audioUrl

        console.log('🎵 Starting audio playback...')

        audio.onended = () => {
          console.log('✅ Audio playback completed')
          URL.revokeObjectURL(audioUrl)
          if (this.currentAudio === audio) {
            this.currentAudio = null
          }
          resolve()
        }

        audio.onerror = error => {
          console.error('❌ Audio playback error:', error)
          URL.revokeObjectURL(audioUrl)
          if (this.currentAudio === audio) {
            this.currentAudio = null
          }
          this.consecutivePlaybackFailures += 1
          this.lastPlaybackError = 'element-error'
          reject(new Error('Failed to play audio'))
        }

        // Attempt to play with proper error handling
        const playPromise = audio.play()

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🎵 Audio playback started successfully')
            })
            .catch(async playError => {
              console.error('❌ Audio play() failed:', playError)
              this.consecutivePlaybackFailures += 1
              this.lastPlaybackError = playError?.name || 'unknown'

              // Attempt a one-time quiet resume of an AudioContext (Chrome mobile heuristic)
              try {
                // Some browsers only allow AudioContext after gesture; create & close to poke
                // We don't retain this context—just attempt activation if possible.
                // (Not using Web Audio output path currently, so this is speculative unlock.)
                // Guard in try so failures are silent.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Ctx: any =
                  (window as any).AudioContext ||
                  (window as any).webkitAudioContext
                if (Ctx) {
                  const ctx = new Ctx()
                  if (ctx.state === 'suspended') {
                    await ctx.resume().catch(() => {})
                  }
                  // Close to avoid resource leaks
                  if (ctx.close) {
                    await ctx.close().catch(() => {})
                  }
                }
              } catch {
                /* ignore */
              }

              // Handle Safari/iOS specific errors gracefully (NotAllowedError => treat as completed)
              if ((isSafari || isIOS) && playError.name === 'NotAllowedError') {
                console.warn(
                  '🍎 Safari/iOS blocked audio playback (NotAllowedError)',
                )
                URL.revokeObjectURL(audioUrl)
                resolve()
                return
              }

              URL.revokeObjectURL(audioUrl)
              reject(playError)
            })
        }
      } catch (error) {
        console.error('❌ Audio setup error:', error)
        this.consecutivePlaybackFailures += 1
        this.lastPlaybackError = 'setup-error'
        reject(error)
      }
    })
  }

  /**
   * Stop (cancel) the currently playing audio, if any.
   * Returns true if playback was stopped.
   */
  stopCurrentPlayback(): boolean {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
        // Attempt to revoke object URL if present
        if (
          this.currentAudio.src &&
          this.currentAudio.src.startsWith('blob:')
        ) {
          try {
            URL.revokeObjectURL(this.currentAudio.src)
          } catch (_) {
            // Ignore failures revoking object URL
          }
        }
        this.currentAudio.currentTime = 0
        // Emulate an 'ended' event for listeners relying on it
        try {
          const endedEvent = new Event('ended')
          this.currentAudio.dispatchEvent(endedEvent)
        } catch (_) {
          // Ignore if dispatch fails
        }
        this.currentAudio = null
        console.log('🛑 Audio playback stopped by user')
        return true
      } catch (error) {
        console.warn('⚠️ Failed to stop current audio:', error)
      }
    }
    return false
  }

  /**
   * Synthesize and play speech in one call with Safari compatibility
   */
  async speak(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    try {
      console.log('🗣️ Speaking with AWS Polly:', text.substring(0, 50) + '...')

      // Check for Safari restrictions
      // Interaction gating removed; we still log the attempt.

      const result = await this.synthesizeSpeech(text, options)

      if (!result.success) {
        console.error('❌ Failed to synthesize speech:', result.error)
        return false
      }

      await this.playAudio(result.audio, options?.outputFormat || 'mp3')
      if (this.consecutivePlaybackFailures === 0) {
        console.log('✅ Speech playback completed')
      } else {
        console.log(
          `✅ Speech playback completed (had ${this.consecutivePlaybackFailures} prior transient failure${this.consecutivePlaybackFailures === 1 ? '' : 's'})`,
        )
      }
      // Reset failure counter on success
      this.consecutivePlaybackFailures = 0
      this.lastPlaybackError = null
      return true
    } catch (error) {
      console.error('❌ Failed to speak:', error)

      // Safari specific handling
      if (
        isSafari &&
        error instanceof Error &&
        error.message.includes('NotAllowedError')
      ) {
        // Silent fail path retained; caller may choose to retry after natural interaction.
        return false
      }

      return false
    }
  }

  /**
   * Expose lightweight diagnostics for callers (optional UI/telemetry)
   */
  getDiagnostics() {
    return {
      consecutivePlaybackFailures: this.consecutivePlaybackFailures,
      lastPlaybackError: this.lastPlaybackError,
      audioUnlockedAssumed: this.audioContextUnlocked,
      userInteractionAssumed: this.userInteractionReceived,
    }
  }

  /**
   * Predefined voice prompts for AI interactions
   */
  prompts = {
    welcome:
      "Hi! I'm your AI assistant powered by AWS Polly. I'm here to help you analyze your documents and answer your questions.",
    listening:
      "I'm listening. Please speak your question clearly, and I'll help you find the information you need.",
    thinking: 'Let me analyze that for you. This may take a moment.',
    completed: "I've completed your analysis. You can see the results below.",
    noResults:
      "I couldn't find any relevant information for that query. Try rephrasing your question or asking about something else.",
    error:
      "I'm sorry, but I encountered an error. Please try again in a moment.",
    guidance: {
      examples:
        "You can ask questions like 'What are the safety requirements?' or search for specific terms like 'project timeline' or 'budget details'.",
      tips: 'For better results, try to be specific in your questions. You can ask about requirements, schedules, costs, or any other document details.',
      voice:
        'You can use voice input by clicking the microphone button, or listen to guidance by clicking the speaker button.',
    },
  }

  /**
   * Speak a predefined prompt
   */
  async speakPrompt(
    promptKey: keyof typeof this.prompts | string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    let text: string

    if (typeof promptKey === 'string' && promptKey in this.prompts) {
      const prompt = this.prompts[promptKey as keyof typeof this.prompts]
      text = typeof prompt === 'string' ? prompt : prompt.examples
    } else if (typeof promptKey === 'string') {
      text = promptKey
    } else {
      console.error('Invalid prompt key:', promptKey)
      return false
    }

    return this.speak(text, options)
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): VoiceId[] {
    return [
      'Joanna',
      'Salli',
      'Kendra',
      'Ivy',
      'Ruth',
      'Matthew',
      'Justin',
      'Joey',
      'Brian',
      'Amy',
      'Emma',
      'Olivia',
    ]
  }

  /**
   * Test the service with a simple phrase
   */
  async testService(): Promise<boolean> {
    return this.speak('AWS Polly text to speech is working correctly.', {
      voice: 'Joanna' as VoiceId,
    })
  }
}

// Export singleton instance
export const novaSonic = new NovaSonicService()

// Export class for custom instances
export { NovaSonicService }
export type { NovaSonicOptions, NovaSonicResponse }
