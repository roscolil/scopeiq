/**
 * Real User Management Service with AWS Amplify Integration
 * Replaces the mock service with actual API calls
 */

import { generateClient } from 'aws-amplify/data'
import { getCurrentUser, signOut } from 'aws-amplify/auth'
import type { Schema } from 'amplify/data/resource'
import { User, UserRole, UserInvitation, RolePermissions } from '@/types'

// Generate the data client
const client = generateClient<Schema>()

// Role permissions configuration (same as mock)
export const ROLE_PERMISSIONS: Record<
  UserRole,
  RolePermissions['permissions']
> = {
  Admin: {
    canManageCompany: true,
    canManageUsers: true,
    canViewAllProjects: true,
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  Owner: {
    canManageCompany: false,
    canManageUsers: false,
    canViewAllProjects: false,
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  User: {
    canManageCompany: false,
    canManageUsers: false,
    canViewAllProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canEditProjects: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
}

export interface CreateUserInput {
  email: string
  name: string
  role: UserRole
  companyId: string
  projectIds: string[]
}

export interface UpdateUserInput {
  name?: string
  role?: UserRole
  projectIds?: string[]
  isActive?: boolean
}

export interface InviteUserInput {
  email: string
  role: UserRole
  companyId: string
  projectIds: string[]
  invitedBy: string
}

class RealUserManagementService {
  // Get current user info
  async getCurrentUserInfo() {
    try {
      const currentUser = await getCurrentUser()
      return currentUser
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // User CRUD operations
  async createUser(input: CreateUserInput): Promise<User> {
    try {
      // Create the user record
      const { data: newUser, errors } = await client.models.User.create({
        email: input.email,
        name: input.name,
        role: input.role,
        companyId: input.companyId,
        isActive: true,
        acceptedAt: new Date().toISOString(),
      })

      if (errors) {
        throw new Error(
          `Failed to create user: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!newUser) {
        throw new Error('Failed to create user: No data returned')
      }

      // Create project assignments if not Admin (Admin has access to all)
      if (input.role !== 'Admin' && input.projectIds.length > 0) {
        await Promise.all(
          input.projectIds.map(projectId =>
            client.models.UserProject.create({
              userId: newUser.id,
              projectId,
            }),
          ),
        )
      }

      // Convert to our User type
      return this.convertAmplifyUserToUser(newUser, input.projectIds)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const { data: user, errors } = await client.models.User.get({ id })

      if (errors || !user) {
        return null
      }

      // Get project assignments
      const { data: assignments } = await client.models.UserProject.list({
        filter: { userId: { eq: id } },
      })

      const projectIds = assignments?.map(a => a.projectId) || []
      return this.convertAmplifyUserToUser(user, projectIds)
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    try {
      const { data: users, errors } = await client.models.User.list({
        filter: { companyId: { eq: companyId } },
      })

      if (errors) {
        throw new Error(
          `Failed to get users: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      // Get project assignments for all users
      const usersWithProjects = await Promise.all(
        (users || []).map(async user => {
          const { data: assignments } = await client.models.UserProject.list({
            filter: { userId: { eq: user.id } },
          })
          const projectIds = assignments?.map(a => a.projectId) || []
          return this.convertAmplifyUserToUser(user, projectIds)
        }),
      )

      return usersWithProjects
    } catch (error) {
      console.error('Error getting users by company:', error)
      throw error
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    try {
      // Update user record
      const updateData: Partial<{
        name: string
        role: UserRole
        isActive: boolean
      }> = {}
      if (input.name) updateData.name = input.name
      if (input.role) updateData.role = input.role
      if (input.isActive !== undefined) updateData.isActive = input.isActive

      const { data: user, errors } = await client.models.User.update({
        id,
        ...updateData,
      })

      if (errors || !user) {
        throw new Error(
          `Failed to update user: ${errors?.map(e => e.message).join(', ')}`,
        )
      }

      // Update project assignments if provided
      if (input.projectIds !== undefined) {
        // Remove existing assignments
        const { data: existingAssignments } =
          await client.models.UserProject.list({
            filter: { userId: { eq: id } },
          })

        if (existingAssignments) {
          await Promise.all(
            existingAssignments.map(assignment =>
              client.models.UserProject.delete({ id: assignment.id }),
            ),
          )
        }

        // Add new assignments (only if not Admin)
        if (
          input.role &&
          input.role !== 'Admin' &&
          input.projectIds.length > 0
        ) {
          await Promise.all(
            input.projectIds.map(projectId =>
              client.models.UserProject.create({
                userId: id,
                projectId,
              }),
            ),
          )
        }
      }

      const projectIds = input.projectIds || []
      return this.convertAmplifyUserToUser(user, projectIds)
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Delete project assignments first
      const { data: assignments } = await client.models.UserProject.list({
        filter: { userId: { eq: id } },
      })

      if (assignments) {
        await Promise.all(
          assignments.map(assignment =>
            client.models.UserProject.delete({ id: assignment.id }),
          ),
        )
      }

      // Delete user
      const { errors } = await client.models.User.delete({ id })

      if (errors) {
        throw new Error(
          `Failed to delete user: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  // Invitation operations
  async inviteUser(input: InviteUserInput): Promise<UserInvitation> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

      const { data: invitation, errors } =
        await client.models.UserInvitation.create({
          email: input.email,
          role: input.role,
          companyId: input.companyId,
          invitedBy: input.invitedBy,
          expiresAt: expiresAt.toISOString(),
          status: 'pending',
        })

      if (errors || !invitation) {
        throw new Error(
          `Failed to create invitation: ${errors?.map(e => e.message).join(', ')}`,
        )
      }

      // Create project assignments for the invitation
      if (input.projectIds.length > 0) {
        await Promise.all(
          input.projectIds.map(projectId =>
            client.models.InvitationProject.create({
              invitationId: invitation.id,
              projectId,
            }),
          ),
        )
      }

      return this.convertAmplifyInvitationToInvitation(
        invitation,
        input.projectIds,
      )
    } catch (error) {
      console.error('Error creating invitation:', error)
      throw error
    }
  }

  async getInvitationsByCompany(companyId: string): Promise<UserInvitation[]> {
    try {
      const { data: invitations, errors } =
        await client.models.UserInvitation.list({
          filter: { companyId: { eq: companyId } },
        })

      if (errors) {
        throw new Error(
          `Failed to get invitations: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      // Get project assignments for all invitations
      const invitationsWithProjects = await Promise.all(
        (invitations || []).map(async invitation => {
          const { data: assignments } =
            await client.models.InvitationProject.list({
              filter: { invitationId: { eq: invitation.id } },
            })
          const projectIds = assignments?.map(a => a.projectId) || []
          return this.convertAmplifyInvitationToInvitation(
            invitation,
            projectIds,
          )
        }),
      )

      return invitationsWithProjects
    } catch (error) {
      console.error('Error getting invitations:', error)
      throw error
    }
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { errors } = await client.models.UserInvitation.update({
        id: invitationId,
        status: 'cancelled',
      })

      if (errors) {
        throw new Error(
          `Failed to cancel invitation: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      return true
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      throw error
    }
  }

  // Permission checking (same as mock)
  getUserPermissions(role: UserRole): RolePermissions['permissions'] {
    return ROLE_PERMISSIONS[role]
  }

  canUserAccessProject(user: User, projectId: string): boolean {
    if (user.role === 'Admin') return true
    return user.projectIds.includes(projectId)
  }

  canUserPerformAction(
    role: UserRole,
    action: keyof RolePermissions['permissions'],
  ): boolean {
    return ROLE_PERMISSIONS[role][action]
  }

  // Helper methods to convert Amplify types to our types
  private convertAmplifyUserToUser(
    amplifyUser: Schema['User']['type'],
    projectIds: string[],
  ): User {
    return {
      id: amplifyUser.id,
      email: amplifyUser.email,
      name: amplifyUser.name,
      role: amplifyUser.role as UserRole,
      companyId: amplifyUser.companyId,
      projectIds,
      isActive: amplifyUser.isActive ?? true,
      createdAt: amplifyUser.createdAt,
      updatedAt: amplifyUser.updatedAt,
      lastLoginAt: amplifyUser.lastLoginAt,
      invitedAt: amplifyUser.invitedAt,
      acceptedAt: amplifyUser.acceptedAt,
    }
  }

  private convertAmplifyInvitationToInvitation(
    amplifyInvitation: Schema['UserInvitation']['type'],
    projectIds: string[],
  ): UserInvitation {
    return {
      id: amplifyInvitation.id,
      email: amplifyInvitation.email,
      role: amplifyInvitation.role as UserRole,
      companyId: amplifyInvitation.companyId,
      projectIds,
      invitedBy: amplifyInvitation.invitedBy,
      expiresAt: amplifyInvitation.expiresAt,
      status: amplifyInvitation.status as UserInvitation['status'],
      createdAt: amplifyInvitation.createdAt,
      updatedAt: amplifyInvitation.updatedAt,
    }
  }
}

// Export singleton instance
export const realUserManagementService = new RealUserManagementService()
