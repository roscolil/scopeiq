import { useState, useEffect, useRef } from 'react'
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
  console.log('🎯 VoiceShazamButton rendered', { isProcessing, selfContained })
  const [pulseAnimation, setPulseAnimation] = useState(false)
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobileView = useIsMobile()

  // Self-contained speech recognition state
  const [internalIsListening, setInternalIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState('Ready')
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(
    null,
  )
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const [hasTranscript, setHasTranscript] = useState(false)
  const lastSubmittedTranscriptRef = useRef<string>('')
  const hasSubmittedRef = useRef<boolean>(false)

  // Determine which listening state to use
  const isListening = selfContained
    ? internalIsListening
    : externalIsListening || false

  // Initialize speech recognition for self-contained mode
  useEffect(() => {
    if (!selfContained) return // Skip if using external control

    console.log('🎯 Speech recognition initialization useEffect running')

    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithSR = window as any
      const SpeechRecognitionAPI =
        windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition

      console.log('🎯 SpeechRecognition API available:', !!SpeechRecognitionAPI)

      if (SpeechRecognitionAPI) {
        console.log('🎯 Creating recognition instance')
        const recognitionInstance = new SpeechRecognitionAPI()

        // Browser detection for optimal configuration
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        )
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const isAndroid = /Android/i.test(navigator.userAgent)
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

        console.log('🍎 Browser detection:', {
          isSafari,
          isMobile,
          isAndroid,
          isIOS,
          userAgent: navigator.userAgent,
        })

        // Optimized configuration based on platform
        if (isSafari && isMobile) {
          // Safari mobile configuration - optimized for iOS
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          console.log('🍎 Configured for Safari mobile with interim results')
        } else if (isAndroid) {
          // Android Chrome configuration - optimized for Android
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          console.log('🤖 Configured for Android Chrome')
        } else {
          // Standard desktop configuration
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          console.log('🎤 Configured for standard browser')
        }

        // Event handlers with platform-specific optimizations
        recognitionInstance.onstart = () => {
          console.log('✅ Speech recognition started')
          setStatus('Listening...')
        }

        recognitionInstance.onend = () => {
          console.log('⏹️ Speech recognition ended')
          setStatus('Stopped')
          setInternalIsListening(false)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error)
          setStatus(`Error: ${event.error}`)
          setInternalIsListening(false)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (event: any) => {
          console.log('📝 Speech recognition result:', event)

          const results = Array.from(event.results)

          // Get both interim and final transcripts
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

            // Android duplicate prevention - skip if we've already submitted this exact transcript
            if (
              hasSubmittedRef.current &&
              currentTranscript === lastSubmittedTranscriptRef.current
            ) {
              console.log(
                '🔄 Skipping - already submitted this transcript:',
                currentTranscript,
              )
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

              // Start new silence timer - wait for 2 seconds of silence
              const newTimer = setTimeout(() => {
                const trimmedTranscript = currentTranscript.trim()

                // Double-check we haven't already submitted this transcript (Android protection)
                if (
                  hasSubmittedRef.current &&
                  trimmedTranscript === lastSubmittedTranscriptRef.current
                ) {
                  console.log(
                    '🔄 Timer expired but already submitted:',
                    trimmedTranscript,
                  )
                  return
                }

                console.log(
                  '⏰ Silence detected, auto-submitting:',
                  trimmedTranscript,
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

                // Pass transcript to parent component after silence
                if (onTranscript && trimmedTranscript) {
                  console.log(
                    '🎯 Calling onTranscript after silence:',
                    trimmedTranscript,
                  )
                  onTranscript(trimmedTranscript)
                }
              }, 2000) // 2 second silence detection

              console.log(
                '⏰ Started 2s silence timer for:',
                currentTranscript.slice(0, 50),
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
  }, [onTranscript, selfContained]) // Only depend on onTranscript and selfContained

  // Cleanup silence timer on unmount
  useEffect(() => {
    if (!selfContained) return

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
    }
  }, [silenceTimer, selfContained])

  // Self-contained toggle listening function
  const internalToggleListening = async () => {
    if (!selfContained || !recognition) {
      console.error('❌ No recognition instance or not in self-contained mode')
      return
    }

    console.log('🎯 toggleListening called', {
      recognition: !!recognition,
      isListening: internalIsListening,
    })

    if (internalIsListening) {
      console.log('🛑 Stopping recognition...')
      recognition.stop()
      setInternalIsListening(false)
      hasSubmittedRef.current = false
      lastSubmittedTranscriptRef.current = ''
      // Clear silence timer when stopping
      setSilenceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })
      setHasTranscript(false)
    } else {
      console.log('🎤 Starting recognition...')
      // Reset state when starting
      setTranscript('')
      setHasTranscript(false)
      hasSubmittedRef.current = false
      lastSubmittedTranscriptRef.current = ''
      setSilenceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })

      // Platform-specific permission handling
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      )
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isSafari && isMobile) {
        try {
          console.log('🍎 Requesting microphone permissions...')
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          console.log('✅ Microphone permission granted')
          stream.getTracks().forEach(track => track.stop())

          setTimeout(() => {
            try {
              recognition.start()
              setInternalIsListening(true)
              setStatus('Starting...')
            } catch (error) {
              console.error('🍎 Safari start error:', error)
              setStatus(`Start error: ${error}`)
            }
          }, 300)
        } catch (error) {
          console.error('🍎 Permission error:', error)
          setStatus(`Permission error: ${error}`)
        }
      } else {
        try {
          recognition.start()
          setInternalIsListening(true)
          setStatus('Starting...')
        } catch (error) {
          console.error('❌ Start error:', error)
          setStatus(`Start error: ${error}`)
        }
      }
    }
  }

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

  // Hide help message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelpMessage(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

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
        {showHelpMessage && !isListening && (
          <div className="bg-black/80 text-white text-sm px-4 py-2 rounded-full mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            🎤 Tap to speak • Auto-submits after silence
          </div>
        )}

        {showTranscript && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 mb-8 max-w-[90%] shadow-xl border border-primary/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <p className="text-md text-center font-medium tracking-tight">
              {showTranscript}
            </p>
          </div>
        )}
        <div ref={containerRef}>
          <Button
            onClick={toggleListening}
            disabled={isProcessing}
            className={cn(
              'h-[154px] w-[154px] rounded-full shadow-xl flex items-center justify-center',
              'border-4 border-background transition-all duration-300',
              isProcessing
                ? 'bg-transparent hover:bg-transparent ring-8 ring-orange-400 scale-105 !opacity-100' // Processing state - highest priority
                : isListening
                  ? 'bg-emerald-500 hover:bg-emerald-600 ring-8 ring-emerald-400 scale-105' // Listening state
                  : 'bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95', // Normal state
              pulseAnimation && 'animate-pulse shadow-2xl',
              isProcessing && 'animate-pulse shadow-2xl', // Add pulse animation during processing
            )}
            style={{
              boxShadow: isProcessing
                ? '0 0 40px rgba(234, 88, 12, 0.6)' // Orange glow when processing - highest priority
                : isListening
                  ? '0 0 40px rgba(16, 185, 129, 0.6)' // Emerald glow when listening
                  : '0 0 30px rgba(0,0,0,0.5)', // Default glow
              position: 'relative',
              zIndex: 200,
            }}
            aria-label={
              isProcessing
                ? 'Processing voice input...'
                : isListening
                  ? 'Listening... Speak now and stop when done'
                  : 'Tap to start voice input'
            }
          >
            {/* Solid background overlay for processing state */}
            {isProcessing && (
              <div
                className="absolute inset-0 bg-orange-600 rounded-full z-0"
                style={{ backgroundColor: '#d97706' }}
              />
            )}

            <div
              className={cn(
                'absolute inset-0 rounded-full',
                isProcessing
                  ? 'bg-orange-600 opacity-50 animate-pulse' // Processing state - highest priority
                  : isListening
                    ? 'bg-emerald-500 opacity-40 animate-ping' // Listening state
                    : pulseAnimation
                      ? 'bg-primary opacity-40 animate-ping' // Default pulse animation
                      : 'hidden', // Hidden when none of the above
              )}
            />
            {/* Additional processing animation ring */}
            {isProcessing && (
              <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping animation-delay-200" />
            )}
            <div
              className="flex items-center justify-center overflow-visible relative z-10"
              style={{ width: '96px', height: '96px' }}
            >
              {isProcessing ? (
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
              ) : isListening ? (
                <div className="relative flex items-center justify-center">
                  {/* Listening with Sound Waves */}
                  <div className="relative">
                    {/* Sound wave bars representing voice listening */}
                    <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '8px',
                          animation: 'pulse-height-1 1.2s ease-in-out infinite',
                          animationDelay: '0ms',
                        }}
                      ></div>
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '16px',
                          animation: 'pulse-height-2 1.0s ease-in-out infinite',
                          animationDelay: '150ms',
                        }}
                      ></div>
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '12px',
                          animation: 'pulse-height-1 1.4s ease-in-out infinite',
                          animationDelay: '300ms',
                        }}
                      ></div>
                    </div>

                    <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '12px',
                          animation: 'pulse-height-2 1.1s ease-in-out infinite',
                          animationDelay: '200ms',
                        }}
                      ></div>
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '16px',
                          animation: 'pulse-height-1 1.3s ease-in-out infinite',
                          animationDelay: '400ms',
                        }}
                      ></div>
                      <div
                        className="w-1 bg-white rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          height: '8px',
                          animation: 'pulse-height-2 1.0s ease-in-out infinite',
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
        </div>
      </div>
    </>
  )
}
