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
  private audioContextUnlocked: boolean = false
  private userInteractionReceived: boolean = false
  private pendingAudio: HTMLAudioElement | null = null
  // Track the currently playing audio element so we can stop/cancel playback early
  private currentAudio: HTMLAudioElement | null = null
  // Queue of pending speak requests when autoplay blocked (iOS/Safari)
  private speakQueue: Array<{
    text: string
    options?: Partial<NovaSonicOptions>
    resolve: (v: boolean) => void
    reject: (e: unknown) => void
  }> = []
  // A promise that resolves when audio is unlocked (first user gesture)
  private unlockPromise: Promise<void> | null = null
  private unlockPromiseResolver: (() => void) | null = null
  private defaultOptions: Required<NovaSonicOptions> = {
    voice: 'Joanna' as VoiceId,
    outputFormat: 'mp3' as OutputFormat,
    sampleRate: '24000',
    engine: 'neural' as Engine,
    languageCode: 'en-US' as LanguageCode,
  }

  // ----- Playback management additions -----
  private playbackQueue: Array<{
    text: string
    options?: Partial<NovaSonicOptions>
    resolve: (v: boolean) => void
    reject: (e: unknown) => void
    requestedAt: number
    interrupt: boolean
  }> = []
  private isSpeaking: boolean = false
  private lastSpokenText: string | null = null
  private lastSpokenAt = 0
  private playbackConfig = {
    duplicateSuppressionMs: 2000, // Skip identical consecutive text inside this window
    maxQueueLength: 6, // Cap to avoid runaway backlog on iOS
    mode: 'queue' as 'queue' | 'interrupt', // default behavior when interrupt flag not provided
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

    if (!isSafari && !isIOS) {
      this.audioContextUnlocked = true
      this.userInteractionReceived = true
      // Non restricted platforms: immediately resolve unlock promise
      this.unlockPromise = Promise.resolve()
      return
    }

    // Create a promise which is resolved upon first successful unlock
    this.unlockPromise = new Promise<void>(res => {
      this.unlockPromiseResolver = res
    })

    // Function to handle user interaction
    const handleUserInteraction = async () => {
      if (this.userInteractionReceived) return

      console.log('🍎 User interaction detected - unlocking audio')
      this.userInteractionReceived = true

      try {
        // Create and immediately play a silent audio to unlock the context
        const silentAudio = new Audio()
        silentAudio.src =
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
        silentAudio.volume = 0
        silentAudio.muted = true

        // Prepare the audio element for immediate playback
        await silentAudio.play()
        this.audioContextUnlocked = true
        console.log('✅ Audio context unlocked successfully')

        // Resolve unlock promise and flush any queued speak requests
        if (this.unlockPromiseResolver) {
          this.unlockPromiseResolver()
          this.unlockPromiseResolver = null
        }
        // Flush queued requests immediately
        this.flushSpeakQueue()
        // Schedule a fallback re-attempt for any early playback that may have been silently blocked
        setTimeout(() => {
          if (!this.isAudioUnlocked()) return
          // If nothing is currently playing but we had a previously pendingAudio, try again
          if (this.pendingAudio) {
            console.log(
              '🔁 Retrying pending audio play after unlock fallback window',
            )
            this.playPendingAudio().catch(() => {})
          }
        }, 350)

        // Remove event listeners after successful unlock
        document.removeEventListener('touchstart', handleUserInteraction)
        document.removeEventListener('touchend', handleUserInteraction)
        document.removeEventListener('click', handleUserInteraction)
        document.removeEventListener('keydown', handleUserInteraction)
      } catch (error) {
        console.warn('⚠️ Failed to unlock audio context:', error)
      }
    }

    // Listen for various user interactions
    document.addEventListener('touchstart', handleUserInteraction, {
      once: true,
      passive: true,
    })
    document.addEventListener('touchend', handleUserInteraction, {
      once: true,
      passive: true,
    })
    document.addEventListener('click', handleUserInteraction, {
      once: true,
      passive: true,
    })
    document.addEventListener('keydown', handleUserInteraction, {
      once: true,
      passive: true,
    })
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
      if (!this.userInteractionReceived) {
        return {
          available: false,
          needsInteraction: true,
          message: 'Click any button to enable audio playback on Safari/iOS',
        }
      } else {
        return {
          available: true,
          needsInteraction: false,
          message: 'Audio enabled and ready',
        }
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
    const isIOSFamily = /iPad|iPhone|iPod|CriOS|FxiOS/i.test(
      navigator.userAgent,
    )
    if (!isSafari && !isIOSFamily) {
      return true // Already enabled / not needed on non-Safari/iOS family
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
      // Resolve unlock promise if pending
      if (this.unlockPromiseResolver) {
        this.unlockPromiseResolver()
        this.unlockPromiseResolver = null
      }
      // Flush any queued speech now that unlock succeeded
      this.flushSpeakQueue()
      return true
    } catch (error) {
      console.error('❌ Failed to enable audio for Safari:', error)
      return false
    }
  }

  /**
   * Force unlock audio across iOS family browsers (Safari, Chrome iOS, Firefox iOS).
   * Safe to call repeatedly; idempotent after unlock.
   */
  async forceUnlockAudio(): Promise<boolean> {
    if (this.isAudioUnlocked()) return true
    try {
      const silentAudio = new Audio()
      silentAudio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
      silentAudio.volume = 0
      silentAudio.muted = true
      await silentAudio.play()
      this.audioContextUnlocked = true
      this.userInteractionReceived = true
      if (this.unlockPromiseResolver) {
        this.unlockPromiseResolver()
        this.unlockPromiseResolver = null
      }
      console.log('🔓 forceUnlockAudio succeeded')
      this.flushSpeakQueue()
      return true
    } catch (e) {
      console.warn('⚠️ forceUnlockAudio failed', e)
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
          if (!this.userInteractionReceived) {
            console.warn(
              '🍎 Safari: No user interaction detected - audio may be blocked',
            )
            console.warn(
              '🍎 Audio playback requires user interaction on Safari/iOS',
            )

            // Store the audio for later playback when user interaction occurs
            this.pendingAudio = audio
            audio.src = audioUrl

            // Try to play anyway, but handle the expected failure gracefully
            const playPromise = audio.play()
            if (playPromise) {
              playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                  console.warn(
                    '🍎 Expected: Safari blocked autoplay - waiting for user interaction',
                  )
                  // Clean up but don't reject - this is expected behavior
                  URL.revokeObjectURL(audioUrl)
                  resolve()
                } else {
                  URL.revokeObjectURL(audioUrl)
                  reject(error)
                }
              })
            } else {
              URL.revokeObjectURL(audioUrl)
              resolve()
            }
            return
          }
        }

        audio.src = audioUrl

        console.log('🎵 Starting audio playback...', {
          locked: !this.isAudioUnlocked(),
          ua: navigator.userAgent,
        })

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
          reject(new Error('Failed to play audio'))
        }

        // Attempt to play with proper error handling
        const playPromise = audio.play()

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🎵 Audio playback started successfully')
            })
            .catch(playError => {
              console.error('❌ Audio play() failed:', playError)

              // Handle Safari/iOS specific errors
              if ((isSafari || isIOS) && playError.name === 'NotAllowedError') {
                console.warn(
                  '🍎 Safari/iOS blocked audio playback - user interaction required',
                )
                // Store as pending to retry after explicit unlock fallback
                this.pendingAudio = audio
                // For Safari, this is expected behavior, so we don't reject
                URL.revokeObjectURL(audioUrl)
                resolve()
              } else {
                URL.revokeObjectURL(audioUrl)
                reject(playError)
              }
            })
        }
      } catch (error) {
        console.error('❌ Audio setup error:', error)
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    try {
      console.log('🗣️ Speaking with AWS Polly:', text.substring(0, 50) + '...')

      // Check for Safari restrictions
      if (isSafari && !this.userInteractionReceived) {
        console.warn('🍎 Safari: Audio playback requires user interaction')
        console.warn(
          '🍎 Tip: User should click a button or interact with the page first',
        )
      }

      // Enhanced path delegates to queueOrPlay for duplicate suppression & queue mgmt
      return await this.queueOrPlay(text, options)
    } catch (error) {
      console.error('❌ Failed to speak:', error)

      // Safari specific handling
      if (
        isSafari &&
        error instanceof Error &&
        error.message.includes('NotAllowedError')
      ) {
        console.warn(
          '🍎 Safari audio blocked - this is expected behavior without user gesture',
        )
        console.warn(
          '🍎 To enable audio: user must click a button or interact with the page',
        )
        return false // Return false for Safari to indicate audio was blocked
      }

      return false
    }
  }

  /**
   * Public API: Configure playback behavior.
   */
  configurePlayback(config: Partial<typeof this.playbackConfig>) {
    this.playbackConfig = { ...this.playbackConfig, ...config }
  }

  /**
   * Request to speak with queue / interrupt semantics.
   * If options?.interrupt === true, current playback stopped and this item plays immediately.
   */
  private queueOrPlay(
    text: string,
    options?: Partial<NovaSonicOptions> & { interrupt?: boolean },
  ): Promise<boolean> {
    // Duplicate suppression (exact text) within window
    const now = Date.now()
    if (
      this.lastSpokenText === text &&
      now - this.lastSpokenAt < this.playbackConfig.duplicateSuppressionMs
    ) {
      console.log('⏭️ Skipping duplicate speech within suppression window')
      return Promise.resolve(true)
    }

    // If locked (Safari/iOS) push to unlock queue (existing speakQueue) for earliest opportunity
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if ((isSafari || isIOS) && !this.isAudioUnlocked()) {
      console.log('🍎 Audio locked - deferring via initial unlock queue')
      return this.queueSpeak(text, options)
    }

    return new Promise<boolean>((resolve, reject) => {
      const interrupt =
        options?.interrupt === true || this.playbackConfig.mode === 'interrupt'
      // If interrupting, clear queue and stop current
      if (interrupt) {
        if (this.currentAudio) this.stopCurrentPlayback()
        this.playbackQueue = []
      } else {
        // Enforce max queue length
        if (this.playbackQueue.length >= this.playbackConfig.maxQueueLength) {
          // Drop oldest
          this.playbackQueue.shift()
        }
      }

      this.playbackQueue.push({
        text,
        options,
        resolve,
        reject,
        requestedAt: now,
        interrupt,
      })
      this.processPlaybackQueue()
    })
  }

  /**
   * Sequentially process playback queue.
   */
  private async processPlaybackQueue() {
    if (this.isSpeaking) return
    const next = this.playbackQueue.shift()
    if (!next) return
    this.isSpeaking = true
    try {
      const result = await this.synthesizeSpeech(next.text, next.options)
      if (!result.success) {
        next.resolve(false)
      } else {
        // Attempt playback with retries
        const ok = await this.tryPlayWithRetry(
          result.audio,
          next.options?.outputFormat || 'mp3',
          2,
        )
        if (ok) {
          this.lastSpokenText = next.text
          this.lastSpokenAt = Date.now()
        }
        next.resolve(ok)
      }
    } catch (e) {
      next.reject(e)
    } finally {
      this.isSpeaking = false
      // Process remaining items
      if (this.playbackQueue.length) this.processPlaybackQueue()
    }
  }

  /**
   * Queue a speak request until audio unlocked (iOS/Safari autoplay)
   */
  private queueSpeak(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.speakQueue.push({ text, options, resolve, reject })
    })
  }

  /**
   * Flush queued speak requests once audio unlocked
   */
  private async flushSpeakQueue() {
    if (!this.speakQueue.length) return
    console.log(
      `🚀 Flushing ${this.speakQueue.length} queued speech request(s) after unlock`,
    )
    const queue = [...this.speakQueue]
    this.speakQueue = []
    for (const item of queue) {
      try {
        const ok = await this.speak(item.text, item.options)
        item.resolve(ok)
      } catch (e) {
        item.reject(e)
      }
    }
  }

  /**
   * Attempt playback with limited retries (handles transient iOS failures)
   */
  private async tryPlayWithRetry(
    audioData: Uint8Array,
    format: string,
    retries: number,
  ): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.playAudio(audioData, format)
        return true
      } catch (err) {
        if (attempt === retries) {
          console.warn('⚠️ Exhausted audio play retries')
          return false
        }
        // Small jittered delay
        await new Promise(r => setTimeout(r, 120 + attempt * 80))
        // Attempt force unlock mid-retry for iOS if still locked
        if (!this.isAudioUnlocked()) {
          this.forceUnlockAudio().catch(() => {})
        }
        console.log('🔁 Retrying audio playback attempt', attempt + 1)
      }
    }
    return false
  }

  /**
   * Expose a method to wait until audio unlocked (for UI components)
   */
  waitForUnlock(): Promise<void> {
    if (this.isAudioUnlocked()) return Promise.resolve()
    if (!this.unlockPromise) {
      this.unlockPromise = new Promise<void>(res => {
        this.unlockPromiseResolver = res
      })
    }
    return this.unlockPromise
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
