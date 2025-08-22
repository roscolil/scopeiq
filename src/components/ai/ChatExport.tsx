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
import { Download, Mail, Share2 } from 'lucide-react'
import {
  downloadChatConversation,
  emailChatConversation,
  shareChatConversation,
  type ChatMessage,
} from '@/utils/ui/chat-export'

interface ChatExportProps {
  messages: ChatMessage[]
  children?: React.ReactNode
}

export const ChatExport: React.FC<ChatExportProps> = ({
  messages,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleDownload = () => {
    downloadChatConversation(messages, true) // Always include timestamps
    setIsOpen(false)
  }

  const handleEmail = () => {
    emailChatConversation(messages, {
      includeTimestamps: true,
      subject: `ScopeIQ Chat Conversation - ${new Date().toLocaleDateString()}`,
    })
    setIsOpen(false)
  }

  const handleShare = async () => {
    const shared = await shareChatConversation(messages, true) // Always include timestamps

    if (!shared) {
      // Fallback to email if Web Share API not available
      handleEmail()
    }

    setIsOpen(false)
  }

  // Check if Web Share API is available (mainly mobile)
  const canUseWebShare = typeof navigator !== 'undefined' && navigator.share

  return (
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
      <DialogContent className="!overflow-hidden !max-h-none !bg-transparent !p-0 w-[90vw] sm:w-full max-w-[300px] border-0 shadow-xl rounded-2xl sm:rounded-2xl">
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
            <Button
              onClick={handleEmail}
              className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Conversation
            </Button>

            <Button
              onClick={handleDownload}
              className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Download as Text
            </Button>

            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="w-full h-9 sm:h-10 text-gray-600 hover:text-gray-800 rounded-xl border border-gray-300 hover:border-gray-400 !mt-10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChatExport
