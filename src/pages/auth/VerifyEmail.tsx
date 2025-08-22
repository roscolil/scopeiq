import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import { useState } from 'react'
import { confirmSignUp, resendSignUpCode, signIn } from 'aws-amplify/auth'

const formSchema = z.object({
  code: z
    .string()
    .min(4, { message: 'Enter the verification code sent to your email' }),
})

type FormValues = z.infer<typeof formSchema>

const VerifyEmail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  // Get email from navigation state (required)
  const emailFromState = location.state?.email || ''

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)
      await confirmSignUp({
        username: emailFromState,
        confirmationCode: data.code,
      })

      toast({
        title: 'Email verified successfully!',
        description: 'Your account is now active. Please sign in to continue.',
      })

      // Redirect to signin with a success indicator
      navigate('/auth/signin', {
        state: {
          email: emailFromState,
          fromVerification: true,
        },
      })
    } catch (err) {
      setError('Invalid code or email. Please try again.')
    }
  }

  const handleResend = async () => {
    try {
      setIsResending(true)
      setError(null)
      await resendSignUpCode({ username: emailFromState })
      toast({
        title: 'Verification code resent',
        description: 'A new verification code has been sent to your email.',
      })
    } catch (err) {
      setError('Could not resend code. Please check your email and try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={`Enter the verification code sent to ${emailFromState}.`}
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

          <div className="flex justify-between items-center text-sm">
            <Button
              type="button"
              variant="link"
              className="px-0 text-blue-400 hover:text-blue-300 font-bold"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? 'Resending...' : 'Resend code'}
            </Button>
            <Link
              to="/auth/signin"
              className="text-blue-400 hover:text-blue-300 hover:underline font-bold transition-colors"
            >
              Back to sign in
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}

export default VerifyEmail
