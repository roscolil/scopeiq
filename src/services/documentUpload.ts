import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Check environment variables at startup
const awsRegion = import.meta.env.VITE_AWS_REGION || 'us-east-1'
const awsAccessKey = import.meta.env.VITE_AWS_ACCESS_KEY_ID
const awsSecretKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME!

// Log configuration without exposing secrets
console.log('S3 Configuration:', {
  region: awsRegion,
  bucketName: BUCKET_NAME,
  hasAccessKey: !!awsAccessKey,
  hasSecretKey: !!awsSecretKey,
})

if (!awsAccessKey || !awsSecretKey) {
  console.error('WARNING: AWS credentials are missing or incomplete')
}

if (!BUCKET_NAME) {
  console.error('WARNING: S3 bucket name is not defined')
}

const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKey!,
    secretAccessKey: awsSecretKey!,
  },
  // Use path style addressing for better compatibility
  forcePathStyle: true,
})

export interface UploadResult {
  key: string
  url: string
  size: number
  type: string
}

export const uploadDocumentToS3 = async (
  file: File,
  projectId: string,
  companyId: string,
): Promise<UploadResult> => {
  try {
    console.log('Starting upload process for file:', file.name)

    const fileBuffer = await file.arrayBuffer()
    // Convert ArrayBuffer to Uint8Array which is compatible with S3 client
    const fileContent = new Uint8Array(fileBuffer)

    console.log('File converted to compatible format')

    // Generate unique file key
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `document-upload/${companyId}/${projectId}/${timestamp}_${sanitizedFileName}`

    console.log('S3 upload path:', key)

    // Create upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
    })

    // Execute the upload
    console.log(`Uploading file to S3 bucket: ${BUCKET_NAME}...`)
    try {
      const uploadResult = await s3Client.send(uploadCommand)
      console.log('S3 upload result:', uploadResult)
    } catch (uploadError) {
      console.error('Direct S3 upload error:', uploadError)
      // Log more specific details about the error
      if (uploadError instanceof Error) {
        console.error(
          `Error name: ${uploadError.name}, Message: ${uploadError.message}`,
        )
        // Check for AWS metadata in a type-safe way
        const awsError = uploadError as { $metadata?: Record<string, unknown> }
        if (awsError.$metadata) {
          console.error('AWS Metadata:', awsError.$metadata)
        }
      }
      throw uploadError
    }

    const url = `https://${BUCKET_NAME}.s3.${s3Client.config.region}.amazonaws.com/${key}`

    // Alternative URL format (virtual-hosted style)
    // const url = `https://s3.${s3Client.config.region}.amazonaws.com/${BUCKET_NAME}/${key}`

    console.log('Upload completed successfully', url)

    return {
      key,
      url,
      size: file.size,
      type: file.type,
    }
  } catch (error) {
    console.error('S3 Upload error:', error)

    // Check for "Failed to fetch" which often indicates CORS issues
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(
        'This appears to be a CORS or network connectivity issue. Please check:',
      )
      console.error('1. Your AWS S3 bucket CORS configuration')
      console.error('2. Network connectivity')
      console.error('3. AWS credentials and permissions')
      throw new Error(
        'Network error when uploading to S3. This may be due to CORS configuration or network connectivity.',
      )
    }

    // Check for missing credentials
    if (error instanceof Error && error.message.includes('credentials')) {
      console.error(
        'AWS credentials issue detected. Check your environment variables.',
      )
      throw new Error('AWS credentials missing or invalid')
    }

    // Check for no such bucket
    if (error instanceof Error && error.message.includes('NoSuchBucket')) {
      console.error('The specified bucket does not exist:', BUCKET_NAME)
      throw new Error(
        `S3 bucket "${BUCKET_NAME}" does not exist or is not accessible`,
      )
    }

    // Check for invalid region
    if (error instanceof Error && error.message.includes('region')) {
      console.error('There may be an issue with the region configuration')
      throw new Error(
        'S3 region configuration issue. Check your AWS region setting.',
      )
    }

    // Check for permission denied
    if (
      error instanceof Error &&
      (error.message.includes('AccessDenied') ||
        error.message.includes('access denied'))
    ) {
      console.error('Permission denied to access the S3 bucket')
      throw new Error(
        'S3 access denied. Check your IAM permissions for this bucket.',
      )
    }

    throw error instanceof Error
      ? error
      : new Error('Unknown upload error occurred')
  }
}

export const getSignedDownloadUrl = async (key: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error('Failed to generate download URL')
  }
}
