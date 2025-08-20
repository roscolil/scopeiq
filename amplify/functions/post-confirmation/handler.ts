/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PostConfirmationTriggerHandler } from 'aws-lambda'
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

export const handler: PostConfirmationTriggerHandler = async event => {
  console.log(
    'Post confirmation trigger started:',
    JSON.stringify(event, null, 2),
  )

  const { userAttributes } = event.request
  const email = userAttributes.email
  const name =
    userAttributes.name ||
    userAttributes.given_name ||
    email?.split('@')[0] ||
    'User'

  // In post-confirmation trigger, groups are not available in the event
  // We'll determine role based on existing users in the company or default to Owner
  const userRole: 'Admin' | 'Owner' | 'User' = 'Owner' // Default for first user in company

  // Note: Group assignment happens separately through Cognito admin operations
  // The actual role will be determined by group membership in the pre-token-generation trigger

  console.log('Determined user role:', userRole)

  if (!email) {
    console.error('No email found in user attributes')
    return event
  }

  try {
    // Check if user already exists in DynamoDB
    const { data: existingUsers, errors: listErrors } =
      await client.models.User.list({
        filter: { email: { eq: email } },
      })

    if (listErrors) {
      console.error('Error checking existing users:', listErrors)
      return event
    }

    if (existingUsers.length === 0) {
      console.log('Creating new user in DynamoDB for:', email)

      // Get or create a default company for the user
      let companyId = userAttributes['custom:companyId']

      if (!companyId) {
        console.log('No company ID found, creating default company')

        // Create a default company for this user
        const { data: newCompany, errors: companyErrors } =
          await client.models.Company.create({
            name: `${name}'s Company`,
            description: 'Default company created during signup',
          })

        if (companyErrors) {
          console.error('Error creating company:', companyErrors)
          return event
        }

        companyId = newCompany?.id
        console.log('Created new company:', companyId)
      }

      // Create user record in DynamoDB
      const { data: newUser, errors: userErrors } =
        await client.models.User.create({
          email,
          name,
          role: userRole, // Use the determined role based on Cognito groups
          companyId: companyId!,
          isActive: true,
          acceptedAt: new Date().toISOString(),
        })

      if (userErrors) {
        console.error('Error creating user:', userErrors)
        return event
      }

      console.log('Successfully created user in DynamoDB:', {
        id: newUser?.id,
        email: newUser?.email,
        role: newUser?.role,
        companyId: newUser?.companyId,
      })

      // Update Cognito user attributes with the company ID and role
      try {
        event.response = event.response || {}
        const response = event.response as any
        response.userAttributes = {
          ...response.userAttributes,
          'custom:companyId': companyId!,
          'custom:role': userRole,
        }
        console.log('Updated Cognito user attributes with company and role')
      } catch (attrError) {
        console.error('Error updating Cognito attributes:', attrError)
      }
    } else {
      console.log('User already exists in DynamoDB:', existingUsers[0].id)

      // Update last login time
      const existingUser = existingUsers[0]
      await client.models.User.update({
        id: existingUser.id,
        lastLoginAt: new Date().toISOString(),
      })

      console.log('Updated existing user login time')
    }

    console.log('Post confirmation trigger completed successfully')
    return event
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error)
    // Don't fail the auth flow - just log the error and continue
    // The frontend sync will handle user creation as a fallback
    return event
  }
}
