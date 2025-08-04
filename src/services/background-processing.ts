/**
 * Background processing service for document embeddings
 * This approach is more performant for production use
 */

import { upsertDocumentEmbedding } from './embedding'
import { documentService } from './hybrid'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import {
  getAWSCredentialsSafe,
  getAWSRegion,
  getS3BucketName,
} from '../utils/aws-config'

const s3Client = new S3Client({
  region: getAWSRegion(),
  credentials: getAWSCredentialsSafe()
    ? {
        accessKeyId: getAWSCredentialsSafe()!.accessKeyId,
        secretAccessKey: getAWSCredentialsSafe()!.secretAccessKey,
      }
    : undefined,
})

/**
 * Extract text from S3 stored file
 */
async function extractTextFromS3(
  s3Key: string,
  fileType: string,
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: getS3BucketName(),
      Key: s3Key,
    })

    const response = await s3Client.send(command)
    const fileBuffer = await response.Body?.transformToByteArray()

    if (!fileBuffer) throw new Error('Failed to retrieve file from S3')

    let text = ''

    if (fileType === 'text/plain') {
      text = new TextDecoder().decode(fileBuffer)
    } else if (fileType.includes('pdf')) {
      // Use pdfjs-dist for server-side PDF processing
      const pdfjsLib = await import('pdfjs-dist')
      const pdf = await pdfjsLib.getDocument(fileBuffer).promise
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        content.items.forEach(item => {
          if ('str' in item) {
            text += item.str + ' '
          }
        })
      }
    } else if (fileType.includes('word') || fileType.includes('docx')) {
      // TODO: Add DOCX processing with mammoth or similar
      console.warn('DOCX processing not implemented yet')
    }

    return text
  } catch (error) {
    console.error('Text extraction failed:', error)
    throw error
  }
}

/**
 * Process document embedding in background
 * This is called after file upload completes
 */
export async function processDocumentEmbedding(
  companyId: string,
  projectId: string,
  documentId: string,
  s3Key: string,
  metadata: {
    name: string
    type: string
    url: string
    size: number
  },
): Promise<void> {
  try {
    console.log(
      'Starting background embedding processing for document:',
      documentId,
    )

    // Try to update document status to 'processing', but don't fail if it doesn't work
    try {
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'processing',
      })
    } catch (statusError) {
      console.warn(
        'Could not update document status to processing:',
        statusError,
      )
      // Continue with embedding generation even if status update fails
    }

    // Extract text from S3
    const text = await extractTextFromS3(s3Key, metadata.type)

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in document')
    }

    // Generate and store embedding
    await upsertDocumentEmbedding({
      projectId,
      documentId,
      content: text,
      metadata: {
        name: metadata.name,
        type: metadata.type,
        url: metadata.url,
        s3Key,
        companyId,
        projectId,
        size: metadata.size,
      },
    })

    // Try to update document status to 'processed', but don't fail if it doesn't work
    try {
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'processed',
      })
      console.log(
        'Successfully processed embedding and updated status for document:',
        documentId,
      )
    } catch (statusError) {
      console.warn(
        'Embedding processed but could not update document status:',
        statusError,
      )
      console.log('Successfully processed embedding for document:', documentId)
    }
  } catch (error) {
    console.error('Background embedding processing failed:', error)

    // Try to update document status to 'failed', but don't throw if it doesn't work
    try {
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'failed',
      })
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError)
    }

    throw error
  }
}

/**
 * Queue document for background processing
 * In a real production app, this would use a proper queue system
 * For now, we'll use setTimeout to simulate async processing
 */
export function queueDocumentProcessing(
  companyId: string,
  projectId: string,
  documentId: string,
  s3Key: string,
  metadata: {
    name: string
    type: string
    url: string
    size: number
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simulate async processing with timeout
    setTimeout(async () => {
      try {
        await processDocumentEmbedding(
          companyId,
          projectId,
          documentId,
          s3Key,
          metadata,
        )
        resolve()
      } catch (error) {
        reject(error)
      }
    }, 1000) // Start processing after 1 second
  })
}
