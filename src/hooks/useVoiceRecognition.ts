/**
 * Shared Voice Recognition Hook
 * Extracts voice recognition logic for use by both VoiceInput and VoiceShazamButton
 */

import { useState, useEffect, useRef } from 'react'

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

interface VoiceRecognitionConfig {
  onTranscript: (text: string) => void
  onInterimTranscript?: (text: string) => void
  preventLoop?: boolean
  disabled?: boolean
  preventAutoRestart?: boolean
  isMobile?: boolean
}

interface VoiceRecognitionResult {
  isListening: boolean
  transcript: string
  isProcessing: boolean
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

export const useVoiceRecognition = ({
  onTranscript,
  onInterimTranscript,
  preventLoop = false,
  disabled = false,
  preventAutoRestart = false,
  isMobile = false,
}: VoiceRecognitionConfig): VoiceRecognitionResult => {
  const [isListening, setIsListening] = useState(false)
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

        // Configure for better mobile performance
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Monitor audio playback to prevent loops
  useEffect(() => {
    if (!preventLoop) return

    const handleAudioStart = () => {
      isPlayingAudioRef.current = true
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
      if (preventAutoRestart) {
        console.log('Auto-restart prevented during AI response')
        return
      }

      setTimeout(() => {
        if (isListening && recognition && !isProcessing) {
          console.log('Audio playback ended, resuming voice input')
          try {
            recognition.start()
          } catch (error) {
            console.warn('Error restarting recognition after audio:', error)
          }
        }
      }, 500)
    }

    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.addEventListener('play', handleAudioStart)
      audio.addEventListener('ended', handleAudioEnd)
      audio.addEventListener('pause', handleAudioEnd)
    })

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
      if (isPlayingAudioRef.current && preventLoop) {
        console.log('Ignoring speech recognition during audio playback')
        return
      }

      const now = Date.now()
      lastTranscriptTimeRef.current = now
      setIsProcessing(true)

      const results = Array.from(event.results) as SpeechRecognitionResult[]
      let completeTranscript = ''
      for (let i = 0; i < results.length; i++) {
        completeTranscript += results[i][0].transcript
      }

      console.log('Complete transcript so far:', completeTranscript)
      setTranscript(completeTranscript)

      if (onInterimTranscript) {
        onInterimTranscript(completeTranscript)
      }

      if (!preventLoop) {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }

        // Use shorter timeout on mobile for better responsiveness
        const silenceTimeout = isMobile ? 1500 : 2500
        debounceTimeoutRef.current = setTimeout(() => {
          console.log(
            'Silence detected, sending complete transcript:',
            completeTranscript,
          )
          onTranscript(completeTranscript.trim())
          setIsProcessing(false)

          // Auto-stop after sending
          if (isListening) {
            setIsListening(false)
          }
        }, silenceTimeout)
      }
    }

    recognition.onerror = event => {
      console.error('Speech recognition error:', event.error)
      setIsProcessing(false)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      if (transcript.trim() && !preventLoop) {
        console.log(
          'Error occurred, sending accumulated transcript:',
          transcript,
        )
        onTranscript(transcript.trim())
      }

      if (isListening && !isPlayingAudioRef.current) {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      setIsProcessing(false)

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
    isProcessing,
    preventLoop,
    onInterimTranscript,
    transcript,
    isMobile,
  ])

  // Handle listening state changes
  useEffect(() => {
    if (!recognition || disabled) return

    if (isListening && !isPlayingAudioRef.current) {
      try {
        console.log('Starting speech recognition')
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

        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
          debounceTimeoutRef.current = null
        }
      } catch (error) {
        console.warn('Error stopping recognition:', error)
      }
    }
  }, [isListening, recognition, disabled])

  // Cleanup debounce timeout
  useEffect(() => {
    const currentTimeout = debounceTimeoutRef.current
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [])

  const startListening = () => setIsListening(true)
  const stopListening = () => setIsListening(false)
  const toggleListening = () => setIsListening(!isListening)

  return {
    isListening,
    transcript,
    isProcessing,
    startListening,
    stopListening,
    toggleListening,
  }
}
