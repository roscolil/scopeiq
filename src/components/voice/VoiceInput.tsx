/**
 * Voice Input Component with Loop Prevention
 * Prevents voice prompts from triggering speech recognition
 */

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// TypeScript declarations for Speech Recognition API
interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: {
    transcript: string
    confidence: number
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[]
  resultIndex: number
}

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isListening: boolean
  toggleListening: () => void
  preventLoop?: boolean // New prop to prevent voice loops
  disabled?: boolean // New prop to disable the component
  onInterimTranscript?: (text: string) => void // New prop for interim results
  preventAutoRestart?: boolean // New prop to prevent auto-restart during AI responses
  isMobile?: boolean // New prop to optimize timeouts for mobile
}

export const VoiceInput = ({
  onTranscript,
  isListening,
  toggleListening,
  preventLoop = false,
  disabled = false,
  onInterimTranscript,
  preventAutoRestart = false,
  isMobile = false,
}: VoiceInputProps) => {
  const [transcript, setTranscript] = useState<string>('')
  const [recognition, setRecognition] = useState<
    typeof SpeechRecognition | null
  >(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs to track audio and prevent loops
  const audioContextRef = useRef<AudioContext | null>(null)
  const isPlayingAudioRef = useRef(false)
  const lastTranscriptTimeRef = useRef<number>(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    // CRITICAL FIX: Don't initialize recognition on mobile to prevent duplicate voice processing
    // Mobile devices use the mobileRecognitionRef in AIActions component instead
    if (isMobile) {
      console.log(
        '🎤 Skipping VoiceInput recognition initialization on mobile (using AIActions mobile recognition)',
      )
      return
    }

    if (typeof window !== 'undefined' && !recognition) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI()

        // Configure for desktop/tablet usage
        recognitionInstance.continuous = true // Enable continuous listening for silence detection
        recognitionInstance.interimResults = true // Enable interim results to detect speech activity
        recognitionInstance.lang = 'en-US'
        recognitionInstance.maxAlternatives = 1

        console.log('🎤 VoiceInput recognition initialized for desktop/tablet')
        setRecognition(recognitionInstance)
      } else {
        console.error('Speech Recognition API is not supported in this browser')
      }
    }

    return () => {
      if (recognition) {
        recognition.onresult = null
        recognition.onend = null
        recognition.onerror = null
        if (isListening) {
          try {
            recognition.stop()
          } catch (error) {
            console.error('Error stopping recognition during cleanup:', error)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]) // Include isMobile to re-initialize when device type changes

  // Monitor audio playback to prevent loops
  useEffect(() => {
    if (!preventLoop) return

    const handleAudioStart = () => {
      isPlayingAudioRef.current = true
      // Stop listening when audio starts playing
      if (isListening && recognition) {
        console.log('Audio playback detected, pausing voice input')
        try {
          recognition.stop()
        } catch (error) {
          console.warn('Error stopping recognition for audio:', error)
        }
      }
    }

    const handleAudioEnd = () => {
      isPlayingAudioRef.current = false
      // Don't auto-restart if preventAutoRestart is true (during AI responses)
      if (preventAutoRestart) {
        console.log('Auto-restart prevented during AI response')
        return
      }

      // Small delay before allowing voice input again
      setTimeout(() => {
        if (isListening && recognition && !isProcessing) {
          console.log('Audio playback ended, resuming voice input')
          try {
            recognition.start()
          } catch (error) {
            console.warn('Error restarting recognition after audio:', error)
          }
        }
      }, 500) // 500ms delay to avoid feedback
    }

    // Listen for audio elements
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.addEventListener('play', handleAudioStart)
      audio.addEventListener('ended', handleAudioEnd)
      audio.addEventListener('pause', handleAudioEnd)
    })

    // Also monitor for dynamically created audio
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLAudioElement) {
            node.addEventListener('play', handleAudioStart)
            node.addEventListener('ended', handleAudioEnd)
            node.addEventListener('pause', handleAudioEnd)
          }
        })
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      audioElements.forEach(audio => {
        audio.removeEventListener('play', handleAudioStart)
        audio.removeEventListener('ended', handleAudioEnd)
        audio.removeEventListener('pause', handleAudioEnd)
      })
      observer.disconnect()
    }
  }, [isListening, recognition, isProcessing, preventLoop, preventAutoRestart])

  // Set up recognition event handlers
  useEffect(() => {
    if (!recognition) return // No recognition on mobile - handled by AIActions

    recognition.onresult = event => {
      // Prevent processing if audio is playing
      if (isPlayingAudioRef.current && preventLoop) {
        console.log('Ignoring speech recognition during audio playback')
        return
      }

      const now = Date.now()
      lastTranscriptTimeRef.current = now
      setIsProcessing(true)

      const results = Array.from(event.results) as SpeechRecognitionResult[]

      // Build complete transcript from ALL results (both interim and final)
      let completeTranscript = ''
      for (let i = 0; i < results.length; i++) {
        completeTranscript += results[i][0].transcript
      }

      console.log('Complete transcript so far:', completeTranscript)

      // Store the complete accumulated transcript
      setTranscript(completeTranscript)

      // Show real-time transcript via interim callback
      if (onInterimTranscript) {
        onInterimTranscript(completeTranscript)
      }

      // In normal mode (non-preventLoop), send complete transcript after silence
      if (!preventLoop) {
        // Clear any existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }

        // Set new timeout for silence detection
        debounceTimeoutRef.current = setTimeout(
          () => {
            console.log(
              'Silence detected, sending complete transcript:',
              completeTranscript,
            )
            onTranscript(completeTranscript.trim())
            setIsProcessing(false)

            // Auto-stop after sending
            if (isListening) {
              toggleListening()
            }
          },
          isMobile ? 1500 : 2500,
        ) // Mobile-aware timeout for better responsiveness
      }
    }

    recognition.onerror = event => {
      console.error('Speech recognition error:', event.error)
      setIsProcessing(false)

      // Clear timeout on error
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      // Send any accumulated transcript before stopping
      if (transcript.trim() && !preventLoop) {
        console.log(
          'Error occurred, sending accumulated transcript:',
          transcript,
        )
        onTranscript(transcript.trim())
      }

      if (isListening && !isPlayingAudioRef.current) {
        toggleListening()
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      setIsProcessing(false)

      // Only restart if we're still supposed to be listening and not playing audio
      if (isListening && !isPlayingAudioRef.current && !isProcessing) {
        try {
          setTimeout(() => {
            if (isListening && recognition) {
              recognition.start()
            }
          }, 100)
        } catch (error) {
          console.error('Error restarting recognition:', error)
        }
      }
    }

    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
    }
  }, [
    recognition,
    isListening,
    onTranscript,
    toggleListening,
    isProcessing,
    preventLoop,
    onInterimTranscript,
    transcript,
    isMobile,
  ])

  // Handle listening state changes
  useEffect(() => {
    if (!recognition) return // No recognition on mobile - handled by AIActions

    if (isListening && !isPlayingAudioRef.current) {
      try {
        console.log('Starting speech recognition (loop-safe)')
        setTranscript('')
        recognition.start()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          console.error('Speech recognition permission denied:', error)
        } else if (
          error instanceof DOMException &&
          error.message.includes('already started')
        ) {
          console.log('Recognition already started')
        } else {
          console.error('Error starting speech recognition:', error)
        }
      }
    } else {
      try {
        recognition.stop()
        setTranscript('')
        setIsProcessing(false)

        // Clear any pending timeout when stopping
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
          debounceTimeoutRef.current = null
        }
      } catch (error) {
        console.warn('Error stopping recognition:', error)
      }
    }
  }, [isListening, recognition])

  // Cleanup debounce timeout
  useEffect(() => {
    const currentTimeout = debounceTimeoutRef.current
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [])

  const buttonVariant = isListening ? 'default' : 'outline'
  const micColor = isListening
    ? isProcessing
      ? 'text-orange-500'
      : 'text-red-500'
    : 'text-gray-500'

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size="icon"
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      onClick={toggleListening}
      className={cn(
        'shrink-0',
        isMobile ? 'hidden' : 'inline-flex', // Hide button on mobile, but keep voice recognition active
      )}
      disabled={isProcessing || disabled}
    >
      {isListening ? (
        <MicOff className={micColor} />
      ) : (
        <Mic className={micColor} />
      )}
    </Button>
  )
}
