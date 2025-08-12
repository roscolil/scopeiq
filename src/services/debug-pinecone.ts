/**
 * Debug Pinecone Storage
 * Helper functions to debug what's stored in Pinecone
 */

import { getIndexStats, queryEmbeddings } from './pinecone'

export async function debugPineconeNamespace(projectId: string) {
  console.log(`🔍 Debugging Pinecone namespace: ${projectId}`)

  try {
    // Get index stats
    const stats = await getIndexStats()
    console.log('📊 Index Stats:', stats)

    // Check if the namespace exists
    const namespaces = stats.namespaces || {}
    const projectNamespace = namespaces[projectId]

    if (projectNamespace) {
      console.log(`✅ Project namespace "${projectId}" found:`)
      console.log(`   Vector count: ${projectNamespace.recordCount}`)
    } else {
      console.log(`❌ Project namespace "${projectId}" not found`)
      console.log('Available namespaces:')
      Object.keys(namespaces).forEach(ns => {
        console.log(`   - ${ns}: ${namespaces[ns].recordCount} vectors`)
      })
    }

    return { projectNamespace, allNamespaces: namespaces }
  } catch (error) {
    console.error('❌ Error debugging Pinecone:', error)
    throw error
  }
}

export async function testEmbeddingSearch(
  projectId: string,
  testQuery: string = 'door schedule',
) {
  console.log(`🧪 Testing embedding search for project: ${projectId}`)
  console.log(`🔍 Query: "${testQuery}"`)

  try {
    // Import here to avoid circular dependencies
    const { generateEmbedding } = await import('./embedding')

    // Generate embedding for test query
    console.log('🔄 Generating embedding...')
    const queryEmbedding = await generateEmbedding(testQuery)
    console.log(
      `✅ Generated embedding with ${queryEmbedding.length} dimensions`,
    )

    // Test query
    console.log('🔄 Querying Pinecone...')
    const results = await queryEmbeddings(projectId, [queryEmbedding], 10)

    console.log(`📊 Query Results:`)
    console.log(`   IDs: ${results.ids[0]?.length || 0}`)
    console.log(`   Documents: ${results.documents[0]?.length || 0}`)
    console.log(`   Metadata: ${results.metadatas[0]?.length || 0}`)
    console.log(`   Distances: ${results.distances[0]?.length || 0}`)

    if (results.documents[0]?.length > 0) {
      console.log('\n📋 Top Results:')
      results.documents[0].slice(0, 3).forEach((doc, idx) => {
        console.log(
          `   ${idx + 1}. Distance: ${results.distances[0][idx]?.toFixed(4)}`,
        )
        console.log(`      Content: ${doc.substring(0, 150)}...`)
        const metadata = results.metadatas[0][idx]
        console.log(
          `      Metadata keys: ${Object.keys(metadata || {}).join(', ')}`,
        )
        if (metadata?.documentName) {
          console.log(`      Document: ${metadata.documentName}`)
        }
      })
    } else {
      console.log('❌ No results found!')
    }

    return results
  } catch (error) {
    console.error('❌ Error testing embedding search:', error)
    throw error
  }
}

// Helper to run both debug functions
export async function fullDebugSession(projectId: string) {
  console.log('🚀 Starting full debug session...\n')

  await debugPineconeNamespace(projectId)
  console.log('\n' + '='.repeat(50) + '\n')
  await testEmbeddingSearch(projectId, 'door window schedule')

  console.log('\n✅ Debug session complete!')
}
