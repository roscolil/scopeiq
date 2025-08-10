// User Management Service - Integrated with AWS SES
// Service to handle user management operations with real backend integration

import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Types
export type UserRole = 'Owner' | 'Admin' | 'User'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string
  isActive: boolean
  projectIds: string[] // Projects this user has access to
  lastLoginAt?: string
  invitedAt?: string
  acceptedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface UserInvitation {
  id: string
  email: string
  role: UserRole
  companyId: string
  invitedBy: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  projectIds?: string[]
  createdAt: string
  updatedAt?: string
}

export interface CreateUserInput {
  email: string
  name: string
  role: UserRole
  companyId: string
  projectIds?: string[]
}

export interface UpdateUserInput {
  name?: string
  role?: UserRole
  isActive?: boolean
  projectIds?: string[]
}

export interface CreateInvitationInput {
  email: string
  role: UserRole
  companyId: string
  invitedBy: string
  projectIds?: string[]
}

export interface InviteUserInput extends CreateInvitationInput {
  inviterName: string
  companyName: string
}

// Role permissions
export interface RolePermissions {
  permissions: {
    canInviteUsers: boolean
    canDeleteUsers: boolean
    canManageProjects: boolean
    canViewAllProjects: boolean
    canEditProjects: boolean
    canDeleteProjects: boolean
    canAccessAnalytics: boolean
    canManageSettings: boolean
  }
}

export const ROLE_PERMISSIONS: Record<
  UserRole,
  RolePermissions['permissions']
> = {
  Owner: {
    canInviteUsers: true,
    canDeleteUsers: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAccessAnalytics: true,
    canManageSettings: true,
  },
  Admin: {
    canInviteUsers: true,
    canDeleteUsers: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAccessAnalytics: true,
    canManageSettings: false,
  },
  User: {
    canInviteUsers: false,
    canDeleteUsers: false,
    canManageProjects: false,
    canViewAllProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canAccessAnalytics: false,
    canManageSettings: false,
  },
}

// Client
const client = generateClient<Schema>()

class UserManagementService {
  // Mock data for fallback
  private mockUsers: User[] = []
  private mockInvitations: UserInvitation[] = []

  // Core user operations
  async getUsersByCompany(companyId: string): Promise<User[]> {
    // For now, return mock data from localStorage if available
    const stored = localStorage.getItem(`users_${companyId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // Fall through to empty array
      }
    }

    return []
  }

  async getInvitationsByCompany(companyId: string): Promise<UserInvitation[]> {
    try {
      // Check if the UserInvitation model is available
      if (!client.models?.UserInvitation) {
        console.warn(
          'UserInvitation model not available. Using fallback storage.',
        )

        // Fallback: Return mock data from localStorage if available
        const stored = localStorage.getItem(`invitations_${companyId}`)
        if (stored) {
          try {
            return JSON.parse(stored)
          } catch {
            // Fall through to empty array
          }
        }

        return []
      }

      // Get invitations from the database
      const { data: invitations, errors } =
        await client.models.UserInvitation.list({
          filter: { companyId: { eq: companyId } },
        })

      if (errors) {
        console.error('Error getting invitations:', errors)
        // Fallback to localStorage on error
        const stored = localStorage.getItem(`invitations_${companyId}`)
        if (stored) {
          try {
            return JSON.parse(stored)
          } catch {
            return []
          }
        }
        return []
      }

      // Map the results to our interface
      const mappedInvitations: UserInvitation[] = invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as UserRole,
        companyId: inv.companyId,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt,
        status: inv.status as 'pending' | 'accepted' | 'expired' | 'cancelled',
        projectIds: [], // Will be populated separately if needed
        createdAt: inv.createdAt || new Date().toISOString(),
        updatedAt: inv.updatedAt,
      }))

      return mappedInvitations
    } catch (error) {
      console.error('Error getting invitations by company:', error)

      // Fallback to localStorage on any error
      const stored = localStorage.getItem(`invitations_${companyId}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return []
        }
      }

      return []
    }
  }

  async createInvitation(
    input: CreateInvitationInput,
  ): Promise<UserInvitation | null> {
    try {
      // Check if the UserInvitation model is available
      if (!client.models?.UserInvitation) {
        console.warn(
          'UserInvitation model not available. Using fallback storage.',
        )

        // Fallback: Generate mock invitation and store locally
        const invitation: UserInvitation = {
          id: crypto.randomUUID(),
          email: input.email,
          role: input.role,
          companyId: input.companyId,
          invitedBy: input.invitedBy,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days
          status: 'pending',
          projectIds: input.projectIds || [],
          createdAt: new Date().toISOString(),
        }

        // Store in localStorage for now
        const existing = await this.getInvitationsByCompany(input.companyId)
        const updated = [...existing, invitation]
        localStorage.setItem(
          `invitations_${input.companyId}`,
          JSON.stringify(updated),
        )

        return invitation
      }

      // Create the invitation in the database
      const { data: createdInvitation, errors } =
        await client.models.UserInvitation.create({
          email: input.email as string & string[],
          role: input.role as string & string[],
          companyId: input.companyId as string & string[],
          invitedBy: input.invitedBy as string & string[],
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString() as string & string[], // 7 days
          status: 'pending' as string & string[],
        })

      if (errors) {
        console.error('Error creating invitation:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!createdInvitation) {
        throw new Error('Failed to create invitation')
      }

      // Map the response to our interface
      const invitation: UserInvitation = {
        id: createdInvitation.id,
        email: createdInvitation.email,
        role: createdInvitation.role as UserRole,
        companyId: createdInvitation.companyId,
        invitedBy: createdInvitation.invitedBy,
        expiresAt: createdInvitation.expiresAt,
        status: createdInvitation.status as
          | 'pending'
          | 'accepted'
          | 'expired'
          | 'cancelled',
        projectIds: input.projectIds || [],
        createdAt: createdInvitation.createdAt || new Date().toISOString(),
        updatedAt: createdInvitation.updatedAt,
      }

      // If project IDs are provided, create project assignments
      if (input.projectIds && input.projectIds.length > 0) {
        for (const projectId of input.projectIds) {
          try {
            await client.models.InvitationProject.create({
              invitationId: invitation.id as string & string[],
              projectId: projectId as string & string[],
            })
          } catch (projectError) {
            console.warn(
              `Failed to assign project ${projectId} to invitation:`,
              projectError,
            )
          }
        }
      }

      return invitation
    } catch (error) {
      console.error('Error creating invitation:', error)
      return null
    }
  }

  // Combined method to create invitation and send email
  async inviteUser(input: InviteUserInput): Promise<UserInvitation | null> {
    try {
      // Create the invitation first
      const invitation = await this.createInvitation(input)
      if (!invitation) {
        throw new Error('Failed to create invitation')
      }

      // Generate acceptance URL (you may want to customize this)
      const acceptUrl = `${window.location.origin}/accept-invitation/${invitation.id}`

      // Send the invitation email
      try {
        await this.sendInvitationEmail({
          invitationId: invitation.id,
          recipientEmail: invitation.email,
          recipientName: invitation.email.split('@')[0], // Use email prefix as name for now
          inviterName: input.inviterName,
          companyName: input.companyName,
          role: invitation.role,
          acceptUrl: acceptUrl,
        })
      } catch (emailError) {
        console.warn('Invitation created but email failed:', emailError)
        // Don't fail the whole operation if email fails
      }

      return invitation
    } catch (error) {
      console.error('Error inviting user:', error)
      return null
    }
  }

  async sendInvitationEmail(params: {
    invitationId: string
    recipientEmail: string
    recipientName: string
    inviterName: string
    companyName: string
    role: string
    acceptUrl: string
  }): Promise<void> {
    try {
      // Check if the sendInvitationEmail mutation is available
      if (!client.mutations?.sendInvitationEmail) {
        throw new Error('Invitation email mutation not deployed yet')
      }

      // Prepare the email request
      const emailRequest = {
        invitationId: params.invitationId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        inviterName: params.inviterName,
        companyName: params.companyName,
        role: params.role,
        acceptUrl: params.acceptUrl,
      }

      // Call the GraphQL mutation
      const result = await client.mutations.sendInvitationEmail(emailRequest)

      // Handle different response formats (same pattern as contact service)
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
          console.error('Invitation email mutation errors:', errors)
          throw new Error(
            `Invitation email sending failed: ${errors.map(e => e.message).join(', ')}`,
          )
        }
      }

      // If we don't have a valid result, throw an error
      if (!emailResult) {
        throw new Error(
          'Invitation email sending failed: Invalid response format from mutation',
        )
      }

      if (emailResult.success === false) {
        throw new Error(
          `Invitation email sending failed: ${emailResult.error || 'Unknown error'}`,
        )
      }

      return
    } catch (error) {
      // Fallback: Log the email content for manual review
      console.warn(
        '📧 SES invitation email failed, logging content for manual processing:',
      )
      const emailData = {
        to: params.recipientEmail,
        from: 'invitations@scopeiq.ai',
        subject: `🚀 You're invited to join ${params.companyName} on ScopeIQ`,
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
USER INVITATION - ScopeIQ
=========================

Hi ${params.recipientName},

${params.inviterName} has invited you to join ${params.companyName} on ScopeIQ as a ${params.role}.

🎯 Role: ${params.role}
🏢 Company: ${params.companyName}
👤 Invited by: ${params.inviterName}
🕐 Invited: ${new Date().toLocaleString('en-AU', {
          timeZone: 'Australia/Sydney',
        })}
🆔 Invitation ID: ${params.invitationId}

To accept this invitation, click the link below:
${params.acceptUrl}

This invitation will expire in 7 days.

=========================
ScopeIQ Team
        `,
      }

      console.log('📧 INVITATION EMAIL CONTENT FOR MANUAL REVIEW:')
      console.log('='.repeat(50))
      console.log(`To: ${emailData.to}`)
      console.log(`From: ${emailData.from}`)
      console.log(`Subject: ${emailData.subject}`)
      console.log(`Timestamp: ${emailData.timestamp}`)
      console.log('='.repeat(50))
      console.log(emailData.body)
      console.log('='.repeat(50))

      // Don't throw here - we don't want email failures to block invitation creation
      // The invitation should be created even if email fails
      console.warn('Invitation created but email notification failed:', error)
    }
  }

  // Permission checking
  getUserPermissions(role: UserRole): RolePermissions['permissions'] {
    return ROLE_PERMISSIONS[role]
  }

  canUserPerformAction(
    role: UserRole,
    action: keyof RolePermissions['permissions'],
  ): boolean {
    return ROLE_PERMISSIONS[role][action]
  }

  // Simplified methods for now
  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    return null
  }

  async deleteUser(id: string): Promise<boolean> {
    return true
  }

  async acceptInvitation(invitationId: string): Promise<User | null> {
    return null
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      // Update the invitation status to 'cancelled'
      const { data: updatedInvitation, errors } = await client.models.UserInvitation.update({
        id: invitationId as string & string[],
        status: 'cancelled' as string & string[],
        updatedAt: new Date().toISOString() as string & string[],
      })

      if (errors) {
        console.error('Error cancelling invitation:', errors)
        throw new Error(`Database error: ${errors.map(e => e.message).join(', ')}`)
      }

      if (!updatedInvitation) {
        throw new Error('Failed to cancel invitation - invitation not found')
      }

      console.log('Invitation cancelled successfully:', invitationId)
      return true
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      return false
    }
  }

  async canUserAccessProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    return true
  }

  async getUsersByRole(companyId: string, role: UserRole): Promise<User[]> {
    const users = await this.getUsersByCompany(companyId)
    return users.filter(user => user.role === role)
  }

  async getActiveUsers(companyId: string): Promise<User[]> {
    const users = await this.getUsersByCompany(companyId)
    return users.filter(user => user.isActive)
  }

  async getUserById(id: string): Promise<User | null> {
    return null
  }

  async createUser(input: CreateUserInput): Promise<User | null> {
    // For now, create a mock user with proper defaults
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      companyId: input.companyId,
      isActive: true, // Default to active
      projectIds: input.projectIds || [],
      createdAt: new Date().toISOString(),
    }

    // Store in localStorage for now (fallback approach)
    const stored = localStorage.getItem(`users_${input.companyId}`)
    const existingUsers = stored ? JSON.parse(stored) : []
    const updatedUsers = [...existingUsers, user]
    localStorage.setItem(
      `users_${input.companyId}`,
      JSON.stringify(updatedUsers),
    )

    return user
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService()
