import { useState, useEffect, useRef, useCallback } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'
import { Mic } from 'lucide-react'
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
  // Faster silence detection (previously 2000ms)
  const SILENCE_DURATION_MS = 1500
  console.log('🎯 VoiceShazamButton rendered', { isProcessing, selfContained })
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
  // NEW: Persist user intent to keep listening; used for auto-restarts after onend
  const shouldAutoRestartRef = useRef<boolean>(false)
  // Queue a tap during processing so it starts listening when processing finishes
  const pendingStartRef = useRef<boolean>(false)
  const endLoopGuardRef = useRef<{ lastEnd: number; attempts: number }>({
    lastEnd: 0,
    attempts: 0,
  })
  const forceStopRef = useRef(false)
  // Prevent brief flash of idle (mic) icon between listening -> processing
  const [recentlyStoppedListening, setRecentlyStoppedListening] =
    useState(false)
  // Will assign after isListening is derived
  const prevListeningRef = useRef<boolean>(false)
  const prevProcessingRef = useRef<boolean>(false)

  // Centralized submission finalizer to ensure recognition fully stops
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
        console.log('🔄 finalizeSubmission duplicate skipped', { context })
        return
      }
      console.log('✅ finalizeSubmission', { context, trimmed })
      setStatus('Got result!')
      setInternalIsListening(false)
      hasSubmittedRef.current = true
      // Ensure we don't auto-restart after a submission
      shouldAutoRestartRef.current = false
      lastSubmittedTranscriptRef.current = trimmed
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
      if (onTranscript) {
        onTranscript(trimmed)
      }
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
          // Android Chrome configuration - specific fixes for duplicate issues
          recognitionInstance.continuous = false // Disable continuous on Android to prevent loops
          recognitionInstance.interimResults = false // Disable interim results on Android for stability
          recognitionInstance.lang = 'en-US'
          recognitionInstance.maxAlternatives = 1
          console.log(
            '🤖 Configured for Android-mode (non-continuous, final results only)',
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
          try {
            window.dispatchEvent(new Event('dictation:stop'))
          } catch {
            /* noop */
          }

          if (forceStopRef.current) {
            console.log('Force stop active, skipping auto-restart')
            forceStopRef.current = false
            return
          }

          // Allow controlled auto-restart on Android too when user intended to keep listening
          if (isAndroid) {
            console.log('🤖 Android: Recognition ended')
          }

          const now = Date.now()
          const sinceLast = now - endLoopGuardRef.current.lastEnd

          // More aggressive loop detection for mobile
          if (sinceLast < 1000) {
            // Increased from 800ms to 1000ms
            endLoopGuardRef.current.attempts += 1
          } else {
            endLoopGuardRef.current.attempts = 0
          }
          endLoopGuardRef.current.lastEnd = now

          // Reduced max attempts for mobile stability
          if (endLoopGuardRef.current.attempts > 3) {
            // Reduced from 5 to 3
            console.warn(
              'Too many rapid end events, halting to prevent STT loop',
            )
            forceStopRef.current = true
            setInternalIsListening(false)
            return
          }

          // Don't auto-restart if we already have a transcript or have submitted
          if (hasSubmittedRef.current || hasTranscript) {
            console.log(
              'Skipping restart - already have transcript or submitted',
            )
            return
          }

          // Optional: auto restart for continuous capture based on user intent
          if (shouldAutoRestartRef.current) {
            const delay = Math.min(
              300 * 2 ** endLoopGuardRef.current.attempts, // Increased base delay from 150ms to 300ms
              5000, // Increased max delay from 3000ms to 5000ms
            )
            console.log('Scheduling restart after', delay, 'ms')
            setTimeout(() => {
              if (
                !forceStopRef.current &&
                shouldAutoRestartRef.current &&
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
          console.error('❌ Speech recognition error:', event.error)
          setStatus(`Error: ${event.error}`)
          setInternalIsListening(false)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (event: any) => {
          console.log('📝 Speech recognition result:', event, { isAndroid })
          console.log('🔍 Debug state before processing result', {
            hasSubmitted: hasSubmittedRef.current,
            forceStop: forceStopRef.current,
            hasTranscript,
          })

          const results = Array.from(event.results)

          // Android-mode handling - different approach for non-continuous mode
          if (isAndroidMode) {
            // Android Chrome in non-continuous mode - get final result only
            let finalTranscript = ''
            for (let i = 0; i < results.length; i++) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = results[i] as any
              if (result.isFinal) {
                finalTranscript += result[0].transcript
              }
            }

            const currentTranscript = finalTranscript.trim()

            if (currentTranscript) {
              console.log('🤖 Android final transcript:', currentTranscript)
              setTranscript(currentTranscript)
              setHasTranscript(true)
              finalizeSubmission(
                recognitionInstance,
                currentTranscript,
                'android-final',
              )
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
            if (!fallbackFinalizeTimerRef.current && !hasSubmittedRef.current) {
              fallbackFinalizeTimerRef.current = setTimeout(() => {
                const latest = transcriptRef.current.trim()
                if (!hasSubmittedRef.current && latest.length > 0) {
                  console.log('⏳ Fallback finalize triggered (4500ms)', {
                    latest,
                  })
                  finalizeSubmission(
                    recognitionInstance,
                    latest,
                    'fallback-timeout',
                  )
                }
              }, 4500)
              console.log('⏳ Fallback finalize timer started (4500ms)')
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

              // Start new silence timer - wait for configured silence duration
              const newTimer = setTimeout(() => {
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

                console.log('⏰ Silence detected (auto-submit)', {
                  trimmedTranscript,
                  threshold: SILENCE_DURATION_MS,
                })
                finalizeSubmission(
                  recognitionInstance,
                  trimmedTranscript,
                  'silence-threshold',
                )
                setStatus('Got result!')
                setInternalIsListening(false)
                hasSubmittedRef.current = true
                lastSubmittedTranscriptRef.current = trimmedTranscript

                // Stop recognition
                try {
                  recognitionInstance.stop()
                } catch (error) {
                  console.log('Recognition already stopped')
                }
              }, 1500) // 1.5 second silence detection

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

  // Reset to initial idle state when processing finishes
  useEffect(() => {
    // Detect transition from processing -> not processing
    if (prevProcessingRef.current && !isProcessing) {
      // Clear any timers
      setSilenceTimer(prev => {
        if (prev) clearTimeout(prev)
        return null
      })
      if (fallbackFinalizeTimerRef.current) {
        clearTimeout(fallbackFinalizeTimerRef.current)
        fallbackFinalizeTimerRef.current = null
      }

      // Reset internal flags/state to page-load idle
      hasSubmittedRef.current = false
      shouldAutoRestartRef.current = false
      lastSubmittedTranscriptRef.current = ''
      forceStopRef.current = false
      setHasTranscript(false)
      setTranscript('')
      setInternalIsListening(false)
      setRecentlyStoppedListening(false)
      setPulseAnimation(false)
      setStatus('Ready')
      // Re-show the help hint post-response; it will auto-hide after 5s
      setShowHelpMessage(true)

      // If user tapped during processing, start listening now
      if (pendingStartRef.current) {
        console.log('🎯 Starting queued listening after processing finished')
        pendingStartRef.current = false
        // Use a small delay to let the UI settle
        setTimeout(() => {
          if (!isProcessing && recognition) {
            // Manually trigger start without calling internalToggleListening to avoid dependency issues
            shouldAutoRestartRef.current = true
            setInternalIsListening(true)
            setStatus('Initializing...')
            try {
              recognition.start()
            } catch (error) {
              console.error('Queued start failed:', error)
              setInternalIsListening(false)
              shouldAutoRestartRef.current = false
            }
          }
        }, 100)
      }
    }
    prevProcessingRef.current = isProcessing
  }, [isProcessing, recognition])

  // Self-contained toggle listening function
  const internalToggleListening = useCallback(async () => {
    if (!selfContained || !recognition) {
      console.error('❌ No recognition instance or not in self-contained mode')
      return
    }

    // If processing, queue the start for when processing finishes
    if (isProcessing) {
      console.log('🎯 Queueing start for when processing finishes')
      pendingStartRef.current = true
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
      // User explicitly stopped - don't auto-restart
      shouldAutoRestartRef.current = false
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
      // User intended to listen; allow auto-restarts on transient onend
      shouldAutoRestartRef.current = true
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
  }, [selfContained, recognition, isProcessing, internalIsListening])

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

  // Hide help message after 5 seconds; allow re-show later by keying on showHelpMessage
  useEffect(() => {
    if (!showHelpMessage) return
    const timer = setTimeout(() => {
      setShowHelpMessage(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [showHelpMessage])

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
          /* Hammer processing animation */
          @keyframes hammer-swing {
            0% {
              transform: scale(0.9) rotate(-18deg);
              opacity: 0.98;
            }
            50% {
              transform: scale(0.9) rotate(12deg);
              opacity: 1;
            }
            100% {
              transform: scale(0.9) rotate(-18deg);
              opacity: 0.98;
            }
          }
          /* Removed hammer-glow (white outer glow) */
          /* Impact-synced pulse: peak at top of swing (0%) */
          @keyframes hammer-impact-ring {
            0% {
              transform: scale(1.0);
              opacity: 0.55;
            }
            20% {
              transform: scale(1.25);
              opacity: 0.25;
            }
            35% {
              transform: scale(1.4);
              opacity: 0.1;
            }
            45% {
              transform: scale(1.5);
              opacity: 0;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
        `,
        }}
      />

      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center VoiceShazamButton">
        {/* Help message - Fixed positioning to prevent layout shift */}
        <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2">
          {showHelpMessage && !isListening && (
            <div className="bg-black/80 text-white text-sm px-4 py-2 rounded-full animate-in fade-in slide-in-from-bottom-3 duration-500 whitespace-nowrap">
              🎤 Tap to speak • Auto-submits after silence
            </div>
          )}
        </div>

        {/* Transcript - Fixed positioning to prevent layout shift */}
        <div className="absolute bottom-full mb-8 left-1/2 transform -translate-x-1/2 max-w-[90vw]">
          {showTranscript && (
            <div className="bg-background rounded-lg p-4 shadow-xl border border-primary/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <p className="text-md text-center font-medium tracking-tight">
                {showTranscript}
              </p>
            </div>
          )}
        </div>

        {/* Button container with fixed dimensions to prevent layout shift */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            width: '154px',
            height: '154px',
            // Reserve space for rings to prevent layout shift
            padding: '8px',
            margin: '-8px',
          }}
        >
          {(() => {
            const showProcessing = isProcessing
            const showListeningVisual =
              isListening || (!showProcessing && recentlyStoppedListening)
            return (
              <Button
                onClick={toggleListening}
                disabled={isProcessing}
                className={cn(
                  'h-[154px] w-[154px] rounded-full shadow-xl flex items-center justify-center',
                  'border-4 border-white transition-all duration-300 absolute inset-0',
                  // Remove scale transforms that cause layout shift - use transform in style instead
                  showProcessing
                    ? 'bg-orange-600 hover:bg-orange-600 !opacity-100'
                    : showListeningVisual
                      ? 'bg-emerald-500 hover:bg-emerald-600 !opacity-100'
                      : 'bg-primary hover:bg-primary',
                  // Remove animate-pulse to avoid opacity animation in listening state
                  pulseAnimation && showListeningVisual && 'shadow-2xl',
                  showProcessing && 'shadow-2xl',
                )}
                style={{
                  boxShadow: showProcessing
                    ? '0 0 40px rgba(234, 88, 12, 0.6)'
                    : showListeningVisual
                      ? '0 0 40px rgba(16, 185, 129, 0.6)'
                      : '0 0 30px rgba(0,0,0,0.5)',
                  // Use transform for scaling to avoid layout shift
                  transform:
                    showProcessing || showListeningVisual
                      ? 'scale(1.05)'
                      : 'scale(1)',
                  // Add ring effect via box-shadow to avoid layout shift
                  ...(showProcessing && {
                    boxShadow:
                      '0 0 40px rgba(234, 88, 12, 0.6), 0 0 0 8px rgba(234, 88, 12, 0.4)',
                  }),
                  ...(showListeningVisual &&
                    !showProcessing && {
                      boxShadow:
                        '0 0 40px rgba(16, 185, 129, 0.6), 0 0 0 8px rgba(16, 185, 129, 0.4)',
                    }),
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
                {/* Solid background handled directly via button bg in processing state */}

                <div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    showProcessing
                      ? 'hidden' // solid background only in processing
                      : showListeningVisual
                        ? 'hidden' // Remove translucent/animated overlay in listening state
                        : 'hidden', // No overlay in blue waiting state
                  )}
                />
                {/* Additional processing animation ring */}
                {showProcessing && (
                  <div
                    className="absolute inset-0 rounded-full bg-orange-400"
                    style={{
                      animation: 'hammer-impact-ring 1.2s ease-out infinite',
                    }}
                  />
                )}
                <div
                  className="flex items-center justify-center overflow-visible relative z-10"
                  style={{ width: '96px', height: '96px' }}
                >
                  {showProcessing ? (
                    <div
                      className="relative flex items-center justify-center"
                      style={{ transform: 'translate(-2px, -4px)' }}
                    >
                      {/* Processing: Animated Hammer (from public asset) */}
                      <img
                        src="/hammer-tool.svg"
                        alt="Processing"
                        draggable={false}
                        style={{
                          width: '144%',
                          height: '144%',
                          objectFit: 'contain',
                          display: 'block',
                          // Pivot near the handle end for a realistic swing
                          transformOrigin: '52% 92%',
                          filter: 'brightness(0) invert(1)', // ensure it renders white like the old icon
                          animation: 'hammer-swing 1.2s ease-in-out infinite',
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
