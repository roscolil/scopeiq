/**
 * Enhanced Document Processing Integration
 * Processes documents and indexes them for intelligent search
 */

import {
  IntelligentSearchEngine,
  type StructuredDocumentData,
  type DocumentElement,
  type QueryIntent,
} from './enhanced-document-analysis-simple'
import { callOpenAI } from './openai'

// Global document processor instance
let globalDocumentProcessor: DocumentProcessor | null = null

/**
 * Document processor that handles enhanced analysis and indexing
 */
export class DocumentProcessor {
  private searchEngine: IntelligentSearchEngine
  private processedDocuments: Set<string> = new Set()

  constructor() {
    this.searchEngine = new IntelligentSearchEngine()
  }

  /**
   * Process and index a document for enhanced search
   */
  async processDocument(
    documentId: string,
    documentContent: string,
    documentName?: string,
    documentType?: string,
  ): Promise<StructuredDocumentData | null> {
    try {
      console.log(`Processing document ${documentId} for enhanced analysis...`)

      // Skip if already processed
      if (this.processedDocuments.has(documentId)) {
        console.log(`Document ${documentId} already processed`)
        return null
      }

      // Analyze document structure using GPT-4 Vision/Text
      const structuredData = await this.analyzeDocumentStructure(
        documentContent,
        documentName,
        documentType,
      )

      if (structuredData && structuredData.elements.length > 0) {
        // Index for intelligent search
        await this.searchEngine.indexDocument(documentId, structuredData)
        this.processedDocuments.add(documentId)

        console.log(
          `Successfully processed and indexed document ${documentId} with ${structuredData.elements.length} elements`,
        )
        return structuredData
      } else {
        console.log(
          `No structured elements extracted from document ${documentId}`,
        )
        return null
      }
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error)
      return null
    }
  }

  /**
   * Analyze document structure using AI
   */
  private async analyzeDocumentStructure(
    content: string,
    name?: string,
    type?: string,
  ): Promise<StructuredDocumentData | null> {
    const prompt = `
You are an expert document analyzer for construction and architectural documents. 
Analyze the following document content and extract structured information.

Document Name: ${name || 'Unknown'}
Document Type: ${type || 'Unknown'}

Content:
${content.slice(0, 4000)} ${content.length > 4000 ? '...(truncated)' : ''}

Extract and return a JSON object with the following structure:
{
  "metadata": {
    "document_type": "floor_plan" | "specification" | "schedule" | "report" | "other",
    "confidence": 0.0-1.0,
    "processing_notes": "brief description"
  },
  "elements": [
    {
      "id": "unique_element_id",
      "type": "room" | "door" | "window" | "equipment" | "material" | "measurement" | "specification" | "other",
      "content": "descriptive text about this element",
      "properties": {
        "name": "element name if available",
        "dimensions": "dimensions if mentioned",
        "location": "location if specified",
        "quantity": "quantity if mentioned",
        "material": "material type if specified"
      },
      "confidence": 0.0-1.0,
      "spatial_relationships": ["array of related element IDs if applicable"]
    }
  ]
}

Focus on extracting:
1. Rooms and spaces (offices, conference rooms, bathrooms, etc.)
2. Doors and windows with specifications
3. Equipment and fixtures
4. Materials and their specifications
5. Measurements and dimensions
6. Schedules and quantities

Return only the JSON object, no additional text.
`

    try {
      const response = await callOpenAI(
        prompt,
        '',
        'You are a construction document analysis expert. Return only valid JSON.',
      )

      // Clean and parse the response
      const cleanedResponse = response.replace(/```json\s*|\s*```/g, '').trim()
      const structuredData = JSON.parse(
        cleanedResponse,
      ) as StructuredDocumentData

      // Validate the structure
      if (this.validateStructuredData(structuredData)) {
        console.log(
          `Extracted ${structuredData.elements.length} elements from document`,
        )
        return structuredData
      } else {
        console.log('Invalid structured data format returned')
        return null
      }
    } catch (error) {
      console.error('Error analyzing document structure:', error)
      return null
    }
  }

  /**
   * Validate structured data format
   */
  private validateStructuredData(data: any): data is StructuredDocumentData {
    return (
      data &&
      typeof data === 'object' &&
      data.metadata &&
      Array.isArray(data.elements) &&
      data.elements.every(
        (element: any) =>
          element.id &&
          element.type &&
          element.content &&
          typeof element.confidence === 'number',
      )
    )
  }

  /**
   * Get the intelligent search engine
   */
  getSearchEngine(): IntelligentSearchEngine {
    return this.searchEngine
  }

  /**
   * Check if document is processed
   */
  isDocumentProcessed(documentId: string): boolean {
    return this.processedDocuments.has(documentId)
  }

  /**
   * Get all processed document IDs
   */
  getProcessedDocuments(): string[] {
    return Array.from(this.processedDocuments)
  }
}

/**
 * Get or create the global document processor
 */
export function getDocumentProcessor(): DocumentProcessor {
  if (!globalDocumentProcessor) {
    globalDocumentProcessor = new DocumentProcessor()
  }
  return globalDocumentProcessor
}

/**
 * Process documents from search results for enhanced analysis
 */
export async function processSearchResultsForEnhancement(
  searchResults: any,
  projectId: string,
): Promise<void> {
  const processor = getDocumentProcessor()

  if (!searchResults?.documents?.[0] || !searchResults?.metadatas?.[0]) {
    return
  }

  const documents = searchResults.documents[0]
  const metadatas = searchResults.metadatas[0]

  console.log(
    `Processing ${documents.length} search results for enhancement...`,
  )

  // Process each document chunk
  for (let i = 0; i < documents.length && i < 5; i++) {
    // Limit to first 5 for performance
    const content = documents[i]
    const metadata = metadatas[i] || {}
    const documentId = metadata.document_id || `${projectId}_chunk_${i}`
    const documentName = metadata.name || metadata.filename

    if (!processor.isDocumentProcessed(documentId)) {
      await processor.processDocument(
        documentId,
        content,
        documentName,
        'search_result',
      )
    }
  }
}

/**
 * Enhanced search function that processes documents on-demand
 */
export async function enhancedSearchWithProcessing(
  query: string,
  searchResults: any,
  projectId: string,
  documentId?: string,
): Promise<any> {
  const processor = getDocumentProcessor()

  // First, process any new documents from search results
  await processSearchResultsForEnhancement(searchResults, projectId)

  // Now try intelligent search
  const searchEngine = processor.getSearchEngine()

  try {
    const intelligentResults = await searchEngine.intelligentSearch(
      query,
      documentId,
    )

    if (intelligentResults && intelligentResults.length > 0) {
      console.log(
        `Enhanced search found ${intelligentResults.length} intelligent results`,
      )

      // Convert to standard format
      const enhancedResults = {
        ids: [intelligentResults.map(r => r.element.id)],
        documents: [intelligentResults.map(r => r.element.content)],
        metadatas: [
          intelligentResults.map(r => ({
            ...r.element.properties,
            element_type: r.element.type,
            confidence: r.element.confidence,
            relevance_score: r.relevanceScore,
            match_reasons: r.matchReasons.join(', '),
            document_type: r.documentType,
            intelligent_search: true,
          })),
        ],
        distances: [intelligentResults.map(r => 1 - r.relevanceScore)],
        summary: generateIntelligentSummary(intelligentResults, query),
        confidence: calculateAverageConfidence(intelligentResults),
        searchMethod: 'intelligent',
        intelligentSearch: true,
        structuredResults: true,
      }

      return enhancedResults
    }
  } catch (error) {
    console.error('Intelligent search failed:', error)
  }

  // Fall back to original search results with enhanced metadata
  return {
    ...searchResults,
    searchMethod: 'standard',
    intelligentSearch: false,
    structuredResults: false,
    confidence: 0.7,
  }
}

/**
 * Generate summary for intelligent search results
 */
function generateIntelligentSummary(results: any[], query: string): string {
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
 * Calculate average confidence from results
 */
function calculateAverageConfidence(results: any[]): number {
  if (results.length === 0) return 0

  const totalConfidence = results.reduce(
    (sum, result) => sum + result.element.confidence * result.relevanceScore,
    0,
  )

  return totalConfidence / results.length
}
