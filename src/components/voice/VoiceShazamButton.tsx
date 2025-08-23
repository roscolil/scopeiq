import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface VoiceShazamButtonProps {
  isListening: boolean
  toggleListening: () => void
  isMobileOnly?: boolean
  showTranscript?: string
  isProcessing?: boolean
  onHide?: () => void
}

export const VoiceShazamButton = ({
  isListening,
  toggleListening,
  isMobileOnly = true,
  showTranscript,
  isProcessing = false,
  onHide,
}: VoiceShazamButtonProps) => {
  const [pulseAnimation, setPulseAnimation] = useState(false)
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  // Use the built-in mobile detection hook
  const isMobileView = useIsMobile()

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
