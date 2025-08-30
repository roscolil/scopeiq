/**
 * Enhanced Embedding Strategy for Construction Documents
 * Optimized for door/window schedules, specifications, and technical documents
 */

import { generateEmbedding } from './embedding'
import { upsertEmbeddings } from './pinecone'
import { broadcastProcessingMessage } from '../utils/processing-messages'

export interface DocumentChunk {
  id: string
  content: string
  chunkIndex: number
  totalChunks: number
  metadata: {
    documentId: string
    documentName: string
    chunkType: 'header' | 'schedule' | 'specification' | 'general' | 'table'
    hasNumbers: boolean
    hasMeasurements: boolean
    constructionTerms: string // Changed from string[] to string
  }
}

/**
 * Enhanced chunking strategy for construction documents
 */
export function chunkConstructionDocument(
  content: string,
  documentId: string,
  documentName: string,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []

  // Construction-specific patterns
  const schedulePattern = /(?:schedule|door|window|frame|hardware)/gi
  const measurementPattern =
    /\d+['"'-]\s*\d*\s*\d*['"/]?|\d+\.\d+\s*(mm|cm|m|ft|in|inch)/gi
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
    'note',
    'architectural',
    'structural',
    'mechanical',
    'electrical',
  ]

  // Split content into logical sections
  const sections = content.split(/\n\s*\n/) // Double newlines indicate sections

  let chunkIndex = 0

  for (const section of sections) {
    if (section.trim().length < 50) continue // Skip very short sections

    // Determine chunk type
    let chunkType: DocumentChunk['metadata']['chunkType'] = 'general'
    if (schedulePattern.test(section)) {
      chunkType =
        section.includes('|') || section.includes('\t')
          ? 'schedule'
          : 'specification'
    } else if (
      section.includes('TITLE') ||
      section.includes('SHEET') ||
      section.toUpperCase() === section
    ) {
      chunkType = 'header'
    } else if (
      section.includes('|') ||
      section.split('\n').some(line => line.split(/\s{3,}/).length > 3)
    ) {
      chunkType = 'table'
    }

    // Check for numbers and measurements
    const hasNumbers = /\d/.test(section)
    const hasMeasurements = measurementPattern.test(section)

    // Find construction terms in this chunk
    const foundTerms = constructionTerms.filter(term =>
      new RegExp(term, 'gi').test(section),
    )

    // Split large sections into smaller chunks (max 800 chars for better precision)
    const subChunks = splitLargeSection(section, 800)

    for (const subChunk of subChunks) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        content: subChunk.trim(),
        chunkIndex,
        totalChunks: 0, // Will be set after all chunks are created
        metadata: {
          documentId,
          documentName,
          chunkType,
          hasNumbers,
          hasMeasurements,
          constructionTerms: foundTerms.join(','), // Convert array to comma-separated string
        },
      })
      chunkIndex++
    }
  }

  // Set total chunks count
  chunks.forEach(chunk => (chunk.totalChunks = chunks.length))

  return chunks
}

/**
 * Split large sections while preserving context
 */
function splitLargeSection(section: string, maxSize: number): string[] {
  if (section.length <= maxSize) return [section]

  const chunks: string[] = []
  const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 0)

  let currentChunk = ''

  for (const sentence of sentences) {
    const sentenceWithPunct = sentence.trim() + '. '

    if (
      currentChunk.length + sentenceWithPunct.length > maxSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim())
      currentChunk = sentenceWithPunct
    } else {
      currentChunk += sentenceWithPunct
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // If no sentences found, split by words
  if (chunks.length === 0 && section.length > maxSize) {
    const words = section.split(/\s+/)
    let wordChunk = ''

    for (const word of words) {
      if (
        wordChunk.length + word.length + 1 > maxSize &&
        wordChunk.length > 0
      ) {
        chunks.push(wordChunk.trim())
        wordChunk = word
      } else {
        wordChunk += (wordChunk ? ' ' : '') + word
      }
    }

    if (wordChunk.trim()) {
      chunks.push(wordChunk.trim())
    }
  }

  return chunks.length > 0 ? chunks : [section]
}

/**
 * Enhanced embedding process for construction documents
 */
export async function processConstructionDocumentEmbedding(
  content: string,
  projectId: string,
  documentId: string,
  documentName: string,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  console.log(`Processing construction document: ${documentName}`)
  broadcastProcessingMessage.startProcessing(
    `Processing construction document: ${documentName}`,
    documentId,
    projectId,
  )

  try {
    // Create chunks optimized for construction documents
    const chunks = chunkConstructionDocument(content, documentId, documentName)

    console.log(`Created ${chunks.length} chunks for ${documentName}`)
    broadcastProcessingMessage.info(
      `Created ${chunks.length} chunks for ${documentName}`,
      documentId,
      projectId,
    )

    // Process chunks in batches to avoid overwhelming the API
    const batchSize = 5
    const totalBatches = Math.ceil(chunks.length / batchSize)

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1

      console.log(
        `Processing chunk batch ${currentBatch} of ${totalBatches} (${batch.length} chunks)`,
      )
      broadcastProcessingMessage.batchProgress(
        currentBatch,
        totalBatches,
        batch.length,
        documentId,
        projectId,
      )

      // Generate embeddings for the batch
      const embeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk.content)),
      )

      // Prepare metadata for storage
      const chunkMetadata = batch.map((chunk, idx) => ({
        ...metadata,
        ...chunk.metadata,
        content:
          chunk.content.substring(0, 500) +
          (chunk.content.length > 500 ? '...' : ''), // Truncated for metadata
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        id: chunk.id,
        originalDocumentId: documentId,
        document_id: documentId, // Add this field for Pinecone filtering
      }))

      // Store embeddings
      await upsertEmbeddings(
        projectId,
        batch.map(chunk => chunk.id),
        embeddings,
        chunkMetadata,
      )

      // Small delay to avoid rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(
      `Successfully processed ${chunks.length} chunks for ${documentName}`,
    )
    broadcastProcessingMessage.success(
      `Successfully processed ${chunks.length} chunks for ${documentName}`,
      documentId,
      projectId,
    )
  } catch (error) {
    console.error(`Failed to process construction document embedding:`, error)
    broadcastProcessingMessage.error(
      `Failed to process construction document embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      documentId,
      projectId,
    )
    throw error
  }
}

export interface SearchResult {
  id: string
  content: string
  metadata: Record<string, unknown>
  distance: number
  similarity: number
}

/**
 * Enhanced search for construction documents
 */
export async function searchConstructionDocument(
  projectId: string,
  query: string,
  options: {
    documentId?: string
    topK?: number
    chunkTypes?: string[]
    requireNumbers?: boolean
    requireMeasurements?: boolean
  } = {},
): Promise<{
  results: SearchResult[]
  summary: string
  confidence: number
}> {
  const {
    documentId,
    topK = 20,
    chunkTypes,
    requireNumbers,
    requireMeasurements,
  } = options

  console.log(`Searching construction documents with query: "${query}"`)

  try {
    // Import here to avoid circular dependency
    const { queryEmbeddings } = await import('./pinecone')

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query)

    // Search with higher topK to get more relevant chunks
    const searchResults = await queryEmbeddings(
      projectId,
      [queryEmbedding],
      topK,
      documentId,
    )

    // Filter results based on criteria
    let filteredResults = searchResults.metadatas[0].map((metadata, idx) => ({
      id: searchResults.ids[0][idx],
      content: searchResults.documents[0][idx],
      metadata,
      distance: searchResults.distances[0][idx],
      similarity: 1 - searchResults.distances[0][idx],
    }))

    // Apply filters
    if (chunkTypes && chunkTypes.length > 0) {
      filteredResults = filteredResults.filter(result =>
        chunkTypes.includes(String(result.metadata.chunkType)),
      )
    }

    if (requireNumbers) {
      filteredResults = filteredResults.filter(
        result => result.metadata.hasNumbers,
      )
    }

    if (requireMeasurements) {
      filteredResults = filteredResults.filter(
        result => result.metadata.hasMeasurements,
      )
    }

    // Sort by similarity
    filteredResults.sort((a, b) => b.similarity - a.similarity)

    // Take top results
    const topResults = filteredResults.slice(0, Math.min(10, topK))

    // Generate summary
    const avgSimilarity =
      topResults.length > 0
        ? topResults.reduce((sum, r) => sum + r.similarity, 0) /
          topResults.length
        : 0

    const summary = generateSearchSummary(query, topResults, avgSimilarity)

    console.log(
      `Found ${topResults.length} relevant chunks with average similarity ${avgSimilarity.toFixed(3)}`,
    )

    return {
      results: topResults,
      summary,
      confidence: avgSimilarity,
    }
  } catch (error) {
    console.error('Construction document search failed:', error)
    throw error
  }
}

/**
 * Generate a summary of search results
 */
function generateSearchSummary(
  query: string,
  results: SearchResult[],
  avgSimilarity: number,
): string {
  if (results.length === 0) {
    return `No relevant information found for "${query}". Try rephrasing your question or checking if the document contains this information.`
  }

  const chunkTypes = [...new Set(results.map(r => r.metadata.chunkType))]
  const documentsFound = [...new Set(results.map(r => r.metadata.documentName))]

  let summary = `Found ${results.length} relevant sections for "${query}":\n\n`

  // Add document context
  if (documentsFound.length === 1) {
    summary += `From document: ${documentsFound[0]}\n`
  } else {
    summary += `From ${documentsFound.length} documents: ${documentsFound.join(', ')}\n`
  }

  // Add content type context
  if (chunkTypes.includes('schedule')) {
    summary += `• Includes schedule/table information\n`
  }
  if (chunkTypes.includes('specification')) {
    summary += `• Includes technical specifications\n`
  }
  if (chunkTypes.includes('header')) {
    summary += `• Includes header/title information\n`
  }

  summary += `\nConfidence level: ${(avgSimilarity * 100).toFixed(1)}%\n\n`

  return summary
}
