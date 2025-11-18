import { defineFunction } from '@aws-amplify/backend'

export const createCheckoutSession = defineFunction({
  name: 'create-checkout-session',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  },
})
