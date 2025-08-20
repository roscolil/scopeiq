import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
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

  // Start pulse animation when listening or show initial pulse animation
  useEffect(() => {
    if (isListening) {
      setPulseAnimation(true)
    } else {
      setPulseAnimation(false)
    }

    // Add a subtle attention-grabbing pulse on first render
    const initialPulse = setTimeout(() => {
      setPulseAnimation(true)
      setTimeout(() => setPulseAnimation(false), 1500)
    }, 500)

    return () => clearTimeout(initialPulse)
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
    <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center VoiceShazamButton">
      {/* Help message */}
      {showHelpMessage && !isListening && (
        <div className="bg-black/80 text-white text-sm px-4 py-2 rounded-full mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
          🎤 Tap to speak • Auto-submits after silence
        </div>
      )}

      {/* Listening instruction */}
      {isListening && (
        <div className="bg-primary/80 text-white text-sm px-4 py-2 rounded-full mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          🔴 Listening... Speak your query
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
            pulseAnimation
              ? 'animate-pulse bg-primary shadow-primary/30'
              : 'bg-primary',
            isListening
              ? 'ring-8 ring-primary/50 scale-115 transition-all duration-300'
              : 'hover:scale-110 active:scale-95 transition-all duration-200',
            'border-4 border-background',
          )}
          style={{
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
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
          <div
            className={cn(
              'absolute inset-0 bg-primary rounded-full opacity-20',
              pulseAnimation ? 'animate-ping' : 'hidden',
            )}
          />
          <div
            className="flex items-center justify-center overflow-visible"
            style={{ width: '96px', height: '96px' }}
          >
            {isProcessing ? (
              <Loader2
                className="text-white animate-spin"
                strokeWidth={2}
                width="100%"
                height="100%"
                style={{ transform: 'scale(1.25)' }}
              />
            ) : isListening ? (
              <Mic
                className="text-white animate-pulse"
                strokeWidth={1.5}
                width="100%"
                height="100%"
                style={{ transform: 'scale(3)' }}
              />
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
  )
}
