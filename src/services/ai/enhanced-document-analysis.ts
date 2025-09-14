/**
 * Enhanced Document Analysis - Proof of Concept
 * Demonstrates improved extraction accuracy and intelligent search enhancement
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
  properties: Record<string, string | number | boolean | string[]>
  relationships: string[] // IDs of related elements
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

export interface ScheduleTable {
  id: string
  type: 'door_schedule' | 'window_schedule' | 'room_schedule' | 'general'
  headers: string[]
  rows: ScheduleRow[]
  confidence: number
  source_region?: BoundingBox
}

export interface ScheduleRow {
  id: string
  tag: string
  data: Record<string, string>
  linked_elements: string[] // IDs of plan elements this row describes
}

export interface MeasurementData {
  id: string
  value: string
  unit: string
  dimension_type: 'length' | 'width' | 'height' | 'area' | 'angle'
  applies_to: string[] // Element IDs this measurement describes
  confidence: number
  position?: BoundingBox
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

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
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
    const structuredData = await parseStructuredResponse(
      rawAnalysis,
      analysisType,
    )

    // Enhance with spatial analysis
    const enhancedData = await enhanceWithSpatialAnalysis(structuredData, file)

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
  const basePrompt = `
ENHANCED DOCUMENT ANALYSIS - STRUCTURED EXTRACTION

You are analyzing a ${analysisType} document. Perform systematic visual analysis and extract structured data.

CRITICAL: Return ONLY a valid JSON object with the following structure:
`

  const commonStructure = `
{
  "document_type": "${analysisType}",
  "confidence": 0.85,
  "elements": [
    {
      "id": "unique_id",
      "type": "door|window|room|dimension|schedule_item|symbol|text_block",
      "content": "descriptive text",
      "confidence": 0.9,
      "position": {"x": 100, "y": 200, "width": 50, "height": 30},
      "properties": {
        "size": "3'-0\"",
        "tag": "101",
        "material": "wood",
        "any_other_relevant_property": "value"
      },
      "relationships": ["id_of_related_element"]
    }
  ],
  "schedules": [
    {
      "id": "schedule_1",
      "type": "door_schedule|window_schedule|room_schedule",
      "headers": ["Tag", "Size", "Type", "Material"],
      "rows": [
        {
          "id": "row_1",
          "tag": "101",
          "data": {"Size": "3'-0\"", "Type": "Wood", "Material": "Oak"},
          "linked_elements": ["door_element_id"]
        }
      ],
      "confidence": 0.8
    }
  ],
  "measurements": [
    {
      "id": "dim_1",
      "value": "12",
      "unit": "ft",
      "dimension_type": "length",
      "applies_to": ["room_1"],
      "confidence": 0.9
    }
  ],
  "spatial_relationships": [
    {
      "element_a": "room_1",
      "element_b": "door_1",
      "relationship": "connected_to",
      "confidence": 0.8
    }
  ]
}
`

  switch (analysisType) {
    case 'floor_plan':
      return (
        basePrompt +
        `
FLOOR PLAN ANALYSIS INSTRUCTIONS:
1. Identify all rooms and spaces (conference rooms, offices, bathrooms, etc.)
2. Locate all doors and windows with their tags/numbers
3. Extract dimension text and measurements
4. Identify spatial relationships (what connects to what)
5. Look for any schedules or legends

SPECIFIC TASKS:
- Count each distinct room/space carefully
- Read all door and window tags
- Extract all visible dimensions
- Note which doors connect which rooms
- Identify any title blocks or legends

` +
        commonStructure
      )

    case 'schedule':
      return (
        basePrompt +
        `
SCHEDULE ANALYSIS INSTRUCTIONS:
1. Identify table structure (headers and rows)
2. Extract all data from each cell
3. Determine schedule type (door, window, room, etc.)
4. Parse tags/numbers that link to plan elements

SPECIFIC TASKS:
- Read table headers accurately
- Extract data from each row
- Identify door/window tags
- Note sizes, materials, types

` +
        commonStructure
      )

    default:
      return basePrompt + commonStructure
  }
}

/**
 * Parse structured response from vision analysis
 */
async function parseStructuredResponse(
  rawAnalysis: any,
  analysisType: string,
): Promise<StructuredDocumentData> {
  try {
    // Try to extract JSON from the response
    let structuredData: any

    if (typeof rawAnalysis === 'string') {
      // Look for JSON in the response
      const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } else if (rawAnalysis.description) {
      // Try to parse from description field
      const jsonMatch = rawAnalysis.description.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: create structure from existing analysis
        structuredData = createFallbackStructure(rawAnalysis, analysisType)
      }
    } else {
      structuredData = rawAnalysis
    }

    // Validate and enhance the structure
    return validateAndEnhanceStructure(structuredData)
  } catch (error) {
    console.warn('Failed to parse structured response, using fallback:', error)
    return createFallbackStructure(rawAnalysis, analysisType)
  }
}

/**
 * Create fallback structure when JSON parsing fails
 */
function createFallbackStructure(
  rawAnalysis: any,
  analysisType: string,
): StructuredDocumentData {
  const elements: EnhancedDocumentElement[] = []

  // Extract elements from description and key elements
  if (rawAnalysis.description) {
    elements.push({
      id: 'description_1',
      type: 'text_block',
      content: rawAnalysis.description,
      confidence: 0.7,
      properties: {},
      relationships: [],
    })
  }

  if (rawAnalysis.keyElements && Array.isArray(rawAnalysis.keyElements)) {
    rawAnalysis.keyElements.forEach((element: string, index: number) => {
      elements.push({
        id: `element_${index}`,
        type: detectElementType(element),
        content: element,
        confidence: 0.6,
        properties: extractProperties(element),
        relationships: [],
      })
    })
  }

  return {
    elements,
    schedules: [],
    measurements: extractMeasurementsFromText(rawAnalysis.extractedText || ''),
    spatial_map: [],
    metadata: {
      document_type: analysisType,
      confidence: 0.6,
      processing_method: 'fallback',
      extracted_at: new Date().toISOString(),
    },
  }
}

/**
 * Detect element type from text content
 */
function detectElementType(content: string): EnhancedDocumentElement['type'] {
  const lowerContent = content.toLowerCase()

  if (lowerContent.includes('door')) return 'door'
  if (lowerContent.includes('window')) return 'window'
  if (
    lowerContent.includes('room') ||
    lowerContent.includes('office') ||
    lowerContent.includes('conference')
  )
    return 'room'
  if (lowerContent.match(/\d+['"'-]\s*\d*/)) return 'dimension'
  if (lowerContent.includes('schedule')) return 'schedule_item'

  return 'text_block'
}

/**
 * Extract properties from text content
 */
function extractProperties(content: string): Record<string, any> {
  const properties: Record<string, any> = {}

  // Extract dimensions
  const dimensionMatch = content.match(/(\d+['"'-]\s*\d*['"']?)/g)
  if (dimensionMatch) {
    properties.dimensions = dimensionMatch
  }

  // Extract numbers (potential tags)
  const numberMatch = content.match(/\b\d+\b/g)
  if (numberMatch) {
    properties.numbers = numberMatch
  }

  // Extract materials
  const materials = ['wood', 'steel', 'glass', 'concrete', 'aluminum']
  materials.forEach(material => {
    if (content.toLowerCase().includes(material)) {
      properties.material = material
    }
  })

  return properties
}

/**
 * Extract measurements from text
 */
function extractMeasurementsFromText(text: string): MeasurementData[] {
  const measurements: MeasurementData[] = []

  // Match various dimension formats
  const dimensionRegex = /(\d+)['"'-]\s*(\d*)['"']?/g
  let match
  let index = 0

  while ((match = dimensionRegex.exec(text)) !== null) {
    measurements.push({
      id: `measurement_${index}`,
      value: match[2] ? `${match[1]}-${match[2]}` : match[1],
      unit: match[0].includes("'") ? 'ft' : 'in',
      dimension_type: 'length',
      applies_to: [],
      confidence: 0.7,
    })
    index++
  }

  return measurements
}

/**
 * Validate and enhance structure
 */
function validateAndEnhanceStructure(data: any): StructuredDocumentData {
  return {
    elements: Array.isArray(data.elements) ? data.elements : [],
    schedules: Array.isArray(data.schedules) ? data.schedules : [],
    measurements: Array.isArray(data.measurements) ? data.measurements : [],
    spatial_map: Array.isArray(data.spatial_relationships)
      ? data.spatial_relationships
      : [],
    metadata: {
      document_type: data.document_type || 'unknown',
      confidence: data.confidence || 0.5,
      processing_method: 'structured_vision',
      extracted_at: new Date().toISOString(),
    },
  }
}

/**
 * Enhance with spatial analysis (placeholder for advanced CV)
 */
async function enhanceWithSpatialAnalysis(
  data: StructuredDocumentData,
  file: File,
): Promise<StructuredDocumentData> {
  // This would integrate with advanced CV libraries for spatial analysis
  // For now, we'll enhance relationships based on content analysis

  // Find rooms that might be connected by doors
  const rooms = data.elements.filter(e => e.type === 'room')
  const doors = data.elements.filter(e => e.type === 'door')

  // Create spatial relationships based on content proximity
  for (const door of doors) {
    for (const room of rooms) {
      if (
        door.content.toLowerCase().includes(room.content.toLowerCase()) ||
        room.content.toLowerCase().includes(door.content.toLowerCase())
      ) {
        data.spatial_map.push({
          element_a: room.id,
          element_b: door.id,
          relationship: 'connected_to',
          confidence: 0.6,
        })
      }
    }
  }

  return data
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

    // Create enhanced embeddings for each element
    for (const element of structure.elements) {
      const enhancedContent = this.createEnhancedElementContent(
        element,
        structure,
      )
      const embedding = await generateEmbedding(enhancedContent)

      // Store with enhanced metadata (this would integrate with your existing Pinecone setup)
      console.log(
        `Indexed element ${element.id} with enhanced content:`,
        enhancedContent.substring(0, 100),
      )
    }
  }

  /**
   * Create enhanced content for embedding that includes context
   */
  private createEnhancedElementContent(
    element: EnhancedDocumentElement,
    structure: StructuredDocumentData,
  ): string {
    let enhancedContent = `${element.type.toUpperCase()}: ${element.content}\n`

    // Add properties
    Object.entries(element.properties).forEach(([key, value]) => {
      enhancedContent += `${key}: ${value}\n`
    })

    // Add related elements context
    element.relationships.forEach(relatedId => {
      const relatedElement = structure.elements.find(e => e.id === relatedId)
      if (relatedElement) {
        enhancedContent += `Related ${relatedElement.type}: ${relatedElement.content}\n`
      }
    })

    // Add spatial context
    const spatialRels = structure.spatial_map.filter(
      rel => rel.element_a === element.id || rel.element_b === element.id,
    )
    spatialRels.forEach(rel => {
      const otherId =
        rel.element_a === element.id ? rel.element_b : rel.element_a
      const otherElement = structure.elements.find(e => e.id === otherId)
      if (otherElement) {
        enhancedContent += `${rel.relationship.replace('_', ' ')} ${otherElement.type}: ${otherElement.content}\n`
      }
    })

    // Add measurement context
    const relevantMeasurements = structure.measurements.filter(m =>
      m.applies_to.includes(element.id),
    )
    relevantMeasurements.forEach(measurement => {
      enhancedContent += `Measurement: ${measurement.value} ${measurement.unit} (${measurement.dimension_type})\n`
    })

    return enhancedContent
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
      spatialKeywords: this.extractSpatialKeywords(lowerQuery),
      measurementQuery: this.extractMeasurementQuery(lowerQuery),
      countQuery: this.extractCountQuery(lowerQuery),
      locationQuery: this.extractLocationQuery(lowerQuery),
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

  private extractSpatialKeywords(query: string): string[] {
    const keywords = []
    if (
      query.includes('near') ||
      query.includes('adjacent') ||
      query.includes('next to')
    )
      keywords.push('adjacent_to')
    if (query.includes('inside') || query.includes('in'))
      keywords.push('inside')
    if (query.includes('connect') || query.includes('access'))
      keywords.push('connected_to')
    return keywords
  }

  private extractMeasurementQuery(query: string): MeasurementQuery | null {
    const measurementMatch = query.match(/(\d+)['"'-]\s*(\d*)['"']?/)
    if (measurementMatch) {
      return {
        value: measurementMatch[0],
        operator:
          query.includes('larger') || query.includes('bigger')
            ? '>'
            : query.includes('smaller') || query.includes('less')
              ? '<'
              : '=',
      }
    }
    return null
  }

  private extractCountQuery(query: string): boolean {
    return (
      query.includes('how many') ||
      query.includes('count') ||
      query.includes('number of')
    )
  }

  private extractLocationQuery(query: string): string[] {
    const locations = []
    if (query.includes('north')) locations.push('north')
    if (query.includes('south')) locations.push('south')
    if (query.includes('east')) locations.push('east')
    if (query.includes('west')) locations.push('west')
    if (query.includes('corner')) locations.push('corner')
    if (query.includes('center')) locations.push('center')
    return locations
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
      filtered = filtered.filter(el => {
        return Object.values(el.properties).some(
          prop =>
            typeof prop === 'string' &&
            prop.includes(intent.measurementQuery!.value),
        )
      })
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
      score += contentMatch * 0.4

      // Property relevance
      const propertyMatch = this.calculatePropertyMatch(
        element.properties,
        query,
      )
      score += propertyMatch * 0.3

      // Spatial relevance
      const spatialMatch = this.calculateSpatialMatch(element, query, structure)
      score += spatialMatch * 0.2

      // Confidence boost
      score *= element.confidence

      return {
        element,
        relevanceScore: score,
        matchReasons: this.getMatchReasons(
          element,
          query,
          contentMatch,
          propertyMatch,
          spatialMatch,
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
    properties: Record<string, any>,
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

  private calculateSpatialMatch(
    element: EnhancedDocumentElement,
    query: string,
    structure: StructuredDocumentData,
  ): number {
    // This would be enhanced with actual spatial analysis
    const spatialRels = structure.spatial_map.filter(
      rel => rel.element_a === element.id || rel.element_b === element.id,
    )

    // Simple spatial relevance based on relationships
    return spatialRels.length > 0 ? 0.5 : 0
  }

  private getMatchReasons(
    element: EnhancedDocumentElement,
    query: string,
    contentMatch: number,
    propertyMatch: number,
    spatialMatch: number,
  ): string[] {
    const reasons = []

    if (contentMatch > 0.5) reasons.push('Strong content match')
    if (propertyMatch > 0.5) reasons.push('Property match')
    if (spatialMatch > 0) reasons.push('Spatial relevance')
    if (element.confidence > 0.8) reasons.push('High confidence extraction')

    return reasons
  }
}

// Supporting interfaces
interface QueryIntent {
  elementTypes: string[]
  spatialKeywords: string[]
  measurementQuery: MeasurementQuery | null
  countQuery: boolean
  locationQuery: string[]
}

interface MeasurementQuery {
  value: string
  operator: '>' | '<' | '='
}

interface ScoredElement {
  element: EnhancedDocumentElement
  relevanceScore: number
  matchReasons: string[]
}

interface IntelligentSearchResult extends ScoredElement {
  documentId: string
  documentType: string
}

export { IntelligentSearchEngine }
