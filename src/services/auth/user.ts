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
    // Add retry mechanism for race conditions with post-confirmation Lambda
    const maxRetries = 3
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`User sync attempt ${attempt}/${maxRetries}`)

        // Small delay to allow post-confirmation Lambda to complete
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }

        return await this._createOrSyncUserInternal()
      } catch (error) {
        console.error(`User sync attempt ${attempt} failed:`, error)
        lastError = error

        if (attempt === maxRetries) {
          break
        }
      }
    }

    throw lastError
  },

  async _createOrSyncUserInternal(): Promise<DatabaseUser> {
    try {
      // Get current Cognito user
      const cognitoUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()

      const email = attributes.email!
      const name =
        attributes.name || attributes.given_name || email.split('@')[0]

      console.log('Attempting to create/sync user:', { email, name })

      // Check if user already exists in DynamoDB
      const { data: existingUsers, errors: listErrors } =
        await client.models.User.list({
          filter: { email: { eq: email } },
        })

      if (listErrors) {
        console.error('Error checking existing users:', listErrors)
        throw new Error(
          `Failed to check existing users: ${listErrors.map(e => e.message).join(', ')}`,
        )
      }

      if (existingUsers.length > 0) {
        // Update existing user with latest Cognito data
        const existingUser = existingUsers[0]
        console.log(
          'Found existing user, updating login time:',
          existingUser.id,
        )

        // Try to update login time, but don't fail if it doesn't work
        let updatedLastLoginAt = existingUser.lastLoginAt
        try {
          const { data: updatedUser, errors: updateErrors } =
            await client.models.User.update({
              id: existingUser.id,
              lastLoginAt: new Date().toISOString(),
            })

          if (updateErrors) {
            console.warn(
              'Could not update login time (non-critical):',
              updateErrors,
            )
          } else {
            updatedLastLoginAt =
              updatedUser?.lastLoginAt || existingUser.lastLoginAt
            console.log('Successfully updated login time')
          }
        } catch (updateError) {
          console.warn(
            'Could not update login time (non-critical):',
            updateError,
          )
        }

        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role as 'Admin' | 'Owner' | 'User',
          companyId: existingUser.companyId,
          isActive: existingUser.isActive ?? true,
          lastLoginAt: updatedLastLoginAt,
          invitedAt: existingUser.invitedAt,
          acceptedAt: existingUser.acceptedAt,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
        }
      } else {
        console.log('No existing user found, creating new user')

        // Create new user in DynamoDB
        // Check if user already has a company ID from post-confirmation
        let companyId = attributes['custom:companyId']

        if (!companyId) {
          console.log('No company ID found, creating default company')
          // Create default company for new user
          const { data: newCompany, errors: companyErrors } =
            await client.models.Company.create({
              name: `${name}'s Company`,
              description: 'Default company created during signup',
            })

          if (companyErrors) {
            console.error('Error creating company:', companyErrors)
            throw new Error(
              `Failed to create company: ${companyErrors.map(e => e.message).join(', ')}`,
            )
          }

          if (!newCompany) {
            throw new Error('Failed to create company - no data returned')
          }

          companyId = newCompany.id
          console.log('Created new company:', companyId)
        } else {
          console.log('Using existing company ID:', companyId)
        }

        // Determine role from Cognito attributes or default to Owner
        const roleFromCognito = attributes['custom:role'] as
          | 'Admin'
          | 'Owner'
          | 'User'
        const userRole = roleFromCognito || 'Owner'

        console.log(
          'Creating user with role:',
          userRole,
          'from Cognito attributes:',
          roleFromCognito,
        )

        const { data: newUser, errors: userErrors } =
          await client.models.User.create({
            email,
            name,
            role: userRole, // Use role from Cognito or default to Owner
            companyId,
            isActive: true,
            acceptedAt: new Date().toISOString(),
          })

        if (userErrors) {
          console.error('Error creating user:', userErrors)
          throw new Error(
            `Failed to create user: ${userErrors.map(e => e.message).join(', ')}`,
          )
        }

        if (!newUser) {
          throw new Error('Failed to create user - no data returned')
        }

        console.log('Successfully created new user:', {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          companyId: newUser.companyId,
        })

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
      console.error('Error in _createOrSyncUserInternal:', error)
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
