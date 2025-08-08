import { defineFunction } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT:
      process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
})
