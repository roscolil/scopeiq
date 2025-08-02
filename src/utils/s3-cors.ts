/**
 * S3 CORS Configuration Utility
 * Note: CORS configuration must be done through AWS Console or AWS CLI
 * Browser clients cannot modify bucket CORS policies due to security restrictions
 */

import { getS3BucketName, getAWSRegion } from './aws-config'

// CORS configuration for PDF viewing and downloading (JSON format)
export const getCorsConfigurationJSON = () => `{
  "CORSRules": [
    {
      "ID": "AllowPDFViewing",
      "AllowedHeaders": [
        "Authorization",
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Range",
        "Accept",
        "Accept-Encoding",
        "x-amz-content-sha256",
        "x-amz-date",
        "x-amz-security-token",
        "x-amz-user-agent"
      ],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.amplifyapp.com",
        "${window.location.origin}"
      ],
      "ExposeHeaders": [
        "Content-Range",
        "Content-Length",
        "Content-Type",
        "Content-Disposition",
        "Accept-Ranges",
        "ETag",
        "Last-Modified",
        "Cache-Control"
      ],
      "MaxAgeSeconds": 86400
    },
    {
      "ID": "AllowFileDownloads",
      "AllowedHeaders": [
        "Authorization",
        "Content-Type",
        "Content-Disposition",
        "Range",
        "Accept-Ranges"
      ],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.amplifyapp.com",
        "${window.location.origin}"
      ],
      "ExposeHeaders": [
        "Content-Disposition",
        "Content-Length",
        "Content-Type",
        "Accept-Ranges",
        "Content-Range"
      ],
      "MaxAgeSeconds": 3600
    },
    {
      "ID": "AllowFileUploads",
      "AllowedHeaders": [
        "*",
        "Authorization",
        "Content-Type",
        "Content-Length",
        "Content-MD5",
        "Content-Disposition",
        "x-amz-content-sha256",
        "x-amz-date",
        "x-amz-security-token",
        "x-amz-user-agent",
        "x-amz-acl"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.amplifyapp.com",
        "${window.location.origin}"
      ],
      "ExposeHeaders": ["ETag", "Location", "x-amz-version-id"],
      "MaxAgeSeconds": 3600
    }
  ]
}`

// Legacy static version for backwards compatibility
export const corsConfigurationJSON = getCorsConfigurationJSON()

// CORS configuration for PDF viewing and downloading (JavaScript object)
export const corsConfiguration = {
  CORSRules: [
    {
      ID: 'AllowPDFViewing',
      AllowedHeaders: [
        'Authorization',
        'Content-Type',
        'Content-Length',
        'Content-Range',
        'Range',
        'Accept',
        'Accept-Encoding',
        'x-amz-content-sha256',
        'x-amz-date',
        'x-amz-security-token',
        'x-amz-user-agent',
      ],
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      AllowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://*.amplifyapp.com',
        window.location.origin, // Current domain
        // Add your production domain here
        // 'https://yourdomain.com'
      ],
      ExposeHeaders: [
        'Content-Range',
        'Content-Length',
        'Content-Type',
        'Content-Disposition',
        'Accept-Ranges',
        'ETag',
        'Last-Modified',
        'Cache-Control',
      ],
      MaxAgeSeconds: 86400, // 24 hours cache for better performance
    },
    {
      ID: 'AllowFileDownloads',
      AllowedHeaders: [
        'Authorization',
        'Content-Type',
        'Content-Disposition',
        'Range',
        'Accept-Ranges',
      ],
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      AllowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://*.amplifyapp.com',
        window.location.origin, // Current domain
        // Add your production domain here
        // 'https://yourdomain.com'
      ],
      ExposeHeaders: [
        'Content-Disposition',
        'Content-Length',
        'Content-Type',
        'Accept-Ranges',
        'Content-Range',
      ],
      MaxAgeSeconds: 3600,
    },
    {
      ID: 'AllowFileUploads',
      AllowedHeaders: [
        '*',
        'Authorization',
        'Content-Type',
        'Content-Length',
        'Content-MD5',
        'Content-Disposition',
        'x-amz-content-sha256',
        'x-amz-date',
        'x-amz-security-token',
        'x-amz-user-agent',
        'x-amz-acl',
      ],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
      AllowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://*.amplifyapp.com',
        window.location.origin, // Current domain
        // Add your production domain here
        // 'https://yourdomain.com'
      ],
      ExposeHeaders: ['ETag', 'Location', 'x-amz-version-id'],
      MaxAgeSeconds: 3600,
    },
  ],
}

export const getBucketInfo = () => {
  try {
    const bucketName = getS3BucketName()
    const region = getAWSRegion()

    return {
      bucketName,
      region,
      success: true,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to get bucket info',
      success: false,
    }
  }
}

// Generate AWS CLI commands for CORS configuration
export const generateCorsCommands = () => {
  const bucketInfo = getBucketInfo()

  if (!bucketInfo.success) {
    return { error: bucketInfo.error }
  }

  // Use the dynamic JSON string for easy copy/paste
  const corsJson = getCorsConfigurationJSON()

  const commands = [
    '# Save this CORS configuration to a file called cors.json:',
    corsJson,
    '',
    '# Then run this AWS CLI command:',
    `aws s3api put-bucket-cors --bucket ${bucketInfo.bucketName} --cors-configuration file://cors.json`,
    '',
    '# Or to check current CORS configuration:',
    `aws s3api get-bucket-cors --bucket ${bucketInfo.bucketName}`,
  ]

  return {
    commands: commands.join('\n'),
    bucketName: bucketInfo.bucketName,
    corsJson,
  }
}

// Function to add your production domain
export const addProductionDomain = (domain: string): void => {
  corsConfiguration.CORSRules.forEach(rule => {
    if (!rule.AllowedOrigins.includes(domain)) {
      rule.AllowedOrigins.push(domain)
    }
  })
}
