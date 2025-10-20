/**
 * AI Response Helper Utilities
 * Provides better context messages and handling for various AI response scenarios
 */

/**
 * Search response type (from Pinecone/semantic search)
 */
export interface SearchResponse {
  ids?: string[][]
  documents?: string[][]
  metadatas?: Record<string, unknown>[][]
  distances?: number[][]
  summary?: string
  confidence?: number
}

/**
 * Get contextual no-results message based on query scope
 */
export function getNoResultsMessage(
  scope: 'document' | 'project',
  documentId?: string,
  projectName?: string,
): string {
  if (scope === 'document') {
    return `I couldn't find relevant content in this document to answer your question. This could mean:
    
• The document doesn't contain information about this topic
• The document is still being processed
• Try asking about different aspects of the document

Would you like to search across the entire project instead?`
  } else {
    return `I couldn't find documents in ${projectName ? `"${projectName}"` : 'this project'} that contain information to answer your question. This could mean:

• No documents have been uploaded yet containing this information
• The documents are still being processed
• Try rephrasing your question with different keywords

You can upload additional documents or try a different search term.`
  }
}

/**
 * Get low confidence results message
 */
export function getLowConfidenceMessage(
  resultCount: number,
  queryScope: 'document' | 'project',
): string {
  return `I found ${resultCount} document${resultCount !== 1 ? 's' : ''}, but they may not directly answer your question. The results have low confidence scores. Try rephrasing your question to be more specific.`
}

/**
 * Get document processing message
 */
export function getDocumentProcessingMessage(documentName?: string): string {
  return `${documentName ? `"${documentName}"` : 'This document'} is still being processed. Please wait a few moments and try again.`
}

/**
 * Get document processing failed message
 */
export function getDocumentProcessingFailedMessage(
  documentName?: string,
): string {
  return `${documentName ? `"${documentName}"` : 'This document'} failed to process. Please try uploading it again or contact support if the problem persists.`
}

/**
 * Get empty project message
 */
export function getEmptyProjectMessage(projectName?: string): string {
  return `${projectName ? `Project "${projectName}"` : 'This project'} doesn't have any documents yet. Upload documents to start asking questions about them.`
}

/**
 * Get vague query suggestion message
 */
export function getVagueQuerySuggestion(): string {
  return `Your question is quite broad. Could you be more specific? For example, ask about specific rooms, measurements, materials, or building elements.`
}

/**
 * Check if search results are meaningful
 */
export function hasValidSearchResults(
  searchResponse: SearchResponse | null | undefined,
): boolean {
  return !!(
    searchResponse &&
    searchResponse.documents &&
    searchResponse.documents[0] &&
    searchResponse.documents[0].length > 0
  )
}

/**
 * Get result count from search response
 */
export function getResultCount(
  searchResponse: SearchResponse | null | undefined,
): number {
  return searchResponse?.ids?.[0]?.length || 0
}

/**
 * Calculate average relevance score from search response
 */
export function calculateAverageRelevance(
  searchResponse: SearchResponse | null | undefined,
): number {
  if (
    !searchResponse?.distances?.[0] ||
    searchResponse.distances[0].length === 0
  ) {
    return 0
  }

  const distances = searchResponse.distances[0]
  const relevanceScores = distances.map((d: number) => 1 - d)
  const sum = relevanceScores.reduce(
    (acc: number, score: number) => acc + score,
    0,
  )
  return sum / relevanceScores.length
}

/**
 * Get top relevance score from search response
 */
export function getTopRelevance(
  searchResponse: SearchResponse | null | undefined,
): number {
  if (
    !searchResponse?.distances?.[0] ||
    searchResponse.distances[0].length === 0
  ) {
    return 0
  }

  return 1 - (searchResponse.distances[0][0] || 1)
}

/**
 * Check if results meet minimum confidence threshold
 */
export function meetsConfidenceThreshold(
  searchResponse: SearchResponse | null | undefined,
  minThreshold: number = 0.3,
): boolean {
  const topRelevance = getTopRelevance(searchResponse)
  return topRelevance >= minThreshold
}

/**
 * Format relevance score for display
 */
export function formatRelevanceScore(distance: number): string {
  return (1 - distance).toFixed(3)
}
