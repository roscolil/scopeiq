import { defineFunction } from '@aws-amplify/backend'

export const preTokenGeneration = defineFunction({
  name: 'pre-token-generation',
  entry: './handler.ts',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT:
      process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
})
