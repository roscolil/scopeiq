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
import { fetchAuthSession } from 'aws-amplify/auth'
import { getAWSRegion } from '@/utils/aws/aws-config'

interface NovaSonicOptions {
  voice?: VoiceId
  outputFormat?: OutputFormat
  sampleRate?: string
  engine?: Engine
  languageCode?: LanguageCode
  textType?: 'text' | 'ssml' // Support for SSML markup
}

interface NovaSonicResponse {
  audio: Uint8Array
  success: boolean
  error?: string
}

class NovaSonicService {
  private client: PollyClient | null = null
  private userInteractionReceived: boolean = false
  private pendingAudio: HTMLAudioElement | null = null
  private audioContextUnlocked: boolean = false
  private playbackCompletionCallbacks: (() => void)[] = []
  private defaultOptions: Required<NovaSonicOptions> = {
    voice: 'Joanna' as VoiceId,
    outputFormat: 'mp3' as OutputFormat,
    sampleRate: '24000',
    engine: 'long-form' as Engine, // Upgraded from 'neural' for better pacing
    languageCode: 'en-US' as LanguageCode,
    textType: 'ssml' as 'text' | 'ssml', // Enable SSML by default for natural pauses
  }

  constructor() {
    this.initializeClient().catch(err => {
      console.error('Failed to initialize Polly client:', err)
    })
    this.setupUserInteractionTracking()
  }

  /**
   * Reinitialize client (useful after user signs in)
   */
  async reinitialize(): Promise<void> {
    await this.initializeClient()
  }

  private async initializeClient() {
    try {
      const region = getAWSRegion()

      // Get credentials from Amplify auth session
      const session = await fetchAuthSession()

      if (!session.credentials) {
        console.warn('⚠️ No AWS credentials available from Amplify session')
        console.warn('⚠️ User may need to sign in for TTS to work')
        return
      }

      this.client = new PollyClient({
        region,
        credentials: session.credentials,
      })

      console.log('✅ AWS Polly client initialized with Amplify credentials')
    } catch (error) {
      console.error('❌ Failed to initialize AWS Polly service:', error)
      console.warn('⚠️ TTS will not be available until user signs in')
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.client !== null
  }

  /**
   * Track user interaction to unlock audio autoplay
   */
  private setupUserInteractionTracking() {
    const unlockAudio = () => {
      if (this.userInteractionReceived) return

      console.log('🔓 User interaction detected - audio unlocked')
      this.userInteractionReceived = true

      // Try to play pending audio if any
      if (this.pendingAudio) {
        this.pendingAudio
          .play()
          .then(() => {
            console.log('✅ Pending audio played successfully')
          })
          .catch(err => {
            console.warn('⚠️ Failed to play pending audio:', err)
          })
        this.pendingAudio = null
      }

      // Clean up listeners after first interaction
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
    }

    // Listen for any user interaction
    document.addEventListener('click', unlockAudio, { passive: true })
    document.addEventListener('touchstart', unlockAudio, { passive: true })
    document.addEventListener('keydown', unlockAudio, { passive: true })
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
        TextType: config.textType,
        VoiceId: config.voice,
        OutputFormat: config.outputFormat,
        SampleRate: config.sampleRate,
        Engine: config.engine,
        LanguageCode: config.languageCode,
      })

      console.log(
        '🎵 Requesting speech synthesis from AWS Polly (long-form)...',
      )
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
   * Play audio directly in the browser with autoplay handling
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

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          this.notifyPlaybackComplete()
          resolve()
        }

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Failed to play audio'))
        }

        // Try to play, handling autoplay restrictions
        audio
          .play()
          .then(() => {
            console.log('✅ Audio playing')
          })
          .catch(err => {
            console.warn('⚠️ Autoplay blocked, waiting for user interaction')
            // Store for later playback after user interaction
            this.pendingAudio = audio

            // If user already interacted, try playing immediately
            if (this.userInteractionReceived) {
              audio.play().catch(console.error)
            }
          })
      } catch (error) {
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
      return false
    }
  }

  /**
   * Predefined voice prompts for AI interactions with SSML for natural pacing
   */
  prompts = {
    welcome: `<speak>
      <break time="200ms"/>
      Hi! <break time="400ms"/>
      I'm your AI assistant powered by AWS Polly.
      <break time="300ms"/>
      <prosody rate="95%">
        I'm here to help you analyze your documents and answer your questions.
      </prosody>
    </speak>`,
    listening: `<speak>
      <prosody rate="92%" pitch="-2%">
        I'm listening.
        <break time="600ms"/>
        Please speak your question clearly,
        <break time="400ms"/>
        and I'll help you find the information you need.
      </prosody>
    </speak>`,
    thinking: `<speak>
      <prosody rate="90%">
        Let me analyze that for you.
        <break time="500ms"/>
        This may take a moment.
      </prosody>
    </speak>`,
    completed: `<speak>
      <break time="200ms"/>
      I've completed your analysis.
      <break time="500ms"/>
      <prosody rate="95%">
        You can see the results below.
      </prosody>
    </speak>`,
    noResults: `<speak>
      <prosody rate="90%" pitch="-1%">
        I couldn't find any relevant information for that query.
        <break time="600ms"/>
        Try rephrasing your question
        <break time="400ms"/>
        or asking about something else.
      </prosody>
    </speak>`,
    error: `<speak>
      <prosody rate="88%" pitch="-2%">
        I'm sorry,
        <break time="400ms"/>
        but I encountered an error.
        <break time="500ms"/>
        Please try again in a moment.
      </prosody>
    </speak>`,
    guidance: {
      examples: `<speak>
        <prosody rate="93%">
          You can ask questions like
          <break time="400ms"/>
          <emphasis level="moderate">What are the safety requirements?</emphasis>
          <break time="500ms"/>
          or search for specific terms like
          <break time="400ms"/>
          <emphasis level="moderate">project timeline</emphasis>
          <break time="300ms"/>
          or
          <break time="300ms"/>
          <emphasis level="moderate">budget details</emphasis>.
        </prosody>
      </speak>`,
      tips: `<speak>
        <prosody rate="92%">
          For better results,
          <break time="400ms"/>
          try to be specific in your questions.
          <break time="500ms"/>
          You can ask about requirements,
          <break time="300ms"/>
          schedules,
          <break time="300ms"/>
          costs,
          <break time="300ms"/>
          or any other document details.
        </prosody>
      </speak>`,
      voice: `<speak>
        <prosody rate="93%">
          You can use voice input by clicking the microphone button,
          <break time="500ms"/>
          or listen to guidance by clicking the speaker button.
        </prosody>
      </speak>`,
    },
  }

  /**
   * Wrap plain text in SSML tags with natural pacing
   */
  private wrapInSSML(text: string): string {
    // Check if text is already SSML
    if (text.trim().startsWith('<speak>')) {
      return text
    }

    // Add natural pauses and prosody for plain text
    return `<speak>
      <prosody rate="93%" pitch="+0%">
        <break time="200ms"/>
        ${text}
      </prosody>
    </speak>`
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
      // Wrap custom text in SSML for better pacing
      text = this.wrapInSSML(promptKey)
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
    const testText = `<speak>
      <prosody rate="95%">
        AWS Polly long-form text to speech
        <break time="400ms"/>
        is working correctly.
      </prosody>
    </speak>`
    return this.speak(testText, {
      voice: 'Joanna' as VoiceId,
    })
  }

  /**
   * Speak with automatic SSML wrapping for custom text
   */
  async speakNatural(
    text: string,
    options?: Partial<NovaSonicOptions>,
  ): Promise<boolean> {
    const ssmlText = this.wrapInSSML(text)
    return this.speak(ssmlText, options)
  }

  /**
   * Enable audio for Safari/iOS (handles autoplay restrictions)
   */
  async enableAudioForSafari(): Promise<boolean> {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOSFamily = /iPad|iPhone|iPod|CriOS|FxiOS/i.test(
      navigator.userAgent,
    )

    if (!isSafari && !isIOSFamily) {
      return true // Not needed on non-Safari/iOS
    }

    try {
      // Play silent audio to unlock audio context
      const silentAudio = new Audio()
      silentAudio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAVJZfh9bS7aV8sbwP1x9Q='
      silentAudio.volume = 0
      silentAudio.muted = true

      await silentAudio.play()
      this.audioContextUnlocked = true
      this.userInteractionReceived = true

      console.log('✅ Audio enabled for Safari/iOS')
      return true
    } catch (error) {
      console.error('❌ Failed to enable audio for Safari:', error)
      return false
    }
  }

  /**
   * Register a callback for playback completion events
   * Returns an unsubscribe function
   */
  onPlaybackComplete(callback: () => void): () => void {
    this.playbackCompletionCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.playbackCompletionCallbacks.indexOf(callback)
      if (index > -1) {
        this.playbackCompletionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify all registered callbacks when playback completes
   */
  private notifyPlaybackComplete(): void {
    console.log('🔄 Notifying playback completion callbacks')
    this.playbackCompletionCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in playback completion callback:', error)
      }
    })
  }
}

// Export singleton instance
export const novaSonic = new NovaSonicService()

// Export class for custom instances
export { NovaSonicService }
export type { NovaSonicOptions, NovaSonicResponse }
