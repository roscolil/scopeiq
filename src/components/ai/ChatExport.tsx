import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Mail, Share2, FileText, Globe } from 'lucide-react'
import {
  downloadChatConversation,
  downloadChatAsHTML,
  shareChatConversation,
  type ChatMessage,
} from '@/utils/ui/chat-export'
import { ChatEmailService } from '@/services/api/chat-email'
import { useAuth } from '@/hooks/aws-auth'
import { useToast } from '@/hooks/use-toast'

interface ChatExportProps {
  messages: ChatMessage[]
  children?: React.ReactNode
}

export const ChatExport: React.FC<ChatExportProps> = ({
  messages,
  children,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleDownloadText = () => {
    downloadChatConversation(messages, true)
    setIsOpen(false)
  }

  const handleDownloadHTML = () => {
    downloadChatAsHTML(messages, true)
    setIsOpen(false)
  }

  const handleEmailSES = () => {
    // Pre-populate with user's email if available
    if (user?.email && !emailAddress) {
      setEmailAddress(user.email)
    }
    setIsEmailDialogOpen(true)
  }

  const sendEmailViaSES = async () => {
    // Use current user's email as recipient if no email address provided
    const recipientEmail = emailAddress || user?.email

    if (!recipientEmail || !ChatEmailService.isValidEmail(recipientEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    setIsSendingEmail(true)
    try {
      const emailService = new ChatEmailService()
      const result = await emailService.sendChatEmail(
        messages,
        recipientEmail,
        {
          format: 'html',
          includeTimestamps: true,
          subject: ChatEmailService.getSuggestedSubject(messages),
        },
      )

      if (result.success) {
        toast({
          title: 'Email Sent Successfully',
          description: `Chat conversation sent to ${recipientEmail}`,
          variant: 'success',
        })
        setEmailAddress('')
        setIsEmailDialogOpen(false)
        setIsOpen(false)
      } else {
        toast({
          title: 'Email Failed',
          description: result.error || 'Failed to send email',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Email sending error:', error)
      toast({
        title: 'Email Failed',
        description:
          'An error occurred while sending the email. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleShare = async () => {
    const shared = await shareChatConversation(messages, true)

    if (!shared) {
      // Fallback to download as text if Web Share API not available
      downloadChatConversation(messages, true)
    }

    setIsOpen(false)
  }

  // Check if Web Share API is available (mainly mobile)
  const canUseWebShare = typeof navigator !== 'undefined' && navigator.share

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button
              variant="outline"
              size="sm"
              className="h-9 md:h-7 text-xs gap-2 px-8 md:px-3 min-w-[140px] md:min-w-0 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 border-indigo-700 text-indigo-50 hover:text-blue-50 shadow-sm hover:shadow transition-all duration-200"
            >
              <Share2 className="h-4 w-4 md:h-3 md:w-3" />
              Export Chat
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="!overflow-hidden !max-h-none !bg-transparent !p-0 w-[95vw] sm:w-full max-w-[400px] border-0 shadow-xl rounded-2xl sm:rounded-2xl">
          <div className="bg-white rounded-2xl p-4 sm:p-0 w-full h-full overflow-hidden">
            <div className="text-center mb-4 sm:mb-6 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold mb-2">
                <Share2 className="h-5 w-5 text-primary" />
                Export Chat
              </div>
              <p className="text-sm text-muted-foreground">
                Share your conversation with {messages.length} messages
              </p>
            </div>

            <div className="space-y-3 sm:px-6 sm:pb-6">
              {/* Email & Share Options */}
              <div className="space-y-2 mb-6">
                <Button
                  onClick={handleEmailSES}
                  className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send via Email
                </Button>

                {/* Share Option */}
                {canUseWebShare && (
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full h-11 sm:h-12 rounded-xl"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share via Device
                  </Button>
                )}
              </div>

              {/* Download Options */}
              <div className="space-y-2 pt-2 border-t relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3">
                  <p className="text-sm font-medium text-gray-500">or</p>
                </div>
                <div className="mt-4"></div>
                <Button
                  onClick={handleDownloadHTML}
                  className="w-full h-11 sm:h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Download as HTML
                </Button>

                <Button
                  onClick={handleDownloadText}
                  className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download as Text
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="w-full h-9 sm:h-10 text-gray-600 hover:text-gray-800 rounded-xl border border-gray-300 hover:border-gray-400 !mt-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Address Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border-0">
          <DialogHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-xl font-semibold">
                Send via Email
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600">
              Enter the recipient email address for your chat conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6 px-1">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={user?.email || 'recipient@example.com'}
                value={emailAddress}
                onChange={e => setEmailAddress(e.target.value)}
                className="w-full h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            {user?.email && !emailAddress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 text-center">
                  💡 Leave empty to send to your account email:{' '}
                  <strong>{user.email}</strong>
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isSendingEmail}
              className="h-11 px-6 rounded-xl border-gray-300 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={sendEmailViaSES}
              disabled={isSendingEmail || (!emailAddress && !user?.email)}
              autoFocus
              className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ChatExport
