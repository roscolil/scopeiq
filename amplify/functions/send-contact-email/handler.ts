import type { AppSyncResolverHandler } from 'aws-lambda'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
})

export interface ContactEmailArgs {
  submissionId: string
  name: string
  email: string
  company?: string
  message: string
  submittedAt: string
}

export interface ContactEmailResponse {
  success: boolean
  messageId?: string
  confirmationMessageId?: string
  error?: string
}

export const handler: AppSyncResolverHandler<
  ContactEmailArgs,
  ContactEmailResponse
> = async event => {
  console.log('Received contact email request:', event)

  try {
    const { submissionId, name, email, company, message, submittedAt } =
      event.arguments

    // Validate required fields
    if (!submissionId || !name || !email || !message) {
      throw new Error('Missing required fields')
    }

    // Email configuration - using verified email as sender
    const fromEmail = process.env.SES_FROM_EMAIL || 'ross@exelion.ai'
    const toEmail = process.env.SES_TO_EMAIL || 'ross@exelion.ai'

    // Create email content
    const subject = `[ScopeIQ Contact Form] Message from ${name}`
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e9ecef;
          }
          .field {
            margin-bottom: 20px;
          }
          .field-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
          }
          .field-value {
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #dee2e6;
          }
          .message {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
          }
          .submission-id {
            font-family: monospace;
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 New Contact Form Submission</h1>
          <p>ScopeIQ Contact Form</p>
        </div>
        
        <div class="content">
          <div class="field">
            <div class="field-label">Name:</div>
            <div class="field-value">${escapeHtml(name)}</div>
          </div>
          
          <div class="field">
            <div class="field-label">Email:</div>
            <div class="field-value">
              <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
            </div>
          </div>
          
          ${
            company
              ? `
          <div class="field">
            <div class="field-label">Company:</div>
            <div class="field-value">${escapeHtml(company)}</div>
          </div>
          `
              : ''
          }
          
          <div class="field">
            <div class="field-label">Message:</div>
            <div class="field-value message">${escapeHtml(message)}</div>
          </div>
          
          <div class="field">
            <div class="field-label">Submitted:</div>
            <div class="field-value">${new Date(submittedAt).toLocaleString(
              'en-AU',
              {
                timeZone: 'Australia/Sydney',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              },
            )}</div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Reply to this inquiry:</strong> Simply reply to this email to respond to ${escapeHtml(name)}</p>
          <p><strong>Submission ID:</strong> <span class="submission-id">${submissionId}</span></p>
          <p>This email was automatically generated from the ScopeIQ contact form.</p>
        </div>
      </body>
      </html>
    `

    const textBody = `
New Contact Form Submission - ScopeIQ

Name: ${name}
Email: ${email}
${company ? `Company: ${company}` : ''}

Message:
${message}

Submitted: ${new Date(submittedAt).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
    })}

Submission ID: ${submissionId}

Reply to this email to respond to the inquiry.
    `.trim()

    // Prepare the email command
    const emailCommand = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      // Set reply-to as the submitter's email for easy response
      ReplyToAddresses: [email],
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
      // Add tags for tracking and analytics
      Tags: [
        {
          Name: 'Source',
          Value: 'ContactForm',
        },
        {
          Name: 'Environment',
          Value: process.env.NODE_ENV || 'development',
        },
      ],
    })

    // Send the notification email to admin
    console.log(`Sending notification email from ${fromEmail} to ${toEmail}`)
    console.log('Notification email command details:', {
      Source: fromEmail,
      ToAddresses: [toEmail],
      ReplyToAddresses: [email],
      Subject: subject,
    })

    const notificationResult = await sesClient.send(emailCommand)
    console.log(
      'Notification email sent successfully:',
      notificationResult.MessageId,
    )

    // Send confirmation email to the form submitter
    const confirmationSubject = `Thank you for contacting ScopeIQ - We'll be in touch soon!`
    const confirmationHtmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You - ScopeIQ</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e9ecef;
          }
          .message-summary {
            background: white;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
            text-align: center;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Thank You for Contacting ScopeIQ!</h1>
          <p>We've received your message and will get back to you soon</p>
        </div>
        
        <div class="content">
          <p>Hi ${escapeHtml(name)},</p>
          
          <p>Thank you for reaching out to ScopeIQ! We've successfully received your message and our team will review it shortly.</p>
          
          <div class="message-summary">
            <h3>📝 Your Message Summary:</h3>
            <p><strong>Submitted:</strong> ${new Date(
              submittedAt,
            ).toLocaleString('en-AU', {
              timeZone: 'Australia/Sydney',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p style="font-style: italic; margin-left: 15px;">"${escapeHtml(message).substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
          </div>
          
          <h3>🚀 What Happens Next?</h3>
          <ul>
            <li><strong>Response Time:</strong> We typically respond within 24 hours during business days</li>
            <li><strong>Expert Review:</strong> Your inquiry will be reviewed by our AI and document processing specialists</li>
            <li><strong>Personalized Follow-up:</strong> We'll provide tailored information based on your specific needs</li>
          </ul>
          
          <p>In the meantime, feel free to explore our platform or check out our latest resources:</p>
          
          <div style="text-align: center;">
            <a href="https://scopeiq.ai" class="cta-button">Visit ScopeIQ Platform</a>
          </div>
          
          <p>If you have any urgent questions or need immediate assistance, please don't hesitate to reply to this email.</p>
          
          <p>Best regards,<br>
          The ScopeIQ Team</p>
        </div>
        
        <div class="footer">
          <p><strong>ScopeIQ</strong> - AI-Powered Document Intelligence</p>
          <p>This email was sent in response to your contact form submission.</p>
          <p>Reference ID: <span style="font-family: monospace; font-size: 12px;">${submissionId}</span></p>
        </div>
      </body>
      </html>
    `

    const confirmationTextBody = `
Thank You for Contacting ScopeIQ!

Hi ${name},

Thank you for reaching out to ScopeIQ! We've successfully received your message and our team will review it shortly.

Your Message Summary:
Submitted: ${new Date(submittedAt).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
    })}
${company ? `Company: ${company}` : ''}
Message: "${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"

What Happens Next?
• Response Time: We typically respond within 24 hours during business days
• Expert Review: Your inquiry will be reviewed by our AI and document processing specialists  
• Personalized Follow-up: We'll provide tailored information based on your specific needs

If you have any urgent questions, please reply to this email.

Best regards,
The ScopeIQ Team

---
ScopeIQ - AI-Powered Document Intelligence
Reference ID: ${submissionId}
    `.trim()

    const confirmationCommand = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [email], // Send to the form submitter
      },
      Message: {
        Subject: {
          Data: confirmationSubject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: confirmationHtmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: confirmationTextBody,
            Charset: 'UTF-8',
          },
        },
      },
      Tags: [
        {
          Name: 'Source',
          Value: 'ContactFormConfirmation',
        },
        {
          Name: 'Environment',
          Value: process.env.NODE_ENV || 'development',
        },
      ],
    })

    // Note: In SES sandbox mode, confirmation emails can only be sent to verified addresses
    // For production, request SES production access or use alternative email service
    console.log(`Attempting to send confirmation email to ${email}`)
    console.log(
      'Note: Confirmation email may fail in SES sandbox mode for unverified recipients',
    )

    try {
      const confirmationResult = await sesClient.send(confirmationCommand)
      console.log(
        'Confirmation email sent successfully:',
        confirmationResult.MessageId,
      )

      return {
        success: true,
        messageId: notificationResult.MessageId,
        confirmationMessageId: confirmationResult.MessageId,
      }
    } catch (confirmationError) {
      console.warn(
        'Confirmation email failed (this is expected in SES sandbox mode for unverified emails):',
        confirmationError,
      )

      // Always return success - the important notification email to admin worked
      // Confirmation emails are a nice-to-have, not essential
      console.log(
        '✅ Contact form submission successful (notification sent, confirmation skipped)',
      )
      return {
        success: true,
        messageId: notificationResult.MessageId,
        confirmationMessageId: 'skipped-ses-sandbox-limitation',
      }
    }
  } catch (error) {
    console.error('Error sending email:', error)

    // Type-safe error logging
    const errorDetails: Record<string, unknown> = {}

    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      errorDetails.name = err.name
      errorDetails.message = err.message
      errorDetails.code = err.code

      // Handle AWS SDK metadata
      const metadata = err.$metadata as Record<string, unknown> | undefined
      if (metadata) {
        errorDetails.statusCode = metadata.httpStatusCode
        errorDetails.requestId = metadata.requestId
      }
    }

    console.error('Error details:', errorDetails)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Helper function to escape HTML entities
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
