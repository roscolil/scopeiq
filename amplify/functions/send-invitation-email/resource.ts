import { defineFunction } from '@aws-amplify/backend'

export const sendInvitationEmail = defineFunction({
  name: 'send-invitation-email',
  entry: './handler.ts',
  environment: {
    SES_REGION: 'ap-southeast-2',
    FROM_EMAIL: 'ross@exelion.ai',
  },
})
