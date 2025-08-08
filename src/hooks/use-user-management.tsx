/**
 * Hook for user management and RBAC functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { User, UserRole, UserInvitation } from '@/types'
import {
  userManagementService,
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
  ROLE_PERMISSIONS,
} from '@/services/user-management'
import { useToast } from '@/hooks/use-toast'

export function useUserManagement(companyId: string) {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load users and invitations
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [usersData, invitationsData] = await Promise.all([
        userManagementService.getUsersByCompany(companyId),
        userManagementService.getInvitationsByCompany(companyId),
      ])

      setUsers(usersData)
      setInvitations(invitationsData)
    } catch (err) {
      setError('Failed to load user data')
      console.error('Error loading user data:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadData()
  }, [companyId, loadData])

  // Create new user
  const createUser = async (input: CreateUserInput) => {
    try {
      const newUser = await userManagementService.createUser(input)
      setUsers(prev => [...prev, newUser])

      toast({
        title: 'User created',
        description: `${newUser.name} has been added successfully.`,
      })

      return newUser
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create user.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Update user
  const updateUser = async (id: string, input: UpdateUserInput) => {
    try {
      const updatedUser = await userManagementService.updateUser(id, input)
      if (updatedUser) {
        setUsers(prev =>
          prev.map(user => (user.id === id ? updatedUser : user)),
        )

        toast({
          title: 'User updated',
          description: `${updatedUser.name} has been updated successfully.`,
        })

        return updatedUser
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update user.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Delete user
  const deleteUser = async (id: string) => {
    try {
      const success = await userManagementService.deleteUser(id)
      if (success) {
        setUsers(prev => prev.filter(user => user.id !== id))

        toast({
          title: 'User deleted',
          description: 'User has been removed successfully.',
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Invite user
  const inviteUser = async (input: InviteUserInput) => {
    try {
      const invitation = await userManagementService.inviteUser(input)
      setInvitations(prev => [...prev, invitation])

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${invitation.email}.`,
      })

      return invitation
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const success = await userManagementService.cancelInvitation(invitationId)
      if (success) {
        setInvitations(prev =>
          prev.map(inv =>
            inv.id === invitationId
              ? { ...inv, status: 'cancelled' as const }
              : inv,
          ),
        )

        toast({
          title: 'Invitation cancelled',
          description: 'The invitation has been cancelled.',
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Get users by role
  const getUsersByRole = (role: UserRole): User[] => {
    return users.filter(user => user.role === role)
  }

  // Get active users
  const getActiveUsers = (): User[] => {
    return users.filter(user => user.isActive)
  }

  // Get pending invitations
  const getPendingInvitations = (): UserInvitation[] => {
    return invitations.filter(inv => inv.status === 'pending')
  }

  // Permission helpers
  const getUserPermissions = (role: UserRole) => {
    return ROLE_PERMISSIONS[role]
  }

  const canUserPerformAction = (
    role: UserRole,
    action: keyof (typeof ROLE_PERMISSIONS)[UserRole],
  ) => {
    return userManagementService.canUserPerformAction(role, action)
  }

  // Stats
  const stats = {
    totalUsers: users.length,
    activeUsers: getActiveUsers().length,
    adminCount: getUsersByRole('Admin').length,
    ownerCount: getUsersByRole('Owner').length,
    userCount: getUsersByRole('User').length,
    pendingInvitations: getPendingInvitations().length,
  }

  return {
    // Data
    users,
    invitations,
    loading,
    error,
    stats,

    // Actions
    createUser,
    updateUser,
    deleteUser,
    inviteUser,
    cancelInvitation,

    // Filters
    getUsersByRole,
    getActiveUsers,
    getPendingInvitations,

    // Permissions
    getUserPermissions,
    canUserPerformAction,

    // Utils
    loadData,
  }
}
