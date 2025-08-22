import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/aws-auth'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, Smartphone, Plus } from 'lucide-react'
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  setupBiometricAuth,
  authenticateWithBiometric,
  hasBiometricCredentials,
  clearBiometricCredentials,
} from '@/services/auth/biometric-cognito'

interface MobileBiometricLoginProps {
  onSetupSuccess?: () => void
  onLoginSuccess?: () => void
  context?: 'signin' | 'settings' // Add context to handle different behaviors
}

export const MobileBiometricLogin: React.FC<MobileBiometricLoginProps> = ({
  onSetupSuccess,
  onLoginSuccess,
  context = 'signin',
}) => {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlatformSupported, setIsPlatformSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const { toast } = useToast()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    checkSupport()
    checkCredentials()
  }, [])

  const checkSupport = async () => {
    const supported = isBiometricSupported()
    setIsSupported(supported)

    if (supported) {
      const platformSupported = await isPlatformAuthenticatorAvailable()
      setIsPlatformSupported(platformSupported)
    }
  }

  const checkCredentials = () => {
    setHasCredentials(hasBiometricCredentials())
  }

  const handleSetupBiometric = async () => {
    // If we're in settings context, redirect to sign-in page for setup
    if (context === 'settings') {
      toast({
        title: 'Complete setup on sign-in page',
        description:
          "You'll be redirected to sign in and set up biometric authentication.",
      })

      // Store a flag to show setup flow on sign-in page
      localStorage.setItem('biometric_setup_requested', 'true')

      // Redirect to sign-in page
      navigate('/auth/signin')
      return
    }

    // Original behavior for sign-in page context
    const emailInput = (
      document.querySelector('input[type="email"]') as HTMLInputElement
    )?.value
    const passwordInput = (
      document.querySelector('input[type="password"]') as HTMLInputElement
    )?.value

    let email = emailInput
    let password = passwordInput

    // If form fields are empty, prompt for credentials
    if (!email) {
      email = prompt('Enter your email to setup biometric authentication:')
      if (!email) return
    }

    if (!password) {
      password = prompt('Enter your password:')
      if (!password) return
    }

    setIsLoading(true)
    try {
      const result = await setupBiometricAuth(email, password)

      if (result.success) {
        toast({
          title: 'Biometric setup complete!',
          description: 'You can now use biometric login on this device.',
        })
        setHasCredentials(true)
        onSetupSuccess?.()
      } else {
        toast({
          title: 'Setup failed',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    setIsLoading(true)
    try {
      const result = await authenticateWithBiometric()

      if (result.success && result.credentials) {
        // Use the decrypted credentials to sign in through AWS Cognito
        const user = await signIn(
          result.credentials.email,
          result.credentials.password,
        )

        toast({
          title: 'Welcome back!',
          description: 'Biometric authentication successful.',
        })

        // Navigate to dashboard
        if (user?.companyId) {
          navigate(`/${user.companyId.toLowerCase()}`)
        } else {
          navigate('/') // Navigate to home/dashboard
        }

        onLoginSuccess?.()
      } else {
        toast({
          title: 'Authentication failed',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      // Check if it's a credentials error and offer to re-setup
      if ((error as Error).message.includes('Incorrect username or password')) {
        toast({
          title: 'Credentials may be outdated',
          description:
            'Your password may have changed. Please update your biometric login.',
          variant: 'destructive',
        })

        // Clear credentials and prompt for re-setup
        await clearBiometricCredentials()
        setHasCredentials(false)
      } else {
        toast({
          title: 'Sign in error',
          description: (error as Error).message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show if not supported
  if (!isSupported || !isPlatformSupported) {
    return null
  }

  // Show login option if credentials exist
  if (hasCredentials) {
    return (
      <div className="space-y-3">
        <Button
          onClick={handleBiometricLogin}
          disabled={isLoading || context === 'settings'}
          className="w-full h-14 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              {context === 'settings' ? 'Setting up...' : 'Authenticating...'}
            </>
          ) : (
            <>
              <Fingerprint className="h-6 w-6 mr-3" />
              {context === 'settings' ? 'Already Enabled' : 'Tap to Sign In'}
            </>
          )}
        </Button>
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-600 font-medium">
            🔒 Touch sensor or Face ID
          </p>
          <p className="text-xs text-gray-500">
            Quick, secure access to your account
          </p>
        </div>
      </div>
    )
  }

  // Show setup option if no credentials exist
  return (
    <div className="space-y-2">
      <Button
        onClick={handleSetupBiometric}
        disabled={isLoading}
        variant="outline"
        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        {isLoading
          ? 'Redirecting...'
          : context === 'settings'
            ? 'Set up on Sign-in Page'
            : 'Enable Biometric Login'}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        {context === 'settings'
          ? "You'll be redirected to sign in and set up biometric authentication"
          : 'Set up fingerprint or face recognition for faster sign-in'}
      </p>
    </div>
  )
}

export default MobileBiometricLogin
