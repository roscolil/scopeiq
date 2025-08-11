import { defineFunction } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
  // Remove resourceGroupName to let Amplify handle the assignment automatically
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT:
      process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
})
