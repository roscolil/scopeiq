import { defineFunction } from '@aws-amplify/backend'

export const manageSubscription = defineFunction({
  name: 'manage-subscription',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  },
})
