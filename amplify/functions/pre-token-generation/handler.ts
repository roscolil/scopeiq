/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PreTokenGenerationTriggerHandler } from 'aws-lambda'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../data/resource'

// Configure Amplify for Lambda execution
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!,
      region: process.env.AWS_REGION!,
      defaultAuthMode: 'iam',
    },
  },
})

const client = generateClient<Schema>({
  authMode: 'iam',
}) as any

export const handler: PreTokenGenerationTriggerHandler = async event => {
  console.log(
    'Pre-token generation trigger started:',
    JSON.stringify(event.request, null, 2),
  )

  try {
    const { userAttributes } = event.request
    const email = userAttributes.email

    if (!email) {
      console.warn('No email found in user attributes')
      // Fallback: Assign Admin group even without email
      event.response = {
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            'custom:role': 'Admin',
            'custom:tokenIssuedAt': new Date().toISOString(),
          },
          groupOverrideDetails: {
            groupsToOverride: ['Admin'],
          },
        },
      }
      return event
    }

    console.log('Processing token for user:', email)

    // Get user data from DynamoDB to add custom claims
    const { data: users, errors: listErrors } = await client.models.User.list({
      filter: { email: { eq: email } },
    })

    if (listErrors) {
      console.error('Error fetching user data:', listErrors)
      // Fallback: Assign Admin group on database error
      event.response = {
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            'custom:role': 'Admin',
            'custom:companyId': 'default-company',
            'custom:tokenIssuedAt': new Date().toISOString(),
          },
          groupOverrideDetails: {
            groupsToOverride: ['Admin'],
          },
        },
      }
      return event
    }

    if (users.length === 0) {
      console.warn('User not found in database:', email)

      // Assign default role for users not yet in database (first time login after signup)
      console.log('Assigning Owner role for new user not yet in database')
      event.response = {
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            'custom:role': 'Owner',
            'custom:companyId': 'default', // Will be updated by post-confirmation
            'custom:isActive': 'true',
            'custom:tokenIssuedAt': new Date().toISOString(),
          },
          groupOverrideDetails: {
            groupsToOverride: ['Owner'],
          },
        },
      }
      return event
    }

    const user = users[0]
    console.log('Found user in database:', {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    })

    // Get user's project assignments
    const { data: projectAssignments, errors: projectErrors } =
      await client.models.UserProject.list({
        filter: { userId: { eq: user.id } },
      })

    if (projectErrors) {
      console.error('Error fetching project assignments:', projectErrors)
    }

    const projectIds =
      projectAssignments?.map(assignment => assignment.projectId) || []

    // Ensure user has a valid role, default to Admin if missing
    const userRole = user.role || 'Admin'

    console.log('Assigning role and groups:', {
      role: userRole,
      groups: [userRole],
    })

    // Add custom claims to both ID and Access tokens
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          // Role and permissions
          'custom:role': userRole,
          'custom:companyId': user.companyId || 'default-company',
          'custom:projectIds': JSON.stringify(projectIds),
          'custom:isActive': user.isActive?.toString() || 'true',

          // User context
          'custom:userId': user.id || '',
          'custom:userName': user.name || '',

          // Timestamps for session management
          'custom:lastLoginAt': user.lastLoginAt || '',
          'custom:tokenIssuedAt': new Date().toISOString(),
        },

        // Add user to appropriate Cognito group based on role
        groupOverrideDetails: {
          groupsToOverride: [userRole], // Always assign the role as a group
        },
      },
    }

    // Update last login time in DynamoDB
    try {
      await client.models.User.update({
        id: user.id,
        lastLoginAt: new Date().toISOString(),
      })
    } catch (updateError) {
      console.error('Error updating last login time:', updateError)
      // Don't fail token generation for this
    }

    console.log('Successfully added custom claims for user:', {
      email: user.email,
      role: userRole,
      companyId: user.companyId,
      projectCount: projectIds.length,
      groups: [userRole],
    })

    return event
  } catch (error) {
    console.error('Error in pre-token generation trigger:', error)

    // Fallback: Always assign Admin group on any error
    console.log('Assigning fallback Admin group due to error')
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          'custom:role': 'Admin',
          'custom:companyId': 'default-company',
          'custom:tokenIssuedAt': new Date().toISOString(),
        },
        groupOverrideDetails: {
          groupsToOverride: ['Admin'],
        },
      },
    }

    return event
  }
}
