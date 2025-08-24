import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { ChatEmailService, type EmailChatOptions } from '@/services/chat-email'
import type { ChatMessage } from '@/utils/ui/chat-export'
import { useAuth } from '@/hooks/aws-auth'
import { useToast } from '@/hooks/use-toast'

interface EmailConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
}

export const EmailConfirmationDialog: React.FC<
  EmailConfirmationDialogProps
> = ({ isOpen, onClose, messages }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [recipientEmail, setRecipientEmail] = useState(user?.email || '')
  const [subject, setSubject] = useState(
    ChatEmailService.getSuggestedSubject(messages),
  )
  const [format, setFormat] = useState<'html' | 'text'>('html')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    messageId?: string
    error?: string
  } | null>(null)

  const chatEmailService = new ChatEmailService()

  const handleSendEmail = async () => {
    // Validate email
    if (!recipientEmail || !ChatEmailService.isValidEmail(recipientEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const options: EmailChatOptions = {
        format,
        subject: subject.trim() || undefined,
        includeTimestamps: true,
      }

      const emailResult = await chatEmailService.sendChatEmail(
        messages,
        recipientEmail,
        options,
      )

      setResult(emailResult)

      if (emailResult.success) {
        toast({
          title: 'Email Sent Successfully',
          description: `Chat conversation sent to ${recipientEmail}`,
        })

        // Close dialog after a short delay to show success
        setTimeout(() => {
          onClose()
          setResult(null)
        }, 2000)
      } else {
        toast({
          title: 'Email Failed',
          description: emailResult.error || 'Failed to send email',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })

      toast({
        title: 'Email Failed',
        description: 'An unexpected error occurred while sending the email.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setResult(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Email Chat Conversation
          </DialogTitle>
          <DialogDescription>
            Send this conversation directly to your email address using AWS SES.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Email Address Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email Address</Label>
            <Input
              id="email"
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="Enter email address"
              disabled={isLoading}
              className="w-full"
            />
            {user?.email && recipientEmail !== user.email && (
              <p className="text-sm text-gray-500">
                Sending to a different email than your account ({user.email})
              </p>
            )}
          </div>

          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line"
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Email Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value: 'html' | 'text') => setFormat(value)}
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="flex-1 cursor-pointer">
                  <div className="font-medium">Rich HTML Format</div>
                  <div className="text-sm text-gray-500">
                    Professional styling with colors and formatting
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex-1 cursor-pointer">
                  <div className="font-medium">Plain Text Format</div>
                  <div className="text-sm text-gray-500">
                    Simple text format for maximum compatibility
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conversation Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This conversation contains {messages.length} messages and will be
              sent with timestamps included.
            </AlertDescription>
          </Alert>

          {/* Result Display */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success
                  ? `Email sent successfully! Message ID: ${result.messageId?.substring(0, 8)}...`
                  : result.error || 'Failed to send email'}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSendEmail}
              disabled={
                isLoading ||
                !recipientEmail ||
                !ChatEmailService.isValidEmail(recipientEmail)
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EmailConfirmationDialog
