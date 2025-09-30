/**
 * useSpeechRecognition Hook
 *
 * Simplified speech recognition hook that handles all the complexity of Web Speech API
 * with proper Android/iOS support and no restart loops.
 *
 * Key improvements:
 * - Single unified logic path for all platforms (no duplicate code)
 * - Proper lifecycle management to prevent restart loops
 * - Clear state machine with explicit transitions
 * - Single auto-submit timer (no conflicting timers)
 * - Platform-specific optimizations applied at initialization only
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Minimal typing for SpeechRecognition API
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

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

type RecognitionState =
  | 'idle' // Not listening
  | 'starting' // User initiated, waiting for onstart
  | 'listening' // Actively listening (onstart fired)
  | 'processing' // Got transcript, waiting for silence/submission
  | 'submitting' // Submitting transcript (includes 1.5s delay)
  | 'stopping' // User stopped, cleaning up
  | 'error' // Error occurred

interface UseSpeechRecognitionOptions {
  /** Called when final transcript ready after silence detection */
  onTranscript: (text: string) => void
  /** Silence duration in ms before auto-submit */
  silenceDuration?: number
  /** Whether recognition is enabled (can be toggled by parent) */
  enabled?: boolean
  /** Whether to automatically prevent wake word conflicts */
  preventWakeWordConflicts?: boolean
}

interface UseSpeechRecognitionReturn {
  /** Current state of recognition */
  state: RecognitionState
  /** Current transcript (interim + final) */
  transcript: string
  /** Whether currently listening for speech */
  isListening: boolean
  /** Whether in the middle of submitting */
  isSubmitting: boolean
  /** Start listening */
  start: () => void
  /** Stop listening */
  stop: () => void
  /** Toggle listening state */
  toggle: () => void
  /** Last error if any */
  error: string | null
}

// Detect platform once
const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
const isAndroid = /Android/i.test(userAgent)
const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
const isMobile = isAndroid || isIOS

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions,
): UseSpeechRecognitionReturn {
  const {
    onTranscript,
    silenceDuration = 1500,
    enabled = true,
    preventWakeWordConflicts = true,
  } = options

  // State
  const [state, setState] = useState<RecognitionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Refs for managing lifecycle
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<string>('') // Mirror for timer access
  const lastSubmittedRef = useRef<string>('')
  const shouldBeListeningRef = useRef<boolean>(false)

  // Update transcript ref when state changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Platform-optimized initialization (runs once)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error('❌ SpeechRecognition API not available')
      setState('error')
      setError('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()

    // Platform-optimized configuration
    recognition.continuous = true // All platforms use continuous mode
    recognition.interimResults = true // Enable interim for responsiveness
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    console.log('✅ Speech recognition initialized', {
      isAndroid,
      isIOS,
      isSafari,
      isMobile,
    })

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, []) // Run once only

  // Clear silence timer helper
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Submit transcript helper
  const submitTranscript = useCallback(
    (text: string, source: string) => {
      const trimmed = text.trim()

      // Skip empty or duplicate
      if (!trimmed || trimmed === lastSubmittedRef.current) {
        console.log('⏭️ Skipping duplicate/empty transcript', {
          trimmed,
          source,
        })
        return
      }

      console.log('✅ Submitting transcript', { trimmed, source })
      setState('submitting')
      clearSilenceTimer()

      // Stop recognition immediately
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort() // Use abort for immediate stop
        } catch {
          /* ignore */
        }
      }

      // Dispatch stop event for wake word coordination
      if (preventWakeWordConflicts) {
        try {
          window.dispatchEvent(new Event('dictation:stop'))
        } catch {
          /* ignore */
        }
      }

      // Wait 1.5s after STT before submission (per requirements)
      setTimeout(() => {
        console.log('📤 Delivering transcript to callback:', trimmed)
        lastSubmittedRef.current = trimmed

        try {
          onTranscript(trimmed)
        } catch (error) {
          console.error('❌ Error in onTranscript callback:', error)
        }

        // Return to idle after submission
        setState('idle')
        setTranscript('')
        shouldBeListeningRef.current = false
      }, 1500)
    },
    [onTranscript, clearSilenceTimer, preventWakeWordConflicts],
  )

  // Setup recognition event handlers
  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    recognition.onstart = () => {
      console.log('🎤 Recognition started')
      setState('listening')
      setError(null)

      if (preventWakeWordConflicts) {
        try {
          window.dispatchEvent(new Event('dictation:start'))
        } catch {
          /* ignore */
        }
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build complete transcript from all results
      let fullTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript
      }

      const trimmed = fullTranscript.trim()
      if (!trimmed) return

      console.log('📝 Transcript update:', trimmed.slice(0, 50) + '...')
      setTranscript(trimmed)
      setState('processing')

      // Reset silence timer on any new speech
      clearSilenceTimer()

      silenceTimerRef.current = setTimeout(() => {
        const finalText = transcriptRef.current
        console.log(`⏰ Silence detected (${silenceDuration}ms)`)
        submitTranscript(finalText, 'silence-timeout')
      }, silenceDuration)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('❌ Recognition error:', event.error)

      clearSilenceTimer()

      // Handle permission errors
      if (event.error === 'not-allowed') {
        setState('error')
        setError('Microphone permission denied')
        shouldBeListeningRef.current = false
        return
      }

      // For other errors, submit any accumulated transcript
      const currentText = transcriptRef.current.trim()
      if (currentText && currentText !== lastSubmittedRef.current) {
        submitTranscript(currentText, 'error-recovery')
      } else {
        setState('idle')
        setTranscript('')
        shouldBeListeningRef.current = false
      }
    }

    recognition.onend = () => {
      console.log('⏹️ Recognition ended')
      clearSilenceTimer()

      // Only restart if we should still be listening
      if (
        shouldBeListeningRef.current &&
        state !== 'submitting' &&
        state !== 'stopping'
      ) {
        console.log('🔄 Auto-restarting recognition (continuous mode)')

        // Small delay to prevent tight restart loop
        setTimeout(() => {
          if (shouldBeListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start()
            } catch (error) {
              console.error('Failed to restart:', error)
              setState('error')
              setError('Failed to restart recognition')
              shouldBeListeningRef.current = false
            }
          }
        }, 100)
      } else {
        // We're done listening
        if (state !== 'submitting') {
          setState('idle')
          setTranscript('')
        }

        if (preventWakeWordConflicts) {
          try {
            window.dispatchEvent(new Event('dictation:stop'))
          } catch {
            /* ignore */
          }
        }
      }
    }

    return () => {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
    }
  }, [
    state,
    silenceDuration,
    submitTranscript,
    clearSilenceTimer,
    preventWakeWordConflicts,
  ])

  // Start function
  const start = useCallback(async () => {
    const recognition = recognitionRef.current
    if (!recognition || !enabled) {
      console.warn('Cannot start: recognition not available or disabled')
      return
    }

    console.log('▶️ Starting speech recognition')

    // Reset state
    setState('starting')
    setTranscript('')
    setError(null)
    lastSubmittedRef.current = ''
    clearSilenceTimer()
    shouldBeListeningRef.current = true

    // iOS Safari requires explicit permission request
    if (isIOS && isSafari) {
      try {
        // Try starting directly first (if permission already granted)
        try {
          recognition.start()
        } catch {
          // Request permission first
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          stream.getTracks().forEach(track => track.stop())
          recognition.start()
        }
      } catch (error) {
        console.error('iOS permission error:', error)
        setState('error')
        setError('Microphone permission required')
        shouldBeListeningRef.current = false
      }
    } else {
      // Other platforms - direct start
      try {
        recognition.start()
      } catch (error: any) {
        if (error?.message?.includes('already started')) {
          console.log('Recognition already running')
          setState('listening')
        } else {
          console.error('Start error:', error)
          setState('error')
          setError(error?.message || 'Failed to start')
          shouldBeListeningRef.current = false
        }
      }
    }
  }, [enabled, clearSilenceTimer])

  // Stop function
  const stop = useCallback(() => {
    console.log('⏸️ Stopping speech recognition')

    setState('stopping')
    shouldBeListeningRef.current = false
    clearSilenceTimer()

    // Submit any pending transcript
    const currentText = transcriptRef.current.trim()
    if (currentText && currentText !== lastSubmittedRef.current) {
      submitTranscript(currentText, 'manual-stop')
    } else {
      // No transcript to submit, just stop
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          /* ignore */
        }
      }

      setState('idle')
      setTranscript('')

      if (preventWakeWordConflicts) {
        try {
          window.dispatchEvent(new Event('dictation:stop'))
        } catch {
          /* ignore */
        }
      }
    }
  }, [clearSilenceTimer, submitTranscript, preventWakeWordConflicts])

  // Toggle function
  const toggle = useCallback(() => {
    if (state === 'idle' || state === 'error') {
      start()
    } else if (state !== 'submitting') {
      stop()
    }
  }, [state, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer()
      shouldBeListeningRef.current = false

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          /* ignore */
        }
      }
    }
  }, [clearSilenceTimer])

  return {
    state,
    transcript,
    isListening: state === 'listening' || state === 'processing',
    isSubmitting: state === 'submitting',
    start,
    stop,
    toggle,
    error,
  }
}
