import { useState, useEffect } from 'react'
import { Mic, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MicPermissionGuideProps {
  onPermissionGranted?: () => void
}

export const MicPermissionGuide = ({
  onPermissionGranted,
}: MicPermissionGuideProps) => {
  const [show, setShow] = useState(false)
  const [hasSeenGuide, setHasSeenGuide] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if user has seen this guide before
    const seen = localStorage.getItem('mic-permission-guide-seen')
    setHasSeenGuide(seen === 'true')

    // Show guide on iOS if not seen before
    if (iOS && !seen) {
      setShow(true)
    }
  }, [])

  const handleEnableMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      localStorage.setItem('mic-permission-guide-seen', 'true')
      localStorage.setItem('mic-permission-granted-once', 'true')
      setShow(false)
      onPermissionGranted?.()
    } catch (error) {
      console.error('Microphone permission denied:', error)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('mic-permission-guide-seen', 'true')
    setShow(false)
  }

  if (!show || !isIOS) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-emerald-500" />
            Enable Voice Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">iOS Safari Security Notice</p>
              <p className="text-blue-700">
                Due to iOS privacy features, you'll need to grant microphone
                access <strong>each time</strong> you reload the page or return
                to the app.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              To use voice features like "Hey Jacq" wake word and voice queries:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Tap "Enable Microphone" below</li>
              <li>Tap "Allow" when Safari asks for permission</li>
              <li>You're ready to use voice features!</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <strong>Remember:</strong> You'll need to enable this again after
              closing Safari or reloading the page. This is an iOS security
              feature we cannot bypass.
            </p>
          </div>

          <Button
            onClick={handleEnableMic}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            size="lg"
          >
            <Mic className="mr-2 h-5 w-5" />
            Enable Microphone
          </Button>

          <button
            onClick={handleDismiss}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
