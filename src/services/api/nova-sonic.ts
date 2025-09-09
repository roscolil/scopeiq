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
   * Setup audio context unlocking for iOS Safari
   */
  private setupAudioContextUnlocking() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS) {
      this.audioContextUnlocked = true
      return
    }

    // Function to unlock audio context with a silent audio play
    const unlockAudioContext = async () => {
      if (this.audioContextUnlocked) return

      try {
        // Create a silent audio buffer and play it
        const silentAudio = new Audio()
        silentAudio.src =
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
        silentAudio.volume = 0

        // Play the silent audio to unlock the context
        const playPromise = silentAudio.play()
        if (playPromise) {
          await playPromise
          console.log('🍎 Audio context unlocked with silent audio')
          this.audioContextUnlocked = true

          // Remove event listeners after successful unlock
          document.removeEventListener('touchstart', unlockAudioContext)
          document.removeEventListener('touchend', unlockAudioContext)
          document.removeEventListener('click', unlockAudioContext)
        }
      } catch (error) {
        console.warn('🍎 Failed to unlock audio context:', error)
      }
    }

    // Listen for user interactions to unlock audio context
    document.addEventListener('touchstart', unlockAudioContext, {
      passive: true,
    })
    document.addEventListener('touchend', unlockAudioContext, { passive: true })
    document.addEventListener('click', unlockAudioContext, { passive: true })
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.client !== null
  }

  /**
   * Check if audio context is unlocked for automatic playback (iOS)
   */
  isAudioUnlocked(): boolean {
    return this.audioContextUnlocked
  }

  /**
   * Manually unlock audio context (useful for iOS)
   */
  async unlockAudio(): Promise<boolean> {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS || this.audioContextUnlocked) {
      return true
    }

    try {
      const silentAudio = new Audio()
      silentAudio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
      silentAudio.volume = 0

      await silentAudio.play()
      this.audioContextUnlocked = true
      console.log('🍎 Audio manually unlocked for automatic playback')
      return true
    } catch (error) {
      console.warn('🍎 Failed to manually unlock audio:', error)
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
   * Play audio directly in the browser
   */
  async playAudio(
    audioData: Uint8Array,
    format: string = 'mp3',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a blob from the audio data
        const buffer = new ArrayBuffer(audioData.length)
        const view = new Uint8Array(buffer)
        view.set(audioData)
        const blob = new Blob([buffer], {
          type: `audio/${format}`,
        })
        const audioUrl = URL.createObjectURL(blob)

        // Create audio element and play
        const audio = new Audio(audioUrl)

        // iOS Safari specific configuration for better compatibility
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if (isIOS) {
          console.log('🍎 Configuring audio for iOS Safari')
          // Pre-load the audio to prepare for playback
          audio.preload = 'auto'
          audio.muted = false

          // Check if audio context is unlocked for automatic playback
          if (this.audioContextUnlocked) {
            console.log(
              '🍎 Audio context is unlocked - automatic playback enabled',
            )
          } else {
            console.log(
              '🍎 Audio context not unlocked - attempting playback anyway',
            )
          }
        }

        console.log('�🎵 Starting audio playback...')

        audio.onended = () => {
          console.log('✅ Audio playback completed successfully')
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = error => {
          console.error('❌ Audio playback error:', error)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Failed to play audio'))
        }

        audio.onloadstart = () => {
          console.log('🔄 Audio loading started...')
        }

        audio.oncanplay = () => {
          console.log('🎶 Audio ready to play')
        }

        // iOS Safari fix: Handle play promise rejection gracefully
        const playPromise = audio.play()

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🎵 Audio playback started successfully')
            })
            .catch(playError => {
              console.error('❌ Audio play() failed:', playError)

              // iOS-specific error handling
              if (isIOS && playError.name === 'NotAllowedError') {
                if (this.audioContextUnlocked) {
                  console.warn(
                    '🍎 Unexpected: audio blocked despite unlocked context',
                  )
                } else {
                  console.warn(
                    '🍎 iOS audio playback blocked - user interaction required',
                  )
                }
                // Don't reject for iOS NotAllowedError - this is expected
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
   * Synthesize and play speech in one call
   */
  async speak(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    try {
      console.log('🗣️ Speaking with AWS Polly:', text.substring(0, 50) + '...')

      const result = await this.synthesizeSpeech(text, options)

      if (!result.success) {
        console.error('❌ Failed to synthesize speech:', result.error)
        return false
      }

      await this.playAudio(result.audio, options?.outputFormat || 'mp3')
      console.log('✅ Speech playback completed')
      return true
    } catch (error) {
      console.error('❌ Failed to speak:', error)

      // iOS Safari specific handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (
        isIOS &&
        error instanceof Error &&
        error.message.includes('NotAllowedError')
      ) {
        console.warn(
          '🍎 iOS audio blocked - this is expected behavior without user gesture',
        )
        // Return true for iOS as blocking is expected
        return true
      }

      return false
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
