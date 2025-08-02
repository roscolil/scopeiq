/**
 * AWS configuration utility
 * Gets AWS configuration from Amplify outputs and environment variables
 */

import { env } from '../services/env'
import amplifyOutputs from '../../amplify_outputs.json'

// Define the type for Amplify outputs
interface AmplifyOutputs {
  storage?: {
    bucket_name?: string
    aws_region?: string
  }
}

// Cast the imported outputs to our type
const outputs = amplifyOutputs as AmplifyOutputs

// Get S3 bucket name from Amplify configuration
export const getS3BucketName = (): string => {
  // First try to get from Amplify outputs (primary source)
  if (outputs.storage?.bucket_name) {
    console.log(
      'Using S3 bucket from Amplify outputs:',
      outputs.storage.bucket_name,
    )
    return outputs.storage.bucket_name
  }

  // Fallback to environment variable
  if (env.S3_BUCKET_NAME) {
    console.log(
      'Using S3 bucket from environment variable:',
      env.S3_BUCKET_NAME,
    )
    return env.S3_BUCKET_NAME
  }

  throw new Error(
    'S3 bucket name not found in Amplify outputs or environment variables',
  )
}

// Get AWS region from Amplify configuration
export const getAWSRegion = (): string => {
  // First try to get from Amplify outputs
  if (outputs.storage?.aws_region) {
    return outputs.storage.aws_region
  }

  // Fallback to environment variable
  return env.AWS_REGION || 'us-east-1'
}

// Get AWS credentials (still from environment as these are sensitive)
export const getAWSCredentials = () => {
  const accessKeyId = env.AWS_ACCESS_KEY_ID
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY

  // Debug what we're getting from environment
  console.log('🔐 AWS Credentials Debug:', {
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    accessKeyLength: accessKeyId?.length || 0,
    secretKeyLength: secretAccessKey?.length || 0,
    envKeys: Object.keys(env).filter(key => key.includes('AWS')),
  })

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials missing:', {
      accessKeyId: accessKeyId || 'undefined',
      secretAccessKey: secretAccessKey ? '[hidden]' : 'undefined',
    })
    throw new Error(
      `AWS credentials not found in environment variables. Missing: ${!accessKeyId ? 'ACCESS_KEY_ID' : ''} ${!secretAccessKey ? 'SECRET_ACCESS_KEY' : ''}`.trim(),
    )
  }

  return {
    accessKeyId,
    secretAccessKey,
  }
}

// Get AWS credentials safely (returns null if not available)
export const getAWSCredentialsSafe = () => {
  try {
    return getAWSCredentials()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('AWS credentials not available:', errorMessage)
    return null
  }
}

// Debug function to show current AWS configuration
export const getAWSConfigDebugInfo = () => {
  try {
    const bucketName = getS3BucketName()
    const region = getAWSRegion()
    const credentials = getAWSCredentialsSafe()

    return {
      bucketName,
      region,
      hasCredentials: !!credentials,
      source: {
        bucket: outputs.storage?.bucket_name ? 'amplify' : 'env',
        region: outputs.storage?.aws_region ? 'amplify' : 'env',
      },
      credentialsError: !credentials
        ? 'AWS credentials not found in environment variables'
        : null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      bucketName: 'Error loading bucket name',
      region: 'Error loading region',
      hasCredentials: false,
      source: { bucket: 'error', region: 'error' },
      error: errorMessage,
    }
  }
}
