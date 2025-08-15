/**
 * Fixed Voice Input Componexport const VoiceInputFixed = ({
  onTranscript,
  isListening,
  toggleListening,
  preventLoop = false,
  disabled = false,
}: VoiceInputProps) => {th Loop Prevention
 * Prevents voice prompts from triggering speech recognition
 */

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
}

export const VoiceInputFixed = ({
  onTranscript,
  isListening,
  toggleListening,
  preventLoop = false,
  disabled = false,
  onInterimTranscript,
  preventAutoRestart = false,
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
    if (typeof window !== 'undefined' && !recognition) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI()

        // FIXED: Configure for better silence detection
        recognitionInstance.continuous = true // Enable continuous listening for silence detection
        recognitionInstance.interimResults = true // Enable interim results to detect speech activity
        recognitionInstance.lang = 'en-US'
        recognitionInstance.maxAlternatives = 1

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
  }, [])

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
    if (!recognition) return

    recognition.onresult = event => {
      // Prevent processing if audio is playing
      if (isPlayingAudioRef.current && preventLoop) {
        console.log('Ignoring speech recognition during audio playback')
        return
      }

      const now = Date.now()
      // Debounce rapid-fire results
      if (now - lastTranscriptTimeRef.current < 1000) {
        console.log('Debouncing rapid speech recognition result')
        return
      }

      lastTranscriptTimeRef.current = now
      setIsProcessing(true)

      const results = Array.from(event.results) as SpeechRecognitionResult[]

      // Handle interim results for real-time display
      const interimTranscript = results
        .filter(result => !result.isFinal)
        .map(result => result[0].transcript)
        .join('')
        .trim()

      // Handle final results for processing
      const finalTranscript = results
        .filter(result => result.isFinal)
        .map(result => result[0].transcript)
        .join('')
        .trim()

      // Show interim results in real-time
      if (interimTranscript && onInterimTranscript) {
        onInterimTranscript(interimTranscript)
      }

      if (finalTranscript) {
        console.log('Final transcript received:', finalTranscript)
        setTranscript(finalTranscript)

        // Send final transcript immediately (no debounce for final results)
        onTranscript(finalTranscript)
        setIsProcessing(false)

        // Don't auto-stop in preventLoop mode - let parent handle silence detection
        if (isListening && !preventLoop) {
          toggleListening()
        }
      } else if (interimTranscript) {
        // Still processing interim results
        setIsProcessing(true)
      }
    }

    recognition.onerror = event => {
      console.error('Speech recognition error:', event.error)
      setIsProcessing(false)

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
  ])

  // Handle listening state changes
  useEffect(() => {
    if (!recognition) return

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
      } catch (error) {
        console.warn('Error stopping recognition:', error)
      }
    }
  }, [isListening, recognition])

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
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
      className="shrink-0"
      disabled={isProcessing || disabled}
    >
      {isListening ? (
        <MicOff className={`w-5 h-5 ${micColor}`} />
      ) : (
        <Mic className={`w-5 h-5 ${micColor}`} />
      )}
    </Button>
  )
}

export { VoiceInputFixed as VoiceInput }
