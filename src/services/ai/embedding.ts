import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'
import {
  processConstructionImage,
  extractTextForEmbedding,
} from '../file/image-processing'
import { enhancedExtractTextFromPDF, type OCRResult } from '../file/ocr'
import {
  upsertEmbeddings,
  queryEmbeddings,
  hybridQuery,
  upsertCommonTerms,
  NAMESPACE_CONFIG,
  type CommonContentType,
} from './pinecone'
import {
  processConstructionDocumentEmbedding,
  searchConstructionDocument,
} from './construction-embedding'

// Re-export the type for external use
export type { CommonContentType } from './pinecone'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

/**
 * Sanitize document ID for Pinecone compatibility
 * Pinecone IDs must be strings without newlines and should be URL-safe
 */
export function sanitizeDocumentId(id: string): string {
  return id
    .replace(/[\r\n\t]/g, '') // Remove newlines and tabs
    .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace invalid chars with underscore
    .substring(0, 512) // Limit length (Pinecone has ID length limits)
}

export async function extractTextFromFile(file: File): Promise<string> {
  let text = ''

  try {
    if (file.type === 'text/plain') {
      text = await file.text()
    } else if (file.type.includes('pdf')) {
      try {
        // Use enhanced OCR service that combines PDF.js + Tesseract
        const ocrResult: OCRResult = await enhancedExtractTextFromPDF(file, {
          language: 'eng',
          fallbackToOCR: true,
          ocrThreshold: 100, // Trigger OCR if PDF.js extracts less than 100 chars
        })

        // Add extraction metadata to the text
        let extractedText = `[ENHANCED EXTRACTION REPORT]\n`
        extractedText += `Method: ${ocrResult.method.toUpperCase()}\n`
        extractedText += `Quality: ${ocrResult.confidence.toFixed(1)}% confidence\n`
        extractedText += `Pages: ${ocrResult.metadata.pages}\n`
        extractedText += `Processing Time: ${(ocrResult.metadata.processingTime / 1000).toFixed(1)}s\n`
        extractedText += `Has Images: ${ocrResult.metadata.hasImages ? 'Yes' : 'No'}\n`
        extractedText += `Has Native Text: ${ocrResult.metadata.hasText ? 'Yes' : 'No'}\n`

        if (ocrResult.metadata.avgConfidence) {
          extractedText += `Average OCR Confidence: ${ocrResult.metadata.avgConfidence.toFixed(1)}%\n`
        }

        extractedText += `\n--- DOCUMENT CONTENT ---\n\n`
        extractedText += ocrResult.text

        text = extractedText
      } catch (error) {
        text = `[ERROR: Enhanced PDF extraction failed - ${error instanceof Error ? error.message : 'Unknown error'}]`
      }
    } else if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      text = result.value
    } else if (file.type.startsWith('image/')) {
      try {
        // Process construction images using the image processing service
        const processedImage = await processConstructionImage(file)
        text = processedImage.searchableContent
      } catch (imageError) {
        text = '[Image file - text extraction failed]'
      }
    } else {
      try {
        text = await file.text()
      } catch (error) {
        text = '[Unsupported file type - could not extract text]'
      }
    }

    return text.trim()
  } catch (error) {
    throw new Error(
      `Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// Rest of the embedding functions from the original file would go here...
// For now, let me add the essential ones:

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OpenAI API key is missing. Please check your VITE_OPENAI_API_KEY environment variable.',
    )
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text')
  }

  // Truncate text if too long (OpenAI has a token limit)
  const maxLength = 8000 // Conservative limit for embedding model
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) : text

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: truncatedText,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      if (response.status === 401) {
        throw new Error(
          'Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY.',
        )
      } else if (response.status === 429) {
        throw new Error(
          'OpenAI API rate limit exceeded. Please try again later.',
        )
      } else if (response.status === 400) {
        throw new Error(
          'Invalid request to OpenAI API. The text may be too long or contain invalid characters.',
        )
      } else {
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response structure from OpenAI embedding API')
    }

    return data.data[0].embedding
  } catch (error) {
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Failed to generate embedding: Unknown error')
    }
  }
}

export async function processEmbeddingOnly(
  content: string,
  projectId: string,
  documentId: string,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  try {
    // Sanitize the document ID for Pinecone compatibility
    const sanitizedId = sanitizeDocumentId(documentId)

    // Check if this is a construction document that would benefit from chunking
    const isConstructionDoc = isConstructionDocument(
      content,
      String(metadata.name || ''),
    )

    if (isConstructionDoc) {
      await processConstructionDocumentEmbedding(
        content,
        projectId,
        sanitizedId,
        String(metadata.name || documentId),
        metadata,
      )
    } else {
      const embedding = await generateEmbedding(content)

      // Truncate content for metadata to avoid size limits
      const truncatedContent =
        content.length > 1000
          ? content.substring(0, 1000) + '...[truncated]'
          : content

      // Store the embedding in Pinecone
      await upsertEmbeddings(
        projectId,
        [sanitizedId],
        [embedding],
        [
          {
            ...metadata,
            content: truncatedContent,
            id: sanitizedId,
            originalId: documentId,
            document_id: documentId, // Add this field for Pinecone filtering
          },
        ],
      )
    }
  } catch (error) {
    console.error('Failed to process embedding:', error)
    throw error
  }
}

/**
 * Detect if a document is a construction document that would benefit from chunking
 */
function isConstructionDocument(content: string, filename: string): boolean {
  const constructionKeywords = [
    'door',
    'window',
    'schedule',
    'frame',
    'elevation',
    'plan',
    'drawing',
    'specification',
    'architectural',
    'construction',
    'building',
  ]

  const constructionPatterns = [
    /door.*schedule/gi,
    /window.*schedule/gi,
    /hardware.*schedule/gi,
    /frame.*schedule/gi,
    /architectural.*plan/gi,
    /construction.*document/gi,
    /building.*specification/gi,
  ]

  // Check filename
  const filenameHasKeywords = constructionKeywords.some(keyword =>
    filename.toLowerCase().includes(keyword.toLowerCase()),
  )

  // Check content for patterns
  const contentHasPatterns = constructionPatterns.some(pattern =>
    pattern.test(content),
  )

  // Check for table-like structures (common in schedules)
  const hasTableStructure =
    content.includes('|') ||
    content.split('\n').some(line => line.split(/\s{3,}/).length > 3)

  // Check for measurement patterns
  const hasMeasurements =
    /\d+['"'-]\s*\d*\s*\d*['"/]?|\d+\.\d+\s*(mm|cm|m|ft|in|inch)/gi.test(
      content,
    )

  return (
    filenameHasKeywords ||
    contentHasPatterns ||
    (hasTableStructure && hasMeasurements)
  )
}

export async function upsertDocumentEmbedding({
  projectId,
  documentId,
  content,
  metadata,
}: {
  projectId: string
  documentId: string
  content: string
  metadata?: Record<string, string | number | boolean>
}) {
  if (!content || content.trim().length === 0) {
    throw new Error('Cannot embed empty content')
  }

  // Sanitize the document ID for Pinecone compatibility
  const sanitizedId = sanitizeDocumentId(documentId)

  // Chunk the content properly (1000 chars per chunk with 200 char overlap)
  const chunkSize = 1000
  const chunkOverlap = 200
  const chunks: string[] = []

  // Create overlapping chunks
  for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
    const chunk = content.slice(i, i + chunkSize)
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim())
    }
  }

  // Store the full document as one chunk (for comprehensive search)
  const fullDocumentId = `${sanitizedId}_full`
  const fullDocumentEmbedding = await generateEmbedding(content)

  const fullDocumentMetadata = {
    ...metadata,
    content: content.substring(0, 2000), // Store first 2000 chars for preview
    chunkType: 'full_document',
    chunkIndex: -1,
    totalChunks: chunks.length,
    id: fullDocumentId,
    originalId: documentId,
    document_id: documentId,
    documentName: metadata?.name || 'Unknown Document',
  }

  // Process chunks in batches
  const batchSize = 10
  const allIds: string[] = [fullDocumentId]
  const allEmbeddings: number[][] = [fullDocumentEmbedding]
  const allMetadata: Record<string, string | number | boolean>[] = [
    fullDocumentMetadata,
  ]

  // Process regular chunks
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchChunks = chunks.slice(i, i + batchSize)

    for (let j = 0; j < batchChunks.length; j++) {
      const chunk = batchChunks[j]
      const chunkIndex = i + j
      const chunkId = `${sanitizedId}_chunk_${chunkIndex}`

      const chunkEmbedding = await generateEmbedding(chunk)

      const chunkMetadata = {
        ...metadata,
        content: chunk,
        chunkType: 'chunk',
        chunkIndex,
        totalChunks: chunks.length,
        id: chunkId,
        originalId: documentId,
        document_id: documentId,
        documentName: metadata?.name || 'Unknown Document',
      }

      allIds.push(chunkId)
      allEmbeddings.push(chunkEmbedding)
      allMetadata.push(chunkMetadata)
    }
  }

  // Upsert all embeddings
  await upsertEmbeddings(projectId, allIds, allEmbeddings, allMetadata)
}

export async function semanticSearch({
  projectId,
  query,
  topK = 10,
  documentId,
}: {
  projectId: string
  query: string
  topK?: number
  documentId?: string
}) {
  const embedding = await generateEmbedding(query)

  // Ensure topK is a valid integer
  const validTopK = Math.max(1, Math.floor(Number(topK) || 10))

  // Check if this looks like a construction-related query
  const isConstructionQuery = isConstructionRelatedQuery(query)

  if (isConstructionQuery) {
    try {
      const result = await searchConstructionDocument(projectId, query, {
        documentId,
        topK: validTopK,
        chunkTypes: getRelevantChunkTypes(query),
        requireNumbers: /\d/.test(query),
        requireMeasurements:
          /\d+['"'-]\s*\d*\s*\d*['"/]?|\d+\.\d+\s*(mm|cm|m|ft|in|inch)/gi.test(
            query,
          ),
      })

      // Transform to match expected format
      return {
        ids: [result.results.map(r => r.id)],
        documents: [result.results.map(r => r.content)],
        metadatas: [result.results.map(r => r.metadata)],
        distances: [result.results.map(r => r.distance)],
        summary: result.summary,
        confidence: result.confidence,
      }
    } catch (constructionSearchError) {
      console.warn(
        'Construction search failed, falling back to standard search:',
        constructionSearchError,
      )
      // Fall back to standard search
    }
  }

  // Standard search
  return await queryEmbeddings(projectId, [embedding], validTopK, documentId)
}

/**
 * Check if a query is construction-related
 */
function isConstructionRelatedQuery(query: string): boolean {
  const constructionTerms = [
    'door',
    'window',
    'frame',
    'sill',
    'header',
    'jamb',
    'mullion',
    'schedule',
    'elevation',
    'detail',
    'section',
    'plan',
    'drawing',
    'specification',
    'material',
    'dimension',
    'scale',
    'hardware',
  ]

  return constructionTerms.some(term =>
    query.toLowerCase().includes(term.toLowerCase()),
  )
}

/**
 * Determine relevant chunk types based on query
 */
function getRelevantChunkTypes(query: string): string[] {
  const chunkTypes: string[] = []

  if (/schedule|table|list/gi.test(query)) {
    chunkTypes.push('schedule', 'table')
  }

  if (/specification|spec|material|requirement/gi.test(query)) {
    chunkTypes.push('specification')
  }

  if (/title|header|name|sheet/gi.test(query)) {
    chunkTypes.push('header')
  }

  // If no specific types found, include all
  if (chunkTypes.length === 0) {
    chunkTypes.push('schedule', 'specification', 'table', 'general')
  }

  return chunkTypes
}

export async function hybridSemanticSearch({
  projectId,
  query,
  topK = 10,
  documentId,
  commonWeight = 0.3,
}: {
  projectId: string
  query: string
  topK?: number
  documentId?: string
  commonWeight?: number
}) {
  const embedding = await generateEmbedding(query)

  // Ensure topK is a valid integer
  const validTopK = Math.max(1, Math.floor(Number(topK) || 10))

  return await hybridQuery(projectId, [embedding], {
    topK: validTopK,
    documentId,
    includeCommon: true,
    commonWeight,
  })
}

export async function searchCommonTermsOnly({
  query,
  topK = 5,
}: {
  query: string
  topK?: number
}) {
  const embedding = await generateEmbedding(query)

  // Ensure topK is a valid integer
  const validTopK = Math.max(1, Math.floor(Number(topK) || 5))

  return await queryEmbeddings(NAMESPACE_CONFIG.common, [embedding], validTopK)
}

export async function improvedDocumentSearch({
  projectId,
  query,
  topK = 50,
  documentId,
}: {
  projectId: string
  query: string
  topK?: number
  documentId?: string
}) {
  try {
    // Step 1: Get semantic results
    const embedding = await generateEmbedding(query)
    const namespace = `project_${projectId}`

    const results = await queryEmbeddings(
      namespace,
      [embedding],
      Math.min(topK * 2, 1000), // Get extra results for filtering
    )

    if (!results.ids?.[0] || results.ids[0].length === 0) {
      return {
        results: [],
        totalResults: 0,
        exactMatches: 0,
        semanticMatches: 0,
      }
    }

    // Step 2: Convert to structured format and filter
    const searchResults = results.ids[0].map((id, index) => ({
      id,
      content: results.documents![0][index] || '',
      metadata: results.metadatas![0][index] || {},
      score: 1 - (results.distances![0][index] || 1), // Convert distance to similarity
    }))

    // Step 3: Apply text-based filtering for exact matches
    const queryLower = query.toLowerCase()
    const exactMatches: typeof searchResults = []
    const semanticMatches: typeof searchResults = []

    searchResults.forEach(result => {
      const contentLower = result.content.toLowerCase()
      if (contentLower.includes(queryLower)) {
        exactMatches.push({
          ...result,
          score: result.score + 0.5, // Boost exact matches
        })
      } else {
        semanticMatches.push(result)
      }
    })

    // Step 4: Combine results (exact matches first, then semantic)
    const combinedResults = [...exactMatches, ...semanticMatches]
      .slice(0, topK)
      .sort((a, b) => b.score - a.score)

    // Step 5: Format for return (excluding file names from metadata)
    const formattedResults = combinedResults.map(result => {
      // Filter out file name related metadata fields
      const sanitizedMetadata = { ...result.metadata }
      delete sanitizedMetadata.name
      delete sanitizedMetadata.fileName
      delete sanitizedMetadata.file_name
      delete sanitizedMetadata.filename
      delete sanitizedMetadata.originalName
      delete sanitizedMetadata.document_name
      delete sanitizedMetadata.documentName

      return {
        id: result.id,
        content: result.content,
        metadata: sanitizedMetadata,
        similarity: result.score,
        hasExactMatch: result.content.toLowerCase().includes(queryLower),
      }
    })

    return {
      results: formattedResults,
      totalResults: combinedResults.length,
      exactMatches: exactMatches.length,
      semanticMatches: semanticMatches.length,
    }
  } catch (error) {
    console.error('Search failed:', error)
    throw error
  }
}

export async function addCommonTerm({
  contentType,
  id,
  content,
  metadata,
}: {
  contentType: CommonContentType
  id: string
  content: string
  metadata?: Record<string, string | number | boolean>
}) {
  const embedding = await generateEmbedding(content)

  await upsertCommonTerms(
    contentType,
    [id],
    [embedding],
    metadata ? [{ ...metadata, content }] : [{ content }],
  )
}
