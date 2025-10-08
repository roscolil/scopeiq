import { defineAuth } from '@aws-amplify/backend'
import { postConfirmation } from '../functions/post-confirmation/resource'
import { preTokenGeneration } from '../functions/pre-token-generation/resource'

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Welcome to Jack of All Trades - Verify Your Account',
      verificationEmailBody: createCode =>
        `Welcome to Jack of All Trades! Use this verification code to complete your account setup: ${createCode()}`,
    },
  },
  // Cognito Groups for role-based access control
  groups: ['Admin', 'Owner', 'User'],

  // User Pool configuration for enhanced security
  userAttributes: {
    email: {
      required: true,
      mutable: false, // Email should not be changeable for security
    },
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    // Custom attributes for RBAC and multi-tenancy
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
    'custom:companyId': {
      dataType: 'String',
      mutable: true,
    },
    'custom:projectIds': {
      dataType: 'String', // JSON array of project IDs
      mutable: true,
    },
    'custom:lastLoginAt': {
      dataType: 'String',
      mutable: true,
    },
  },

  // Lambda triggers for enhanced security and user management
  triggers: {
    postConfirmation,
    preTokenGeneration, // Add custom claims to JWT tokens
  },

  // Account recovery settings
  accountRecovery: 'EMAIL_ONLY',

  // Multi-factor authentication settings
  multifactor: {
    mode: 'OPTIONAL', // Users can enable MFA
    sms: true,
    totp: true,
  },
})
