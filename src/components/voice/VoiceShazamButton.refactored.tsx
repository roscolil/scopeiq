import { useState, useEffect, useRef, useCallback } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'
import { Mic, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface VoiceShazamButtonProps {
  // Legacy props for backward compatibility
  isListening?: boolean
  toggleListening?: () => void
  // New self-contained props
  isMobileOnly?: boolean
  showTranscript?: string
  isProcessing?: boolean
  onHide?: () => void
  onTranscript?: (text: string) => void
  // Mode selector
  selfContained?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

const CONSTANTS = {
  SILENCE_DURATION_MS: 1500, // 1.5 seconds of silence before auto-submit
  HELP_MESSAGE_DURATION_MS: 10000,
  SUBMISSION_DELAY_MS: 1500,
  FALLBACK_TIMEOUT_MS: 3000,
  TTS_TIMEOUT_MS: 45000,
  GRACE_PERIOD_MS: 300,
  ERROR_RECOVERY_DELAY_MS: 1000,
} as const

const LOOP_GUARD_CONFIG = {
  androidThreshold: 800,
  desktopThreshold: 1000,
  androidMaxAttempts: 5,
  desktopMaxAttempts: 3,
  androidBaseDelay: 150,
  desktopBaseDelay: 300,
  androidMaxDelay: 2000,
  desktopMaxDelay: 5000,
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const detectPlatform = () => {
  const userAgent = navigator.userAgent
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
  const isAndroid = /Android/i.test(userAgent)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  const isMobileSafari = isSafari && isMobile

  return {
    isSafari,
    isAndroid,
    isMobile,
    isMobileSafari,
    isAndroidMode: isAndroid || isSafari,
  }
}

const isDuplicateTranscript = (current: string, previous: string): boolean => {
  if (!previous || !current) return false

  const isExactDuplicate = current === previous
  const isSimilarDuplicate =
    current.length > 5 &&
    (previous.includes(current.slice(0, -2)) ||
      current.includes(previous.slice(0, -2)))

  return isExactDuplicate || isSimilarDuplicate
}

const buildTranscript = (results: any[]): string => {
  // Web Speech API returns CUMULATIVE results
  // Each new result already includes all previous words
  // So we only need the LAST result to avoid word repetition
  if (results.length === 0) return ''

  const lastIndex = results.length - 1
  const lastResult = results[lastIndex]
  return lastResult[0].transcript.trim()
}

const dispatchDictationEvent = (type: 'start' | 'stop') => {
  try {
    window.dispatchEvent(new Event(`dictation:${type}`))
  } catch {
    // Silently fail if event dispatch fails
  }
}

const clearAllTimers = (refs: {
  silence?: React.MutableRefObject<NodeJS.Timeout | null>
  fallback?: React.MutableRefObject<NodeJS.Timeout | null>
  ttsClear?: React.MutableRefObject<NodeJS.Timeout | null>
}) => {
  if (refs.silence?.current) {
    clearTimeout(refs.silence.current)
    refs.silence.current = null
  }
  if (refs.fallback?.current) {
    clearTimeout(refs.fallback.current)
    refs.fallback.current = null
  }
  if (refs.ttsClear?.current) {
    clearTimeout(refs.ttsClear.current)
    refs.ttsClear.current = null
  }
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useTranscriptState = () => {
  const [transcript, setTranscript] = useState('')
  const [displayTranscript, setDisplayTranscript] = useState('')
  const transcriptRef = useRef('')
  const displayTranscriptRef = useRef('')

  useEffect(() => {
    transcriptRef.current = transcript
    if (transcript) {
      setDisplayTranscript(transcript)
      displayTranscriptRef.current = transcript
    }
  }, [transcript])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setDisplayTranscript('')
    transcriptRef.current = ''
    displayTranscriptRef.current = ''
  }, [])

  const updateTranscript = useCallback((text: string) => {
    requestAnimationFrame(() => {
      transcriptRef.current = text
      setTranscript(text)
      setDisplayTranscript(text)
      displayTranscriptRef.current = text
    })
  }, [])

  return {
    transcript,
    displayTranscript,
    transcriptRef,
    displayTranscriptRef,
    clearTranscript,
    updateTranscript,
  }
}

const useSubmissionRefs = () => {
  const lastSubmittedTranscriptRef = useRef<string>('')
  const hasSubmittedRef = useRef<boolean>(false)
  const isSubmittingRef = useRef<boolean>(false)

  const resetSubmission = useCallback(() => {
    hasSubmittedRef.current = false
    lastSubmittedTranscriptRef.current = ''
    isSubmittingRef.current = false
  }, [])

  const markAsSubmitted = useCallback((text: string) => {
    hasSubmittedRef.current = true
    lastSubmittedTranscriptRef.current = text
    isSubmittingRef.current = true
  }, [])

  return {
    lastSubmittedTranscriptRef,
    hasSubmittedRef,
    isSubmittingRef,
    resetSubmission,
    markAsSubmitted,
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const VoiceShazamButton = ({
  isListening: externalIsListening,
  toggleListening: externalToggleListening,
  isMobileOnly = true,
  showTranscript,
  isProcessing = false,
  onHide,
  onTranscript,
  selfContained = true,
}: VoiceShazamButtonProps) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const containerRef = useRef<HTMLDivElement>(null)
  const isMobileView = useIsMobile()

  // Recognition state
  const [internalIsListening, setInternalIsListening] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(
    null,
  )

  // Transcript management
  const {
    transcript,
    displayTranscript,
    transcriptRef,
    clearTranscript,
    updateTranscript,
  } = useTranscriptState()

  // Submission tracking
  const {
    lastSubmittedTranscriptRef,
    hasSubmittedRef,
    isSubmittingRef,
    resetSubmission,
    markAsSubmitted,
  } = useSubmissionRefs()

  // UI state
  const [pulseAnimation, setPulseAnimation] = useState(false)
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  const [helpBlockedUntilSpeechComplete, setHelpBlockedUntilSpeechComplete] =
    useState(false)
  const [recentlyStoppedListening, setRecentlyStoppedListening] =
    useState(false)
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false)
  const [ttsActive, setTtsActive] = useState(false)
  const [hasTranscript, setHasTranscript] = useState(false)

  // Refs
  const prevListeningRef = useRef<boolean>(false)
  const forceStopRef = useRef(false)
  const isListeningRef = useRef<boolean>(false) // Track listening state for onend handler
  const endLoopGuardRef = useRef<{ lastEnd: number; attempts: number }>({
    lastEnd: 0,
    attempts: 0,
  })

  // Timers
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const fallbackFinalizeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const ttsClearTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep listening ref in sync with state for use in onend handler
  useEffect(() => {
    isListeningRef.current = internalIsListening
  }, [internalIsListening])

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const isListening = selfContained
    ? internalIsListening
    : externalIsListening || false

  if (prevListeningRef.current === false && isListening) {
    prevListeningRef.current = isListening
  }

  // ============================================================================
  // SUBMISSION HANDLER
  // ============================================================================

  const finalizeSubmission = useCallback(
    (
      recognitionInstance: SpeechRecognitionType,
      text: string,
      context: string,
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return

      if (
        hasSubmittedRef.current &&
        trimmed === lastSubmittedTranscriptRef.current
      ) {
        return
      }

      // Mark as submitted immediately
      markAsSubmitted(trimmed)
      setStatus('Got result!')
      setInternalIsListening(false)
      setIsProcessingSubmission(true)

      forceStopRef.current = true
      setSilenceTimer(prev => {
        if (prev) clearTimeout(prev)
        return null
      })

      clearAllTimers({
        fallback: fallbackFinalizeTimerRef,
        ttsClear: ttsClearTimerRef,
      })

      try {
        recognitionInstance.stop()
      } catch {
        // Already stopped
      }

      dispatchDictationEvent('stop')

      setTimeout(() => {
        if (onTranscript) {
          try {
            onTranscript(trimmed)
          } catch (error) {
            console.error('Error executing onTranscript callback:', error)
          }
        }

        clearTranscript()
        setHasTranscript(false)
        isSubmittingRef.current = false
        setIsProcessingSubmission(false)
      }, CONSTANTS.SUBMISSION_DELAY_MS)
    },
    [
      onTranscript,
      clearTranscript,
      markAsSubmitted,
      hasSubmittedRef,
      lastSubmittedTranscriptRef,
      isSubmittingRef,
    ],
  )

  // ============================================================================
  // SPEECH RECOGNITION SETUP
  // ============================================================================

  useEffect(() => {
    if (!selfContained) return
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSR = window as any
    const SpeechRecognitionAPI =
      windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setStatus('Speech Recognition not supported')
      return
    }

    const recognitionInstance = new SpeechRecognitionAPI()
    const platform = detectPlatform()

    // Configure recognition
    // iOS Safari requires continuous=false for reliable operation
    const isIOS =
      platform.isMobileSafari || /iPad|iPhone|iPod/.test(navigator.userAgent)
    recognitionInstance.continuous = !isIOS // false on iOS, true elsewhere
    recognitionInstance.interimResults = !isIOS // iOS has issues with interim results
    recognitionInstance.lang = 'en-US'
    recognitionInstance.maxAlternatives = 1

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    recognitionInstance.onstart = () => {
      setStatus('Listening...')
      setInternalIsListening(true)
      setPulseAnimation(true)
      dispatchDictationEvent('start')
    }

    recognitionInstance.onend = () => {
      // iOS Safari: With continuous=false, onend fires quickly but we want to keep listening
      // Don't set listening to false yet - check if we should restart first
      // Use ref to avoid stale closure value
      const willRestart =
        !forceStopRef.current &&
        !hasSubmittedRef.current &&
        !isSubmittingRef.current &&
        !hasTranscript &&
        isListeningRef.current

      console.log('📱 Voice recognition ended', {
        willRestart,
        isListening: isListeningRef.current,
        hasTranscript,
        forceStop: forceStopRef.current,
        hasSubmitted: hasSubmittedRef.current,
        isSubmitting: isSubmittingRef.current,
        platform: platform.isMobileSafari ? 'iOS Safari' : 'Other',
      })

      if (!willRestart) {
        console.log('❌ NOT restarting - setting listening to false')
        setStatus('Stopped')
        setInternalIsListening(false)
        dispatchDictationEvent('stop')

        // Clean up and return - don't schedule restart
        if (forceStopRef.current) {
          forceStopRef.current = false
        }
        return
      }

      // Keep status as "Listening..." for seamless UX
      console.log('✅ WILL restart - keeping listening state active')

      // Loop guard logic
      const now = Date.now()
      const sinceLast = now - endLoopGuardRef.current.lastEnd
      const loopThreshold = platform.isAndroidMode
        ? LOOP_GUARD_CONFIG.androidThreshold
        : LOOP_GUARD_CONFIG.desktopThreshold
      const maxAttempts = platform.isAndroidMode
        ? LOOP_GUARD_CONFIG.androidMaxAttempts
        : LOOP_GUARD_CONFIG.desktopMaxAttempts

      if (sinceLast < loopThreshold) {
        endLoopGuardRef.current.attempts += 1
      } else {
        endLoopGuardRef.current.attempts = 0
      }
      endLoopGuardRef.current.lastEnd = now

      console.log('🔄 Loop guard:', {
        sinceLast,
        attempts: endLoopGuardRef.current.attempts,
        maxAttempts,
      })

      if (endLoopGuardRef.current.attempts > maxAttempts) {
        console.log('⛔ Too many restart attempts - stopping')
        forceStopRef.current = true
        setInternalIsListening(false)
        setStatus('Stopped')
        return
      }

      // Don't restart if we have a transcript
      if (hasTranscript) {
        console.log('📝 Has transcript - not restarting')
        return
      }

      // Use ref for current listening state
      if (isListeningRef.current) {
        const baseDelay = platform.isAndroidMode
          ? LOOP_GUARD_CONFIG.androidBaseDelay
          : LOOP_GUARD_CONFIG.desktopBaseDelay
        const maxDelay = platform.isAndroidMode
          ? LOOP_GUARD_CONFIG.androidMaxDelay
          : LOOP_GUARD_CONFIG.desktopMaxDelay
        const delay = Math.min(
          baseDelay * 2 ** endLoopGuardRef.current.attempts,
          maxDelay,
        )

        console.log(`⏱️ Scheduling restart in ${delay}ms`)

        setTimeout(() => {
          console.log('⏰ Restart timeout fired - checking conditions...')
          console.log({
            forceStop: forceStopRef.current,
            isListening: isListeningRef.current,
            hasSubmitted: hasSubmittedRef.current,
            isSubmitting: isSubmittingRef.current,
          })

          if (
            !forceStopRef.current &&
            isListeningRef.current &&
            !hasSubmittedRef.current &&
            !isSubmittingRef.current
          ) {
            try {
              console.log('🚀 Starting recognition...')
              recognitionInstance.start()
              setInternalIsListening(true)
              setStatus('Listening...')
            } catch (error: any) {
              // Gracefully handle "already started" errors
              if (!error?.message?.includes('already started')) {
                console.error('❌ Error restarting recognition:', error)
                setInternalIsListening(false)
                setStatus('Error')
              } else {
                console.log('ℹ️ Recognition already started')
              }
            }
          } else {
            console.log('🚫 Conditions not met - skipping restart')
          }
        }, delay)
      } else {
        console.log(
          '👂 isListeningRef.current is FALSE - not scheduling restart',
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognitionInstance.onerror = (event: any) => {
      setStatus(`Error: ${event.error}`)
      setInternalIsListening(false)

      // Android-specific error recovery
      if (
        platform.isAndroidMode &&
        (event.error === 'network' || event.error === 'audio-capture')
      ) {
        setTimeout(() => {
          if (!forceStopRef.current && !hasSubmittedRef.current) {
            try {
              recognitionInstance.start()
              setStatus('Recovering...')
              setInternalIsListening(true)
            } catch {
              // Recovery failed
            }
          }
        }, CONSTANTS.ERROR_RECOVERY_DELAY_MS)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognitionInstance.onresult = (event: any) => {
      if (isSubmittingRef.current || hasSubmittedRef.current) return

      const results = Array.from(event.results)
      const currentTranscript = buildTranscript(results)

      if (!currentTranscript) return

      // Prevent duplicate processing
      if (currentTranscript === transcriptRef.current) return

      // Check for duplicate submission
      if (
        isDuplicateTranscript(
          currentTranscript,
          lastSubmittedTranscriptRef.current,
        )
      ) {
        return
      }

      // Update transcript
      updateTranscript(currentTranscript)
      setHasTranscript(true)

      // Set fallback timer
      if (
        !fallbackFinalizeTimerRef.current &&
        !hasSubmittedRef.current &&
        !isSubmittingRef.current
      ) {
        fallbackFinalizeTimerRef.current = setTimeout(() => {
          const latest = transcriptRef.current.trim()
          if (
            !hasSubmittedRef.current &&
            !isSubmittingRef.current &&
            latest.length > 0
          ) {
            finalizeSubmission(recognitionInstance, latest, 'fallback-timeout')
          }
        }, CONSTANTS.FALLBACK_TIMEOUT_MS)
      }

      // Reset silence timer
      setSilenceTimer(prevTimer => {
        if (prevTimer) clearTimeout(prevTimer)

        const newTimer = setTimeout(() => {
          const trimmedTranscript = transcriptRef.current.trim()

          if (
            !isDuplicateTranscript(
              trimmedTranscript,
              lastSubmittedTranscriptRef.current,
            )
          ) {
            finalizeSubmission(
              recognitionInstance,
              trimmedTranscript,
              'silence-threshold',
            )
          }
        }, CONSTANTS.SILENCE_DURATION_MS)

        return newTimer
      })
    }

    setRecognition(recognitionInstance)
    setStatus('Initialized')

    return () => {
      try {
        recognitionInstance.stop()
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [
    selfContained,
    finalizeSubmission,
    updateTranscript,
    transcriptRef,
    hasSubmittedRef,
    isSubmittingRef,
    lastSubmittedTranscriptRef,
    hasTranscript,
    internalIsListening,
  ])

  // ============================================================================
  // CLEANUP TIMERS
  // ============================================================================

  useEffect(() => {
    if (!selfContained) return

    return () => {
      clearAllTimers({
        silence: { current: silenceTimer },
        fallback: fallbackFinalizeTimerRef,
        ttsClear: ttsClearTimerRef,
      })
    }
  }, [silenceTimer, selfContained])

  // ============================================================================
  // TOGGLE LISTENING
  // ============================================================================

  const internalToggleListening = useCallback(async () => {
    if (!selfContained || !recognition || ttsActive) return

    if (internalIsListening) {
      // Stop listening
      recognition.stop()
      setInternalIsListening(false)
      resetSubmission()
      forceStopRef.current = true

      setSilenceTimer(prevTimer => {
        if (prevTimer) clearTimeout(prevTimer)
        return null
      })

      clearAllTimers({
        fallback: fallbackFinalizeTimerRef,
      })

      dispatchDictationEvent('stop')
      setHasTranscript(false)
      clearTranscript()
    } else {
      // Start listening

      // Unlock iOS/Safari audio
      try {
        if (novaSonic.enableAudioForSafari) {
          novaSonic.enableAudioForSafari().catch(() => {})
        }
        type UnlockCapable = typeof novaSonic & {
          forceUnlockAudio?: () => Promise<boolean>
        }
        const maybeUnlock = novaSonic as UnlockCapable
        if (maybeUnlock.forceUnlockAudio) {
          maybeUnlock.forceUnlockAudio().catch(() => {})
        }
      } catch {
        // Non-fatal
      }

      setInternalIsListening(true)
      setStatus('Initializing...')

      // Reset all state
      clearTranscript()
      setHasTranscript(false)
      resetSubmission()
      forceStopRef.current = false
      endLoopGuardRef.current = { lastEnd: 0, attempts: 0 }

      setSilenceTimer(prevTimer => {
        if (prevTimer) clearTimeout(prevTimer)
        return null
      })

      clearAllTimers({
        fallback: fallbackFinalizeTimerRef,
      })

      const platform = detectPlatform()

      if (platform.isMobileSafari) {
        try {
          try {
            recognition.start()
            setStatus('Ready to listen!')
          } catch {
            setStatus('Requesting access...')
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            })
            stream.getTracks().forEach(track => track.stop())
            recognition.start()
            setStatus('Ready to listen!')
          }
        } catch (error) {
          setStatus('Permission error')
        }
      } else {
        try {
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          setStatus('Start error')
          setInternalIsListening(false)
        }
      }
    }
  }, [
    selfContained,
    recognition,
    internalIsListening,
    ttsActive,
    clearTranscript,
    resetSubmission,
  ])

  const toggleListening = selfContained
    ? internalToggleListening
    : externalToggleListening

  // ============================================================================
  // SIDE EFFECTS
  // ============================================================================

  // Pulse animation
  useEffect(() => {
    setPulseAnimation(isListening)
  }, [isListening])

  // Wakeword activation
  useEffect(() => {
    if (!selfContained) return

    const handler = () => {
      if (ttsActive) return
      const canShow = !isMobileOnly || isMobileView
      if (!canShow || internalIsListening || isProcessing) return
      internalToggleListening()
    }

    window.addEventListener('wakeword:activate-mic', handler)
    return () => window.removeEventListener('wakeword:activate-mic', handler)
  }, [
    selfContained,
    isMobileOnly,
    isMobileView,
    internalIsListening,
    isProcessing,
    internalToggleListening,
    ttsActive,
  ])

  // Grace period for visual transitions
  useEffect(() => {
    const wasListening = prevListeningRef.current

    if (wasListening && !isListening && !isProcessing) {
      setRecentlyStoppedListening(true)
      const timeout = setTimeout(
        () => setRecentlyStoppedListening(false),
        CONSTANTS.GRACE_PERIOD_MS,
      )
      prevListeningRef.current = isListening
      return () => clearTimeout(timeout)
    }

    if (isProcessing) {
      setRecentlyStoppedListening(false)
    }

    prevListeningRef.current = isListening
  }, [isListening, isProcessing])

  // Block help message during processing
  useEffect(() => {
    if (isProcessing || isProcessingSubmission) {
      setHelpBlockedUntilSpeechComplete(true)
      setShowHelpMessage(false)
    }
  }, [isProcessing, isProcessingSubmission])

  // TTS event listeners
  useEffect(() => {
    const onSpeechComplete = () => {
      setHelpBlockedUntilSpeechComplete(false)
      setTtsActive(false)
      clearAllTimers({ ttsClear: ttsClearTimerRef })

      // CRITICAL: Reset submission flags to allow consecutive voice queries
      // Without this, the second query won't work because hasSubmittedRef stays true
      resetSubmission()
      console.log(
        '🔄 Reset submission flags after TTS complete - ready for next query',
      )

      // IMPORTANT: Don't auto-resume - the recognition should stay active
      // The onend handler will keep restarting it as long as isListeningRef is true
      // User manually tapped mic once, it should stay on until they tap to stop
      console.log(
        '✅ TTS done - mic should continue listening automatically via onend loop',
      )
    }

    const onSpeechStart = () => {
      setTtsActive(true)
      if (ttsClearTimerRef.current) clearTimeout(ttsClearTimerRef.current)
      ttsClearTimerRef.current = setTimeout(() => {
        setTtsActive(false)
        ttsClearTimerRef.current = null
      }, CONSTANTS.TTS_TIMEOUT_MS)
    }

    window.addEventListener(
      'ai:speech:complete',
      onSpeechComplete as EventListener,
    )
    window.addEventListener('ai:speech:start', onSpeechStart as EventListener)

    return () => {
      window.removeEventListener(
        'ai:speech:complete',
        onSpeechComplete as EventListener,
      )
      window.removeEventListener(
        'ai:speech:start',
        onSpeechStart as EventListener,
      )
    }
  }, [resetSubmission])

  // Auto-show/hide help message
  useEffect(() => {
    if (
      isProcessing ||
      isProcessingSubmission ||
      isListening ||
      helpBlockedUntilSpeechComplete ||
      recentlyStoppedListening
    )
      return

    setShowHelpMessage(true)
    const timer = setTimeout(
      () => setShowHelpMessage(false),
      CONSTANTS.HELP_MESSAGE_DURATION_MS,
    )
    return () => clearTimeout(timer)
  }, [
    isProcessing,
    isProcessingSubmission,
    isListening,
    helpBlockedUntilSpeechComplete,
    recentlyStoppedListening,
  ])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onHide?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onHide])

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isMobileOnly && !isMobileView) return null

  const showProcessing = isProcessing || isProcessingSubmission
  const showListeningVisual =
    isListening || (!showProcessing && recentlyStoppedListening)

  return (
    <>
      <AnimationStyles />

      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center VoiceShazamButton">
        <HelpMessage
          show={
            showHelpMessage &&
            !isListening &&
            !isProcessing &&
            !isProcessingSubmission &&
            !recentlyStoppedListening
          }
        />

        <StatusIndicator
          show={isListening || isProcessing || isProcessingSubmission}
          isProcessing={isProcessing}
          isProcessingSubmission={isProcessingSubmission}
        />

        <TranscriptDisplay
          show={
            (displayTranscript || transcript || showTranscript) &&
            !isProcessing &&
            !isProcessingSubmission
          }
          text={displayTranscript || transcript || showTranscript}
        />

        <div ref={containerRef}>
          <VoiceButton
            onClick={toggleListening}
            disabled={isProcessing || isProcessingSubmission}
            showProcessing={showProcessing}
            showListeningVisual={showListeningVisual}
            pulseAnimation={pulseAnimation}
          />
        </div>
      </div>
    </>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const AnimationStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        @keyframes pulse-height-1 {
          0%, 100% { height: 8px; transform: scaleY(1); }
          50% { height: 20px; transform: scaleY(1.5); }
        }
        @keyframes pulse-height-2 {
          0%, 100% { height: 12px; transform: scaleY(1); }
          50% { height: 24px; transform: scaleY(1.8); }
        }
        @keyframes brain-pulse {
          0%, 100% { 
            transform: scale(2.5); 
            opacity: 0.9;
          }
          50% { 
            transform: scale(3.2); 
            opacity: 1;
          }
        }
        @keyframes brain-glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
          50% { 
            box-shadow: 0 0 40px rgba(255, 255, 255, 0.6);
          }
        }
      `,
    }}
  />
)

const HelpMessage = ({ show }: { show: boolean }) => {
  if (!show) return null

  return (
    <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <span className="text-sm font-medium">
        💤 Say "Hey Jacq" or tap mic to speak
      </span>
    </div>
  )
}

const StatusIndicator = ({
  show,
  isProcessing,
  isProcessingSubmission,
}: {
  show: boolean
  isProcessing: boolean
  isProcessingSubmission: boolean
}) => {
  if (!show) return null

  const message = isProcessing
    ? '🧠 AI is thinking...'
    : isProcessingSubmission
      ? '⏳ Preparing query...'
      : '🎤 Listening...'

  return (
    <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

const TranscriptDisplay = ({
  show,
  text,
}: {
  show: boolean
  text?: string
}) => {
  if (!show || !text) return null

  return (
    <div className="bg-background/95 backdrop-blur-md rounded-xl p-4 mb-8 max-w-[90%] shadow-2xl border-2 border-primary/40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <p className="text-md text-center font-medium tracking-tight leading-relaxed">
        {text}
      </p>
    </div>
  )
}

const VoiceButton = ({
  onClick,
  disabled,
  showProcessing,
  showListeningVisual,
  pulseAnimation,
}: {
  onClick: (() => void) | undefined
  disabled: boolean
  showProcessing: boolean
  showListeningVisual: boolean
  pulseAnimation: boolean
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-[154px] w-[154px] rounded-full shadow-xl flex items-center justify-center',
        'border-4 border-background transition-all duration-300',
        showProcessing
          ? 'bg-transparent hover:bg-transparent ring-8 ring-orange-400 scale-105 !opacity-100'
          : showListeningVisual
            ? 'bg-emerald-500 hover:bg-emerald-600 ring-8 ring-emerald-400 scale-105'
            : 'bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95',
        pulseAnimation && showListeningVisual && 'animate-pulse shadow-2xl',
        showProcessing && 'animate-pulse shadow-2xl',
      )}
      style={{
        boxShadow: showProcessing
          ? '0 0 40px rgba(234, 88, 12, 0.6)'
          : showListeningVisual
            ? '0 0 40px rgba(16, 185, 129, 0.6)'
            : '0 0 30px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 200,
      }}
      aria-label={
        showProcessing
          ? 'Processing voice input...'
          : showListeningVisual
            ? 'Listening... Speak now and stop when done'
            : 'Tap to start voice input'
      }
    >
      {showProcessing && (
        <div
          className="absolute inset-0 bg-orange-600 rounded-full z-0"
          style={{ backgroundColor: '#d97706' }}
        />
      )}

      <div
        className={cn(
          'absolute inset-0 rounded-full',
          showProcessing
            ? 'bg-orange-600 opacity-50 animate-pulse'
            : showListeningVisual
              ? 'bg-emerald-500 opacity-40 animate-ping'
              : pulseAnimation
                ? 'bg-primary opacity-40 animate-ping'
                : 'hidden',
        )}
      />

      {showProcessing && (
        <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping animation-delay-200" />
      )}

      <div
        className="flex items-center justify-center overflow-visible relative z-10"
        style={{ width: '96px', height: '96px' }}
      >
        {showProcessing ? (
          <BrainIcon />
        ) : showListeningVisual ? (
          <SoundWaveIcon />
        ) : (
          <Mic
            className="text-white"
            strokeWidth={1.5}
            width="100%"
            height="100%"
            style={{ transform: 'scale(3)' }}
          />
        )}
      </div>
    </Button>
  )
}

const BrainIcon = () => (
  <div className="relative flex items-center justify-center">
    <div
      className="absolute inset-0 rounded-full"
      style={{ animation: 'brain-glow 2s ease-in-out infinite' }}
    />
    <Brain
      className="text-white"
      strokeWidth={1.5}
      style={{ animation: 'brain-pulse 1.5s ease-in-out infinite' }}
    />
  </div>
)

const SoundWaveIcon = () => (
  <div className="relative flex items-center justify-center">
    <div className="relative">
      <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
        <SoundWaveBar
          height="8px"
          animation="pulse-height-1 1.2s ease-in-out infinite"
          delay="0ms"
        />
        <SoundWaveBar
          height="16px"
          animation="pulse-height-2 1.0s ease-in-out infinite"
          delay="150ms"
        />
        <SoundWaveBar
          height="12px"
          animation="pulse-height-1 1.4s ease-in-out infinite"
          delay="300ms"
        />
      </div>

      <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
        <SoundWaveBar
          height="12px"
          animation="pulse-height-2 1.1s ease-in-out infinite"
          delay="200ms"
        />
        <SoundWaveBar
          height="16px"
          animation="pulse-height-1 1.3s ease-in-out infinite"
          delay="400ms"
        />
        <SoundWaveBar
          height="8px"
          animation="pulse-height-2 1.0s ease-in-out infinite"
          delay="550ms"
        />
      </div>
    </div>
  </div>
)

const SoundWaveBar = ({
  height,
  animation,
  delay,
}: {
  height: string
  animation: string
  delay: string
}) => (
  <div
    className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
    style={{ height, animation, animationDelay: delay }}
  />
)
