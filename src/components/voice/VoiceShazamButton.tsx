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

  // Debug status changes
  useEffect(() => {
    console.log('🔍 VoiceShazamButton status changed to:', status)
  }, [status])

  // Debug render with current state
  useEffect(() => {
    console.log('🎯 VoiceShazamButton rendered state:', {
      isProcessing,
      selfContained,
      status,
      hasCallback: !!onTranscript,
      timestamp: new Date().toISOString(),
    })
  }, [isProcessing, status, onTranscript])
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(
    null,
  )

  // Android health check timer
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null)
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

  // Centralized submission finalizer to ensure recognition fully stops
  const finalizeSubmission = useCallback(
    (
      recognitionInstance: SpeechRecognitionType,
      text: string,
      context: string,
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // CRITICAL: If we're already submitting or have submitted, bail out immediately
      // This makes finalizeSubmission truly idempotent and prevents duplicate submissions
      if (isSubmittingRef.current || hasSubmittedRef.current) {
        console.log(
          '🛑 finalizeSubmission blocked - already submitting/submitted',
          {
            context,
            isSubmitting: isSubmittingRef.current,
            hasSubmitted: hasSubmittedRef.current,
            trimmed,
          },
        )
        return
      }

      // Set the flag IMMEDIATELY before any other operations
      isSubmittingRef.current = true

      console.log('✅ finalizeSubmission PROCEEDING', { context, trimmed })
      setStatus('Got result!')
      setInternalIsListening(false)
      setIsProcessingSubmission(true) // Show processing visual during delay

      // Don't set flags yet - wait until after the delayed callback
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

      // Add 1.5 second delay after STT before submitting query
      console.log('⏳ Waiting 1.5s before submitting query...', {
        trimmed,
        onTranscript: !!onTranscript,
      })
      setTimeout(() => {
        console.log('📤 Submitting query after delay:', trimmed)
        console.log('🔍 Debug callback check:', {
          onTranscript: !!onTranscript,
          trimmed,
          hasSubmitted: hasSubmittedRef.current,
          lastSubmitted: lastSubmittedTranscriptRef.current,
        })
        if (onTranscript) {
          console.log('✅ Calling onTranscript callback with:', trimmed)
          try {
            onTranscript(trimmed)
            console.log('✅ onTranscript callback executed successfully')
          } catch (error) {
            console.error('❌ Error executing onTranscript callback:', error)
          }
        } else {
          console.error('❌ onTranscript callback is not available!')
        }
        // Set submission flags AFTER the callback to prevent blocking
        hasSubmittedRef.current = true
        lastSubmittedTranscriptRef.current = trimmed
        isSubmittingRef.current = false // Clear submitting flag
        setIsProcessingSubmission(false) // Clear processing visual

        // Don't dispatch dictation:stop yet - wait for AI speech to complete
        // This keeps the wake word suspended during AI processing and TTS response
      }, 1500) // 1.5 second delay after STT
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
    console.log('🎯 Speech recognition initialization (once)')
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithSR = window as any
      const SpeechRecognitionAPI =
        windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition
      console.log('🎯 SpeechRecognition API available:', !!SpeechRecognitionAPI)
      if (SpeechRecognitionAPI) {
        console.log('🎯 Creating recognition instance with optimizations')
        const recognitionInstance = new SpeechRecognitionAPI()

        // Browser detection for optimal configuration
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        )
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const isAndroid = /Android/i.test(navigator.userAgent)
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        const isChrome = /Chrome/i.test(navigator.userAgent)
        // Android-mode: we want exact Android behavior on Android and ALL Safari (mobile + desktop)
        const isAndroidMode = isAndroid || isSafari

        console.log('🍎 Browser detection:', {
          isSafari,
          isMobile,
          isAndroid,
          isIOS,
          isChrome,
          userAgent: navigator.userAgent,
        })

        // Optimized configuration based on platform
        if (isAndroidMode) {
          // Android Chrome configuration - enable continuous for wake word activation
          recognitionInstance.continuous = true // Enable continuous for longer listening sessions
          recognitionInstance.interimResults = true // Enable interim results for better responsiveness
          recognitionInstance.lang = 'en-US'
          recognitionInstance.maxAlternatives = 1
          console.log(
            '🤖 Configured for Android-mode (continuous, interim results enabled)',
            { isAndroid, isSafari },
          )
        } else if (isChrome && !isMobile) {
          // Desktop Chrome - optimized for maximum responsiveness
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          recognitionInstance.maxAlternatives = 1
          // Chrome-specific optimizations
          if (recognitionInstance.serviceURI !== undefined) {
            // Use local recognition service if available for faster startup
            console.log('🌐 Chrome: Using optimized local speech service')
          }
          console.log('🌐 Configured for Desktop Chrome (maximum speed)')
        } else if (isSafari && !isMobile) {
          // Desktop Safari - optimized configuration
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          recognitionInstance.maxAlternatives = 1
          console.log('🍎 Configured for Desktop Safari (optimized)')
        } else {
          // Other desktop browsers - optimized for speed
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          recognitionInstance.maxAlternatives = 1
          console.log('🎤 Configured for desktop browser (fast startup)')
        }

        // Event handlers with platform-specific optimizations
        recognitionInstance.onstart = () => {
          console.log('✅ Speech recognition started - ready for input')
          setStatus('Listening...')
          setInternalIsListening(true) // Ensure state is synchronized immediately

          // Immediate visual feedback - start pulse animation
          setPulseAnimation(true)
          try {
            window.dispatchEvent(new Event('dictation:start'))
          } catch {
            /* noop */
          }
        }

        recognitionInstance.onend = () => {
          console.log('⏹️ Speech recognition ended', { isAndroid })
          setStatus('Stopped')
          setInternalIsListening(false)

          // Only dispatch dictation:stop if we haven't submitted a query
          // If we have submitted, keep dictation active until AI speech completes
          if (!hasSubmittedRef.current && !isSubmittingRef.current) {
            try {
              window.dispatchEvent(new Event('dictation:stop'))
              console.log('🔄 Dispatched dictation:stop (no submission)')
            } catch {
              /* noop */
            }
          } else {
            console.log(
              '🔄 Keeping dictation active - query submitted, waiting for AI response',
            )
          }

          if (forceStopRef.current) {
            console.log('Force stop active, skipping auto-restart')
            forceStopRef.current = false
            return
          }

          // Android-mode: Now supports continuous mode with auto-restart
          if (isAndroidMode) {
            console.log(
              '🤖 Android-mode: Recognition ended, checking for auto-restart (continuous mode)',
            )
            // Continue with the auto-restart logic below for Android mode too
          }

          const now = Date.now()
          const sinceLast = now - endLoopGuardRef.current.lastEnd

          // Platform-specific loop detection
          const loopThreshold = isAndroidMode ? 800 : 1000 // Android needs tighter control
          const maxAttempts = isAndroidMode ? 5 : 3 // Android can handle more attempts

          if (sinceLast < loopThreshold) {
            endLoopGuardRef.current.attempts += 1
          } else {
            endLoopGuardRef.current.attempts = 0
          }
          endLoopGuardRef.current.lastEnd = now

          if (endLoopGuardRef.current.attempts > maxAttempts) {
            console.warn(
              `Too many rapid end events (${endLoopGuardRef.current.attempts}), halting to prevent STT loop`,
              { isAndroidMode, maxAttempts },
            )
            forceStopRef.current = true
            setInternalIsListening(false)
            return
          }

          // Don't auto-restart if we already have submitted or are currently submitting
          // Android-specific: Allow restart even with transcript for continuous listening
          if (hasSubmittedRef.current || isSubmittingRef.current) {
            console.log('Skipping restart - already submitted or submitting', {
              hasSubmitted: hasSubmittedRef.current,
              hasTranscript,
              isSubmitting: isSubmittingRef.current,
            })
            return
          }

          // Android-specific: Don't restart if we have a transcript and we're not in continuous mode
          if (!isAndroidMode && hasTranscript) {
            console.log(
              'Non-Android: Skipping restart - already have transcript',
            )
            return
          }

          // Optional: auto restart for continuous capture (only if user was listening)
          if (internalIsListening) {
            // Android needs faster restart to maintain continuous listening
            const baseDelay = isAndroidMode ? 150 : 300
            const maxDelay = isAndroidMode ? 2000 : 5000
            const delay = Math.min(
              baseDelay * 2 ** endLoopGuardRef.current.attempts,
              maxDelay,
            )
            console.log('Scheduling restart after', delay, 'ms')
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
                } catch (error) {
                  console.error('Restart failed:', error)
                  setInternalIsListening(false)
                }
              }
            }, delay)
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error, {
            isAndroidMode,
          })
          setStatus(`Error: ${event.error}`)
          setInternalIsListening(false)

          // Android-specific error recovery
          if (
            isAndroidMode &&
            (event.error === 'network' || event.error === 'audio-capture')
          ) {
            console.log('🤖 Android: Attempting error recovery in 1 second')
            setTimeout(() => {
              if (!forceStopRef.current && !hasSubmittedRef.current) {
                console.log('🤖 Android: Restarting after error recovery')
                try {
                  recognitionInstance.start()
                  setStatus('Recovering...')
                  setInternalIsListening(true)
                } catch (restartError) {
                  console.error(
                    '🤖 Android: Recovery restart failed:',
                    restartError,
                  )
                }
              }
            }, 1000)
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (event: any) => {
          // CRITICAL: Stop processing any new results if we're already submitting or have submitted
          if (isSubmittingRef.current || hasSubmittedRef.current) {
            console.log(
              '🛑 Ignoring onresult - already submitting or submitted',
              {
                isSubmitting: isSubmittingRef.current,
                hasSubmitted: hasSubmittedRef.current,
              },
            )
            return
          }

          console.log('📝 Speech recognition result:', event, { isAndroid })
          console.log('🔍 Debug state before processing result', {
            hasSubmitted: hasSubmittedRef.current,
            forceStop: forceStopRef.current,
            hasTranscript,
          })

          const results = Array.from(event.results)

          // Android-mode handling - now uses same continuous logic as other platforms
          if (isAndroidMode) {
            // Android Chrome now uses continuous mode with silence detection
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

            // Combine both for current display
            const currentTranscript = (
              finalTranscript + interimTranscript
            ).trim()

            if (currentTranscript) {
              console.log('🤖 Android current transcript:', currentTranscript)
              setTranscript(currentTranscript)
              setHasTranscript(true)

              // Start fallback finalize timer when we get the FIRST transcript chunk of this session
              if (
                !fallbackFinalizeTimerRef.current &&
                !hasSubmittedRef.current &&
                !isSubmittingRef.current
              ) {
                fallbackFinalizeTimerRef.current = setTimeout(() => {
                  // Double-check we haven't submitted in the meantime
                  if (isSubmittingRef.current || hasSubmittedRef.current) {
                    console.log(
                      '⏳ Android fallback timer expired but already submitting/submitted',
                    )
                    return
                  }
                  const latest = transcriptRef.current.trim()
                  if (latest.length > 0) {
                    console.log(
                      '⏳ Android fallback finalize triggered (3000ms)',
                      {
                        latest,
                      },
                    )

                    // CRITICAL: Set hasSubmitted to block other timers, stop everything
                    hasSubmittedRef.current = true
                    forceStopRef.current = true

                    // Clear any silence timer
                    setSilenceTimer(prev => {
                      if (prev) clearTimeout(prev)
                      return null
                    })

                    // Stop recognition immediately
                    try {
                      recognitionInstance.stop()
                    } catch {
                      /* already stopped */
                    }

                    // Reset hasSubmittedRef so finalizeSubmission can proceed
                    hasSubmittedRef.current = false

                    finalizeSubmission(
                      recognitionInstance,
                      latest,
                      'android-fallback-timeout',
                    )
                  }
                }, 3000)
                console.log(
                  '⏳ Android fallback finalize timer started (3000ms)',
                )
              }

              // Enhanced duplicate prevention - check multiple conditions
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
                console.log(
                  '🔄 Android skipping duplicate/similar transcript:',
                  {
                    current: currentTranscript,
                    last: lastSubmittedTranscriptRef.current,
                  },
                )
                return
              }

              // Clear existing silence timer on any speech activity
              setSilenceTimer(prevTimer => {
                if (prevTimer) {
                  clearTimeout(prevTimer)
                  console.log(
                    '🔄 Android speech activity detected, resetting silence timer',
                  )
                }

                // Don't set a new timer if we're already submitting or have submitted
                if (isSubmittingRef.current || hasSubmittedRef.current) {
                  console.log(
                    '🔄 Android skipping new silence timer - already submitting or submitted',
                    {
                      isSubmitting: isSubmittingRef.current,
                      hasSubmitted: hasSubmittedRef.current,
                    },
                  )
                  return null
                }

                // Start new silence timer - wait for configured silence duration
                const newTimer = setTimeout(() => {
                  // First check: bail out if already submitting or submitted
                  if (isSubmittingRef.current || hasSubmittedRef.current) {
                    console.log(
                      '🔄 Android silence timer expired but already submitting/submitted',
                      {
                        isSubmitting: isSubmittingRef.current,
                        hasSubmitted: hasSubmittedRef.current,
                      },
                    )
                    return
                  }

                  const trimmedTranscript = currentTranscript.trim()

                  // Triple-check we haven't already submitted this or similar transcript
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
                    console.log(
                      '🔄 Android timer expired but transcript is duplicate/similar:',
                      {
                        current: trimmedTranscript,
                        last: lastSubmittedTranscriptRef.current,
                      },
                    )
                    return
                  }

                  console.log('⏰ Android silence detected', {
                    trimmedTranscript,
                    threshold: SILENCE_DURATION_MS,
                  })

                  // CRITICAL: Set hasSubmitted to block other timers, but NOT isSubmitting yet
                  // (finalizeSubmission will set isSubmitting)
                  hasSubmittedRef.current = true
                  forceStopRef.current = true

                  // Clear fallback timer immediately
                  if (fallbackFinalizeTimerRef.current) {
                    clearTimeout(fallbackFinalizeTimerRef.current)
                    fallbackFinalizeTimerRef.current = null
                  }

                  // Clear any other silence timers
                  setSilenceTimer(prev => {
                    if (prev) clearTimeout(prev)
                    return null
                  })

                  // Stop recognition immediately
                  try {
                    recognitionInstance.stop()
                  } catch {
                    /* already stopped */
                  }

                  // Reset hasSubmittedRef so finalizeSubmission can proceed
                  hasSubmittedRef.current = false

                  // Now call finalizeSubmission (which will set isSubmittingRef)
                  finalizeSubmission(
                    recognitionInstance,
                    trimmedTranscript,
                    'android-silence-threshold',
                  )
                }, SILENCE_DURATION_MS)

                console.log(
                  `⏰ Android started ${SILENCE_DURATION_MS}ms silence timer for:`,
                  currentTranscript.slice(0, 60),
                )
                return newTimer
              })
            }
            return
          }

          // Non-Android handling (iOS Safari, desktop) - use interim results and silence detection
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

          // Combine both for current display
          const currentTranscript = (finalTranscript + interimTranscript).trim()

          if (currentTranscript) {
            console.log('🎤 Current transcript:', currentTranscript)
            setTranscript(currentTranscript)
            setHasTranscript(true)
            // Start fallback finalize timer when we get the FIRST transcript chunk of this session
            if (
              !fallbackFinalizeTimerRef.current &&
              !hasSubmittedRef.current &&
              !isSubmittingRef.current
            ) {
              fallbackFinalizeTimerRef.current = setTimeout(() => {
                // Double-check we haven't submitted in the meantime
                if (isSubmittingRef.current || hasSubmittedRef.current) {
                  console.log(
                    '⏳ Fallback timer expired but already submitting/submitted',
                  )
                  return
                }
                const latest = transcriptRef.current.trim()
                if (latest.length > 0) {
                  console.log('⏳ Fallback finalize triggered (3000ms)', {
                    latest,
                  })

                  // CRITICAL: Set hasSubmitted to block other timers, stop everything
                  hasSubmittedRef.current = true
                  forceStopRef.current = true

                  // Clear any silence timer
                  setSilenceTimer(prev => {
                    if (prev) clearTimeout(prev)
                    return null
                  })

                  // Stop recognition immediately
                  try {
                    recognitionInstance.stop()
                  } catch {
                    /* already stopped */
                  }

                  // Reset hasSubmittedRef so finalizeSubmission can proceed
                  hasSubmittedRef.current = false

                  finalizeSubmission(
                    recognitionInstance,
                    latest,
                    'fallback-timeout',
                  )
                }
              }, 3000)
              console.log('⏳ Fallback finalize timer started (3000ms)')
            }

            // Enhanced duplicate prevention - check multiple conditions
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
              console.log('🔄 Skipping duplicate/similar transcript:', {
                current: currentTranscript,
                last: lastSubmittedTranscriptRef.current,
              })
              return
            }

            // Clear existing silence timer on any speech activity
            setSilenceTimer(prevTimer => {
              if (prevTimer) {
                clearTimeout(prevTimer)
                console.log(
                  '🔄 Speech activity detected, resetting silence timer',
                )
              }

              // Don't set a new timer if we're already submitting or have submitted
              if (isSubmittingRef.current || hasSubmittedRef.current) {
                console.log(
                  '🔄 Skipping new silence timer - already submitting or submitted',
                  {
                    isSubmitting: isSubmittingRef.current,
                    hasSubmitted: hasSubmittedRef.current,
                  },
                )
                return null
              }

              // Start new silence timer - wait for configured silence duration
              const newTimer = setTimeout(() => {
                // First check: bail out if already submitting or submitted
                if (isSubmittingRef.current || hasSubmittedRef.current) {
                  console.log(
                    '🔄 Silence timer expired but already submitting/submitted',
                    {
                      isSubmitting: isSubmittingRef.current,
                      hasSubmitted: hasSubmittedRef.current,
                    },
                  )
                  return
                }

                const trimmedTranscript = currentTranscript.trim()

                // Triple-check we haven't already submitted this or similar transcript
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
                  console.log(
                    '🔄 Timer expired but transcript is duplicate/similar:',
                    {
                      current: trimmedTranscript,
                      last: lastSubmittedTranscriptRef.current,
                    },
                  )
                  return
                }

                console.log('⏰ Silence detected', {
                  trimmedTranscript,
                  threshold: SILENCE_DURATION_MS,
                })

                // CRITICAL: Set hasSubmitted to block other timers, but NOT isSubmitting yet
                // (finalizeSubmission will set isSubmitting)
                hasSubmittedRef.current = true
                forceStopRef.current = true

                // Clear fallback timer immediately
                if (fallbackFinalizeTimerRef.current) {
                  clearTimeout(fallbackFinalizeTimerRef.current)
                  fallbackFinalizeTimerRef.current = null
                }

                // Clear any other silence timers
                setSilenceTimer(prev => {
                  if (prev) clearTimeout(prev)
                  return null
                })

                // Stop recognition immediately
                try {
                  recognitionInstance.stop()
                } catch {
                  /* already stopped */
                }

                // Reset hasSubmittedRef so finalizeSubmission can proceed
                hasSubmittedRef.current = false

                // Now call finalizeSubmission (which will set isSubmittingRef)
                finalizeSubmission(
                  recognitionInstance,
                  trimmedTranscript,
                  'silence-threshold',
                )
              }, SILENCE_DURATION_MS)

              console.log(
                `⏰ Started ${SILENCE_DURATION_MS}ms silence timer for:`,
                currentTranscript.slice(0, 60),
              )
              return newTimer
            })
          }
        }

        setRecognition(recognitionInstance)
        setStatus('Initialized')

        // Android health check: monitor for stuck states
        if (isAndroidMode) {
          console.log('🤖 Android: Starting health check monitoring')
          if (healthCheckTimerRef.current) {
            clearInterval(healthCheckTimerRef.current)
          }

          healthCheckTimerRef.current = setInterval(() => {
            // Check if we should be listening but recognition seems stuck
            if (
              internalIsListening &&
              !hasSubmittedRef.current &&
              !isSubmittingRef.current
            ) {
              console.log(
                '🤖 Android: Health check - monitoring recognition state',
              )
            }
          }, 5000) // Check every 5 seconds
        }
      } else {
        setStatus('Speech Recognition not supported')
        console.error('❌ Speech Recognition API not supported')
      }
    }
    return () => {
      try {
        recognition?.stop()
      } catch {
        /* ignore */
      }

      // Cleanup health check timer
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current)
        healthCheckTimerRef.current = null
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
      console.error('❌ No recognition instance or not in self-contained mode')
      return
    }

    if (ttsActive) {
      console.log('🔇 Ignoring toggle while TTS is active')
      return
    }

    console.log('🎯 toggleListening called', {
      recognition: !!recognition,
      isListening: internalIsListening,
      hasSubmitted: hasSubmittedRef.current,
    })

    if (internalIsListening) {
      console.log('🛑 Stopping recognition...')
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
      setTranscript('') // Clear transcript when stopping
    } else {
      console.log('🎤 Starting recognition...')

      // Attempt to unlock iOS/Safari audio early so first TTS response auto-plays
      try {
        // Attempt legacy Safari unlock, then new generalized force unlock
        if (novaSonic.enableAudioForSafari) {
          novaSonic.enableAudioForSafari().catch(() => {})
        }
        // Narrow type for optional forceUnlockAudio
        type UnlockCapable = typeof novaSonic & {
          forceUnlockAudio?: () => Promise<boolean>
        }
        const maybeUnlock = novaSonic as UnlockCapable
        if (maybeUnlock.forceUnlockAudio) {
          maybeUnlock.forceUnlockAudio().catch(() => {})
        }
      } catch (e) {
        // Non-fatal; continue
      }

      // IMMEDIATE FEEDBACK: Set UI state immediately before any async operations
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

      // Platform-specific permission handling - optimized for immediate startup
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      )
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isChrome = /Chrome/i.test(navigator.userAgent) && !isAndroid
      const isDesktopSafari = isSafari && !isMobile
      const isAndroidMode = isAndroid || isSafari

      if (isSafari && isMobile) {
        // iOS Safari - request permissions first but start immediately after
        try {
          console.log('🍎 iOS Safari: Starting with optimized flow')

          // Try to start immediately first (works if permissions already granted)
          try {
            recognition.start()
            setStatus('Ready to listen!')
            console.log(
              '🍎 iOS Safari: Started immediately (permissions already granted)',
            )
          } catch (immediateError) {
            console.log('🍎 iOS Safari: Need to request permissions first')
            setStatus('Requesting access...')

            // Request permissions if immediate start failed
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            })
            console.log('✅ iOS Safari: Microphone permission granted')
            stream.getTracks().forEach(track => track.stop())

            // Start recognition immediately after permission (no delay needed)
            recognition.start()
            setStatus('Ready to listen!')
          }
        } catch (error) {
          console.error('🍎 iOS Safari permission error:', error)
          setStatus(`Permission error: ${error}`)
        }
      } else if (isAndroidMode) {
        // Android-mode start logic for non-continuous mode (Android + all Safari)
        try {
          console.log('🤖 Android-mode: Starting recognition immediately')
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          console.error('🤖 Android-mode start error:', error)
          setStatus(`Start error: ${error}`)
          setInternalIsListening(false)
        }
      } else if (isChrome) {
        // Desktop Chrome - optimized for immediate startup
        try {
          console.log('🌐 Desktop Chrome: Starting recognition immediately')
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          console.error('🌐 Desktop Chrome start error:', error)
          setStatus(`Start error: ${error}`)
          setInternalIsListening(false)
        }
      } else if (isDesktopSafari) {
        // Desktop Safari - optimized startup
        try {
          console.log('🍎 Desktop Safari: Starting recognition immediately')
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          console.error('🍎 Desktop Safari start error:', error)
          setStatus(`Start error: ${error}`)
          setInternalIsListening(false)
        }
      } else {
        // Other browsers - immediate startup
        try {
          console.log('🌐 Other browser: Starting recognition immediately')
          recognition.start()
          setStatus('Ready to listen!')
        } catch (error) {
          console.error('❌ Start error:', error)
          setStatus(`Start error: ${error}`)
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
      console.log('📡 wakeword:activate-mic received', {
        internalIsListening,
        isProcessing,
        ttsActive,
        canShow: !isMobileOnly || isMobileView,
      })
      if (ttsActive) {
        console.log('🔇 Ignoring wakeword during active TTS')
        return
      }
      // Only respond if button is visible (mobile-only either disabled or we are on mobile)
      const canShow = !isMobileOnly || isMobileView
      if (!canShow) return
      // Avoid starting if already listening or currently processing upstream
      if (internalIsListening || isProcessing) return
      // Start listening
      console.log('🎤 Wakeword activating mic (selfContained Shazam)')
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
      console.log(
        '🎙️ AI speech complete - clearing TTS state and resuming wake word',
      )
      setHelpBlockedUntilSpeechComplete(false)
      setTtsActive(false)
      if (ttsClearTimerRef.current) {
        clearTimeout(ttsClearTimerRef.current)
        ttsClearTimerRef.current = null
      }

      // NOW dispatch dictation:stop to allow wake word to resume
      // This happens after the full interaction cycle (speak → process → TTS response)
      try {
        window.dispatchEvent(new Event('dictation:stop'))
        console.log(
          '🔄 Dispatched dictation:stop after AI speech complete - wake word can resume',
        )
      } catch {
        /* noop */
      }
    }
    const onSpeechStart = () => {
      console.log('🎙️ AI speech started - keeping dictation active')
      setTtsActive(true)
      // Failsafe: auto-clear TTS state after 45s in case complete event is missed
      if (ttsClearTimerRef.current) clearTimeout(ttsClearTimerRef.current)
      ttsClearTimerRef.current = setTimeout(() => {
        console.warn('⏳ TTS active timeout reached, auto-clearing gate')
        setTtsActive(false)
        ttsClearTimerRef.current = null
        // Also dispatch dictation:stop on timeout to ensure wake word can resume
        try {
          window.dispatchEvent(new Event('dictation:stop'))
          console.log(
            '🔄 Dispatched dictation:stop after timeout - wake word can resume',
          )
        } catch {
          /* noop */
        }
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
