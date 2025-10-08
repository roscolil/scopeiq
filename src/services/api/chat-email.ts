import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'
import type { ChatMessage } from '../../utils/ui/chat-export'
import {
  formatChatAsHTML,
  formatChatForSharing,
} from '../../utils/ui/chat-export'

const client = generateClient<Schema>()

export interface EmailChatOptions {
  format?: 'html' | 'text'
  subject?: string
  includeTimestamps?: boolean
}

export interface EmailChatResult {
  success: boolean
  messageId?: string
  error?: string
}

export class ChatEmailService {
  /**
   * Send chat conversation via AWS SES (Fallback to contact form for now)
   */
  async sendChatEmail(
    messages: ChatMessage[],
    recipientEmail: string,
    options: EmailChatOptions = {},
  ): Promise<EmailChatResult> {
    try {
      const { format = 'html', subject, includeTimestamps = true } = options

      // Format the chat content based on the specified format
      let chatContent: string
      if (format === 'html') {
        chatContent = formatChatAsHTML(messages, includeTimestamps)
      } else {
        chatContent = formatChatForSharing(messages, includeTimestamps)
      }

      // Create default subject if not provided
      const emailSubject =
        subject || `Jack Chat Conversation - ${new Date().toLocaleDateString()}`

      // For now, fallback to using contact email function with chat content
      // TODO: Implement dedicated sendChatEmail mutation in amplify/data/resource.ts
      const result = await client.mutations.sendContactEmail({
        submissionId: `chat-${Date.now()}`,
        name: 'Chat Export User',
        email: recipientEmail,
        company: 'Jack Chat Export',
        message: `${emailSubject}\n\n${chatContent}`,
        submittedAt: new Date().toISOString(),
      })

      // Handle the response
      if (result && typeof result === 'object') {
        // Check if result has data property (standard GraphQL response)
        if ('data' in result && result.data) {
          return {
            success: true,
            messageId: `chat-export-${Date.now()}`,
          }
        }
        // Check if result is successful
        else if (result) {
          return {
            success: true,
            messageId: `chat-export-${Date.now()}`,
          }
        }
        // Handle errors in the response
        else if ('errors' in result && result.errors) {
          const errors = result.errors as Array<{ message: string }>
          console.error('Chat email mutation errors:', errors)
          return {
            success: false,
            error: `Email sending failed: ${errors.map(e => e.message).join(', ')}`,
          }
        }
      }

      return {
        success: true,
        messageId: `chat-export-${Date.now()}`,
      }
    } catch (error) {
      console.error('Error sending chat email:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get suggested subject line based on conversation content
   */
  static getSuggestedSubject(messages: ChatMessage[]): string {
    const today = new Date().toLocaleDateString()
    const messageCount = messages.length

    // Try to extract a topic from the first user message
    const firstUserMessage = messages.find(msg => msg.type === 'user')
    if (firstUserMessage && firstUserMessage.content.length > 0) {
      const firstLine = firstUserMessage.content.split('\n')[0]
      if (firstLine.length > 10 && firstLine.length < 50) {
        return `Jack Chat: ${firstLine} - ${today}`
      }
    }

    return `Jack Chat Conversation (${messageCount} messages) - ${today}`
  }
}
