/**
 * Simplified background processing that focuses only on embedding generation
 * This bypasses database status updates to avoid authorization issues
 */

import { upsertDocumentEmbedding } from './embedding'

/**
 * Simple embedding processing without database status updates
 * This is a fallback approach when database permissions are restrictive
 */
export async function processEmbeddingOnly(
  projectId: string,
  documentId: string,
  content: string,
  metadata: Record<string, string | number | boolean>,
): Promise<void> {
  if (!content || content.trim().length === 0) {
    throw new Error('No text content found in document')
  }

  await upsertDocumentEmbedding({
    projectId,
    documentId,
    content,
    metadata: {
      ...metadata,
      content,
    },
  })
}

/**
 * Extract text content from uploaded file
 * This runs in the client to avoid S3 access issues
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    let text = ''

    if (file.type === 'text/plain') {
      text = await file.text()
    } else if (file.type.includes('pdf')) {
      // Use pdfjs-dist for PDF text extraction
      const pdfjsLib = await import('pdfjs-dist')
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        content.items.forEach(item => {
          if ('str' in item) {
            text += item.str + ' '
          }
        })
      }
    } else if (file.type.includes('word') || file.type.includes('docx')) {
      // TODO: Add DOCX processing with mammoth or similar
      console.warn('DOCX processing not implemented yet')
    }

    return text.trim()
  } catch (error) {
    console.error('Text extraction failed:', error)
    throw error
  }
}
