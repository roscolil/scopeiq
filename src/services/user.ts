/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'

const client = generateClient<Schema>() as any

export interface DatabaseUser {
  id: string
  email: string
  name: string
  role: 'Admin' | 'Owner' | 'User'
  companyId: string
  isActive: boolean
  lastLoginAt?: string | null
  invitedAt?: string | null
  acceptedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export const userService = {
  // Create or sync user in DynamoDB after Cognito signup
  async createOrSyncUser(): Promise<DatabaseUser> {
    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()

      const email = attributes.email!
      const name =
        attributes.name || attributes.given_name || email.split('@')[0]

      // Check if user already exists in DynamoDB
      const { data: existingUsers } = await client.models.User.list({
        filter: { email: { eq: email } },
      })

      if (existingUsers.length > 0) {
        // Update existing user with latest Cognito data
        const existingUser = existingUsers[0]
        const { data: updatedUser } = await client.models.User.update({
          id: existingUser.id,
          lastLoginAt: new Date().toISOString(),
        })

        if (!updatedUser) {
          throw new Error('Failed to update user')
        }

        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role as 'Admin' | 'Owner' | 'User',
          companyId: existingUser.companyId,
          isActive: existingUser.isActive ?? true,
          lastLoginAt: new Date().toISOString(),
          invitedAt: existingUser.invitedAt,
          acceptedAt: existingUser.acceptedAt,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
        }
      } else {
        // Create new user in DynamoDB
        // For now, create a default company for new users
        let companyId = attributes['custom:companyId']

        if (!companyId) {
          // Create default company for new user
          const { data: newCompany } = await client.models.Company.create({
            name: `${name}'s Company`,
            description: 'Default company',
          })

          if (!newCompany) {
            throw new Error('Failed to create company')
          }

          companyId = newCompany.id
        }

        const { data: newUser } = await client.models.User.create({
          email,
          name,
          role: 'Owner', // First user in a company becomes Owner
          companyId,
          isActive: true,
          acceptedAt: new Date().toISOString(),
        })

        if (!newUser) {
          throw new Error('Failed to create user')
        }

        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role as 'Admin' | 'Owner' | 'User',
          companyId: newUser.companyId,
          isActive: newUser.isActive ?? true,
          lastLoginAt: newUser.lastLoginAt,
          invitedAt: newUser.invitedAt,
          acceptedAt: newUser.acceptedAt,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        }
      }
    } catch (error) {
      console.error('Error creating/syncing user:', error)
      throw error
    }
  },

  // Get current user's DynamoDB record
  async getCurrentDatabaseUser(): Promise<DatabaseUser | null> {
    try {
      const cognitoUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()
      const email = attributes.email!

      const { data: users } = await client.models.User.list({
        filter: { email: { eq: email } },
      })

      if (users.length === 0) {
        return null
      }

      const user = users[0]
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'Admin' | 'Owner' | 'User',
        companyId: user.companyId,
        isActive: user.isActive ?? true,
        lastLoginAt: user.lastLoginAt,
        invitedAt: user.invitedAt,
        acceptedAt: user.acceptedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    } catch (error) {
      console.error('Error getting current database user:', error)
      return null
    }
  },

  // Update user role (Admin only)
  async updateUserRole(
    userId: string,
    role: 'Admin' | 'Owner' | 'User',
  ): Promise<void> {
    try {
      await client.models.User.update({
        id: userId,
        role,
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  },

  // Get all users in the current user's company
  async getCompanyUsers(): Promise<DatabaseUser[]> {
    try {
      const currentUser = await this.getCurrentDatabaseUser()
      if (!currentUser) {
        throw new Error('User not found')
      }

      const { data: users } = await client.models.User.list({
        filter: { companyId: { eq: currentUser.companyId } },
      })

      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'Admin' | 'Owner' | 'User',
        companyId: user.companyId,
        isActive: user.isActive ?? true,
        lastLoginAt: user.lastLoginAt,
        invitedAt: user.invitedAt,
        acceptedAt: user.acceptedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
    } catch (error) {
      console.error('Error getting company users:', error)
      throw error
    }
  },
}
