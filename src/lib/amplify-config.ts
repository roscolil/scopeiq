// AWS Amplify configuration types
import type { ResourcesConfig } from 'aws-amplify'

// Function to get Amplify configuration with environment variables as fallback
export const getAmplifyConfig = (): ResourcesConfig => {
  return {
    Auth: {
      Cognito: {
        userPoolId:
          import.meta.env.VITE_AWS_USER_POOL_ID || 'ap-southeast-2_5YHqOMRto',
        userPoolClientId:
          import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID ||
          '1k5dtmskd86v45o0vk7bv7qfq0',
        identityPoolId:
          import.meta.env.VITE_AWS_IDENTITY_POOL_ID ||
          'ap-southeast-2:8e8f5a01-ba68-4ea0-b4ad-b36b1fe5c7b9',
        loginWith: {
          oauth: {
            domain:
              import.meta.env.VITE_AWS_OAUTH_DOMAIN ||
              'scopeiq.auth.ap-southeast-2.amazoncognito.com',
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [
              import.meta.env.VITE_AWS_OAUTH_REDIRECT_SIGN_IN ||
                'http://localhost:5173/',
            ],
            redirectSignOut: [
              import.meta.env.VITE_AWS_OAUTH_REDIRECT_SIGN_OUT ||
                'http://localhost:5173/',
            ],
            responseType: 'code' as const,
          },
          username: true,
          email: true,
        },
      },
    },
    API: {
      GraphQL: {
        endpoint:
          import.meta.env.VITE_AWS_GRAPHQL_ENDPOINT ||
          'https://rauqe6czs5cztmjxylk6rn5iqy.appsync-api.ap-southeast-2.amazonaws.com/graphql',
        region: import.meta.env.VITE_AWS_REGION || 'ap-southeast-2',
        defaultAuthMode: 'userPool' as const,
      },
    },
    Storage: {
      S3: {
        bucket:
          import.meta.env.VITE_AWS_S3_BUCKET ||
          'amplify-scopeiq-s-s3buckets3bucket-o0vdcwxbz6mi',
        region: import.meta.env.VITE_AWS_REGION || 'ap-southeast-2',
      },
    },
  }
}
