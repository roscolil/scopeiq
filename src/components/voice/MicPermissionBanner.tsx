import { useState, useEffect } from 'react'
import { Mic, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MicPermissionBannerProps {
  onPermissionGranted?: () => void
  className?: string
}

export const MicPermissionBanner = ({
  onPermissionGranted,
  className = '',
}: MicPermissionBannerProps) => {
  const [show, setShow] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (!isIOS) return

      // Check if user has granted permission before
      const hasGrantedBefore = localStorage.getItem(
        'mic-permission-granted-once',
      )
      if (!hasGrantedBefore) return

      // Check current permission status
      try {
        const status = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        })

        // Show banner if permission was granted before but is now denied/prompt
        if (status.state === 'prompt' || status.state === 'denied') {
          setShow(true)
        }

        // Listen for permission changes
        status.onchange = () => {
          if (status.state === 'granted') {
            setShow(false)
          }
        }
      } catch {
        // Permissions API not supported, check if getUserMedia fails
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          stream.getTracks().forEach(track => track.stop())
          setShow(false)
        } catch {
          setShow(true)
        }
      }
    }

    checkPermissions()
  }, [])

  const handleEnableMic = async () => {
    setIsRequesting(true)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      localStorage.setItem('mic-permission-granted-once', 'true')
      setShow(false)
      onPermissionGranted?.()
    } catch (error) {
      console.error('Microphone permission denied:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    // Remember dismissal for this session only
    sessionStorage.setItem('mic-banner-dismissed', 'true')
  }

  if (!show || sessionStorage.getItem('mic-banner-dismissed')) return null

  return (
    <div className={`fixed top-16 left-0 right-0 z-40 ${className}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg shadow-lg p-4 flex items-center gap-4 animate-slide-down">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              Voice features need microphone access
            </p>
            <p className="text-xs text-white/90 mt-0.5">
              iOS requires you to re-enable each session for security
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleEnableMic}
              disabled={isRequesting}
              size="sm"
              className="bg-white text-emerald-600 hover:bg-white/90 shadow-md"
            >
              <Mic className="mr-1.5 h-4 w-4" />
              {isRequesting ? 'Enabling...' : 'Enable'}
            </Button>

            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
