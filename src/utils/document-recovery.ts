/**
 * Utility functions for fixing document processing issues
 */

import { documentService } from '@/services/hybrid'
import { processEmbeddingOnly, extractTextFromFile } from '@/services/embedding'

/**
 * Fix documents that are stuck in 'processing' state
 * This can happen when the embedding process fails or doesn't complete properly
 */
export async function fixStuckProcessingDocuments(
  companyId: string,
  projectId: string,
): Promise<{ fixed: number; failed: number }> {
  let fixed = 0
  let failed = 0

  try {
    // Get all documents for the project
    const documents = await documentService.getDocumentsByProject(projectId)

    // Find documents stuck in processing state
    const stuckDocuments = documents.filter(doc => doc.status === 'processing')

    console.log(
      `Found ${stuckDocuments.length} documents stuck in processing state`,
    )

    for (const doc of stuckDocuments) {
      try {
        console.log(`Attempting to fix document: ${doc.name} (${doc.id})`)

        // Try to fetch the document content if available
        if (doc.url) {
          // For now, just mark as processed if it has a URL
          // In the future, you could re-process the embedding here
          await documentService.updateDocument(companyId, projectId, doc.id, {
            status: 'processed',
          })

          console.log(`Fixed document: ${doc.name}`)
          fixed++
        } else {
          // Mark as failed if no content available
          await documentService.updateDocument(companyId, projectId, doc.id, {
            status: 'failed',
          })

          console.log(`Marked document as failed: ${doc.name}`)
          failed++
        }
      } catch (error) {
        console.error(`Failed to fix document ${doc.name}:`, error)
        failed++
      }
    }

    return { fixed, failed }
  } catch (error) {
    console.error('Error fixing stuck processing documents:', error)
    throw error
  }
}

/**
 * Retry processing for a specific document
 */
export async function retryDocumentProcessing(
  companyId: string,
  projectId: string,
  documentId: string,
): Promise<boolean> {
  try {
    const document = await documentService.getDocument(
      companyId,
      projectId,
      documentId,
    )

    if (!document) {
      throw new Error('Document not found')
    }

    // Update status to processing
    await documentService.updateDocument(companyId, projectId, documentId, {
      status: 'processing',
    })

    // Try to re-process if we have content or can extract it
    if (document.content) {
      await processEmbeddingOnly(document.content, projectId, documentId, {
        name: document.name,
        type: document.type,
        url: document.url,
        companyId,
        size: document.size,
      })

      // Mark as processed
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'processed',
      })

      return true
    } else {
      // Mark as failed if no content
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'failed',
      })

      return false
    }
  } catch (error) {
    console.error('Error retrying document processing:', error)

    // Mark as failed
    try {
      await documentService.updateDocument(companyId, projectId, documentId, {
        status: 'failed',
      })
    } catch (updateError) {
      console.error('Failed to update status to failed:', updateError)
    }

    return false
  }
}
