import { useState, useEffect, useRef, useCallback } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'
import { Mic, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface VoiceShazamButtonProps {
  // Legacy props for backward compatibility
  isListening?: boolean
  toggleListening?: () => void
  // New self-contained props
  isMobileOnly?: boolean
  showTranscript?: string
  isProcessing?: boolean
  onHide?: () => void
  onTranscript?: (text: string) => void // For passing transcript to parent
  // Mode selector
  selfContained?: boolean // If true, manages its own speech recognition
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

export const VoiceShazamButton = ({
  // Legacy props
  isListening: externalIsListening,
  toggleListening: externalToggleListening,
  // New props
  isMobileOnly = true,
  showTranscript,
  isProcessing = false,
  onHide,
  onTranscript,
  selfContained = true, // Default to self-contained mode
}: VoiceShazamButtonProps) => {
  // Silence duration for wake word activation - 1.5 seconds as per Android requirements
  const SILENCE_DURATION_MS = 1500 // 1.5 seconds of silence before auto-submit
  const [pulseAnimation, setPulseAnimation] = useState(false)
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  // Block re-showing the help toast until after TTS completes
  const [helpBlockedUntilSpeechComplete, setHelpBlockedUntilSpeechComplete] =
    useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobileView = useIsMobile()

  // Self-contained speech recognition state
  const [internalIsListening, setInternalIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  // Ref mirror of transcript to avoid stale closure inside delayed timers
  const transcriptRef = useRef('')
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])
  const [status, setStatus] = useState('Ready')

  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(
    null,
  )

  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const fallbackFinalizeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [hasTranscript, setHasTranscript] = useState(false)
  const lastSubmittedTranscriptRef = useRef<string>('')
  const hasSubmittedRef = useRef<boolean>(false)
  const endLoopGuardRef = useRef<{ lastEnd: number; attempts: number }>({
    lastEnd: 0,
    attempts: 0,
  })
  const forceStopRef = useRef(false)
  // Prevent brief flash of idle (mic) icon between listening -> processing
  const [recentlyStoppedListening, setRecentlyStoppedListening] =
    useState(false)
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false) // Track 1.5s submission delay
  // Will assign after isListening is derived
  const prevListeningRef = useRef<boolean>(false)
  // Gate wakeword/user toggles while TTS is active
  const [ttsActive, setTtsActive] = useState(false)
  const ttsClearTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSubmittingRef = useRef(false) // Track if we're in the middle of submitting

  // Centralized submission finalizer
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
      setStatus('Got result!')
      setInternalIsListening(false)
      setIsProcessingSubmission(true)
      isSubmittingRef.current = true

      forceStopRef.current = true
      setSilenceTimer(prev => {
        if (prev) clearTimeout(prev)
        return null
      })
      if (fallbackFinalizeTimerRef.current) {
        clearTimeout(fallbackFinalizeTimerRef.current)
        fallbackFinalizeTimerRef.current = null
      }
      try {
        recognitionInstance.stop()
      } catch {
        /* already stopped */
      }
      // Ensure global dictation state reflects we are no longer listening,
      // in case recognition onend isn't fired or arrives late on some platforms
      try {
        window.dispatchEvent(new Event('dictation:stop'))
      } catch {
        /* noop */
      }

      setTimeout(() => {
        if (onTranscript) {
          try {
            onTranscript(trimmed)
          } catch (error) {
            console.error('Error executing onTranscript callback:', error)
          }
        }
        hasSubmittedRef.current = true
        lastSubmittedTranscriptRef.current = trimmed
        isSubmittingRef.current = false
        setIsProcessingSubmission(false)
      }, 1500)
    },
    [onTranscript],
  )

  // Determine which listening state to use
  const isListening = selfContained
    ? internalIsListening
    : externalIsListening || false
  // Initialize previous ref once we know current state
  if (prevListeningRef.current === false && isListening) {
    prevListeningRef.current = isListening
  }

  // Initialize speech recognition for self-contained mode (once)
  useEffect(() => {
    if (!selfContained) return
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithSR = window as any
      const SpeechRecognitionAPI =
        windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI()

        // Browser detection for optimal configuration
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        )
        const isAndroid = /Android/i.test(navigator.userAgent)
        const isAndroidMode = isAndroid || isSafari

        // Unified configuration for all platforms
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'
        recognitionInstance.maxAlternatives = 1

        // Event handlers
        recognitionInstance.onstart = () => {
          setStatus('Listening...')
          setInternalIsListening(true)
          setPulseAnimation(true)
          try {
            window.dispatchEvent(new Event('dictation:start'))
          } catch {
            /* noop */
          }
        }

        recognitionInstance.onend = () => {
          setStatus('Stopped')
          setInternalIsListening(false)
          try {
            window.dispatchEvent(new Event('dictation:stop'))
          } catch {
            /* noop */
          }

          if (forceStopRef.current) {
            forceStopRef.current = false
            return
          }

          const now = Date.now()
          const sinceLast = now - endLoopGuardRef.current.lastEnd
          const loopThreshold = isAndroidMode ? 800 : 1000
          const maxAttempts = isAndroidMode ? 5 : 3

          if (sinceLast < loopThreshold) {
            endLoopGuardRef.current.attempts += 1
          } else {
            endLoopGuardRef.current.attempts = 0
          }
          endLoopGuardRef.current.lastEnd = now

          if (endLoopGuardRef.current.attempts > maxAttempts) {
            forceStopRef.current = true
            setInternalIsListening(false)
            return
          }

          if (hasSubmittedRef.current || isSubmittingRef.current) {
            return
          }

          if (!isAndroidMode && hasTranscript) {
            return
          }

          if (internalIsListening) {
            const baseDelay = isAndroidMode ? 150 : 300
            const maxDelay = isAndroidMode ? 2000 : 5000
            const delay = Math.min(
              baseDelay * 2 ** endLoopGuardRef.current.attempts,
              maxDelay,
            )
            setTimeout(() => {
              if (
                !forceStopRef.current &&
                internalIsListening &&
                !hasSubmittedRef.current
              ) {
                try {
                  recognitionInstance.start()
                  setInternalIsListening(true)
                  setStatus('Listening...')
                } catch {
                  setInternalIsListening(false)
                }
              }
            }, delay)
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onerror = (event: any) => {
          setStatus(`Error: ${event.error}`)
          setInternalIsListening(false)

          // Android-specific error recovery
          if (
            isAndroidMode &&
            (event.error === 'network' || event.error === 'audio-capture')
          ) {
            setTimeout(() => {
              if (!forceStopRef.current && !hasSubmittedRef.current) {
                try {
                  recognitionInstance.start()
                  setStatus('Recovering...')
                  setInternalIsListening(true)
                } catch {
                  /* Recovery failed */
                }
              }
            }, 1000)
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (event: any) => {
          const results = Array.from(event.results)

          // Android-mode handling
          if (isAndroidMode) {
            let interimTranscript = ''
            let finalTranscript = ''

            for (let i = 0; i < results.length; i++) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = results[i] as any
              if (result.isFinal) {
                finalTranscript += result[0].transcript
              } else {
                interimTranscript += result[0].transcript
              }
            }

            const currentTranscript = (
              finalTranscript + interimTranscript
            ).trim()

            if (currentTranscript) {
              setTranscript(currentTranscript)
              setHasTranscript(true)

              if (
                !fallbackFinalizeTimerRef.current &&
                !hasSubmittedRef.current
              ) {
                fallbackFinalizeTimerRef.current = setTimeout(() => {
                  const latest = transcriptRef.current.trim()
                  if (!hasSubmittedRef.current && latest.length > 0) {
                    finalizeSubmission(
                      recognitionInstance,
                      latest,
                      'android-fallback-timeout',
                    )
                  }
                }, 3000)
              }

              // Enhanced duplicate prevention
              const isExactDuplicate =
                currentTranscript === lastSubmittedTranscriptRef.current
              const isSimilarDuplicate =
                lastSubmittedTranscriptRef.current &&
                currentTranscript.length > 5 &&
                lastSubmittedTranscriptRef.current.includes(
                  currentTranscript.slice(0, -2),
                )
              const isAlreadySubmitted = hasSubmittedRef.current

              if (
                isAlreadySubmitted &&
                (isExactDuplicate || isSimilarDuplicate)
              ) {
                return
              }

              // Clear existing silence timer on any speech activity
              setSilenceTimer(prevTimer => {
                if (prevTimer) {
                  clearTimeout(prevTimer)
                }

                const newTimer = setTimeout(() => {
                  const trimmedTranscript = currentTranscript.trim()

                  const finalIsExactDuplicate =
                    trimmedTranscript === lastSubmittedTranscriptRef.current
                  const finalIsSimilarDuplicate =
                    lastSubmittedTranscriptRef.current &&
                    trimmedTranscript.length > 5 &&
                    (lastSubmittedTranscriptRef.current.includes(
                      trimmedTranscript.slice(0, -2),
                    ) ||
                      trimmedTranscript.includes(
                        lastSubmittedTranscriptRef.current.slice(0, -2),
                      ))

                  if (
                    hasSubmittedRef.current &&
                    (finalIsExactDuplicate || finalIsSimilarDuplicate)
                  ) {
                    return
                  }

                  finalizeSubmission(
                    recognitionInstance,
                    trimmedTranscript,
                    'android-silence-threshold',
                  )
                }, SILENCE_DURATION_MS)

                return newTimer
              })
            }
            return
          }

          // Non-Android handling
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = 0; i < results.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = results[i] as any
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }

          const currentTranscript = (finalTranscript + interimTranscript).trim()

          if (currentTranscript) {
            setTranscript(currentTranscript)
            setHasTranscript(true)
            if (!fallbackFinalizeTimerRef.current && !hasSubmittedRef.current) {
              fallbackFinalizeTimerRef.current = setTimeout(() => {
                const latest = transcriptRef.current.trim()
                if (!hasSubmittedRef.current && latest.length > 0) {
                  finalizeSubmission(
                    recognitionInstance,
                    latest,
                    'fallback-timeout',
                  )
                }
              }, 3000)
            }

            // Enhanced duplicate prevention
            const isExactDuplicate =
              currentTranscript === lastSubmittedTranscriptRef.current
            const isSimilarDuplicate =
              lastSubmittedTranscriptRef.current &&
              currentTranscript.length > 5 &&
              lastSubmittedTranscriptRef.current.includes(
                currentTranscript.slice(0, -2),
              )
            const isAlreadySubmitted = hasSubmittedRef.current

            if (
              isAlreadySubmitted &&
              (isExactDuplicate || isSimilarDuplicate)
            ) {
              return
            }

            // Clear existing silence timer on any speech activity
            setSilenceTimer(prevTimer => {
              if (prevTimer) {
                clearTimeout(prevTimer)
              }

              const newTimer = setTimeout(() => {
                const trimmedTranscript = currentTranscript.trim()

                const finalIsExactDuplicate =
                  trimmedTranscript === lastSubmittedTranscriptRef.current
                const finalIsSimilarDuplicate =
                  lastSubmittedTranscriptRef.current &&
                  trimmedTranscript.length > 5 &&
                  (lastSubmittedTranscriptRef.current.includes(
                    trimmedTranscript.slice(0, -2),
                  ) ||
                    trimmedTranscript.includes(
                      lastSubmittedTranscriptRef.current.slice(0, -2),
                    ))

                if (
                  hasSubmittedRef.current &&
                  (finalIsExactDuplicate || finalIsSimilarDuplicate)
                ) {
                  return
                }

                finalizeSubmission(
                  recognitionInstance,
                  trimmedTranscript,
                  'silence-threshold',
                )
              }, SILENCE_DURATION_MS)

              return newTimer
            })
          }
        }

        setRecognition(recognitionInstance)
        setStatus('Initialized')
      } else {
        setStatus('Speech Recognition not supported')
      }
    }
    return () => {
      try {
        recognition?.stop()
      } catch {
        /* ignore */
      }
    }
    // We intentionally do NOT include dynamic speech state deps here; this effect is for one-time init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfContained, finalizeSubmission, onTranscript])

  // Cleanup silence timer on unmount
  useEffect(() => {
    if (!selfContained) return

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
      if (fallbackFinalizeTimerRef.current) {
        clearTimeout(fallbackFinalizeTimerRef.current)
        fallbackFinalizeTimerRef.current = null
      }
    }
  }, [silenceTimer, selfContained])

  // Self-contained toggle listening function
  const internalToggleListening = useCallback(async () => {
    if (!selfContained || !recognition) {
      return
    }

    if (ttsActive) {
      return
    }

    if (internalIsListening) {
      recognition.stop()
      setInternalIsListening(false)
      hasSubmittedRef.current = false
      lastSubmittedTranscriptRef.current = ''
      forceStopRef.current = true
      // Clear silence timer when stopping
      setSilenceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })
      if (fallbackFinalizeTimerRef.current) {
        clearTimeout(fallbackFinalizeTimerRef.current)
        fallbackFinalizeTimerRef.current = null
      }
      // Ensure wakeword engine resumes immediately
      try {
        window.dispatchEvent(new Event('dictation:stop'))
      } catch {
        /* noop */
      }
      setHasTranscript(false)
      setTranscript('')
    } else {
      // Attempt to unlock iOS/Safari audio
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

      // Reset all state when starting
      setTranscript('')
      setHasTranscript(false)
      hasSubmittedRef.current = false
      lastSubmittedTranscriptRef.current = ''
      forceStopRef.current = false
      endLoopGuardRef.current = { lastEnd: 0, attempts: 0 } // Reset loop guard
      setSilenceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })
      if (fallbackFinalizeTimerRef.current) {
        clearTimeout(fallbackFinalizeTimerRef.current)
        fallbackFinalizeTimerRef.current = null
      }

      // Platform detection
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      )
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isMobileSafari = isSafari && isMobile

      if (isMobileSafari) {
        // iOS Safari - handle permissions
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
          setStatus(`Permission error`)
        }
      } else {
        // All other platforms
        try {
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          setStatus(`Start error`)
          setInternalIsListening(false)
        }
      }
    }
  }, [selfContained, recognition, internalIsListening, ttsActive])

  // Determine which toggle function to use
  const toggleListening = selfContained
    ? internalToggleListening
    : externalToggleListening

  // Start pulse animation when listening
  useEffect(() => {
    if (isListening) {
      setPulseAnimation(true)
    } else {
      setPulseAnimation(false)
    }
  }, [isListening])

  // Programmatic activation via wakeword event
  useEffect(() => {
    if (!selfContained) return
    const handler = () => {
      if (ttsActive) return
      const canShow = !isMobileOnly || isMobileView
      if (!canShow) return
      if (internalIsListening || isProcessing) return
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

  // Grace window: if we transition from listening -> not listening while processing hasn't started yet,
  // keep showing the listening visual briefly to avoid mic flash.
  useEffect(() => {
    const wasListening = prevListeningRef.current
    if (wasListening && !isListening && !isProcessing) {
      setRecentlyStoppedListening(true)
      const timeout = setTimeout(() => setRecentlyStoppedListening(false), 300)
      prevListeningRef.current = isListening
      return () => clearTimeout(timeout)
    }
    if (isProcessing) {
      // Once processing starts, clear grace state immediately
      setRecentlyStoppedListening(false)
    }
    prevListeningRef.current = isListening
  }, [isListening, isProcessing])

  // When processing starts, block help from showing until TTS completes.
  useEffect(() => {
    if (isProcessing || isProcessingSubmission) {
      setHelpBlockedUntilSpeechComplete(true)
      setShowHelpMessage(false)
    }
  }, [isProcessing, isProcessingSubmission])

  // Listen for TTS completion signal from AIActions to allow help to re-appear
  useEffect(() => {
    const onSpeechComplete = () => {
      setHelpBlockedUntilSpeechComplete(false)
      setTtsActive(false)
      if (ttsClearTimerRef.current) {
        clearTimeout(ttsClearTimerRef.current)
        ttsClearTimerRef.current = null
      }
    }
    const onSpeechStart = () => {
      setTtsActive(true)
      if (ttsClearTimerRef.current) clearTimeout(ttsClearTimerRef.current)
      ttsClearTimerRef.current = setTimeout(() => {
        setTtsActive(false)
        ttsClearTimerRef.current = null
      }, 45000)
    }
    // Using generic Event type to satisfy TS in DOM
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
  }, [])

  // Auto-show help only when idle (not listening, not processing) AND not blocked;
  // auto-hide after 10 seconds.
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
    const timer = setTimeout(() => setShowHelpMessage(false), 10000)
    return () => clearTimeout(timer)
  }, [
    isProcessing,
    isProcessingSubmission,
    isListening,
    helpBlockedUntilSpeechComplete,
    recentlyStoppedListening,
  ])

  // Handle click outside to hide
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (onHide) {
          onHide()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onHide])

  // Don't render anything if it's mobile only and we're on desktop
  if (isMobileOnly && !isMobileView) return null

  return (
    <>
      {/* Custom CSS animations for sound wave bars */}
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

      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center VoiceShazamButton">
        {/* Help message */}
        {/* Wake word status - only show when truly idle and ready for input */}
        {showHelpMessage &&
          !isListening &&
          !isProcessing &&
          !isProcessingSubmission &&
          !recentlyStoppedListening && (
            <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <span className="text-sm font-medium">
                💤 Say "Hey Jacq" or tap mic to speak
              </span>
            </div>
          )}
        {/* {showHelpMessage && !isListening && !isProcessing && (
          <div className="relative mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>🎤 Tap to speak</span>
                <span className="opacity-80">•</span>
                <span className="opacity-90">Auto-submits after silence</span>
              </div>
            </div>
            {/* Animated caret pointing toward the mic button 
            <div className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary/80 mt-1 animate-bounce" />
          </div>
        )} */}
        {/* Status indicator - only show while listening or processing */}
        {(isListening || isProcessing || isProcessingSubmission) && (
          <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <span className="text-sm font-medium">
              {isProcessing
                ? '🧠 AI is thinking...'
                : isProcessingSubmission
                  ? '⏳ Preparing query...'
                  : '🎤 Listening...'}
            </span>
          </div>
        )}
        {isListening && (transcript || showTranscript) && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 mb-8 max-w-[90%] shadow-xl border border-primary/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <p className="text-md text-center font-medium tracking-tight">
              {transcript || showTranscript}
            </p>
          </div>
        )}
        <div ref={containerRef}>
          {(() => {
            const showProcessing = isProcessing || isProcessingSubmission
            const showListeningVisual =
              isListening || (!showProcessing && recentlyStoppedListening)
            return (
              <Button
                onClick={toggleListening}
                disabled={isProcessing || isProcessingSubmission}
                className={cn(
                  'h-[154px] w-[154px] rounded-full shadow-xl flex items-center justify-center',
                  'border-4 border-background transition-all duration-300',
                  showProcessing
                    ? 'bg-transparent hover:bg-transparent ring-8 ring-orange-400 scale-105 !opacity-100'
                    : showListeningVisual
                      ? 'bg-emerald-500 hover:bg-emerald-600 ring-8 ring-emerald-400 scale-105'
                      : 'bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95',
                  pulseAnimation &&
                    showListeningVisual &&
                    'animate-pulse shadow-2xl',
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
                {/* Solid background overlay for processing state */}
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
                      ? 'bg-orange-600 opacity-50 animate-pulse' // Processing state - highest priority
                      : showListeningVisual
                        ? 'bg-emerald-500 opacity-40 animate-ping' // Listening state
                        : pulseAnimation
                          ? 'bg-primary opacity-40 animate-ping' // Default pulse animation
                          : 'hidden', // Hidden when none of the above
                  )}
                />
                {/* Additional processing animation ring */}
                {showProcessing && (
                  <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping animation-delay-200" />
                )}
                <div
                  className="flex items-center justify-center overflow-visible relative z-10"
                  style={{ width: '96px', height: '96px' }}
                >
                  {showProcessing ? (
                    <div className="relative flex items-center justify-center">
                      {/* AI Processing Brain */}
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          animation: 'brain-glow 2s ease-in-out infinite',
                        }}
                      />
                      <Brain
                        className="text-white"
                        strokeWidth={1.5}
                        style={{
                          animation: 'brain-pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                  ) : showListeningVisual ? (
                    <div className="relative flex items-center justify-center">
                      {/* Listening with Sound Waves */}
                      <div className="relative">
                        {/* Sound wave bars representing voice listening */}
                        <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '8px',
                              animation:
                                'pulse-height-1 1.2s ease-in-out infinite',
                              animationDelay: '0ms',
                            }}
                          ></div>
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '16px',
                              animation:
                                'pulse-height-2 1.0s ease-in-out infinite',
                              animationDelay: '150ms',
                            }}
                          ></div>
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '12px',
                              animation:
                                'pulse-height-1 1.4s ease-in-out infinite',
                              animationDelay: '300ms',
                            }}
                          ></div>
                        </div>

                        <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '12px',
                              animation:
                                'pulse-height-2 1.1s ease-in-out infinite',
                              animationDelay: '200ms',
                            }}
                          ></div>
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '16px',
                              animation:
                                'pulse-height-1 1.3s ease-in-out infinite',
                              animationDelay: '400ms',
                            }}
                          ></div>
                          <div
                            className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                            style={{
                              height: '8px',
                              animation:
                                'pulse-height-2 1.0s ease-in-out infinite',
                              animationDelay: '550ms',
                            }}
                          ></div>
                        </div>

                        {/* No microphone icon in listening state - just the soundwaves */}
                      </div>
                    </div>
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
          })()}
        </div>
      </div>
    </>
  )
}
