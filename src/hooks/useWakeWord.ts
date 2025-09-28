import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useWakeWord
 * Passive hotword ("Hey Jacq") detection built on top of Web SpeechRecognition.
 * Designed to coexist with primary dictation components (VoiceInput / VoiceShazamButton)
 * without interfering: it suspends when main recognition runs and resumes afterwards.
 */

export type WakeWordState =
  | 'idle' // Not started yet (pre-consent or disabled)
  | 'listening' // Actively listening for wake phrase
  | 'cooldown' // Recently triggered, cooling down
  | 'suspended' // Temporarily paused (e.g., primary dictation active, page hidden)
  | 'error'
  | 'unsupported' // Not supported on this device/browser

interface UseWakeWordOptions {
  /** Whether the user has enabled wake word preference */
  enabled: boolean
  /** Fire when wake word detected */
  onWake: () => void
  /** Optional external signal that main dictation is active; we suspend in that case */
  isDictationActive?: boolean
  /** Cooldown (ms) after a successful trigger before listening resumes */
  cooldownMs?: number
  /** Minimum time (ms) before we can trigger again (guards rapid fire) */
  minIntervalMs?: number
  /** Custom phrases allowed (first item treated as canonical) */
  phrases?: string[]
  /** Levenshtein distance threshold for fuzzy match (0 exact, higher = more tolerant) */
  maxDistance?: number
  /** Defer auto-start until a user interaction has happened (click/keydown) */
  requireUserInteraction?: boolean
  /** If true, auto-start once constraints satisfied */
  autoStart?: boolean
  /** Optional logger */
  debug?: boolean
  /** Optional watchdog interval (ms). If provided, periodically ensures listener is active when it should be. */
  watchdogIntervalMs?: number
}

interface UseWakeWordReturn {
  state: WakeWordState
  error: string | null
  enable: () => void
  disable: () => void
  /** Manual suspend (will auto-resume if enable called again and constraints satisfied) */
  suspend: () => void
  resume: () => void
  /** Whether underlying SpeechRecognition has mic permission */
  hasPermission: boolean | null
  /** Last raw snippet processed (for debugging) */
  lastChunk: string
  /** Whether wake word is supported on this device */
  isSupported: boolean
  /** Device type detection */
  deviceInfo: {
    isAndroid: boolean
    isMobile: boolean
    isIOS: boolean
    browser: string
  }
}

// Lightweight Levenshtein distance implementation
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const v0 = new Array(b.length + 1).fill(0)
  const v1 = new Array(b.length + 1).fill(0)
  for (let i = 0; i < v0.length; i++) v0[i] = i
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j]
  }
  return v0[b.length]
}

const DEFAULT_PHRASES = [
  'hey jacq',
  'hey jack',
  'hay jack',
  'hey jac',
  'hey jak',
  'hey jake',
]

// Device detection utilities
function getDeviceInfo() {
  const userAgent = navigator.userAgent
  const isAndroid = /Android/i.test(userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isMobile = /Mobi|Android/i.test(userAgent)

  let browser = 'unknown'
  if (userAgent.includes('Chrome')) browser = 'chrome'
  else if (userAgent.includes('Firefox')) browser = 'firefox'
  else if (userAgent.includes('Safari')) browser = 'safari'
  else if (userAgent.includes('Edge')) browser = 'edge'

  return { isAndroid, isIOS, isMobile, browser }
}

// Check if wake word is supported on this device
function isWakeWordSupported(): boolean {
  const deviceInfo = getDeviceInfo()

  // Check for SpeechRecognition API support
  const hasSpeechRecognition =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

  if (!hasSpeechRecognition) return false

  // Android Chrome has known issues with continuous listening
  if (deviceInfo.isAndroid && deviceInfo.browser === 'chrome') {
    return false
  }

  // iOS Safari has restrictions
  if (deviceInfo.isIOS && deviceInfo.browser === 'safari') {
    return false
  }

  return true
}

export function useWakeWord(options: UseWakeWordOptions): UseWakeWordReturn {
  const {
    enabled,
    onWake,
    isDictationActive = false,
    cooldownMs = 4000,
    minIntervalMs = 2500,
    phrases = DEFAULT_PHRASES,
    maxDistance = 2,
    requireUserInteraction = true,
    autoStart = true,
    debug = false,
  } = options

  const watchdogIntervalMs = options.watchdogIntervalMs ?? 7000

  // Device detection
  const deviceInfo = getDeviceInfo()
  const isSupported = isWakeWordSupported()

  const [state, setState] = useState<WakeWordState>(
    isSupported ? 'idle' : 'unsupported',
  )
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [active, setActive] = useState(false) // internal active flag (enabled + started)
  const [lastChunk, setLastChunk] = useState('')
  // Persist a flag indicating we have previously started successfully (to allow auto-start after refresh)
  const PERSIST_KEY = 'wakeword.permission.granted'
  useEffect(() => {
    try {
      if (hasPermission && typeof window !== 'undefined') {
        localStorage.setItem(PERSIST_KEY, 'true')
      }
    } catch {
      /* noop */
    }
  }, [hasPermission])
  const priorPermissionGranted =
    typeof window !== 'undefined' &&
    localStorage.getItem(PERSIST_KEY) === 'true'
  const prevEnabledRef = useRef<boolean>(enabled)

  // Minimal typing for recognition to avoid lib conflicts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any | null>(null)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)
  const restartRef = useRef<NodeJS.Timeout | null>(null)
  const lastTriggerTimeRef = useRef<number>(0)
  const userInteractedRef = useRef<boolean>(false)
  const manuallySuspendedRef = useRef<boolean>(false)
  const visibilityListenerAddedRef = useRef<boolean>(false)

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) console.log('[wakeword]', ...args)
    },
    [debug],
  )

  // Utility: clear timers
  const clearTimers = () => {
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current)
      cooldownRef.current = null
    }
    if (restartRef.current) {
      clearTimeout(restartRef.current)
      restartRef.current = null
    }
  }

  // Stop recognition safely
  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      rec.stop()
    } catch (e) {
      log('Error stopping recognition', e)
    }
    // Force re-creation on next start to avoid stale internal state after long TTS / stop cycles
    recognitionRef.current = null
  }, [log])

  // Internal suspend helper (declared early for dependency ordering)
  const internalSuspend = useCallback(
    (manual: boolean) => {
      stopRecognition()
      clearTimers()
      if (manual) manuallySuspendedRef.current = true
      setState('suspended')
      setActive(false)
    },
    [stopRecognition],
  )

  // Track basic user interaction
  useEffect(() => {
    if (!requireUserInteraction || userInteractedRef.current) return
    const mark = () => {
      userInteractedRef.current = true
      log('User interaction registered')
      if (enabled && autoStart) {
        attemptStartRef.current()
      }
    }
    window.addEventListener('pointerdown', mark, { once: true })
    window.addEventListener('keydown', mark, { once: true })
    return () => {
      window.removeEventListener('pointerdown', mark)
      window.removeEventListener('keydown', mark)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, autoStart, requireUserInteraction])

  // Visibility change handling
  // Visibility handling
  useEffect(() => {
    if (!visibilityListenerAddedRef.current) {
      const handler = () => {
        if (document.hidden) {
          log('Page hidden -> suspending wake listener')
          internalSuspend(false)
        } else {
          log('Page visible -> maybe resume')
          if (enabled && !isDictationActive && !manuallySuspendedRef.current) {
            attemptStartRef.current()
          }
        }
      }
      document.addEventListener('visibilitychange', handler)
      visibilityListenerAddedRef.current = true
    }
  }, [enabled, internalSuspend, isDictationActive, log])

  const enterCooldown = useCallback(() => {
    setState('cooldown')
    cooldownRef.current = setTimeout(() => {
      cooldownRef.current = null
      if (enabled && !isDictationActive && !manuallySuspendedRef.current) {
        attemptStartRef.current()
      } else {
        setState('idle')
      }
    }, cooldownMs)
  }, [cooldownMs, enabled, isDictationActive])

  // Early rearm after AI speech completes (put system back into 'waiting to wake')
  useEffect(() => {
    const handler = () => {
      log(
        'Received ai:speech:complete -> considering early wake listener rearm',
      )
      if (!enabled) return
      if (isDictationActive) return
      if (manuallySuspendedRef.current) return
      // If currently cooling down, shorten it
      if (state === 'cooldown') {
        if (cooldownRef.current) {
          clearTimeout(cooldownRef.current)
          cooldownRef.current = null
        }
        log('Bypassing remaining cooldown after speech completion')
        attemptStartRef.current()
        return
      }
      if (state === 'idle' || state === 'suspended' || state === 'error') {
        attemptStartRef.current()
      }
    }
    window.addEventListener('ai:speech:complete', handler)
    return () => window.removeEventListener('ai:speech:complete', handler)
  }, [enabled, isDictationActive, state, log])

  const evaluateChunk = useCallback(
    (text: string) => {
      const lower = text.toLowerCase().trim()
      if (!lower) return false
      // Only keep last ~40 chars to focus on tail
      const tail = lower.slice(-40)
      // Tokenize into words, examine last 5
      const tokens = tail.split(/[^a-z0-9]+/).filter(Boolean)
      const windowTokens = tokens.slice(-5)
      const windowStr = windowTokens.join(' ')
      for (const phrase of phrases) {
        const distance = levenshtein(windowStr, phrase)
        if (distance <= maxDistance) {
          log('Fuzzy match window vs phrase', { windowStr, phrase, distance })
          return true
        }
        // Also check suffixes containing last 2-3 tokens
        if (windowTokens.length >= 2) {
          const last2 = windowTokens.slice(-2).join(' ')
          if (levenshtein(last2, phrase) <= maxDistance) return true
        }
        if (windowTokens.length >= 3) {
          const last3 = windowTokens.slice(-3).join(' ')
          if (levenshtein(last3, phrase) <= maxDistance) return true
        }
      }
      return false
    },
    [phrases, maxDistance, log],
  )

  const handleWake = useCallback(() => {
    const now = Date.now()
    if (now - lastTriggerTimeRef.current < minIntervalMs) {
      log('Ignoring wake due to min interval')
      return
    }
    lastTriggerTimeRef.current = now
    log('Wake phrase detected -> triggering onWake')
    try {
      onWake()
    } catch (e) {
      log('onWake handler threw', e)
    }
    stopRecognition()
    enterCooldown()
  }, [enterCooldown, log, minIntervalMs, onWake, stopRecognition])

  // Restart scheduling (uses ref to attemptStart)
  const scheduleRestart = useCallback(() => {
    if (restartRef.current) return
    if (!enabled || isDictationActive || manuallySuspendedRef.current) return
    restartRef.current = setTimeout(
      () => {
        restartRef.current = null
        attemptStartRef.current()
      },
      600 + Math.random() * 400,
    )
  }, [enabled, isDictationActive])

  const setupRecognition = useCallback(() => {
    if (!isSupported) {
      setError('Wake word not supported on this device')
      setState('unsupported')
      return
    }

    if (
      !('SpeechRecognition' in window) &&
      !('webkitSpeechRecognition' in window)
    ) {
      setError('SpeechRecognition API not supported')
      setState('error')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: any =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()

    // Configure based on device capabilities
    if (deviceInfo.isAndroid) {
      // Android has issues with continuous listening, use shorter sessions
      rec.continuous = false
      rec.interimResults = false
      log('Android detected: using non-continuous mode')
    } else {
      rec.continuous = true
      rec.interimResults = true
    }

    rec.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = event.results
      const idx = event.resultIndex
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = results[idx]
      const snippet = result[0]?.transcript || ''
      if (snippet) {
        setLastChunk(snippet)
        if (evaluateChunk(snippet)) {
          handleWake()
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      log('wake recognition error', e)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setHasPermission(false)
      }
      setError(e.error || 'error')
      setState('error')
      if (e.error !== 'not-allowed') {
        scheduleRestart()
      }
    }
    rec.onend = () => {
      log('wake recognition ended')
      if (state === 'listening') {
        // For Android, use shorter restart delay since continuous mode is disabled
        if (deviceInfo.isAndroid) {
          setTimeout(() => {
            if (
              enabled &&
              !isDictationActive &&
              !manuallySuspendedRef.current
            ) {
              attemptStartRef.current()
            }
          }, 1000)
        } else {
          scheduleRestart()
        }
      }
    }
    recognitionRef.current = rec
  }, [
    evaluateChunk,
    handleWake,
    log,
    scheduleRestart,
    state,
    deviceInfo.isAndroid,
    enabled,
    isDictationActive,
  ])

  // attemptStart implemented via ref to avoid cyclic dependencies
  const attemptStartRef = useRef<() => void>(() => undefined)

  const attemptStart = useCallback(() => {
    if (!isSupported) {
      log('Not starting (not supported on this device)')
      return
    }
    if (!enabled) {
      log('Not starting (disabled)')
      return
    }
    if (isDictationActive) {
      log('Not starting (dictation active)')
      return
    }
    if (manuallySuspendedRef.current) {
      log('Not starting (manually suspended)')
      return
    }
    if (requireUserInteraction && !userInteractedRef.current) {
      // Allow bypass if we've previously had permission & user enabled
      if (!priorPermissionGranted) {
        log('Waiting for user interaction before starting')
        return
      } else {
        log('Bypassing user interaction gate (prior permission)')
      }
    }
    if (document.hidden) {
      log('Page hidden - delaying start')
      return
    }
    if (!recognitionRef.current) {
      setupRecognition()
    }
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.start()
      setState('listening')
      setActive(true)
      setError(null)
      log('Wake listener started')
      setHasPermission(true)
    } catch (e) {
      log('Start error', e)
      setError((e as Error).message)
      setState('error')
    }
  }, [
    isSupported,
    enabled,
    isDictationActive,
    log,
    requireUserInteraction,
    setupRecognition,
    priorPermissionGranted,
  ])
  attemptStartRef.current = attemptStart

  // React to enabled or dictation changes
  useEffect(() => {
    if (!enabled) {
      stopRecognition()
      clearTimers()
      setState(isSupported ? 'idle' : 'unsupported')
      setActive(false)
      return
    }
    if (enabled && !isDictationActive && autoStart && isSupported) {
      attemptStartRef.current()
    } else if (isDictationActive && state === 'listening') {
      log('Dictation activated -> suspend wake listener')
      internalSuspend(false)
    }
  }, [
    autoStart,
    enabled,
    internalSuspend,
    isDictationActive,
    log,
    state,
    stopRecognition,
    isSupported,
  ])

  // Detect transition from disabled -> enabled to ensure restart even if other effect paths were skipped
  useEffect(() => {
    if (!prevEnabledRef.current && enabled && isSupported) {
      log('Enabled toggled on -> forcing wake listener start')
      attemptStartRef.current()
    }
    prevEnabledRef.current = enabled
  }, [enabled, log, isSupported])

  const enable = useCallback(() => {
    if (enabled && isSupported) {
      attemptStartRef.current()
    }
  }, [enabled, isSupported])

  const disable = useCallback(() => {
    manuallySuspendedRef.current = false
    stopRecognition()
    clearTimers()
    setState(isSupported ? 'idle' : 'unsupported')
    setActive(false)
  }, [stopRecognition, isSupported])

  const suspend = useCallback(() => internalSuspend(true), [internalSuspend])
  const resume = useCallback(() => {
    if (!enabled || !isSupported) return
    manuallySuspendedRef.current = false
    attemptStartRef.current()
  }, [enabled, isSupported])

  // Cleanup
  useEffect(() => {
    return () => {
      stopRecognition()
      clearTimers()
    }
  }, [stopRecognition])

  // Resilience watchdog: periodically verify that if we are enabled & should be listening, we are.
  useEffect(() => {
    if (!enabled || !isSupported) return
    if (watchdogIntervalMs <= 0) return
    const id = setInterval(() => {
      try {
        // Conditions under which we expect to be actively listening
        if (
          enabled &&
          !isDictationActive &&
          !manuallySuspendedRef.current &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible' &&
          state !== 'listening'
        ) {
          // Avoid interfering if currently in cooldown (let cooldown finish)
          if (state === 'cooldown') return
          // Attempt restart
          log('Watchdog attempting restart (state=', state, ')')
          attemptStartRef.current()
          try {
            window.dispatchEvent(new CustomEvent('wakeword:watchdog-restart'))
          } catch {
            /* noop */
          }
        }
      } catch (e) {
        log('Watchdog iteration error', e)
      }
    }, watchdogIntervalMs)
    return () => clearInterval(id)
  }, [enabled, isDictationActive, state, watchdogIntervalMs, log, isSupported])

  return {
    state,
    error,
    enable,
    disable,
    suspend,
    resume,
    hasPermission,
    lastChunk,
    isSupported,
    deviceInfo,
  }
}

export default useWakeWord
