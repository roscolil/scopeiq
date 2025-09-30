/**
 * VoiceShazamButton - Refactored
 *
 * Simplified mobile voice input button with clean separation of concerns:
 * - Speech recognition logic: useSpeechRecognition hook
 * - Wake word integration: via window events
 * - UI/UX: This component (animations, visuals, user interaction)
 *
 * Key improvements over original:
 * - ~300 lines instead of ~1,320 lines
 * - No duplicate Android/iOS logic
 * - No conflicting timers or race conditions
 * - Clear, predictable state management
 * - Proper lifecycle with no restart loops
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface VoiceShazamButtonProps {
  /** Called when speech transcript is ready */
  onTranscript: (text: string) => void
  /** Whether parent is processing the query */
  isProcessing?: boolean
  /** Only show on mobile devices */
  isMobileOnly?: boolean
  /** Called when user clicks outside to hide */
  onHide?: () => void
}

export const VoiceShazamButton = ({
  onTranscript,
  isProcessing = false,
  isMobileOnly = true,
  onHide,
}: VoiceShazamButtonProps) => {
  const isMobileView = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)

  // Help message state
  const [showHelpMessage, setShowHelpMessage] = useState(true)
  const [helpBlockedUntilSpeechComplete, setHelpBlockedUntilSpeechComplete] =
    useState(false)

  // TTS coordination state
  const [ttsActive, setTtsActive] = useState(false)
  const ttsClearTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Speech recognition hook - all the complex logic is here
  const { state, transcript, isListening, isSubmitting, toggle } =
    useSpeechRecognition({
      onTranscript,
      silenceDuration: 1500, // 1.5 seconds of silence
      enabled: true,
      preventWakeWordConflicts: true,
    })

  // When processing starts, hide help message
  useEffect(() => {
    if (isProcessing || isSubmitting) {
      setHelpBlockedUntilSpeechComplete(true)
      setShowHelpMessage(false)
    }
  }, [isProcessing, isSubmitting])

  // Listen for TTS events to coordinate with AI responses
  useEffect(() => {
    const onSpeechStart = () => {
      setTtsActive(true)
      setShowHelpMessage(false)

      // Failsafe: auto-clear after 45s if complete event missed
      if (ttsClearTimerRef.current) clearTimeout(ttsClearTimerRef.current)
      ttsClearTimerRef.current = setTimeout(() => {
        console.warn('⏳ TTS timeout reached, auto-clearing')
        setTtsActive(false)
        ttsClearTimerRef.current = null
      }, 45000)
    }

    const onSpeechComplete = () => {
      setTtsActive(false)
      setHelpBlockedUntilSpeechComplete(false)

      if (ttsClearTimerRef.current) {
        clearTimeout(ttsClearTimerRef.current)
        ttsClearTimerRef.current = null
      }
    }

    window.addEventListener('ai:speech:start', onSpeechStart)
    window.addEventListener('ai:speech:complete', onSpeechComplete)

    return () => {
      window.removeEventListener('ai:speech:start', onSpeechStart)
      window.removeEventListener('ai:speech:complete', onSpeechComplete)

      if (ttsClearTimerRef.current) {
        clearTimeout(ttsClearTimerRef.current)
      }
    }
  }, [])

  // Auto-show help when idle, auto-hide after 10s
  useEffect(() => {
    if (
      isProcessing ||
      isSubmitting ||
      isListening ||
      helpBlockedUntilSpeechComplete ||
      ttsActive
    ) {
      return
    }

    setShowHelpMessage(true)
    const timer = setTimeout(() => setShowHelpMessage(false), 10000)

    return () => clearTimeout(timer)
  }, [
    isProcessing,
    isSubmitting,
    isListening,
    helpBlockedUntilSpeechComplete,
    ttsActive,
  ])

  // Handle wake word activation
  useEffect(() => {
    const handler = () => {
      console.log('📡 Wake word detected - activating mic')

      // Only respond if visible and not busy
      const canShow = !isMobileOnly || isMobileView
      if (!canShow || isListening || isProcessing || ttsActive) {
        console.log('⏭️ Ignoring wake word (busy or hidden)', {
          canShow,
          isListening,
          isProcessing,
          ttsActive,
        })
        return
      }

      toggle()
    }

    window.addEventListener('wakeword:activate-mic', handler)
    return () => window.removeEventListener('wakeword:activate-mic', handler)
  }, [isMobileOnly, isMobileView, isListening, isProcessing, ttsActive, toggle])

  // Handle click outside to hide
  useEffect(() => {
    if (!onHide) return

    const handleClickOutside = (event: Event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onHide()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onHide])

  // Don't render if mobile-only and we're on desktop
  if (isMobileOnly && !isMobileView) return null

  // Determine visual state
  const showProcessing = isProcessing || isSubmitting
  const showListeningVisual = isListening || state === 'processing'

  return (
    <>
      {/* Animation styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse-height-1 {
            0%, 100% { height: 8px; }
            50% { height: 20px; }
          }
          @keyframes pulse-height-2 {
            0%, 100% { height: 12px; }
            50% { height: 24px; }
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

      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center">
        {/* Help message - show when idle */}
        {showHelpMessage &&
          !isListening &&
          !isProcessing &&
          !isSubmitting &&
          !ttsActive && (
            <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <span className="text-sm font-medium">
                💤 Say "Hey Jacq" or tap mic to speak
              </span>
            </div>
          )}

        {/* Status indicator - show while active */}
        {(isListening || isProcessing || isSubmitting) && (
          <div className="px-4 py-2 rounded-full text-white shadow-2xl border border-white/20 bg-gradient-to-r from-primary to-accent ring-2 ring-white/30 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <span className="text-sm font-medium">
              {isProcessing
                ? '🧠 AI is thinking...'
                : isSubmitting
                  ? '⏳ Preparing query...'
                  : '🎤 Listening...'}
            </span>
          </div>
        )}

        {/* Transcript display */}
        {isListening && transcript && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 mb-8 max-w-[90%] shadow-xl border border-primary/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <p className="text-md text-center font-medium tracking-tight">
              {transcript}
            </p>
          </div>
        )}

        {/* Main button */}
        <div ref={containerRef}>
          <Button
            onClick={() => {
              if (!ttsActive) {
                toggle()
              } else {
                console.log('🔇 Ignoring click during TTS')
              }
            }}
            disabled={isProcessing || isSubmitting || ttsActive}
            className={cn(
              'h-[154px] w-[154px] rounded-full shadow-xl flex items-center justify-center',
              'border-4 border-background transition-all duration-300',
              showProcessing
                ? 'bg-transparent hover:bg-transparent ring-8 ring-orange-400 scale-105 !opacity-100'
                : showListeningVisual
                  ? 'bg-emerald-500 hover:bg-emerald-600 ring-8 ring-emerald-400 scale-105'
                  : 'bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95',
              showListeningVisual && 'animate-pulse shadow-2xl',
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
                  ? 'Listening... Speak now'
                  : 'Tap to start voice input'
            }
          >
            {/* Processing state background */}
            {showProcessing && (
              <>
                <div
                  className="absolute inset-0 bg-orange-600 rounded-full z-0"
                  style={{ backgroundColor: '#d97706' }}
                />
                <div className="absolute inset-0 rounded-full bg-orange-600 opacity-50 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping animation-delay-200" />
              </>
            )}

            {/* Listening state background */}
            {!showProcessing && showListeningVisual && (
              <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-40 animate-ping" />
            )}

            {/* Icon container */}
            <div
              className="flex items-center justify-center overflow-visible relative z-10"
              style={{ width: '96px', height: '96px' }}
            >
              {showProcessing ? (
                // Processing: Brain icon
                <div className="relative flex items-center justify-center">
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
                // Listening: Sound waves (no mic icon)
                <div className="relative flex items-center justify-center">
                  <div className="relative">
                    {/* Left sound waves */}
                    <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '8px',
                          animation: 'pulse-height-1 1.2s ease-in-out infinite',
                          animationDelay: '0ms',
                        }}
                      />
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '16px',
                          animation: 'pulse-height-2 1.0s ease-in-out infinite',
                          animationDelay: '150ms',
                        }}
                      />
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '12px',
                          animation: 'pulse-height-1 1.4s ease-in-out infinite',
                          animationDelay: '300ms',
                        }}
                      />
                    </div>

                    {/* Right sound waves */}
                    <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '12px',
                          animation: 'pulse-height-2 1.1s ease-in-out infinite',
                          animationDelay: '200ms',
                        }}
                      />
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '16px',
                          animation: 'pulse-height-1 1.3s ease-in-out infinite',
                          animationDelay: '400ms',
                        }}
                      />
                      <div
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '8px',
                          animation: 'pulse-height-2 1.0s ease-in-out infinite',
                          animationDelay: '550ms',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Idle: Mic icon
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
