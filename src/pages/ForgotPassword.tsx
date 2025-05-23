import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useAuth } from '@/hooks/use-auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
})

type FormValues = z.infer<typeof formSchema>

const ForgotPassword = () => {
  const { resetPassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)
      await resetPassword(data.email)
      setIsSubmitted(true)
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for password reset instructions.',
      })
    } catch (err) {
      setError(
        'An error occurred while sending the password reset email. Please try again.',
      )
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email address and we'll send you a link to reset your password"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSubmitted ? (
        <div className="text-center space-y-4">
          <Alert className="mb-4">
            <AlertDescription>
              If an account exists with the email you provided, you will receive
              a password reset link shortly.
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link to="/signin">Return to sign in</Link>
          </Button>
        </div>
      ) : (
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

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Sending email...'
                : 'Send reset link'}
            </Button>

            <div className="text-center">
              <Link
                to="/signin"
                className="text-primary hover:underline text-sm"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
