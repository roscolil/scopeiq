/**
 * Enhanced Document Analysis - Simplified Working Version
 * Proof of Concept for improved extraction accuracy and intelligent search
 */

import { analyzeImageWithGPT4Vision } from './openai'
import { generateEmbedding } from './embedding'

export interface EnhancedDocumentElement {
  id: string
  type:
    | 'door'
    | 'window'
    | 'room'
    | 'dimension'
    | 'schedule_item'
    | 'symbol'
    | 'text_block'
  content: string
  confidence: number
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  properties: Record<string, string | number | boolean>
  relationships: string[] // IDs of related elements
}

export interface ScheduleTable {
  id: string
  type: 'door_schedule' | 'window_schedule' | 'room_schedule' | 'general'
  headers: string[]
  rows: ScheduleRow[]
  confidence: number
}

export interface ScheduleRow {
  id: string
  tag: string
  data: Record<string, string>
  linked_elements: string[]
}

export interface MeasurementData {
  id: string
  value: string
  unit: string
  dimension_type: 'length' | 'width' | 'height' | 'area' | 'angle'
  applies_to: string[]
  confidence: number
}

export interface SpatialRelationship {
  element_a: string
  element_b: string
  relationship:
    | 'adjacent_to'
    | 'inside'
    | 'connected_to'
    | 'references'
    | 'dimensioned_by'
  confidence: number
}

export interface StructuredDocumentData {
  elements: EnhancedDocumentElement[]
  schedules: ScheduleTable[]
  measurements: MeasurementData[]
  spatial_map: SpatialRelationship[]
  metadata: {
    document_type: string
    confidence: number
    processing_method: string
    extracted_at: string
  }
}

/**
 * Enhanced Document Analysis using structured vision prompts
 */
export async function analyzeDocumentStructure(
  file: File,
  analysisType:
    | 'floor_plan'
    | 'schedule'
    | 'elevation'
    | 'detail' = 'floor_plan',
): Promise<StructuredDocumentData> {
  console.log(`Starting enhanced analysis for ${analysisType}: ${file.name}`)

  const structuredPrompt = buildStructuredPrompt(analysisType)

  try {
    // Use enhanced vision analysis
    const rawAnalysis = await analyzeImageWithGPT4Vision(file, structuredPrompt)

    // Parse structured response
    const structuredData = parseStructuredResponse(rawAnalysis, analysisType)

    // Enhance with spatial analysis
    const enhancedData = enhanceWithSpatialAnalysis(structuredData)

    console.log(
      `Enhanced analysis complete: ${enhancedData.elements.length} elements extracted`,
    )

    return enhancedData
  } catch (error) {
    console.error('Enhanced document analysis failed:', error)
    throw error
  }
}

/**
 * Build structured prompts based on document type
 */
function buildStructuredPrompt(analysisType: string): string {
  return `
ENHANCED DOCUMENT ANALYSIS - STRUCTURED EXTRACTION

You are analyzing a ${analysisType} document. Please examine this image carefully and provide detailed analysis.

ANALYZE THE FOLLOWING:
1. **Element Identification**: Count and identify all doors, windows, rooms, and spaces
2. **Text Extraction**: Read all visible text, labels, dimensions, and tags
3. **Measurements**: Extract all dimension callouts and measurements
4. **Spatial Relationships**: Note which elements connect or relate to each other
5. **Schedules/Tables**: If present, extract table data with headers and rows

SPECIFIC INSTRUCTIONS FOR ${analysisType.toUpperCase()}:
${getTypeSpecificInstructions(analysisType)}

Please provide your analysis in a clear, detailed format covering:
- Summary of what you observe
- Count of each element type (doors, windows, rooms, etc.)
- All readable text and labels
- Measurements and dimensions found
- Any schedules or tables detected
- Notable spatial relationships

Be systematic and thorough in your analysis.
`
}

function getTypeSpecificInstructions(analysisType: string): string {
  switch (analysisType) {
    case 'floor_plan':
      return `
- Count individual rooms/spaces (offices, conference rooms, bathrooms, etc.)
- Identify door and window symbols with their tags/numbers
- Extract room labels and numbers
- Note dimension callouts and measurements
- Identify any legends or title blocks`

    case 'schedule':
      return `
- Focus on table structure and data extraction
- Read headers carefully
- Extract each row of data completely
- Note door/window tags that link to plans
- Identify types, sizes, materials, quantities`

    case 'elevation':
      return `
- Identify building features and materials
- Extract floor-to-floor heights
- Note window and door openings
- Read dimension strings
- Identify architectural details`

    case 'detail':
      return `
- Focus on construction details and connections
- Extract material callouts
- Note dimension details
- Identify fasteners and hardware
- Read specification notes`

    default:
      return '- Perform general document analysis'
  }
}

/**
 * Parse structured response from vision analysis
 */
function parseStructuredResponse(
  rawAnalysis: {
    description: string
    extractedText: string
    keyElements: string[]
  },
  analysisType: string,
): StructuredDocumentData {
  const elements: EnhancedDocumentElement[] = []
  const measurements: MeasurementData[] = []
  const schedules: ScheduleTable[] = []

  // Extract elements from key elements
  if (rawAnalysis.keyElements) {
    rawAnalysis.keyElements.forEach((element, index) => {
      const elementType = detectElementType(element)
      const properties = extractProperties(element)

      elements.push({
        id: `element_${index}`,
        type: elementType,
        content: element,
        confidence: calculateConfidence(element, elementType),
        properties,
        relationships: [],
      })
    })
  }

  // Extract measurements from text
  const extractedMeasurements = extractMeasurementsFromText(
    rawAnalysis.extractedText + ' ' + rawAnalysis.description,
  )
  measurements.push(...extractedMeasurements)

  // Try to detect schedules in the description
  const detectedSchedules = detectSchedulesInText(rawAnalysis.description)
  schedules.push(...detectedSchedules)

  return {
    elements,
    schedules,
    measurements,
    spatial_map: [],
    metadata: {
      document_type: analysisType,
      confidence: calculateOverallConfidence(elements),
      processing_method: 'enhanced_vision',
      extracted_at: new Date().toISOString(),
    },
  }
}

/**
 * Detect element type from content
 */
function detectElementType(content: string): EnhancedDocumentElement['type'] {
  const lowerContent = content.toLowerCase()

  if (lowerContent.includes('door')) return 'door'
  if (lowerContent.includes('window')) return 'window'
  if (
    lowerContent.includes('room') ||
    lowerContent.includes('office') ||
    lowerContent.includes('conference') ||
    lowerContent.includes('bathroom')
  )
    return 'room'
  if (lowerContent.match(/\d+['"'-]/)) return 'dimension'
  if (lowerContent.includes('schedule') || lowerContent.includes('table'))
    return 'schedule_item'
  if (lowerContent.includes('symbol') || lowerContent.includes('legend'))
    return 'symbol'

  return 'text_block'
}

/**
 * Extract properties from content
 */
function extractProperties(
  content: string,
): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {}

  // Extract dimensions
  const dimensionMatches = content.match(/(\d+['"'-]\s*\d*['"']?)/g)
  if (dimensionMatches) {
    properties.dimensions = dimensionMatches.join(', ')
  }

  // Extract numbers (potential tags)
  const numberMatches = content.match(/\b(\d+)\b/g)
  if (numberMatches) {
    properties.tags = numberMatches.join(', ')
  }

  // Extract count information
  const countMatch = content.match(/(\d+)\s*(office|room|door|window)/i)
  if (countMatch) {
    properties.count = parseInt(countMatch[1])
    properties.item_type = countMatch[2].toLowerCase()
  }

  // Extract materials
  const materials = ['wood', 'steel', 'glass', 'concrete', 'aluminum', 'metal']
  for (const material of materials) {
    if (content.toLowerCase().includes(material)) {
      properties.material = material
      break
    }
  }

  return properties
}

/**
 * Calculate confidence based on content analysis
 */
function calculateConfidence(content: string, elementType: string): number {
  let confidence = 0.5 // Base confidence

  // Higher confidence for specific mentions
  if (content.toLowerCase().includes(elementType)) confidence += 0.3

  // Higher confidence for numbers/dimensions
  if (/\d/.test(content)) confidence += 0.1

  // Higher confidence for specific construction terms
  const constructionTerms = [
    'door',
    'window',
    'room',
    'office',
    'conference',
    'bathroom',
    'dimension',
  ]
  if (constructionTerms.some(term => content.toLowerCase().includes(term))) {
    confidence += 0.1
  }

  return Math.min(confidence, 0.95) // Cap at 95%
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(
  elements: EnhancedDocumentElement[],
): number {
  if (elements.length === 0) return 0.3

  const avgConfidence =
    elements.reduce((sum, el) => sum + el.confidence, 0) / elements.length
  return avgConfidence
}

/**
 * Extract measurements from text
 */
function extractMeasurementsFromText(text: string): MeasurementData[] {
  const measurements: MeasurementData[] = []

  // Match various dimension formats
  const patterns = [
    /(\d+)['"'-]\s*(\d*)['"']?/g, // 12'-6", 8', 3-0
    /(\d+\.?\d*)\s*(ft|feet|in|inch|inches|mm|cm|m)/gi, // 12.5 ft, 36 inches
  ]

  let index = 0
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const value = match[2] ? `${match[1]}-${match[2]}` : match[1]
      const unit = match[0].includes("'")
        ? 'ft'
        : match[0].includes('"')
          ? 'in'
          : match[3] || 'ft'

      measurements.push({
        id: `measurement_${index}`,
        value,
        unit,
        dimension_type: 'length',
        applies_to: [],
        confidence: 0.7,
      })
      index++
    }
  }

  return measurements
}

/**
 * Detect schedules in text description
 */
function detectSchedulesInText(text: string): ScheduleTable[] {
  const schedules: ScheduleTable[] = []

  // Look for table-like structures in the description
  if (
    text.toLowerCase().includes('schedule') ||
    text.toLowerCase().includes('table')
  ) {
    // This is a simplified detection - in a real implementation,
    // this would use more sophisticated table detection
    schedules.push({
      id: 'detected_schedule_1',
      type: 'general',
      headers: ['Item', 'Details'],
      rows: [
        {
          id: 'row_1',
          tag: 'N/A',
          data: {
            Item: 'Schedule detected',
            Details: 'Table structure found in image',
          },
          linked_elements: [],
        },
      ],
      confidence: 0.6,
    })
  }

  return schedules
}

/**
 * Enhance with spatial analysis
 */
function enhanceWithSpatialAnalysis(
  data: StructuredDocumentData,
): StructuredDocumentData {
  const spatialRelationships: SpatialRelationship[] = []

  // Find potential relationships based on content analysis
  const rooms = data.elements.filter(e => e.type === 'room')
  const doors = data.elements.filter(e => e.type === 'door')

  // Create relationships between rooms and doors based on content proximity
  for (const door of doors) {
    for (const room of rooms) {
      // Simple heuristic: if door mentions room or vice versa
      if (
        door.content.toLowerCase().includes(room.content.toLowerCase()) ||
        room.content.toLowerCase().includes(door.content.toLowerCase())
      ) {
        spatialRelationships.push({
          element_a: room.id,
          element_b: door.id,
          relationship: 'connected_to',
          confidence: 0.6,
        })
      }
    }
  }

  return {
    ...data,
    spatial_map: spatialRelationships,
  }
}

/**
 * Intelligent Search Engine for Enhanced Documents
 */
export class IntelligentSearchEngine {
  private documentStructures: Map<string, StructuredDocumentData> = new Map()

  /**
   * Index a structured document for intelligent search
   */
  async indexDocument(
    documentId: string,
    structure: StructuredDocumentData,
  ): Promise<void> {
    this.documentStructures.set(documentId, structure)
    console.log(
      `Indexed document ${documentId} with ${structure.elements.length} elements`,
    )
  }

  /**
   * Intelligent search with natural language queries
   */
  async intelligentSearch(
    query: string,
    documentId?: string,
  ): Promise<IntelligentSearchResult[]> {
    const results: IntelligentSearchResult[] = []

    // Parse query intent
    const queryIntent = this.parseQueryIntent(query)

    // Search in specific document or all documents
    const documentsToSearch = documentId
      ? [documentId]
      : Array.from(this.documentStructures.keys())

    for (const docId of documentsToSearch) {
      const structure = this.documentStructures.get(docId)
      if (!structure) continue

      // Apply intelligent filtering based on query intent
      const filteredElements = this.filterElementsByIntent(
        structure.elements,
        queryIntent,
      )

      // Score and rank results
      const scoredResults = this.scoreElements(
        filteredElements,
        query,
        structure,
      )

      results.push(
        ...scoredResults.map(scored => ({
          ...scored,
          documentId: docId,
          documentType: structure.metadata.document_type,
        })),
      )
    }

    // Sort by relevance score
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
  }

  /**
   * Parse query intent from natural language
   */
  private parseQueryIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase()

    return {
      elementTypes: this.extractElementTypes(lowerQuery),
      isCountQuery:
        lowerQuery.includes('how many') || lowerQuery.includes('count'),
      measurementQuery: this.extractMeasurementQuery(lowerQuery),
      locationTerms: this.extractLocationTerms(lowerQuery),
    }
  }

  private extractElementTypes(query: string): string[] {
    const types = []
    if (query.includes('door')) types.push('door')
    if (query.includes('window')) types.push('window')
    if (
      query.includes('room') ||
      query.includes('office') ||
      query.includes('conference')
    )
      types.push('room')
    if (query.includes('dimension') || query.includes('measurement'))
      types.push('dimension')
    return types
  }

  private extractMeasurementQuery(query: string): string | null {
    const measurementMatch = query.match(/(\d+['"'-]\s*\d*['"']?)/)
    return measurementMatch ? measurementMatch[0] : null
  }

  private extractLocationTerms(query: string): string[] {
    const terms = []
    if (query.includes('adjacent') || query.includes('near'))
      terms.push('adjacent')
    if (query.includes('inside') || query.includes('in')) terms.push('inside')
    if (query.includes('north')) terms.push('north')
    if (query.includes('south')) terms.push('south')
    return terms
  }

  /**
   * Filter elements based on query intent
   */
  private filterElementsByIntent(
    elements: EnhancedDocumentElement[],
    intent: QueryIntent,
  ): EnhancedDocumentElement[] {
    let filtered = elements

    // Filter by element types
    if (intent.elementTypes.length > 0) {
      filtered = filtered.filter(el => intent.elementTypes.includes(el.type))
    }

    // Filter by measurements
    if (intent.measurementQuery) {
      filtered = filtered.filter(
        el =>
          el.content.includes(intent.measurementQuery!) ||
          (typeof el.properties.dimensions === 'string' &&
            el.properties.dimensions.includes(intent.measurementQuery!)),
      )
    }

    return filtered
  }

  /**
   * Score elements for relevance
   */
  private scoreElements(
    elements: EnhancedDocumentElement[],
    query: string,
    structure: StructuredDocumentData,
  ): ScoredElement[] {
    return elements.map(element => {
      let score = 0

      // Content relevance
      const contentMatch = this.calculateContentMatch(element.content, query)
      score += contentMatch * 0.5

      // Property relevance
      const propertyMatch = this.calculatePropertyMatch(
        element.properties,
        query,
      )
      score += propertyMatch * 0.3

      // Confidence boost
      score *= element.confidence

      // Type relevance boost
      if (query.toLowerCase().includes(element.type)) {
        score += 0.2
      }

      return {
        element,
        relevanceScore: score,
        matchReasons: this.getMatchReasons(
          element,
          query,
          contentMatch,
          propertyMatch,
        ),
      }
    })
  }

  private calculateContentMatch(content: string, query: string): number {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const words = lowerQuery.split(' ')

    let matches = 0
    for (const word of words) {
      if (lowerContent.includes(word)) matches++
    }

    return matches / words.length
  }

  private calculatePropertyMatch(
    properties: Record<string, string | number | boolean>,
    query: string,
  ): number {
    const lowerQuery = query.toLowerCase()
    let matches = 0
    let total = 0

    Object.values(properties).forEach(value => {
      total++
      if (
        typeof value === 'string' &&
        value.toLowerCase().includes(lowerQuery)
      ) {
        matches++
      }
    })

    return total > 0 ? matches / total : 0
  }

  private getMatchReasons(
    element: EnhancedDocumentElement,
    query: string,
    contentMatch: number,
    propertyMatch: number,
  ): string[] {
    const reasons = []

    if (contentMatch > 0.5) reasons.push('Strong content match')
    if (propertyMatch > 0) reasons.push('Property match')
    if (element.confidence > 0.8) reasons.push('High confidence extraction')
    if (query.toLowerCase().includes(element.type)) reasons.push('Type match')

    return reasons
  }
}

// Supporting interfaces
interface QueryIntent {
  elementTypes: string[]
  isCountQuery: boolean
  measurementQuery: string | null
  locationTerms: string[]
}

interface ScoredElement {
  element: EnhancedDocumentElement
  relevanceScore: number
  matchReasons: string[]
}

export interface IntelligentSearchResult extends ScoredElement {
  documentId: string
  documentType: string
}
