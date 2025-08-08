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
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/aws-auth'
import { routes } from '@/utils/navigation'
import { Eye, EyeOff } from 'lucide-react'

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

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)
      console.log('Starting sign in process...')

      const user = await signIn(data.email, data.password)

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
      console.error('Sign in error details:', err)

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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <Link
              to="/auth/verify-email"
              className="text-blue-400 hover:text-blue-300 hover:underline font-bold transition-colors"
            >
              Verify email
            </Link>
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
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
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
