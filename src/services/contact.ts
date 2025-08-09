import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Generate the Amplify client with API key for public access
const client = generateClient<Schema>({
  authMode: 'apiKey'
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
  // Submit a new contact form using Amplify
  async submitContactForm(formData: ContactFormData): Promise<ContactSubmission> {
    try {
      // Check if the model is available
      if (!client.models?.ContactSubmission) {
        console.warn('ContactSubmission model not available. Using fallback storage. Available models:', Object.keys(client.models || {}))
        
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
        const existingSubmissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]')
        existingSubmissions.push(submission)
        localStorage.setItem('contactSubmissions', JSON.stringify(existingSubmissions))

        console.log('Contact submission stored locally (fallback):', submission)
        
        // Still attempt to send email notification
        await this.sendEmailNotification(submission)
        
        return submission
      }

      console.log('Submitting contact form with data:', formData)
      
      // Temporary workaround for Amplify type generation bug
      const { data: submission, errors } = await client.models.ContactSubmission.create({
        name: formData.name as string & string[],
        company: (formData.company || null) as string & string[],
        email: formData.email as string & string[],
        message: formData.message as string & string[],
        status: 'new' as string & string[],
      })

      if (errors) {
        console.error('Error creating contact submission:', errors)
        throw new Error(`Database error: ${errors.map(e => e.message).join(', ')}`)
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

  // Send email notification (placeholder for now)
  async sendEmailNotification(submission: ContactSubmission): Promise<void> {
    try {
      console.log('Sending email notification for submission:', submission.id)
      
      // For now, just log the email content
      // In production, you'd integrate with AWS SES or another email service
      const emailData = {
        to: 'ross@exelion.ai',
        subject: `New Contact Form Submission from ${submission.name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${submission.name}</p>
          <p><strong>Company:</strong> ${submission.company || 'Not provided'}</p>
          <p><strong>Email:</strong> ${submission.email}</p>
          <p><strong>Message:</strong></p>
          <p>${submission.message.replace(/\n/g, '<br>')}</p>
          <p><strong>Submitted:</strong> ${new Date(submission.createdAt).toLocaleString()}</p>
        `,
      }

      console.log('Email notification would be sent:', emailData)
      
      // TODO: Implement actual email sending with AWS SES
      // This could be done via a Lambda function or direct SES integration
    } catch (error) {
      console.error('Error sending email notification:', error)
      // Don't throw here - we don't want email failures to block form submission
    }
  },

  // Get all contact submissions (admin only)
  async getContactSubmissions(): Promise<ContactSubmission[]> {
    try {
      if (!client.models?.ContactSubmission) {
        console.warn('ContactSubmission model not available. Using fallback storage.')
        // Fallback: Return locally stored submissions
        const localSubmissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]')
        return localSubmissions
      }

      const { data: submissions, errors } = await client.models.ContactSubmission.list()
      
      if (errors) {
        console.error('Error fetching contact submissions:', errors)
        throw new Error(`Database error: ${errors.map(e => e.message).join(', ')}`)
      }

      return submissions.map(submission => ({
        id: submission.id,
        name: submission.name,
        company: submission.company || undefined,
        email: submission.email,
        message: submission.message,
        status: submission.status as 'new' | 'contacted' | 'resolved',
        createdAt: submission.createdAt || new Date().toISOString(),
        updatedAt: submission.updatedAt || new Date().toISOString(),
      }))
    } catch (error) {
      console.error('Error fetching contact submissions:', error)
      throw error
    }
  },

  // Update contact submission status (admin only)
  async updateContactStatus(
    id: string, 
    status: 'new' | 'contacted' | 'resolved'
  ): Promise<ContactSubmission> {
    try {
      // Temporary workaround for Amplify type generation bug
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        id,
        status,
      }
      const { data: submission, errors } = await client.models.ContactSubmission.update(updateData)

      if (errors) {
        console.error('Error updating contact status:', errors)
        throw new Error(`Database error: ${errors.map(e => e.message).join(', ')}`)
      }

      if (!submission) {
        throw new Error('Contact submission not found')
      }

      return {
        id: submission.id,
        name: submission.name,
        company: submission.company || undefined,
        email: submission.email,
        message: submission.message,
        status: submission.status as 'new' | 'contacted' | 'resolved',
        createdAt: submission.createdAt || new Date().toISOString(),
        updatedAt: submission.updatedAt || new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error updating contact status:', error)
      throw error
    }
  },
}
