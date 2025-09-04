/**
 * Enhanced AI Workflow Test
 * Quick test to verify the enhanced workflow is working
 */

import { enhancedSemanticSearch } from './enhanced-ai-workflow'

/**
 * Test the enhanced workflow with sample data
 */
export async function testEnhancedWorkflow() {
  console.log('🧪 Testing Enhanced AI Workflow...')

  // Test queries that should trigger intelligent search
  const testQueries = [
    'How many conference rooms are there?',
    'What are the dimensions of the offices?',
    'Show me all the doors in the building',
    'Where are the windows located?',
    'What materials are specified for construction?',
  ]

  const testProjectId = 'test-project-123'

  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`)

    try {
      const result = await enhancedSemanticSearch({
        projectId: testProjectId,
        query,
        topK: 5,
        useIntelligentSearch: true,
      })

      console.log(`📊 Result type: ${result.searchMethod || 'unknown'}`)
      console.log(
        `🎯 Intelligent search: ${result.intelligentSearch ? 'YES' : 'NO'}`,
      )
      console.log(
        `📈 Confidence: ${result.confidence ? (result.confidence * 100).toFixed(1) + '%' : 'N/A'}`,
      )

      if (result.summary) {
        console.log(`📝 Summary: ${result.summary.slice(0, 100)}...`)
      }

      if (result.documents && result.documents[0]) {
        console.log(`📄 Found ${result.documents[0].length} documents`)
      }
    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error)
    }
  }

  console.log('\n✅ Enhanced workflow test completed')
}

/**
 * Test document processing capabilities
 */
export async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing...')

  const { getDocumentProcessor } = await import('./enhanced-document-processor')
  const processor = getDocumentProcessor()

  // Sample construction document content
  const sampleContent = `
FLOOR PLAN - SECOND FLOOR
Building: Office Complex A
Date: March 2024

ROOM SCHEDULE:
- Conference Room A: 20' x 15', Capacity 12 people
- Conference Room B: 16' x 12', Capacity 8 people  
- Office 201: 12' x 10', Single occupancy
- Office 202: 12' x 10', Single occupancy
- Office 203: 15' x 12', Double occupancy
- Break Room: 18' x 14', Kitchen facilities
- Storage Room: 8' x 6', General storage

DOOR SCHEDULE:
- D1: 3'-0" x 7'-0", Wood, Conference Room A entrance
- D2: 3'-0" x 7'-0", Wood, Conference Room B entrance
- D3: 2'-8" x 7'-0", Wood, Office doors (5 total)
- D4: 3'-6" x 7'-0", Glass, Break room entrance

WINDOW SCHEDULE:
- W1: 4'-0" x 6'-0", Double hung, Conference rooms (2 total)
- W2: 3'-0" x 4'-0", Fixed, Offices (6 total)
- W3: 6'-0" x 4'-0", Sliding, Break room

MATERIALS:
- Flooring: Carpet tile throughout offices, ceramic tile in break room
- Walls: Painted drywall, accent wall in conference rooms
- Ceiling: Suspended acoustic tile, 9'-0" height
`

  try {
    console.log('📄 Processing sample construction document...')

    const structuredData = await processor.processDocument(
      'test-doc-123',
      sampleContent,
      'Second Floor Plan',
      'floor_plan',
    )

    if (structuredData) {
      console.log(
        `✅ Successfully processed document with ${structuredData.elements.length} elements`,
      )
      console.log(`📊 Document type: ${structuredData.metadata.document_type}`)
      console.log(
        `🎯 Confidence: ${(structuredData.metadata.confidence * 100).toFixed(1)}%`,
      )

      // Show sample elements
      console.log('\n🏗️ Sample extracted elements:')
      structuredData.elements.slice(0, 3).forEach((element, i) => {
        console.log(`  ${i + 1}. ${element.type}: ${element.content}`)
        if (element.properties.dimensions) {
          console.log(`     Dimensions: ${element.properties.dimensions}`)
        }
      })

      // Test intelligent search on this processed document
      console.log('\n🔍 Testing intelligent search on processed document...')

      const searchEngine = processor.getSearchEngine()
      const searchResults = await searchEngine.intelligentSearch(
        'How many conference rooms?',
        'test-doc-123',
      )

      console.log(`📊 Intelligent search found ${searchResults.length} results`)
      searchResults.slice(0, 2).forEach((result, i) => {
        console.log(
          `  ${i + 1}. ${result.element.content} (${(result.relevanceScore * 100).toFixed(1)}% relevant)`,
        )
      })
    } else {
      console.log('❌ Failed to process document')
    }
  } catch (error) {
    console.error('❌ Error in document processing test:', error)
  }

  console.log('\n✅ Document processing test completed')
}

// Export test functions
export { testEnhancedWorkflow, testDocumentProcessing }
