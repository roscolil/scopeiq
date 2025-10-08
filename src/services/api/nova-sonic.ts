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
  // Persistent reusable output element (improves iOS autoplay reliability)
  private outputAudio: HTMLAudioElement | null = null
  // Autoplay blocked tracking
  private lastAutoplayBlockedAt: number | null = null
  private autoplayBlocked: boolean = false
  private autoplayListeners: Set<() => void> = new Set()
  // Web Audio API context & active buffer source (Option 2 path)
  private audioCtx: AudioContext | null = null
  private activeSource: AudioBufferSourceNode | null = null
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
   * Track initial user interaction to unlock audio autoplay on iOS/Safari and Android Chrome.
   */
  private setupUserInteractionTracking() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    if (!isSafari && !isIOS && !isAndroidChrome) {
      // Non‑restricted platforms: treat as immediately unlocked
      this.audioContextUnlocked = true
      this.userInteractionReceived = true
      this.unlockPromise = Promise.resolve()
      return
    }

    // Promise that resolves on first unlock
    this.unlockPromise = new Promise<void>(res => {
      this.unlockPromiseResolver = res
    })

    const handleUserInteraction = async () => {
      if (this.userInteractionReceived) return

      let platformLabel = '🍎'
      if (isAndroidChrome) platformLabel = '🤖'
      else if (isSafari || isIOS) platformLabel = '🍎'

      console.log(
        `${platformLabel} User interaction detected - unlocking audio`,
      )
      this.userInteractionReceived = true
      try {
        const silentAudio = new Audio()
        silentAudio.src =
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
        silentAudio.volume = 0
        silentAudio.muted = true

        // Android Chrome specific configuration
        if (isAndroidChrome) {
          ;(
            silentAudio as HTMLAudioElement & { playsInline?: boolean }
          ).playsInline = true
          silentAudio.preload = 'auto'
        }

        await silentAudio.play()
        this.audioContextUnlocked = true
        console.log(`${platformLabel} Audio context unlocked successfully`)
        if (this.unlockPromiseResolver) {
          this.unlockPromiseResolver()
          this.unlockPromiseResolver = null
        }
        this.flushSpeakQueue()
        setTimeout(() => {
          if (!this.isAudioUnlocked()) return
          if (this.pendingAudio) {
            console.log(
              `${platformLabel} Retrying pending audio play after unlock fallback window`,
            )
            this.playPendingAudio().catch(() => {})
          }
        }, 350)
      } catch (e) {
        console.warn(`${platformLabel} Failed to unlock audio context:`, e)
      } finally {
        document.removeEventListener('touchstart', handleUserInteraction)
        document.removeEventListener('touchend', handleUserInteraction)
        document.removeEventListener('click', handleUserInteraction)
        document.removeEventListener('keydown', handleUserInteraction)
      }
    }

    const opts: AddEventListenerOptions = { once: true, passive: true }
    document.addEventListener('touchstart', handleUserInteraction, opts)
    document.addEventListener('touchend', handleUserInteraction, opts)
    document.addEventListener('click', handleUserInteraction, opts)
    document.addEventListener('keydown', handleUserInteraction, { once: true })
  }

  /**
   * Ensure a single persistent <audio> element is used for all playback (improves iOS reliability).
   */
  private ensureOutputAudio(): HTMLAudioElement {
    if (this.outputAudio) return this.outputAudio
    const audio = document.createElement('audio')
    audio.preload = 'auto'
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.controls = false
    audio.style.display = 'none'
    document.body.appendChild(audio)
    this.outputAudio = audio
    return audio
  }

  /**
   * Public: register a listener invoked when autoplay is blocked (once per block episode).
   */
  onAutoplayBlocked(cb: () => void): () => void {
    this.autoplayListeners.add(cb)
    return () => this.autoplayListeners.delete(cb)
  }

  private emitAutoplayBlocked() {
    if (this.autoplayBlocked) return
    this.autoplayBlocked = true
    this.lastAutoplayBlockedAt = Date.now()
    console.warn('🔔 Emitting autoplay blocked event to listeners')
    this.autoplayListeners.forEach(l => {
      try {
        l()
      } catch (e) {
        /* ignore */
      }
    })
  }

  clearAutoplayBlockedFlag() {
    if (this.autoplayBlocked) {
      this.autoplayBlocked = false
      console.log('✅ Autoplay block cleared')
    }
  }

  hasPendingPlayback(): boolean {
    return !!this.pendingAudio || !!this.activeSource
  }

  /**
   * Ensure (or lazily create) an AudioContext for Web Audio playback.
   * Attempts to resume if suspended (common on iOS after backgrounding).
   */
  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      try {
        interface AudioContextWindow extends Window {
          webkitAudioContext?: typeof AudioContext
        }
        const w = window as AudioContextWindow
        const Ctor: typeof AudioContext | undefined =
          (typeof window !== 'undefined' && 'AudioContext' in window
            ? (window as unknown as { AudioContext: typeof AudioContext })
                .AudioContext
            : undefined) || w.webkitAudioContext
        if (!Ctor) throw new Error('AudioContext not supported')
        this.audioCtx = new Ctor()
      } catch (e) {
        console.warn('⚠️ Failed to create AudioContext', e)
        throw e
      }
    }
    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume()
        console.log('🔄 AudioContext resumed')
      } catch (e) {
        console.warn('⚠️ Failed to resume AudioContext', e)
      }
    }
    return this.audioCtx
  }

  /**
   * Play via Web Audio API. Returns true if successful, false if we should fallback.
   */
  private async playViaWebAudio(
    audioData: Uint8Array,
    format: string,
  ): Promise<boolean> {
    try {
      const ctx = await this.ensureAudioContext()
      // MP3 / PCM both acceptable; decodeAudioData handles container based on browser support.
      const arrayBuf = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength,
      )
      // Ensure we pass a plain ArrayBuffer (not SharedArrayBuffer) & clone to avoid detachment issues
      const clone = arrayBuf.slice(0)
      const audioBuffer = await ctx.decodeAudioData(clone as ArrayBuffer)
      // Stop any prior source
      if (this.activeSource) {
        try {
          this.activeSource.stop()
        } catch (e) {
          /* ignore stop race */
        }
        this.activeSource = null
      }
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      this.activeSource = source
      source.onended = () => {
        if (this.activeSource === source) {
          this.activeSource = null
        }
        console.log('✅ Web Audio buffer playback ended')
      }
      source.start(0)
      console.log('🎧 Playing via Web Audio path (buffer)')
      return true
    } catch (e) {
      console.warn('⚠️ Web Audio path failed, will fallback to element', e)
      return false
    }
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
   * Exposed helper for UI components: attempts to resume any pending (blocked) audio immediately.
   */
  async resumePendingAudio(): Promise<boolean> {
    if (this.pendingAudio) {
      console.log('🔁 Manual resumePendingAudio invoked')
      return this.playPendingAudio()
    }
    console.log('ℹ️ resumePendingAudio: no pending audio to play')
    return false
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
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    if (!this.client) {
      return {
        available: false,
        needsInteraction: false,
        message: 'Text-to-speech service not available',
      }
    }

    if (isSafari || isIOS || isAndroidChrome) {
      if (!this.userInteractionReceived) {
        let platformName = 'Safari/iOS'
        if (isAndroidChrome) platformName = 'Android Chrome'

        return {
          available: false,
          needsInteraction: true,
          message: `Click any button to enable audio playback on ${platformName}`,
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
      // Proactively create/resume AudioContext after a real user gesture
      try {
        await this.ensureAudioContext()
      } catch (e) {
        /* ignore ensure ctx failure */
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
      try {
        await this.ensureAudioContext()
      } catch (e) {
        /* ignore ensure ctx failure */
      }
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
   * Play audio directly in the browser with Safari and Android Chrome compatibility
   */
  async playAudio(
    audioData: Uint8Array,
    format: string = 'mp3',
  ): Promise<void> {
    // On iOS/Safari/Android Chrome, attempt Web Audio first (after unlock) to bypass element autoplay quirks
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    if ((isSafari || isIOS || isAndroidChrome) && this.isAudioUnlocked()) {
      const ok = await this.playViaWebAudio(audioData, format)
      if (ok) return
    }
    return this.playAudioElement(audioData, format)
  }

  /**
   * Original element-based playback path (renamed from playAudio)
   */
  private async playAudioElement(
    audioData: Uint8Array,
    format: string = 'mp3',
  ): Promise<void> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    return new Promise((resolve, reject) => {
      try {
        // Prepare blob URL
        const buf = new ArrayBuffer(audioData.length)
        const view = new Uint8Array(buf)
        view.set(audioData)
        const blob = new Blob([buf], { type: `audio/${format}` })
        const audioUrl = URL.createObjectURL(blob)

        // Reuse persistent element
        const audio = this.ensureOutputAudio()
        if (this.currentAudio && this.currentAudio !== audio) {
          this.stopCurrentPlayback()
        }
        this.currentAudio = audio

        // Safari/iOS/Android Chrome specific configuration
        if (isSafari || isIOS || isAndroidChrome) {
          audio.preload = 'auto'
          ;(audio as HTMLAudioElement & { playsInline: boolean }).playsInline =
            true
          audio.controls = false

          // Check if user interaction has occurred
          if (!this.userInteractionReceived) {
            const platformEmoji = isAndroidChrome ? '🤖' : '🍎'
            const platformName = isAndroidChrome
              ? 'Android Chrome'
              : 'Safari/iOS'

            console.warn(
              `${platformEmoji} ${platformName}: No user interaction detected - audio may be blocked`,
            )
            console.warn(
              `${platformEmoji} Audio playback requires user interaction on ${platformName}`,
            )

            // Store the audio for later playback when user interaction occurs
            this.pendingAudio = audio
            audio.src = audioUrl

            // Try to play anyway, but handle the expected failure gracefully
            const playPromise = audio.play()
            if (playPromise) {
              playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                  const platformEmoji = isAndroidChrome ? '🤖' : '🍎'
                  const platformName = isAndroidChrome
                    ? 'Android Chrome'
                    : 'Safari'

                  console.warn(
                    `${platformEmoji} Expected: ${platformName} blocked autoplay - waiting for user interaction`,
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

              // Handle Safari/iOS/Android Chrome specific errors
              if (
                (isSafari || isIOS || isAndroidChrome) &&
                playError.name === 'NotAllowedError'
              ) {
                const platformEmoji = isAndroidChrome ? '🤖' : '🍎'
                const platformName = isAndroidChrome
                  ? 'Android Chrome'
                  : 'Safari/iOS'

                console.warn(
                  `${platformEmoji} ${platformName} blocked audio playback - will retry on next gesture or unlock`,
                )
                this.pendingAudio = audio
                // Attach one-time gesture listeners to re-attempt playback ASAP
                const gestureReplay = () => {
                  document.removeEventListener('touchstart', gestureReplay)
                  document.removeEventListener('click', gestureReplay)
                  document.removeEventListener('keydown', gestureReplay)
                  if (this.pendingAudio) {
                    this.playPendingAudio()
                      .then(() =>
                        console.log(
                          '▶️ Deferred playback started (gesture replay)',
                        ),
                      )
                      .catch(e =>
                        console.warn(
                          '⚠️ Deferred playback failed (gesture replay)',
                          e,
                        ),
                      )
                  }
                }
                document.addEventListener('touchstart', gestureReplay, {
                  once: true,
                  passive: true,
                })
                document.addEventListener('click', gestureReplay, {
                  once: true,
                  passive: true,
                })
                document.addEventListener('keydown', gestureReplay, {
                  once: true,
                })
                interface AutoplayBlockedError extends Error {
                  code: string
                }
                this.emitAutoplayBlocked()
                const blocked: AutoplayBlockedError = Object.assign(
                  new Error('Autoplay blocked'),
                  { code: 'AUTOPLAY_BLOCKED' },
                )
                reject(blocked)
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
    if (this.activeSource) {
      try {
        this.activeSource.stop()
      } catch (e) {
        /* ignore */
      }
      this.activeSource = null
    }
    return false
  }

  /**
   * Synthesize and play speech in one call with Safari and Android Chrome compatibility
   */
  async speak(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    try {
      console.log('🗣️ Speaking with AWS Polly:', text.substring(0, 50) + '...')

      // Check for browser restrictions
      if ((isSafari || isAndroidChrome) && !this.userInteractionReceived) {
        const platformName = isSafari ? 'Safari' : 'Android Chrome'
        const platformEmoji = isSafari ? '🍎' : '🤖'

        console.warn(
          `${platformEmoji} ${platformName}: Audio playback requires user interaction`,
        )
        console.warn(
          `${platformEmoji} Tip: User should click a button or interact with the page first`,
        )
      }

      // Enhanced path delegates to queueOrPlay for duplicate suppression & queue mgmt
      return await this.queueOrPlay(text, options)
    } catch (error) {
      console.error('❌ Failed to speak:', error)

      // Platform-specific handling
      if (
        (isSafari || isAndroidChrome) &&
        error instanceof Error &&
        error.message.includes('NotAllowedError')
      ) {
        const platformName = isSafari ? 'Safari' : 'Android Chrome'
        const platformEmoji = isSafari ? '🍎' : '🤖'

        console.warn(
          `${platformEmoji} ${platformName} audio blocked - this is expected behavior without user gesture`,
        )
        console.warn(
          `${platformEmoji} To enable audio: user must click a button or interact with the page`,
        )
        return false // Return false to indicate audio was blocked
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

    // If locked (Safari/iOS/Android Chrome) push to unlock queue (existing speakQueue) for earliest opportunity
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent)
    const isAndroidChrome = isAndroid && isChrome

    if ((isSafari || isIOS || isAndroidChrome) && !this.isAudioUnlocked()) {
      const platformEmoji = isAndroidChrome ? '🤖' : '🍎'
      console.log(
        `${platformEmoji} Audio locked - deferring via initial unlock queue`,
      )
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
        const blocked = (err as { code?: string })?.code === 'AUTOPLAY_BLOCKED'
        if (attempt === retries) {
          if (blocked && this.pendingAudio) {
            console.warn(
              '🍎 Autoplay blocked after retries – will play once unlocked',
            )
            this.waitForUnlock()
              .then(() => {
                if (this.pendingAudio) {
                  this.playPendingAudio()
                    .then(() =>
                      console.log('▶️ Deferred playback started (post-unlock)'),
                    )
                    .catch(e => console.warn('⚠️ Deferred playback failed', e))
                }
              })
              .catch(() => {})
            return true
          }
          console.warn('⚠️ Exhausted audio play retries (non-autoplay)')
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
