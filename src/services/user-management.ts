/**
 * User Management Service
 * Handles user creation, role assignment, and permissions
 */

import { User, UserRole, UserInvitation, RolePermissions } from '@/types'

// Role permissions configuration
export const ROLE_PERMISSIONS: Record<
  UserRole,
  RolePermissions['permissions']
> = {
  Admin: {
    // Company level permissions
    canManageCompany: true,
    canManageUsers: true,
    canViewAllProjects: true,

    // Project level permissions
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,

    // Document level permissions
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  Owner: {
    // Company level permissions
    canManageCompany: false,
    canManageUsers: false,
    canViewAllProjects: false, // Only assigned projects

    // Project level permissions
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,

    // Document level permissions
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  User: {
    // Company level permissions
    canManageCompany: false,
    canManageUsers: false,
    canViewAllProjects: false, // Only assigned projects

    // Project level permissions
    canCreateProjects: false,
    canDeleteProjects: false,
    canEditProjects: false,

    // Document level permissions
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

class UserManagementService {
  private users: Map<string, User> = new Map()
  private invitations: Map<string, UserInvitation> = new Map()

  // Initialize with some mock data
  constructor() {
    this.initializeMockData()
  }

  private initializeMockData() {
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@company.com',
        name: 'Admin User',
        role: 'Admin',
        companyId: 'company-1',
        projectIds: ['1', '2', '3'],
        isActive: true,
        createdAt: new Date('2024-01-15').toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'owner@company.com',
        name: 'Project Owner',
        role: 'Owner',
        companyId: 'company-1',
        projectIds: ['1', '2'],
        isActive: true,
        createdAt: new Date('2024-02-01').toISOString(),
        lastLoginAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        id: '3',
        email: 'user@company.com',
        name: 'Regular User',
        role: 'User',
        companyId: 'company-1',
        projectIds: ['1'],
        isActive: true,
        createdAt: new Date('2024-02-15').toISOString(),
        lastLoginAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
      {
        id: '4',
        email: 'inactive@company.com',
        name: 'Inactive User',
        role: 'User',
        companyId: 'company-1',
        projectIds: ['2'],
        isActive: false,
        createdAt: new Date('2024-01-20').toISOString(),
        lastLoginAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
      },
    ]

    mockUsers.forEach(user => this.users.set(user.id, user))

    // Add some mock invitations
    const mockInvitations: UserInvitation[] = [
      {
        id: 'inv-1',
        email: 'pending@company.com',
        role: 'User',
        companyId: 'company-1',
        projectIds: ['3'],
        invitedBy: '1',
        expiresAt: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]

    mockInvitations.forEach(inv => this.invitations.set(inv.id, inv))
  }

  // User CRUD operations
  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      isActive: true,
      createdAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
    }

    this.users.set(user.id, user)
    return user
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.companyId === companyId,
    )
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    const user = this.users.get(id)
    if (!user) return null

    const updatedUser: User = {
      ...user,
      ...input,
      updatedAt: new Date().toISOString(),
    }

    this.users.set(id, updatedUser)
    return updatedUser
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id)
  }

  // Invitation operations
  async inviteUser(input: InviteUserInput): Promise<UserInvitation> {
    const invitation: UserInvitation = {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      expiresAt: new Date(Date.now() + 604800000).toISOString(), // 1 week
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    this.invitations.set(invitation.id, invitation)
    return invitation
  }

  async getInvitationsByCompany(companyId: string): Promise<UserInvitation[]> {
    return Array.from(this.invitations.values()).filter(
      inv => inv.companyId === companyId,
    )
  }

  async acceptInvitation(invitationId: string): Promise<User | null> {
    const invitation = this.invitations.get(invitationId)
    if (!invitation || invitation.status !== 'pending') return null

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired'
      return null
    }

    // Create user from invitation
    const user = await this.createUser({
      email: invitation.email,
      name: invitation.email.split('@')[0], // Default name from email
      role: invitation.role,
      companyId: invitation.companyId,
      projectIds: invitation.projectIds,
    })

    // Mark invitation as accepted
    invitation.status = 'accepted'
    this.invitations.set(invitationId, invitation)

    return user
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    const invitation = this.invitations.get(invitationId)
    if (!invitation) return false

    invitation.status = 'cancelled'
    this.invitations.set(invitationId, invitation)
    return true
  }

  // Permission checking
  getUserPermissions(role: UserRole): RolePermissions['permissions'] {
    return ROLE_PERMISSIONS[role]
  }

  canUserAccessProject(user: User, projectId: string): boolean {
    // Admins can access all projects
    if (user.role === 'Admin') return true

    // Others can only access assigned projects
    return user.projectIds.includes(projectId)
  }

  canUserPerformAction(
    role: UserRole,
    action: keyof RolePermissions['permissions'],
  ): boolean {
    return ROLE_PERMISSIONS[role][action]
  }

  // Get users by role
  async getUsersByRole(companyId: string, role: UserRole): Promise<User[]> {
    const users = await this.getUsersByCompany(companyId)
    return users.filter(user => user.role === role)
  }

  // Get active users
  async getActiveUsers(companyId: string): Promise<User[]> {
    const users = await this.getUsersByCompany(companyId)
    return users.filter(user => user.isActive)
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService()
