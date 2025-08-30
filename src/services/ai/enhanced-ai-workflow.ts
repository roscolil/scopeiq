/**
 * Enhanced Query/Response Workflow Integration
 * Seamlessly integrates enhanced document analysis into existing AI workflow
 */

import {
  IntelligentSearchEngine,
  type IntelligentSearchResult,
} from './enhanced-document-analysis-simple'
import { semanticSearch, generateEmbedding } from './embedding'
import { searchConstructionDocument } from './construction-embedding'
import { callOpenAI } from './openai'
import {
  getDocumentProcessor,
  enhancedSearchWithProcessing,
} from './enhanced-document-processor'

/**
 * Get the intelligent search engine from document processor
 */
function getIntelligentSearchEngine(): IntelligentSearchEngine {
  const processor = getDocumentProcessor()
  return processor.getSearchEngine()
}

/**
 * Enhanced semantic search that combines existing and intelligent search
 */
export async function enhancedSemanticSearch({
  projectId,
  query,
  topK = 10,
  documentId,
  useIntelligentSearch = true,
}: {
  projectId: string
  query: string
  topK?: number
  documentId?: string
  useIntelligentSearch?: boolean
}) {
  try {
    console.log('Starting enhanced semantic search for:', query)

    // Step 1: Always get standard search results first
    const standardResults = await semanticSearch({
      projectId,
      query,
      topK,
      documentId,
    })

    // Step 2: Check if we should use intelligent search
    if (useIntelligentSearch && shouldUseIntelligentSearch(query)) {
      console.log(
        'Using enhanced processing with intelligent search for query:',
        query,
      )

      // Use enhanced search with on-demand processing
      const enhancedResults = await enhancedSearchWithProcessing(
        query,
        standardResults,
        projectId,
        documentId,
      )

      if (enhancedResults?.intelligentSearch) {
        console.log('Successfully returned enhanced intelligent search results')
        return enhancedResults
      }
    }

    // Step 3: Return standard results with enhanced metadata
    console.log('Using standard search pipeline for query:', query)
    return {
      ...standardResults,
      searchMethod: 'standard',
      intelligentSearch: false,
      structuredResults: false,
      confidence: 0.7,
    }
  } catch (error) {
    console.error('Enhanced search failed, falling back to standard:', error)
    const fallbackResults = await semanticSearch({
      projectId,
      query,
      topK,
      documentId,
    })
    return {
      ...fallbackResults,
      searchMethod: 'fallback',
      intelligentSearch: false,
      structuredResults: false,
      confidence: 0.5,
    }
  }
}

/**
 * Enhanced AI response that incorporates structured document understanding
 */
export async function enhancedAIResponse({
  query,
  projectId,
  documentId,
  projectName,
  document,
  queryScope = 'project',
}: {
  query: string
  projectId: string
  documentId?: string
  projectName?: string
  document?: any
  queryScope?: 'document' | 'project'
}) {
  try {
    console.log('Starting enhanced AI response for:', query)

    // Step 1: Perform enhanced search to get context
    const searchResponse = await enhancedSemanticSearch({
      projectId,
      query,
      topK: queryScope === 'document' ? 5 : 10,
      documentId: queryScope === 'document' ? documentId : undefined,
      useIntelligentSearch: true,
    })

    // Step 2: Build enhanced context
    const context = buildEnhancedContext({
      query,
      searchResponse,
      queryScope,
      documentId,
      document,
      projectName,
    })

    // Step 3: Use enhanced system prompt for construction documents
    const systemPrompt = getEnhancedSystemPrompt(query, searchResponse)

    // Step 4: Get AI response with enhanced context
    const response = await callOpenAI(query, context, systemPrompt)

    // Step 5: Return enhanced response with metadata
    return {
      response,
      searchResults: searchResponse,
      metadata: {
        searchMethod: (searchResponse as any).searchMethod || 'standard',
        confidence: (searchResponse as any).confidence || 0.7,
        intelligentSearch: (searchResponse as any).intelligentSearch || false,
        structuredResults: (searchResponse as any).structuredResults || false,
      },
    }
  } catch (error) {
    console.error('Enhanced AI response failed:', error)
    throw error
  }
}

/**
 * Determine if query should use intelligent search
 */
function shouldUseIntelligentSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase()

  // Intelligent search is beneficial for:
  const intelligentSearchIndicators = [
    // Counting queries
    'how many',
    'count',
    'number of',

    // Element-specific queries
    'door',
    'window',
    'room',
    'office',
    'conference',

    // Dimensional queries
    /\d+['"'-]/,
    'feet',
    'foot',
    'inches',
    'inch',

    // Spatial queries
    'adjacent',
    'near',
    'next to',
    'connected',
    'inside',

    // Specification queries
    'schedule',
    'material',
    'type',
    'specification',

    // Location queries
    'where',
    'location',
    'find',
    'show me',
  ]

  return intelligentSearchIndicators.some(indicator => {
    if (typeof indicator === 'string') {
      return lowerQuery.includes(indicator)
    } else {
      return indicator.test(lowerQuery)
    }
  })
}

/**
 * Perform intelligent search with fallback
 */
async function performIntelligentSearch(
  query: string,
  projectId: string,
  documentId?: string,
  topK: number = 10,
): Promise<IntelligentSearchResult[] | null> {
  try {
    const searchEngine = getIntelligentSearchEngine()

    // Try intelligent search
    const results = await searchEngine.intelligentSearch(query, documentId)

    if (results && results.length > 0) {
      console.log(`Intelligent search found ${results.length} results`)
      return results.slice(0, topK)
    }

    return null
  } catch (error) {
    console.warn('Intelligent search failed:', error)
    return null
  }
}

/**
 * Convert intelligent search results to standard format
 */
function convertIntelligentToStandardFormat(
  intelligentResults: IntelligentSearchResult[],
  query: string,
): any {
  const ids = intelligentResults.map(r => r.element.id)
  const documents = intelligentResults.map(r => r.element.content)
  const metadatas = intelligentResults.map(r => ({
    ...r.element.properties,
    element_type: r.element.type,
    confidence: r.element.confidence,
    relevance_score: r.relevanceScore,
    match_reasons: r.matchReasons.join(', '),
    document_type: r.documentType,
    intelligent_search: true,
  }))
  const distances = intelligentResults.map(r => 1 - r.relevanceScore)

  // Generate intelligent summary
  const summary = generateIntelligentSummary(intelligentResults, query)

  return {
    ids: [ids],
    documents: [documents],
    metadatas: [metadatas],
    distances: [distances],
    summary,
    confidence: calculateAverageConfidence(intelligentResults),
    searchMethod: 'intelligent',
    intelligentSearch: true,
    structuredResults: true,
  }
}

/**
 * Generate summary for intelligent search results
 */
function generateIntelligentSummary(
  results: IntelligentSearchResult[],
  query: string,
): string {
  if (results.length === 0) {
    return `No specific elements found for "${query}". The documents may not contain this information or may need reprocessing with enhanced analysis.`
  }

  const elementTypes = [...new Set(results.map(r => r.element.type))]
  const confidence = calculateAverageConfidence(results)

  let summary = `Found ${results.length} relevant elements for "${query}":\n\n`

  // Group by element type
  elementTypes.forEach(type => {
    const typeResults = results.filter(r => r.element.type === type)
    if (typeResults.length > 0) {
      summary += `${type.toUpperCase()}S (${typeResults.length}):\n`

      typeResults.slice(0, 3).forEach(result => {
        summary += `• ${result.element.content}`

        // Add key properties
        const keyProps = Object.entries(result.element.properties)
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')

        if (keyProps) {
          summary += ` (${keyProps})`
        }

        summary += `\n`
      })

      if (typeResults.length > 3) {
        summary += `... and ${typeResults.length - 3} more\n`
      }
      summary += `\n`
    }
  })

  summary += `Analysis confidence: ${(confidence * 100).toFixed(1)}%`

  return summary
}

/**
 * Calculate average confidence from intelligent results
 */
function calculateAverageConfidence(
  results: IntelligentSearchResult[],
): number {
  if (results.length === 0) return 0

  const totalConfidence = results.reduce(
    (sum, result) => sum + result.element.confidence * result.relevanceScore,
    0,
  )

  return totalConfidence / results.length
}

/**
 * Build enhanced context for AI response
 */
function buildEnhancedContext({
  query,
  searchResponse,
  queryScope,
  documentId,
  document,
  projectName,
}: {
  query: string
  searchResponse: any
  queryScope: 'document' | 'project'
  documentId?: string
  document?: any
  projectName?: string
}): string {
  let context = ''

  // Add scope context
  if (queryScope === 'document' && documentId && document) {
    context += `Document Context: ${document.name || 'Unknown Document'} (ID: ${documentId})\n`
  } else {
    context += `Project Context: ${projectName || 'Unknown Project'}\n`
  }

  // Add search method information
  if (searchResponse.intelligentSearch) {
    context += `Search Method: Enhanced intelligent search with structured document analysis\n`
    context += `Analysis Confidence: ${((searchResponse.confidence || 0.7) * 100).toFixed(1)}%\n\n`
  }

  // Add results with enhanced formatting
  if (
    searchResponse.documents &&
    searchResponse.documents[0] &&
    searchResponse.documents[0].length > 0
  ) {
    context += `Relevant Information:\n`

    searchResponse.documents[0]
      .slice(0, 5)
      .forEach((doc: string, index: number) => {
        const metadata = searchResponse.metadatas?.[0]?.[index] || {}

        context += `\n${index + 1}. ${doc}`

        // Add metadata context for intelligent search results
        if (metadata.element_type) {
          context += `\n   Type: ${metadata.element_type}`
          if (metadata.confidence) {
            context += ` (${(metadata.confidence * 100).toFixed(1)}% confidence)`
          }
        }

        if (metadata.match_reasons) {
          context += `\n   Match: ${metadata.match_reasons}`
        }

        context += `\n`
      })

    // Add summary if available
    if (searchResponse.summary) {
      context += `\nSearch Summary:\n${searchResponse.summary}\n`
    }

    context += `\nIMPORTANT: Base your answer on the specific information provided above. If the search found structured elements (doors, windows, rooms, etc.), provide precise counts and details.`
  } else {
    context += `No relevant content found for this query.`
  }

  return context
}

/**
 * Get enhanced system prompt based on query type and results
 */
function getEnhancedSystemPrompt(query: string, searchResponse: any): string {
  let systemPrompt =
    'You are an AI assistant specialized in construction and jobsite document analysis.'

  if (searchResponse.intelligentSearch) {
    systemPrompt +=
      ' You have access to enhanced structured document analysis that can precisely identify elements like doors, windows, rooms, measurements, and spatial relationships.'

    // Add specific instructions based on query type
    if (
      query.toLowerCase().includes('how many') ||
      query.toLowerCase().includes('count')
    ) {
      systemPrompt +=
        ' For counting questions, provide exact numbers based on the structured analysis results.'
    }

    if (/\d+['"'-]/.test(query)) {
      systemPrompt +=
        ' For dimensional queries, reference specific measurements and specifications found in the analysis.'
    }

    if (
      query.toLowerCase().includes('adjacent') ||
      query.toLowerCase().includes('near')
    ) {
      systemPrompt +=
        ' For spatial queries, use the spatial relationship information to provide accurate location-based answers.'
    }
  }

  systemPrompt +=
    " Provide direct, concise answers without repeating the user's question. Focus only on answering what was asked based on the document analysis provided."

  return systemPrompt
}

/**
 * Index a document for intelligent search when it's processed
 */
export async function indexDocumentForIntelligentSearch(
  documentId: string,
  structuredData: any,
): Promise<void> {
  try {
    const searchEngine = getIntelligentSearchEngine()
    await searchEngine.indexDocument(documentId, structuredData)
    console.log(`Document ${documentId} indexed for intelligent search`)
  } catch (error) {
    console.error('Failed to index document for intelligent search:', error)
  }
}

/**
 * Enhanced AI Actions Integration
 * Drop-in replacement for existing AI query handling
 */
export async function handleEnhancedAIQuery({
  query,
  projectId,
  documentId,
  projectName,
  document,
  queryScope = 'project',
  onProgress,
}: {
  query: string
  projectId: string
  documentId?: string
  projectName?: string
  document?: any
  queryScope?: 'document' | 'project'
  onProgress?: (stage: string) => void
}) {
  try {
    onProgress?.('Analyzing query...')

    // Determine if this is a question or search query
    const isQuestion =
      query.includes('?') ||
      query.toLowerCase().startsWith('what') ||
      query.toLowerCase().startsWith('how') ||
      query.toLowerCase().startsWith('where') ||
      query.toLowerCase().startsWith('when') ||
      query.toLowerCase().startsWith('why') ||
      query.toLowerCase().startsWith('show') ||
      query.toLowerCase().startsWith('find')

    if (isQuestion) {
      // Handle as AI question with enhanced context
      onProgress?.('Getting enhanced context...')

      const aiResponse = await enhancedAIResponse({
        query,
        projectId,
        documentId,
        projectName,
        document,
        queryScope,
      })

      onProgress?.('Generating response...')

      return {
        type: 'ai' as const,
        response: aiResponse.response,
        searchResults: aiResponse.searchResults,
        metadata: aiResponse.metadata,
      }
    } else {
      // Handle as search query
      onProgress?.('Searching documents...')

      const searchResults = await enhancedSemanticSearch({
        projectId,
        query,
        topK: 20,
        documentId: queryScope === 'document' ? documentId : undefined,
        useIntelligentSearch: true,
      })

      return {
        type: 'search' as const,
        searchResults,
        metadata: {
          searchMethod: (searchResults as any).searchMethod || 'standard',
          intelligentSearch: (searchResults as any).intelligentSearch || false,
        },
      }
    }
  } catch (error) {
    console.error('Enhanced AI query failed:', error)
    throw error
  }
}

/**
 * Enhanced callOpenAI with custom system prompt support
 */
async function callOpenAI(
  prompt: string,
  context?: string,
  systemPrompt?: string,
): Promise<string> {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              systemPrompt ||
              "You are an AI assistant specialized in construction and jobsite document analysis. Provide direct, concise answers without repeating the user's question. Focus only on answering what was asked.",
          },
          {
            role: 'user',
            content: context
              ? `Context: ${context}\n\nQuestion: ${prompt}\n\nPlease provide a direct answer without repeating my question.`
              : prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

export { getIntelligentSearchEngine }
