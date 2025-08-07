import { Link, useNavigate } from 'react-router-dom'
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
import { useState } from 'react'
import { useAuth } from '@/hooks/aws-auth'
import { routes } from '@/utils/navigation'

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
})

type FormValues = z.infer<typeof formSchema>

const SignIn = () => {
  const navigate = useNavigate()
  const { signIn, user } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)
      await signIn(data.email, data.password)

      // After successful sign in, check user attributes for navigation
      // Give a moment for the auth context to update
      setTimeout(() => {
        if (user) {
          const companyId = user['custom:Company'] || user.company

          if (companyId) {
            // Always redirect to company dashboard
            navigate(routes.company.home((companyId as string).toLowerCase()))
          } else {
            // Fallback to home if no company ID
            navigate(routes.home())
          }
        } else {
          // Fallback navigation
          navigate(routes.home())
        }
      }, 100)
    } catch (err) {
      setError('Invalid email or password. Please try again.')
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
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-sm text-right">
            <Link
              to="/forgot-password"
              className="text-primary hover:underline"
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
        <span className="text-gray-400">Don't have an account?</span>{' '}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  )
}

export default SignIn
