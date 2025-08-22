import { Link, useNavigate, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/aws-auth'
import { routes } from '@/utils/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileBiometricLogin } from '@/components/auth/MobileBiometricLogin'
import {
  hasBiometricCredentials,
  isPlatformAuthenticatorAvailable,
  setupBiometricAuth,
} from '@/services/biometric-cognito'

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
})

type FormValues = z.infer<typeof formSchema>

const SignIn = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const isMobile = useIsMobile()
  const [showBiometric, setShowBiometric] = useState(false)
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)

  // Get email and success state from navigation
  const emailFromState = location.state?.email
  const isFromVerification = location.state?.fromVerification

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: emailFromState || '',
      password: '',
    },
  })

  // Show success message if coming from successful verification
  useEffect(() => {
    if (isFromVerification) {
      toast({
        title: 'Email verified successfully!',
        description: 'You can now sign in to your account.',
        variant: 'default',
      })
    }
  }, [isFromVerification])

  // Check biometric availability and setup status
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (isMobile) {
        const isSupported = await isPlatformAuthenticatorAvailable()
        const hasSetup = hasBiometricCredentials()
        setShowBiometric(isSupported)
        setHasBiometricSetup(hasSetup)

        // Check if user was redirected from settings for setup
        const setupRequested = localStorage.getItem('biometric_setup_requested')
        if (setupRequested === 'true' && isSupported && !hasSetup) {
          setShowSetupPrompt(true)
          localStorage.removeItem('biometric_setup_requested')
          toast({
            title: 'Set up biometric login',
            description:
              'Sign in with your credentials to enable biometric authentication.',
          })
        }
      }
    }

    checkBiometricSupport()
  }, [isMobile])

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)

      const user = await signIn(data.email, data.password)

      // If setup was requested from settings, set up biometric auth
      if (showSetupPrompt && isMobile && showBiometric) {
        try {
          const biometricResult = await setupBiometricAuth(
            data.email,
            data.password,
          )
          if (biometricResult.success) {
            // Set a flag to indicate successful setup
            localStorage.setItem('biometric_setup_completed', 'true')

            // Dispatch a custom event to notify other components
            window.dispatchEvent(new CustomEvent('biometric-setup-completed'))

            toast({
              title: 'Biometric login enabled!',
              description:
                'You can now use fingerprint or face recognition to sign in.',
            })
            setHasBiometricSetup(true)
            setShowSetupPrompt(false)
          } else {
            toast({
              title: 'Biometric setup failed',
              description:
                biometricResult.error ||
                'Could not set up biometric authentication.',
              variant: 'destructive',
            })
          }
        } catch (biometricError) {
          toast({
            title: 'Biometric setup failed',
            description: 'Could not set up biometric authentication.',
            variant: 'destructive',
          })
        }
      }

      // Show success message
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      })

      // Get company information and redirect to company dashboard
      // The signIn function should return user data with companyId
      if (user?.companyId) {
        navigate(`/${user.companyId.toLowerCase()}`)
      } else {
        // Fallback to home if no company ID
        navigate('/')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'UNVERIFIED_EMAIL') {
          // Navigate to verification page with the email
          navigate('/auth/verify-email', { state: { email: data.email } })
          toast({
            title: 'Email verification required',
            description:
              'Please check your email and verify your account before signing in.',
            variant: 'destructive',
          })
          return
        }
        setError(err.message)
      } else {
        setError('Invalid email or password. Please try again.')
      }
    }
  }

  return (
    <AuthLayout
      title="Sign in to your account"
      description="Enter your credentials to access your account"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showSetupPrompt && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            🔒 Sign in to enable biometric authentication on this device. After
            signing in, your fingerprint or face recognition will be set up
            automatically.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Biometric Authentication Option - Mobile Only */}
          {isMobile && showBiometric && hasBiometricSetup && (
            <div className="space-y-4 animate-in fade-in-0 duration-500">
              {/* Primary Biometric Login */}
              <div className="text-center space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Welcome back! 👋
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Use your biometric authentication for quick and secure
                    access
                  </p>
                  <MobileBiometricLogin
                    onLoginSuccess={() => {
                      // Navigation is handled within the component
                    }}
                  />
                </div>
              </div>

              {/* Alternative Login Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-gray-500 font-medium">
                    Or use your password
                  </span>
                </div>
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="sr-only">
                        {showPassword ? 'Hide password' : 'Show password'}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between text-sm">
            {/* <Link
              to="/auth/verify-email"
              className="text-blue-400 hover:text-blue-300 hover:underline font-bold transition-colors"
            >
              Verify email
            </Link> */}
            <Link
              to="/forgot-password"
              className="text-blue-400 hover:text-blue-300 hover:underline font-bold transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? showSetupPrompt
                ? 'Signing in & Setting up Biometric...'
                : 'Signing in...'
              : showSetupPrompt
                ? 'Sign in & Enable Biometric'
                : 'Sign in'}
          </Button>

          {/* Biometric Setup Option - Mobile Only */}
          {isMobile &&
            showBiometric &&
            !hasBiometricSetup &&
            !showSetupPrompt && (
              <div className="pt-2">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-700 mb-2">
                    ⚡ Make sign-in faster and more secure
                  </p>
                  <MobileBiometricLogin
                    onSetupSuccess={() => {
                      setHasBiometricSetup(true)
                      toast({
                        title: 'Biometric login enabled!',
                        description:
                          'You can now use fingerprint or face recognition to sign in.',
                      })
                    }}
                  />
                </div>
              </div>
            )}
        </form>
      </Form>

      <div className="mt-4 text-center text-sm">
        <span className="text-gray-100 dark:text-gray-100 font-medium">
          Don't have an account?
        </span>{' '}
        <Link
          to="/auth/signup"
          className="text-blue-400 hover:text-blue-300 hover:underline font-bold text-base transition-colors"
        >
          Sign up
        </Link>
      </div>
    </AuthLayout>
  )
}

export default SignIn
