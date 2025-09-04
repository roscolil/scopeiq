/**
 * Enhanced Document Analysis - Integration Example
 * Shows how to integrate the proof of concept with existing system
 */

import {
  analyzeDocumentStructure,
  IntelligentSearchEngine,
} from './enhanced-document-analysis-simple'
import { processEmbeddingOnly } from './embedding'

/**
 * Enhanced document processing that integrates with existing system
 */
export async function processDocumentWithEnhancedAnalysis(
  file: File,
  projectId: string,
  documentId: string,
  documentName: string,
): Promise<{
  standardEmbedding: boolean
  enhancedAnalysis: boolean
  searchCapabilities: string[]
  extractionAccuracy: number
}> {
  try {
    console.log(`Processing ${documentName} with enhanced analysis`)

    // Step 1: Perform enhanced structural analysis
    const structureData = await analyzeDocumentStructure(file, 'floor_plan')

    // Step 2: Create enhanced content for embedding
    const enhancedContent = createEnhancedEmbeddingContent(
      structureData,
      file.name,
    )

    // Step 3: Process with existing embedding system
    await processEmbeddingOnly(enhancedContent, projectId, documentId, {
      ...structureData.metadata,
      enhanced_analysis: true,
      element_count: structureData.elements.length,
      schedule_count: structureData.schedules.length,
      measurement_count: structureData.measurements.length,
      spatial_relationship_count: structureData.spatial_map.length,
    })

    // Step 4: Index in intelligent search engine
    const searchEngine = new IntelligentSearchEngine()
    await searchEngine.indexDocument(documentId, structureData)

    // Step 5: Calculate accuracy improvement
    const extractionAccuracy = calculateAccuracyImprovement(structureData)

    // Step 6: Determine available search capabilities
    const searchCapabilities = determineSearchCapabilities(structureData)

    console.log(`Enhanced processing complete:`, {
      elements: structureData.elements.length,
      schedules: structureData.schedules.length,
      measurements: structureData.measurements.length,
      accuracy: extractionAccuracy,
    })

    return {
      standardEmbedding: true,
      enhancedAnalysis: true,
      searchCapabilities,
      extractionAccuracy,
    }
  } catch (error) {
    console.error('Enhanced processing failed:', error)

    // Fallback to standard processing
    const standardContent = `Document: ${file.name}\nType: Construction Document\nProcessed: ${new Date().toISOString()}`
    await processEmbeddingOnly(standardContent, projectId, documentId, {
      enhanced_analysis: false,
      fallback_processing: true,
    })

    return {
      standardEmbedding: true,
      enhancedAnalysis: false,
      searchCapabilities: ['basic_text_search'],
      extractionAccuracy: 0.6,
    }
  }
}

/**
 * Create enhanced content that combines structured data for better embeddings
 */
function createEnhancedEmbeddingContent(
  structureData: any,
  fileName: string,
): string {
  let content = `ENHANCED DOCUMENT ANALYSIS\n`
  content += `Document: ${fileName}\n`
  content += `Type: ${structureData.metadata.document_type}\n`
  content += `Processing Method: ${structureData.metadata.processing_method}\n`
  content += `Confidence: ${(structureData.metadata.confidence * 100).toFixed(1)}%\n\n`

  // Add elements with enhanced context
  if (structureData.elements.length > 0) {
    content += `EXTRACTED ELEMENTS (${structureData.elements.length}):\n`
    structureData.elements.forEach((element: any) => {
      content += `${element.type.toUpperCase()}: ${element.content}\n`

      // Add properties with context
      Object.entries(element.properties).forEach(([key, value]) => {
        content += `  - ${key}: ${value}\n`
      })

      content += `  - Confidence: ${(element.confidence * 100).toFixed(1)}%\n\n`
    })
  }

  // Add measurements with context
  if (structureData.measurements.length > 0) {
    content += `MEASUREMENTS (${structureData.measurements.length}):\n`
    structureData.measurements.forEach((measurement: any) => {
      content += `${measurement.dimension_type.toUpperCase()}: ${measurement.value} ${measurement.unit}\n`
      if (measurement.applies_to.length > 0) {
        content += `  - Applies to: ${measurement.applies_to.join(', ')}\n`
      }
      content += `  - Confidence: ${(measurement.confidence * 100).toFixed(1)}%\n\n`
    })
  }

  // Add schedules
  if (structureData.schedules.length > 0) {
    content += `SCHEDULES AND TABLES (${structureData.schedules.length}):\n`
    structureData.schedules.forEach((schedule: any) => {
      content += `${schedule.type.replace('_', ' ').toUpperCase()}:\n`
      content += `Headers: ${schedule.headers.join(', ')}\n`
      schedule.rows.forEach((row: any) => {
        content += `  ${row.tag}: ${Object.values(row.data).join(', ')}\n`
      })
      content += `  - Confidence: ${(schedule.confidence * 100).toFixed(1)}%\n\n`
    })
  }

  // Add spatial relationships
  if (structureData.spatial_map.length > 0) {
    content += `SPATIAL RELATIONSHIPS (${structureData.spatial_map.length}):\n`
    structureData.spatial_map.forEach((rel: any) => {
      content += `${rel.element_a} ${rel.relationship.replace('_', ' ')} ${rel.element_b}\n`
    })
    content += `\n`
  }

  // Add searchable summary
  content += `SEARCHABLE SUMMARY:\n`
  content += `This document contains ${structureData.elements.length} architectural elements, `
  content += `${structureData.measurements.length} measurements, and `
  content += `${structureData.schedules.length} schedules. `

  const roomCount = structureData.elements.filter(
    (e: any) => e.type === 'room',
  ).length
  const doorCount = structureData.elements.filter(
    (e: any) => e.type === 'door',
  ).length
  const windowCount = structureData.elements.filter(
    (e: any) => e.type === 'window',
  ).length

  if (roomCount > 0) content += `Contains ${roomCount} rooms/spaces. `
  if (doorCount > 0) content += `Contains ${doorCount} doors. `
  if (windowCount > 0) content += `Contains ${windowCount} windows. `

  return content
}

/**
 * Calculate accuracy improvement based on structured extraction
 */
function calculateAccuracyImprovement(structureData: any): number {
  let accuracy = 0.6 // Base accuracy

  // Boost for structured elements
  if (structureData.elements.length > 0) {
    const avgElementConfidence =
      structureData.elements.reduce(
        (sum: number, el: any) => sum + el.confidence,
        0,
      ) / structureData.elements.length
    accuracy += avgElementConfidence * 0.2
  }

  // Boost for measurements
  if (structureData.measurements.length > 0) {
    accuracy += 0.1
  }

  // Boost for schedules
  if (structureData.schedules.length > 0) {
    accuracy += 0.1
  }

  // Boost for spatial relationships
  if (structureData.spatial_map.length > 0) {
    accuracy += 0.05
  }

  // Overall confidence boost
  accuracy *= structureData.metadata.confidence

  return Math.min(accuracy, 0.95) // Cap at 95%
}

/**
 * Determine available search capabilities based on extracted data
 */
function determineSearchCapabilities(structureData: any): string[] {
  const capabilities = ['basic_text_search']

  // Element-based searches
  if (structureData.elements.length > 0) {
    capabilities.push('element_type_search') // "find all doors"
    capabilities.push('element_count_search') // "how many rooms"
  }

  // Measurement-based searches
  if (structureData.measurements.length > 0) {
    capabilities.push('dimension_search') // "find 8 foot doors"
    capabilities.push('measurement_comparison') // "doors larger than 3 feet"
  }

  // Schedule-based searches
  if (structureData.schedules.length > 0) {
    capabilities.push('schedule_search') // "find door schedule"
    capabilities.push('specification_search') // "wood doors"
  }

  // Spatial searches
  if (structureData.spatial_map.length > 0) {
    capabilities.push('spatial_search') // "rooms connected to lobby"
    capabilities.push('adjacency_search') // "what's next to the conference room"
  }

  // Advanced capabilities based on element diversity
  const elementTypes = new Set(structureData.elements.map((e: any) => e.type))
  if (elementTypes.size >= 3) {
    capabilities.push('multi_element_search') // "conference rooms with windows"
    capabilities.push('contextual_search') // "spaces for meetings"
  }

  return capabilities
}

/**
 * Demo queries that showcase enhanced capabilities
 */
export const DEMO_QUERIES = {
  counting: [
    'How many conference rooms are there?',
    'Count the number of doors in the plan',
    'How many windows face the parking lot?',
  ],

  dimensional: [
    'Show me all 3-0 doors',
    'Find doors larger than 6 feet',
    'What are the room dimensions?',
  ],

  spatial: [
    'What rooms are adjacent to the lobby?',
    'Which doors connect to the hallway?',
    'Show me spaces near the restrooms',
  ],

  specification: [
    'Find all wood doors in the schedule',
    'Show me glazed openings',
    'What type of hardware is specified?',
  ],

  contextual: [
    'Where are the meeting spaces?',
    'Show me private offices',
    'Find spaces for collaboration',
  ],
}

/**
 * Performance comparison between standard and enhanced processing
 */
export interface ProcessingComparison {
  standard: {
    processing_time: number
    text_extracted: number
    searchable_content_length: number
    accuracy_estimate: number
  }
  enhanced: {
    processing_time: number
    elements_extracted: number
    measurements_found: number
    schedules_parsed: number
    spatial_relationships: number
    accuracy_estimate: number
    search_capabilities: string[]
  }
  improvement: {
    accuracy_gain: number
    capability_increase: number
    content_richness: number
  }
}

export { createEnhancedEmbeddingContent }
