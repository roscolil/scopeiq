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
  private defaultOptions: Required<NovaSonicOptions> = {
    voice: 'Joanna' as VoiceId,
    outputFormat: 'mp3' as OutputFormat,
    sampleRate: '24000',
    engine: 'neural' as Engine,
    languageCode: 'en-US' as LanguageCode,
  }

  constructor() {
    this.initializeClient()
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
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.client !== null
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
          console.log('� Configuring audio for iOS Safari')
          // Pre-load the audio to prepare for playback
          audio.preload = 'auto'
          // iOS requires explicit interaction, but we'll try anyway
          audio.muted = false
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
                console.warn(
                  '🍎 iOS audio playback blocked - user interaction required',
                )
                // Don't reject, as this is expected behavior on iOS
                URL.revokeObjectURL(audioUrl)
                resolve() // Resolve instead of reject for iOS compatibility
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
