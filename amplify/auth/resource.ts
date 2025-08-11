import { defineAuth } from '@aws-amplify/backend'
import { postConfirmation } from '../functions/post-confirmation/resource'

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Welcome to ScopeIQ',
      verificationEmailBody: createCode =>
        `Use this code to verify your account: ${createCode()}`,
    },
  },
  groups: ['Admin', 'Owner', 'User'],
  userAttributes: {
    email: {
      required: true,
      mutable: false,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
    'custom:companyId': {
      dataType: 'String',
      mutable: true,
    },
  },
  triggers: {
    postConfirmation,
  },
})
