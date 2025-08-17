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
      return event
    }

    // Get user data from DynamoDB to add custom claims
    const { data: users, errors: listErrors } = await client.models.User.list({
      filter: { email: { eq: email } },
    })

    if (listErrors) {
      console.error('Error fetching user data:', listErrors)
      return event
    }

    if (users.length === 0) {
      console.warn('User not found in database:', email)
      return event
    }

    const user = users[0]

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

    // Add custom claims to both ID and Access tokens
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          // Role and permissions
          'custom:role': user.role || 'User',
          'custom:companyId': user.companyId || '',
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
          groupsToOverride: user.role ? [user.role] : ['User'],
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
      role: user.role,
      companyId: user.companyId,
      projectCount: projectIds.length,
    })

    return event
  } catch (error) {
    console.error('Error in pre-token generation trigger:', error)
    // Don't fail the auth flow - return event without modifications
    return event
  }
}
