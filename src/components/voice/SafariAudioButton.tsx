/**
 * Safari Audio Enable Button
 * A component that helps users enable audio on Safari/iOS
 */

import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSafariAudio } from '@/hooks/useSafariAudio'

interface SafariAudioButtonProps {
  className?: string
  showAlways?: boolean // Show button even when audio is available
}

export function SafariAudioButton({
  className = '',
  showAlways = false,
}: SafariAudioButtonProps) {
  const {
    status,
    enableAudio,
    isSafari,
    needsUserInteraction,
    getStatusMessage,
  } = useSafariAudio()

  // Don't show button if not Safari and audio is available (unless showAlways is true)
  if (!showAlways && (!isSafari || !needsUserInteraction)) {
    return null
  }

  const handleEnableAudio = async () => {
    const success = await enableAudio()
    if (success) {
      console.log('✅ Audio enabled for Safari')
    } else {
      console.warn('❌ Failed to enable audio for Safari')
    }
  }

  return (
    <Button
      onClick={handleEnableAudio}
      variant={needsUserInteraction ? 'default' : 'outline'}
      size="sm"
      className={`gap-2 ${className}`}
      disabled={!isSafari}
    >
      {needsUserInteraction ? (
        <>
          <VolumeX className="w-4 h-4" />
          Enable Audio
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          Audio Ready
        </>
      )}
    </Button>
  )
}

/**
 * Safari Audio Status Indicator
 * Shows current audio status with helpful messages
 */
export function SafariAudioStatus({ className = '' }: { className?: string }) {
  const { status, isSafari, getStatusMessage } = useSafariAudio()

  if (!isSafari && status.isAvailable) {
    return null // Don't show anything for non-Safari browsers with working audio
  }

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      {getStatusMessage()}
    </div>
  )
}

/**
 * Combined component with both button and status
 */
export function SafariAudioHelper({ className = '' }: { className?: string }) {
  const { isSafari, needsUserInteraction } = useSafariAudio()

  if (!isSafari) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SafariAudioButton />
      {needsUserInteraction && <SafariAudioStatus />}
    </div>
  )
}
