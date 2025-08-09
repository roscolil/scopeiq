// User Management Service - Clean simplified version
// Simplified service to handle user management operations with mock data fallback

import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Types
export type UserRole = 'Owner' | 'Admin' | 'Manager' | 'Viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string
  isActive: boolean
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
  Manager: {
    canInviteUsers: true,
    canDeleteUsers: false,
    canManageProjects: true,
    canViewAllProjects: false,
    canEditProjects: true,
    canDeleteProjects: false,
    canAccessAnalytics: true,
    canManageSettings: false,
  },
  Viewer: {
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
    console.log('Getting users for company (mock):', companyId)

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
    console.log('Getting invitations for company (mock):', companyId)

    // For now, return mock data from localStorage if available
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

  async createInvitation(
    input: CreateInvitationInput,
  ): Promise<UserInvitation | null> {
    try {
      console.log('Creating invitation (mock):', input)

      // Generate mock invitation
      const invitation: UserInvitation = {
        id: crypto.randomUUID(),
        email: input.email,
        role: input.role,
        companyId: input.companyId,
        invitedBy: input.invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
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
    } catch (error) {
      console.error('Error creating invitation:', error)
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
      console.log('Invitation email would be sent with params:', params)

      // For now, we'll log this and potentially use the contact email service as a fallback
      // Once the deployment is complete and types are fixed, we can switch to the proper mutation

      console.log('Invitation email sent successfully (mock for now)')
    } catch (error) {
      console.error('Error sending invitation email:', error)
      throw error
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
    console.log('Update user (mock):', id, input)
    return null
  }

  async deleteUser(id: string): Promise<boolean> {
    console.log('Delete user (mock):', id)
    return true
  }

  async acceptInvitation(invitationId: string): Promise<User | null> {
    console.log('Accept invitation (mock):', invitationId)
    return null
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    console.log('Cancel invitation (mock):', invitationId)
    return true
  }

  async canUserAccessProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    console.log('Check project access (mock):', userId, projectId)
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
    console.log('Get user by ID (mock):', id)
    return null
  }

  async createUser(input: CreateUserInput): Promise<User | null> {
    console.log('Create user (mock):', input)
    return null
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService()
