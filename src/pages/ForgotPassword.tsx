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
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'
const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
})

const resetSchema = emailSchema.extend({
  code: z.string().min(4, 'Enter the code sent to your email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type EmailFormValues = z.infer<typeof emailSchema>
type ResetFormValues = z.infer<typeof resetSchema>

const ForgotPassword = () => {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: email, code: '', password: '' },
  })

  // Step 1: Request reset code
  const onRequest = async (data: EmailFormValues) => {
    try {
      setError(null)
      await resetPassword({ username: data.email })
      setEmail(data.email)
      resetForm.reset({ email: data.email, code: '', password: '' })
      setStep('reset')
      toast({
        title: 'Password reset code sent',
        description: 'Check your email for the verification code.',
      })
    } catch (err) {
      setError(
        'Could not send reset code. Please check your email and try again.',
      )
    }
  }

  // Step 2: Submit new password with code
  const onReset = async (data: ResetFormValues) => {
    try {
      setError(null)
      await confirmResetPassword({
        username: data.email,
        confirmationCode: data.code,
        newPassword: data.password,
      })
      setStep('done')
      toast({
        title: 'Password reset successful',
        description: 'You can now sign in with your new password.',
      })
    } catch (err) {
      setError('Invalid code or password. Please try again.')
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email address and we'll send you a code to reset your password"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'request' && (
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(onRequest)}
            className="space-y-4"
          >
            <FormField
              control={emailForm.control}
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
              disabled={emailForm.formState.isSubmitting}
            >
              {emailForm.formState.isSubmitting
                ? 'Sending code...'
                : 'Send reset code'}
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

      {step === 'reset' && (
        <Form {...resetForm}>
          <form
            onSubmit={resetForm.handleSubmit(onReset)}
            className="space-y-4"
          >
            <FormField
              control={resetForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled value={email} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="New password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={resetForm.formState.isSubmitting}
            >
              {resetForm.formState.isSubmitting
                ? 'Resetting...'
                : 'Reset Password'}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm px-0"
                onClick={() => setStep('request')}
              >
                Back to email entry
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === 'done' && (
        <div className="text-center space-y-4">
          <Alert className="mb-4">
            <AlertDescription>
              Your password has been reset. You can now sign in with your new
              password.
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link to="/signin">Return to sign in</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
