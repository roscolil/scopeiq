/**
 * Manual user role management utilities
 * For fixing user roles and testing role assignments
 */

import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = generateClient<Schema>() as any

interface UserInfo {
  cognito: {
    userId: string
    email?: string
    cognitoGroups: string
    customRole: string
    customCompanyId: string
  }
  database:
    | {
        id: string
        email: string
        role: string
        companyId: string
        isActive?: boolean
      }
    | string
}

interface DatabaseUser {
  id: string
  email: string
  role: 'Admin' | 'Owner' | 'User'
  companyId: string
  isActive?: boolean
}

export const roleManagementUtils = {
  // Update a user's role by email (for admin use)
  async updateUserRoleByEmail(
    email: string,
    newRole: 'Admin' | 'Owner' | 'User',
  ): Promise<void> {
    try {
      console.log(`Updating user role for ${email} to ${newRole}`)

      // Find user by email
      const { data: users, errors: listErrors } = await client.models.User.list(
        {
          filter: { email: { eq: email } },
        },
      )

      if (listErrors) {
        console.error('Error finding user:', listErrors)
        throw new Error(
          `Failed to find user: ${listErrors.map(e => e.message).join(', ')}`,
        )
      }

      if (users.length === 0) {
        throw new Error(`User with email ${email} not found`)
      }

      const user = users[0]
      console.log('Found user:', {
        id: user.id,
        email: user.email,
        currentRole: user.role,
      })

      // Update user role
      const { data: updatedUser, errors: updateErrors } =
        await client.models.User.update({
          id: user.id,
          role: newRole,
        })

      if (updateErrors) {
        console.error('Error updating user role:', updateErrors)
        throw new Error(
          `Failed to update user role: ${updateErrors.map(e => e.message).join(', ')}`,
        )
      }

      console.log('Successfully updated user role:', {
        id: user.id,
        email: user.email,
        oldRole: user.role,
        newRole: updatedUser?.role,
      })

      return updatedUser
    } catch (error) {
      console.error('Error in updateUserRoleByEmail:', error)
      throw error
    }
  },

  // List all users in the system (for admin debugging)
  async listAllUsers(): Promise<DatabaseUser[]> {
    try {
      const { data: users, errors: listErrors } =
        await client.models.User.list()

      if (listErrors) {
        console.error('Error listing users:', listErrors)
        throw new Error(
          `Failed to list users: ${listErrors.map((e: { message: string }) => e.message).join(', ')}`,
        )
      }

      console.log('All users in system:')
      users.forEach((user: DatabaseUser) => {
        console.log(
          `- ${user.email}: ${user.role} (Company: ${user.companyId})`,
        )
      })

      return users
    } catch (error) {
      console.error('Error in listAllUsers:', error)
      throw error
    }
  },

  // Check current user's role and permissions
  async checkCurrentUserRole(): Promise<UserInfo> {
    try {
      const { getCurrentUser, fetchUserAttributes } = await import(
        'aws-amplify/auth'
      )

      const cognitoUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()
      const email = attributes.email!

      // Get user from DynamoDB
      const { data: users } = await client.models.User.list({
        filter: { email: { eq: email } },
      })

      const dbUser = users[0]

      const userInfo = {
        cognito: {
          userId: cognitoUser.userId,
          email: attributes.email,
          cognitoGroups: attributes['cognito:groups'] || 'None',
          customRole: attributes['custom:role'] || 'None',
          customCompanyId: attributes['custom:companyId'] || 'None',
        },
        database: dbUser
          ? {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
              companyId: dbUser.companyId,
              isActive: dbUser.isActive,
            }
          : 'User not found in database',
      }

      console.log('Current user info:', userInfo)
      return userInfo
    } catch (error) {
      console.error('Error checking current user role:', error)
      throw error
    }
  },
}

// Helper functions to call from browser console
if (typeof window !== 'undefined') {
  // @ts-expect-error - Adding to window for console access
  window.roleUtils = roleManagementUtils
  console.log('Role management utilities available as window.roleUtils')
  console.log('Usage:')
  console.log('- roleUtils.checkCurrentUserRole() - Check your current role')
  console.log(
    '- roleUtils.updateUserRoleByEmail("email@example.com", "Admin") - Update user role',
  )
  console.log('- roleUtils.listAllUsers() - List all users (admin only)')
}
