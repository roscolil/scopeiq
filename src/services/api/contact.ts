import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Generate the Amplify client with API key for public access
const publicClient = generateClient<Schema>({
  authMode: 'apiKey',
})

export interface ContactSubmission {
  id: string
  name: string
  company?: string
  email: string
  message: string
  status: 'new' | 'contacted' | 'resolved'
  createdAt: string
  updatedAt: string
}

export interface ContactFormData {
  name: string
  company?: string
  email: string
  message: string
}

export const contactService = {
  // Submit a new contact form - Public access only
  async submitContactForm(
    formData: ContactFormData,
  ): Promise<ContactSubmission> {
    try {
      // Check if the model is available
      if (!publicClient.models?.ContactSubmission) {
        console.warn(
          'ContactSubmission model not available. Using fallback storage.',
        )

        // Fallback: Store locally and simulate successful submission
        const submission: ContactSubmission = {
          id: crypto.randomUUID(),
          name: formData.name,
          company: formData.company,
          email: formData.email,
          message: formData.message,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Store in localStorage as fallback
        const existingSubmissions = JSON.parse(
          localStorage.getItem('contactSubmissions') || '[]',
        )
        existingSubmissions.push(submission)
        localStorage.setItem(
          'contactSubmissions',
          JSON.stringify(existingSubmissions),
        )

        console.log('Contact submission stored locally (fallback):', submission)

        // Still attempt to send email notification
        await this.sendEmailNotification(submission)

        return submission
      }

      console.log('Submitting contact form with data:', formData)

      // Create the submission using public API key
      const { data: submission, errors } =
        await publicClient.models.ContactSubmission.create({
          name: formData.name as string & string[],
          company: (formData.company || null) as string & string[],
          email: formData.email as string & string[],
          message: formData.message as string & string[],
          status: 'new' as string & string[],
        })

      if (errors) {
        console.error('Error creating contact submission:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      console.log('Contact submission created successfully:', submission)

      const result: ContactSubmission = {
        id: submission.id,
        name: submission.name,
        company: submission.company || undefined,
        email: submission.email,
        message: submission.message,
        status: submission.status as 'new' | 'contacted' | 'resolved',
        createdAt: submission.createdAt || new Date().toISOString(),
        updatedAt: submission.updatedAt || new Date().toISOString(),
      }

      // Send email notification
      await this.sendEmailNotification(result)

      return result
    } catch (error) {
      console.error('Error submitting contact form:', error)
      throw error
    }
  },

  // Send email notification via AWS SES
  async sendEmailNotification(submission: ContactSubmission): Promise<void> {
    try {
      // Check if the sendContactEmail mutation is available
      if (!publicClient.mutations?.sendContactEmail) {
        throw new Error('Email mutation not deployed yet')
      }

      // Prepare the email request
      const emailRequest = {
        submissionId: submission.id,
        name: submission.name,
        email: submission.email,
        company: submission.company || null,
        message: submission.message,
        submittedAt: submission.createdAt,
      }

      console.log('Calling sendContactEmail mutation with:', emailRequest)

      // Call the GraphQL mutation
      const result = await publicClient.mutations.sendContactEmail(emailRequest)

      // Handle different response formats
      let emailResult: {
        success: boolean
        messageId?: string
        confirmationMessageId?: string
        error?: string
      } | null = null

      if (result && typeof result === 'object') {
        // Check if result has data property (standard GraphQL response)
        if ('data' in result && result.data) {
          emailResult = result.data as {
            success: boolean
            messageId?: string
            error?: string
          }
        }
        // Check if result is the direct response
        else if ('success' in result) {
          emailResult = result as {
            success: boolean
            messageId?: string
            error?: string
          }
        }
        // Handle errors in the response
        else if ('errors' in result && result.errors) {
          const errors = result.errors as Array<{ message: string }>
          console.error('Email mutation errors:', errors)
          throw new Error(
            `Email sending failed: ${errors.map(e => e.message).join(', ')}`,
          )
        }
      }

      // If we don't have a valid result, throw an error
      if (!emailResult) {
        throw new Error(
          'Email sending failed: Invalid response format from mutation',
        )
      }

      if (emailResult.success === false) {
        throw new Error(
          `Email sending failed: ${emailResult.error || 'Unknown error'}`,
        )
      }

      // Explicitly return here to avoid any subsequent error handling
      return
    } catch (error) {
      // Fallback: Log the email content for manual review
      console.warn(
        '📧 SES email failed, logging content for manual processing:',
      )
      const emailData = {
        to: 'ross@exelion.ai',
        replyTo: submission.email,
        subject: `🚀 New Contact Form Submission from ${submission.name}`,
        timestamp: new Date().toLocaleString('en-AU', {
          timeZone: 'Australia/Sydney',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        body: `
NEW CONTACT FORM SUBMISSION - ScopeIQ
=====================================

👤 Name: ${submission.name}
🏢 Company: ${submission.company || 'Not provided'}
📧 Email: ${submission.email}
🕐 Submitted: ${new Date(submission.createdAt).toLocaleString('en-AU', {
          timeZone: 'Australia/Sydney',
        })}
🆔 Submission ID: ${submission.id}

💬 Message:
${submission.message}

=====================================
Reply to: ${submission.email}
        `,
      }

      console.log('📧 EMAIL CONTENT FOR MANUAL REVIEW:')
      console.log('='.repeat(50))
      console.log(`To: ${emailData.to}`)
      console.log(`Reply-To: ${emailData.replyTo}`)
      console.log(`Subject: ${emailData.subject}`)
      console.log(`Timestamp: ${emailData.timestamp}`)
      console.log('='.repeat(50))
      console.log(emailData.body)
      console.log('='.repeat(50))

      // Don't throw here - we don't want email failures to block form submission
      // The form submission should succeed even if email fails
    }
  },
}
