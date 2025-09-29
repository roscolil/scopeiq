import React, { useEffect, useState, useCallback } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'
import { Button } from '@/components/ui/button'
import { Volume2 } from 'lucide-react'

interface AutoplayFallbackButtonProps {
  className?: string
  // Optional: delay (ms) before showing the button after detecting a block
  showDelayMs?: number
  // Optional: called after successful manual playback
  onManualPlaySuccess?: () => void
  // Optional: called if manual playback still fails
  onManualPlayFail?: (e: unknown) => void
}

/**
 * Displays a button to manually start deferred TTS playback if iOS/Safari autoplay was blocked.
 * It subscribes to the novaSonic autoplay blocked event and becomes visible only in that case.
 */
export const AutoplayFallbackButton: React.FC<AutoplayFallbackButtonProps> = ({
  className,
  showDelayMs = 400,
  onManualPlaySuccess,
  onManualPlayFail,
}) => {
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)

  // Subscribe to autoplay blocked events
  useEffect(() => {
    const unsubscribe = novaSonic.onAutoplayBlocked(() => {
      // Only show if there is actually something pending
      if (!novaSonic.hasPendingPlayback()) return
      if (showDelayMs > 0) {
        setTimeout(() => setVisible(true), showDelayMs)
      } else {
        setVisible(true)
      }
    })
    return unsubscribe
  }, [showDelayMs])

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      // Prevent event bubbling to avoid triggering other elements behind the button
      e.stopPropagation()
      e.preventDefault()

      setPending(true)
      try {
        const ok = await novaSonic.resumePendingAudio()
        if (ok) {
          novaSonic.clearAutoplayBlockedFlag()
          setVisible(false)
          onManualPlaySuccess?.()
        } else {
          onManualPlayFail?.(new Error('No pending audio to play'))
        }
      } catch (e) {
        onManualPlayFail?.(e)
      } finally {
        setPending(false)
      }
    },
    [onManualPlayFail, onManualPlaySuccess],
  )

  if (!visible) return null

  return (
    <div
      className={`${className} relative z-[60] pointer-events-auto`}
      style={{
        position: 'relative',
        zIndex: 60, // Higher than navbar z-50
        isolation: 'isolate', // Creates new stacking context
      }}
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={handleClick}
        className="flex items-center gap-1 animate-fade-in relative z-[60] pointer-events-auto"
        style={{
          position: 'relative',
          zIndex: 60, // Higher than navbar z-50
        }}
      >
        <Volume2 className="w-4 h-4" />
        {pending ? 'Starting…' : 'Play response'}
      </Button>
    </div>
  )
}
