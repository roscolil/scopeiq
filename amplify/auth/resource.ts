import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Welcome to ScopeIQ',
      verificationEmailBody: createCode =>
        `Use this code to verify your account: ${createCode()}`,
    },
  },
})
