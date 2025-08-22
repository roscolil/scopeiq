import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  getS3BucketName,
  getAWSRegion,
  getAWSCredentialsSafe,
} from '@/utils/aws/aws-config'

// Check configuration at startup
const awsRegion = getAWSRegion()
const credentials = getAWSCredentialsSafe()
const BUCKET_NAME = getS3BucketName()

const s3Client = new S3Client({
  region: awsRegion,
  credentials: credentials
    ? {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    : undefined,
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
  onProgress?: (progress: number) => void,
): Promise<UploadResult> => {
  try {
    // Phase 1: File preparation (0-15%)
    onProgress?.(5)

    const fileBuffer = await file.arrayBuffer()
    onProgress?.(10)

    // Convert ArrayBuffer to Uint8Array which is compatible with S3 client
    const fileContent = new Uint8Array(fileBuffer)
    onProgress?.(15)

    console.log('File converted to compatible format')

    // Phase 2: Upload preparation (15-25%)
    // Generate file key with clean hierarchy: company/projectId/files
    // Always use projectId for consistency with metadata system
    const timestamp = Date.now()
    // Improved file name sanitization that preserves readability
    const sanitizedFileName = file.name
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w\-_.]/g, '') // Remove special characters except dash, underscore, dot
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores

    const key = `${companyId}/${projectId}/files/${timestamp}_${sanitizedFileName}`

    console.log('S3 upload path:', key)
    onProgress?.(20)

    // Create upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
    })

    onProgress?.(25)

    // Phase 3: S3 Upload (25-75%)
    console.log(`Uploading file to S3 bucket: ${BUCKET_NAME}...`)
    onProgress?.(30)

    try {
      // Simulate upload progress for large files
      const uploadPromise = s3Client.send(uploadCommand)

      // For files larger than 1MB, show intermediate progress
      if (file.size > 1024 * 1024) {
        let currentProgress = 35
        const progressInterval = setInterval(() => {
          currentProgress = Math.min(currentProgress + 5, 70)
          onProgress?.(currentProgress)
        }, 200)

        const uploadResult = await uploadPromise
        clearInterval(progressInterval)
        onProgress?.(75)

        console.log('S3 upload result:', uploadResult)
      } else {
        // For smaller files, jump to completion
        const uploadResult = await uploadPromise
        onProgress?.(75)
        console.log('S3 upload result:', uploadResult)
      }
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

    // Phase 4: URL generation (75-100%)
    onProgress?.(80)

    const url = `https://${BUCKET_NAME}.s3.${awsRegion}.amazonaws.com/${key}`

    onProgress?.(90)

    // Generate a pre-signed URL for viewing (1 hour expiration)
    const viewCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const preSignedUrl = await getSignedUrl(s3Client, viewCommand, {
      expiresIn: 3600, // 1 hour
    })

    console.log('Generated pre-signed URL for viewing:', preSignedUrl)
    onProgress?.(100)

    // Alternative URL format (virtual-hosted style)
    // const url = `https://s3.${awsRegion}.amazonaws.com/${BUCKET_NAME}/${key}`

    console.log('Upload completed successfully', url)

    return {
      key,
      url: preSignedUrl, // Use pre-signed URL instead of plain URL
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

/**
 * Generate a new pre-signed URL for an existing S3 object
 * @param key - The S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL for downloading/viewing the file
 */
export const generatePreSignedUrl = async (
  key: string,
  expiresIn: number = 3600,
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    console.log(
      `Generated pre-signed URL for key: ${key}, expires in: ${expiresIn}s`,
    )

    return preSignedUrl
  } catch (error) {
    console.error('Error generating pre-signed URL:', error)
    throw new Error('Failed to generate pre-signed URL for document access')
  }
}

/**
 * Check if a URL is expired by examining its X-Amz-Date and X-Amz-Expires parameters
 * @param url - The pre-signed URL to check
 * @returns Object with expiration status and details
 */
export const checkUrlExpiration = (url: string) => {
  try {
    const urlObj = new URL(url)
    const dateParam = urlObj.searchParams.get('X-Amz-Date')
    const expiresParam = urlObj.searchParams.get('X-Amz-Expires')

    if (!dateParam || !expiresParam) {
      return {
        isExpired: false,
        isSigned: false,
        message: 'URL is not pre-signed',
      }
    }

    const signedDate = new Date(
      dateParam.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
        '$1-$2-$3T$4:$5:$6Z',
      ),
    )
    const expiresInSeconds = parseInt(expiresParam)
    const expirationDate = new Date(
      signedDate.getTime() + expiresInSeconds * 1000,
    )
    const isExpired = new Date() > expirationDate

    return {
      isExpired,
      isSigned: true,
      signedAt: signedDate,
      expiresAt: expirationDate,
      message: isExpired
        ? `URL expired ${Math.abs(Math.floor((new Date().getTime() - expirationDate.getTime()) / 60000))} minutes ago`
        : `URL expires in ${Math.floor((expirationDate.getTime() - new Date().getTime()) / 60000)} minutes`,
    }
  } catch (error) {
    return {
      isExpired: true,
      isSigned: false,
      message: 'Invalid URL format',
    }
  }
}
