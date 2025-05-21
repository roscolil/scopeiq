import { useEffect, useState } from 'react'

// Helper to detect iOS Safari
type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function isIos() {
  const nav = window.navigator as NavigatorWithStandalone
  return (
    /iphone|ipad|ipod/i.test(nav.userAgent) &&
    /safari/i.test(nav.userAgent) &&
    !nav.standalone
  )
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  )
}

export const AddToHomeScreen = () => {
  // Type for BeforeInstallPromptEvent, since it's not in the standard TypeScript DOM lib
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIosBanner, setShowIosBanner] = useState(false)

  useEffect(() => {
    // Only show if not already installed
    if (isInStandaloneMode()) return

    // Detect iOS Safari and show instructions
    if (isIos()) {
      setShowIosBanner(true)
      return
    }

    // Listen for the Android/Chrome install prompt
    // Type for BeforeInstallPromptEvent, since it's not in the standard TypeScript DOM lib
    interface BeforeInstallPromptEvent extends Event {
      prompt: () => Promise<void>
      userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
      }>
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstall(false)
      setDeferredPrompt(null)
    }
  }

  // iOS "share" SVG icon
  const shareIcon = (
    <svg
      className="inline h-5 w-5 mb-1"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M10 2a1 1 0 011 1v7h3.586l-4.293 4.293a1 1 0 01-1.414 0L4.586 10H8V3a1 1 0 012-1zM4 17a2 2 0 01-2-2v-2a1 1 0 112 0v2h12v-2a1 1 0 112 0v2a2 2 0 01-2 2H4z" />
    </svg>
  )

  // iOS banner instructions
  if (showIosBanner) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-xl px-4 py-3 flex items-center gap-2 z-50 max-w-md">
        <span className="font-semibold">Add to Home Screen:</span>
        <span>
          Tap {shareIcon} then <b>Add to Home Screen</b>
        </span>
        <button
          onClick={() => setShowIosBanner(false)}
          className="ml-2 text-gray-500 hover:text-black font-bold"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  // Android/Chrome install button
  if (showInstall) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-xl px-4 py-3 flex items-center gap-2 z-50 max-w-md">
        <button
          onClick={handleInstallClick}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-blue-700 transition"
        >
          Add to Home Screen
        </button>
        <button
          onClick={() => setShowInstall(false)}
          className="ml-2 text-gray-500 hover:text-black font-bold"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  // Nothing to show (already installed or not eligible)
  return null
}
