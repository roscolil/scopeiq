import { useEffect, useState } from 'react'
/**
 * DEPRECATED: WakeWordIndicator has been replaced by centralized Settings > Voice controls
 * and an inline passive status pill inside AIActions. This component is retained temporarily
 * for reference and can be removed once migration is confirmed stable.
 */
import useWakeWord, { WakeWordState } from '@/hooks/useWakeWord'
import { cn } from '@/lib/utils'

interface WakeWordIndicatorProps {
  /** Main dictation active? (suspends wake listener) */
  isDictationActive: boolean
  /** Callback invoked to initiate primary dictation when wake phrase detected */
  onWakeActivate: () => void
  /** Local storage key for preference */
  preferenceKey?: string
  /** Optional className for container */
  className?: string
  /** If true, start in enabled state if preference absent (after consent) */
  defaultEnabled?: boolean
  /** Show debug text */
  debug?: boolean
}

const PREF_KEY_FALLBACK = 'wakeword.enabled'
const CONSENT_KEY = 'wakeword.consent.v1'

// One-time lightweight consent banner
function ConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[300] max-w-xs rounded-md border border-border bg-background/95 backdrop-blur p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <p className="text-sm font-medium mb-2">Enable hands-free "Hey Jacq"?</p>
      <p className="text-xs text-muted-foreground mb-3 leading-snug">
        Allows passive wake word listening while this tab is active. Microphone
        use stops when you start dictation or leave the tab.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onDecline}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50"
        >
          Not now
        </button>
        <button
          onClick={onAccept}
          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Enable
        </button>
      </div>
    </div>
  )
}

// Small pulsing dot indicator
function StatusDot({ state }: { state: WakeWordState }) {
  let color = 'bg-muted'
  if (state === 'listening') color = 'bg-emerald-500 animate-pulse'
  else if (state === 'cooldown') color = 'bg-amber-500 animate-pulse'
  else if (state === 'suspended') color = 'bg-gray-400'
  else if (state === 'error') color = 'bg-red-500'
  else if (state === 'unsupported') color = 'bg-orange-500'
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full transition-colors',
        color,
      )}
    />
  )
}

export function WakeWordIndicator({
  isDictationActive,
  onWakeActivate,
  preferenceKey = PREF_KEY_FALLBACK,
  className,
  defaultEnabled = true,
  debug = false,
}: WakeWordIndicatorProps) {
  const [enabledPreference, setEnabledPreference] = useState<boolean>(false)
  const [hasLoadedPref, setHasLoadedPref] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  // Load preference & consent
  useEffect(() => {
    try {
      const raw = localStorage.getItem(preferenceKey)
      const consent = localStorage.getItem(CONSENT_KEY)
      if (!consent) {
        setShowConsent(true)
      }
      if (raw === null) {
        setEnabledPreference(false) // start disabled until consent
      } else {
        setEnabledPreference(raw === 'true')
      }
    } catch (e) {
      if (debug) console.warn('wakeword pref load error', e)
    } finally {
      setHasLoadedPref(true)
    }
  }, [preferenceKey, debug])

  const wake = useWakeWord({
    enabled: enabledPreference,
    onWake: () => {
      onWakeActivate()
    },
    isDictationActive,
    debug,
    autoStart: true,
    requireUserInteraction: true,
  })

  // Accept consent
  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true')
      const final = defaultEnabled
      localStorage.setItem(preferenceKey, String(final))
      setEnabledPreference(final)
    } catch (e) {
      if (debug) console.warn('consent save error', e)
    }
    setShowConsent(false)
  }

  // Decline consent
  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined')
      localStorage.setItem(preferenceKey, 'false')
    } catch {
      /* noop */
    }
    setEnabledPreference(false)
    setShowConsent(false)
  }

  // Toggle via context menu (simple long-press/ctrl-click pattern can be added later)
  const handleQuickToggle = () => {
    const next = !enabledPreference
    setEnabledPreference(next)
    try {
      localStorage.setItem(preferenceKey, String(next))
    } catch {
      /* noop */
    }
  }

  // Hide everything until pref is loaded (avoid flicker)
  if (!hasLoadedPref) return null

  return (
    <>
      {showConsent && (
        <ConsentBanner onAccept={handleAccept} onDecline={handleDecline} />
      )}
      {/* Indicator (only render if consented or enabled) */}
      {!showConsent && (
        <div
          className={cn(
            'fixed bottom-3 left-3 z-[250] select-none rounded-full border border-border bg-background/90 backdrop-blur px-3 py-1.5 shadow-sm text-xs font-medium flex items-center gap-2 cursor-pointer hover:bg-muted/60 transition-colors',
            className,
          )}
          role="status"
          aria-label={`Wake word ${wake.state}`}
          onClick={handleQuickToggle}
          title={
            wake.state === 'unsupported'
              ? 'Wake word not supported on this device'
              : enabledPreference
                ? `Hands-free active (${wake.state}). Click to disable.`
                : 'Hands-free disabled. Click to enable.'
          }
        >
          <StatusDot state={wake.state} />
          {wake.state === 'unsupported' ? (
            <span className="hidden md:inline text-muted-foreground">
              Not supported
            </span>
          ) : enabledPreference ? (
            <span className="hidden md:inline">Hey Jacq</span>
          ) : (
            <span className="hidden md:inline text-muted-foreground">
              Hands-free off
            </span>
          )}
        </div>
      )}
    </>
  )
}

export default WakeWordIndicator
