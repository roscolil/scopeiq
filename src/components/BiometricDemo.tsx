import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MobileBiometricLogin } from '@/components/MobileBiometricLogin'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  hasBiometricCredentials,
  removeAllBiometricCredentials,
} from '@/services/biometric-cognito'
import {
  Smartphone,
  Fingerprint,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Info,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/**
 * BiometricDemo - A demonstration component showing biometric authentication capabilities
 * This component helps developers and users understand the biometric feature status
 */
export const BiometricDemo: React.FC = () => {
  const isMobile = useIsMobile()
  const [biometricStatus, setBiometricStatus] = useState({
    isSupported: false,
    isPlatformAvailable: false,
    hasCredentials: false,
    loading: true,
  })

  useEffect(() => {
    checkBiometricStatus()
  }, [])

  const checkBiometricStatus = async () => {
    setBiometricStatus(prev => ({ ...prev, loading: true }))

    try {
      const isSupported = isBiometricSupported()
      const isPlatformAvailable = await isPlatformAuthenticatorAvailable()
      const hasCredentials = hasBiometricCredentials()

      setBiometricStatus({
        isSupported,
        isPlatformAvailable,
        hasCredentials,
        loading: false,
      })
    } catch (error) {
      console.error('Error checking biometric status:', error)
      setBiometricStatus(prev => ({ ...prev, loading: false }))
    }
  }

  const handleClearCredentials = async () => {
    try {
      const success = removeAllBiometricCredentials()
      if (success) {
        toast({
          title: 'Credentials cleared',
          description:
            'All biometric credentials have been removed from this device.',
        })
        checkBiometricStatus()
      } else {
        toast({
          title: 'Failed to clear credentials',
          description: 'There was an error removing biometric credentials.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  }

  const getDeviceStatusIcon = () => {
    if (biometricStatus.loading)
      return <Smartphone className="h-5 w-5 animate-pulse" />
    if (!biometricStatus.isSupported)
      return <XCircle className="h-5 w-5 text-red-500" />
    if (!biometricStatus.isPlatformAvailable)
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <CheckCircle className="h-5 w-5 text-green-500" />
  }

  const getDeviceStatusText = () => {
    if (biometricStatus.loading) return 'Checking device capabilities...'
    if (!biometricStatus.isSupported)
      return 'WebAuthn not supported in this browser'
    if (!biometricStatus.isPlatformAvailable)
      return 'No biometric hardware detected'
    return 'Biometric authentication available'
  }

  const getCredentialStatusBadge = () => {
    if (biometricStatus.hasCredentials) {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Credentials Stored
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-gray-600">
        <XCircle className="h-3 w-3 mr-1" />
        No Credentials
      </Badge>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-blue-600" />
            Biometric Authentication Demo
          </CardTitle>
          <CardDescription>
            Test and explore the biometric login feature on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Status */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Device Status
            </h4>
            <div className="flex items-center gap-2 text-sm">
              {getDeviceStatusIcon()}
              <span>{getDeviceStatusText()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMobile ? 'default' : 'outline'}>
                {isMobile ? 'Mobile Device' : 'Desktop Device'}
              </Badge>
              {getCredentialStatusBadge()}
            </div>
          </div>

          <Separator />

          {/* Biometric Component */}
          {biometricStatus.isSupported &&
          biometricStatus.isPlatformAvailable ? (
            <div className="space-y-3">
              <h4 className="font-medium">Try Biometric Authentication</h4>
              <MobileBiometricLogin
                onSetupSuccess={() => {
                  checkBiometricStatus()
                  toast({
                    title: 'Setup successful!',
                    description:
                      'Biometric login is now available on this device.',
                  })
                }}
                onLoginSuccess={() => {
                  toast({
                    title: 'Authentication successful!',
                    description: 'Biometric login worked perfectly.',
                  })
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-600">
                Biometric Authentication Unavailable
              </h4>
              <div className="text-sm text-gray-500 space-y-1">
                {!biometricStatus.isSupported && (
                  <p>• Your browser doesn't support WebAuthn</p>
                )}
                {biometricStatus.isSupported &&
                  !biometricStatus.isPlatformAvailable && (
                    <p>• Your device doesn't have biometric hardware</p>
                  )}
                {!isMobile && (
                  <p>• This feature is optimized for mobile devices</p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Developer Tools */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Developer Tools
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkBiometricStatus}
                className="w-full"
              >
                Refresh Status
              </Button>
              {biometricStatus.hasCredentials && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCredentials}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Stored Credentials
                </Button>
              )}
            </div>
          </div>

          {/* Status Details */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p>
              <strong>Browser Support:</strong>{' '}
              {biometricStatus.isSupported ? '✅' : '❌'}
            </p>
            <p>
              <strong>Platform Authenticator:</strong>{' '}
              {biometricStatus.isPlatformAvailable ? '✅' : '❌'}
            </p>
            <p>
              <strong>Mobile Device:</strong> {isMobile ? '✅' : '❌'}
            </p>
            <p>
              <strong>Stored Credentials:</strong>{' '}
              {biometricStatus.hasCredentials ? '✅' : '❌'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BiometricDemo
