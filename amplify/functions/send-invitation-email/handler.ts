import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { Schema } from '../../data/resource'

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.SES_REGION || 'us-east-1',
})

// Handler for sending invitation emails
export const handler: Schema['sendInvitationEmail']['functionHandler'] =
  async event => {
    try {
      const {
        invitationId,
        recipientEmail,
        recipientName,
        inviterName,
        companyName,
        role,
        acceptUrl,
      } = event.arguments

      // Email configuration
      const fromEmail = process.env.FROM_EMAIL || 'noreply@scopeiq.com'

      // Create email content
      const subject = `Invitation to join ${companyName} on ScopeIQ`

      const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .role-badge { display: inline-block; padding: 4px 12px; background: #e1f5fe; color: #0277bd; border-radius: 20px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
              <p>Join your team on ScopeIQ</p>
            </div>
            
            <div class="content">
              <h2>Hello ${recipientName || recipientEmail}!</h2>
              
              <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on ScopeIQ.</p>
              
              <p>You've been assigned the role of: <span class="role-badge">${role}</span></p>
              
              <p>ScopeIQ helps teams collaborate on documents with AI-powered insights and streamlined workflows.</p>
              
              <p>Click the button below to accept your invitation and get started:</p>
              
              <p style="text-align: center;">
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
              </p>
              
              <p><small>This invitation will expire in 7 days. If you're unable to click the button above, copy and paste this link into your browser:</small></p>
              <p><small style="word-break: break-all;">${acceptUrl}</small></p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <h3>What's next?</h3>
              <ul>
                <li>Accept your invitation to create your account</li>
                <li>Explore your assigned projects and documents</li>
                <li>Start collaborating with your team</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This invitation was sent by ${inviterName} from ${companyName}.</p>
              <p>If you believe this invitation was sent in error, you can safely ignore this email.</p>
              <p>&copy; 2025 ScopeIQ. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

      const textBody = `
You're invited to join ${companyName} on ScopeIQ!

${inviterName} has invited you to join ${companyName} on ScopeIQ as a ${role}.

ScopeIQ helps teams collaborate on documents with AI-powered insights and streamlined workflows.

Accept your invitation: ${acceptUrl}

This invitation will expire in 7 days.

What's next:
- Accept your invitation to create your account
- Explore your assigned projects and documents  
- Start collaborating with your team

This invitation was sent by ${inviterName} from ${companyName}.
If you believe this invitation was sent in error, you can safely ignore this email.

© 2025 ScopeIQ. All rights reserved.
    `

      // Send email using SES
      const sendEmailCommand = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
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
      })

      const result = await sesClient.send(sendEmailCommand)

      return {
        success: true,
        messageId: result.MessageId,
        message: 'Invitation email sent successfully',
      }
    } catch (error) {
      console.error('Error sending invitation email:', error)

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to send invitation email',
      }
    }
  }
