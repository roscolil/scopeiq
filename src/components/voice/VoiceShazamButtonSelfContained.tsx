import { useState, useEffect, useRef } from 'react'
import { Mic, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface VoiceShazamButtonProps {
  isListening?: boolean
  toggleListening?: () => void
  isMobileOnly?: boolean
  showTranscript?: string
  isProcessing?: boolean
  onHide?: () => void
  onTranscript?: (text: string) => void // For passing transcript to parent
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

export const VoiceShazamButton = ({
  isMobileOnly = true,
  showTranscript,
  isProcessing = false,
  onHide,
  onTranscript,
}: VoiceShazamButtonProps) => {
  console.log('🎯 VoiceShazamButtonSelfContained rendered', { isProcessing })
  const [pulseAnimation, setPulseAnimation] = useState(false)
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobileView = useIsMobile()

  // SELF-CONTAINED SAFARI VOICE LOGIC (from working SafariVoiceDebug)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState('Ready')
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(
    null,
  )
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const [hasTranscript, setHasTranscript] = useState(false)

  // Initialize speech recognition (EXACT COPY from SafariVoiceDebug)
  useEffect(() => {
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

        // Safari mobile detection (EXACT COPY from SafariVoiceDebug)
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        )
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

        console.log('🍎 Browser detection:', {
          isSafari,
          isMobile,
          userAgent: navigator.userAgent,
        })

        if (isSafari && isMobile) {
          // Safari mobile configuration - enable interim results for silence detection
          recognitionInstance.continuous = true // Changed to true for better silence detection
          recognitionInstance.interimResults = true // Enable interim results
          recognitionInstance.lang = 'en-US'
          console.log('🍎 Configured for Safari mobile with interim results')
        } else {
          // Standard configuration
          recognitionInstance.continuous = true
          recognitionInstance.interimResults = true
          recognitionInstance.lang = 'en-US'
          console.log('🎤 Configured for standard browser')
        }

        // Event handlers (EXACT COPY from SafariVoiceDebug)
        recognitionInstance.onstart = () => {
          console.log('✅ Speech recognition started')
          setStatus('Listening...')
        }

        recognitionInstance.onend = () => {
          console.log('⏹️ Speech recognition ended')
          setStatus('Stopped')
          setIsListening(false)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error)
          setStatus(`Error: ${event.error}`)
          setIsListening(false)
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
                console.log(
                  '⏰ Silence detected, auto-submitting:',
                  trimmedTranscript,
                )
                setStatus('Got result!')
                setIsListening(false)

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
  }, [onTranscript]) // Only depend on onTranscript - not on state variables

  // Cleanup silence timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
    }
  }, [silenceTimer])

  // Toggle listening function (EXACT COPY from SafariVoiceDebug)
  const toggleListening = async () => {
    console.log('🎯 toggleListening called', {
      recognition: !!recognition,
      isListening,
    })
    if (!recognition) {
      console.error('❌ No recognition instance')
      return
    }

    if (isListening) {
      console.log('🛑 Stopping recognition...')
      recognition.stop()
      setIsListening(false)
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
      setSilenceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })

      // Safari mobile - request permissions first (EXACT COPY from SafariVoiceDebug)
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
              setIsListening(true)
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
          setIsListening(true)
          setStatus('Starting...')
        } catch (error) {
          console.error('❌ Start error:', error)
          setStatus(`Start error: ${error}`)
        }
      }
    }
  }

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
            🎤 Tap to speak • 2s silence auto-submits
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
            onClick={() => {
              console.log('🎯 Button clicked!')
              toggleListening()
            }}
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
