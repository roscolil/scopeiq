import { useCallback, useEffect, useState } from 'react'

// Centralized keys
export const WAKEWORD_ENABLED_KEY = 'wakeword.enabled'
export const WAKEWORD_CONSENT_KEY = 'wakeword.consent.v1'

export interface WakeWordPreferenceState {
  enabled: boolean
  consent: 'true' | 'declined' | 'pending'
  loading: boolean
}

/**
 * Small event name fired on window when preference changes so other components can react.
 */
export const WAKEWORD_PREF_EVENT = 'wakeword:preference-changed'

/**
 * Hook to manage wake word preference & consent centralized in settings.
 * - Reads/writes localStorage
 * - Emits window event on changes
 * - Provides helper actions
 */
export function useWakeWordPreference() {
  const [state, setState] = useState<WakeWordPreferenceState>({
    enabled: false,
    consent: 'pending',
    loading: true,
  })

  // Load from storage once
  useEffect(() => {
    try {
      const consentRaw = localStorage.getItem(WAKEWORD_CONSENT_KEY)
      const enabledRaw = localStorage.getItem(WAKEWORD_ENABLED_KEY)
      setState({
        enabled: enabledRaw === 'true',
        consent: consentRaw ? (consentRaw as 'true' | 'declined') : 'pending',
        loading: false,
      })
    } catch {
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(WAKEWORD_ENABLED_KEY, String(value))
    } catch {
      /* noop */
    }
    setState(s => ({ ...s, enabled: value }))
    window.dispatchEvent(new Event(WAKEWORD_PREF_EVENT))
  }, [])

  const acceptConsent = useCallback((autoEnable: boolean = true) => {
    try {
      localStorage.setItem(WAKEWORD_CONSENT_KEY, 'true')
      if (autoEnable) localStorage.setItem(WAKEWORD_ENABLED_KEY, 'true')
    } catch {
      /* noop */
    }
    setState(s => ({
      ...s,
      consent: 'true',
      enabled: autoEnable ? true : s.enabled,
    }))
    window.dispatchEvent(new Event(WAKEWORD_PREF_EVENT))
  }, [])

  const declineConsent = useCallback(() => {
    try {
      localStorage.setItem(WAKEWORD_CONSENT_KEY, 'declined')
      localStorage.setItem(WAKEWORD_ENABLED_KEY, 'false')
    } catch {
      /* noop */
    }
    setState(s => ({ ...s, consent: 'declined', enabled: false }))
    window.dispatchEvent(new Event(WAKEWORD_PREF_EVENT))
  }, [])

  return {
    ...state,
    setEnabled,
    acceptConsent,
    declineConsent,
  }
}

export default useWakeWordPreference
