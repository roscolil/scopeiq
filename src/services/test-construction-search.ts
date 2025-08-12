/**
 * Test Enhanced Construction Document Search
 *
 * This can be used to test the enhanced search capabilities
 */

import { searchConstructionDocument } from './construction-embedding'

export async function testConstructionSearch() {
  const testQueries = [
    'What door types are in the schedule?',
    'Show me window specifications',
    'What are the frame dimensions?',
    'Hardware requirements for doors',
    'Material specifications',
  ]

  console.log('🔍 Testing Enhanced Construction Document Search')

  for (const query of testQueries) {
    console.log(`\n📋 Testing query: "${query}"`)

    try {
      const result = await searchConstructionDocument(
        'test-project', // You'll need to use your actual project ID
        query,
        {
          topK: 5,
          chunkTypes: ['schedule', 'specification', 'table'],
          requireNumbers: true,
        },
      )

      console.log(`✅ Found ${result.results.length} results`)
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      console.log(`📝 Summary: ${result.summary}`)

      if (result.results.length > 0) {
        console.log(
          `🎯 Top result: ${result.results[0].content.substring(0, 200)}...`,
        )
      }
    } catch (error) {
      console.error(`❌ Search failed: ${error}`)
    }
  }
}

// Usage: Call this function after uploading your door & window schedule
// testConstructionSearch()
