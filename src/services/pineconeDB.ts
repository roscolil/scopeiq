/**
 * Pinecone Vector Database Service
 * Drop-in replacement for ChromaDB with guaranteed reliability
 */

import { Pinecone } from '@pinecone-database/pinecone'

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey:
    import.meta.env.VITE_PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY!,
})

const INDEX_NAME = 'scopeiq-documents'
const DIMENSION = 1536 // OpenAI ada-002 embedding dimension

// Cache for index reference
let indexCache: ReturnType<typeof pinecone.index> | null = null

// Helper: Get or create index (equivalent to collection)
async function getOrCreateIndex() {
  if (indexCache) return indexCache

  try {
    // Check if index exists
    const indexList = await pinecone.listIndexes()
    const existingIndex = indexList.indexes?.find(
      idx => idx.name === INDEX_NAME,
    )

    if (!existingIndex) {
      console.log(`Creating Pinecone index: ${INDEX_NAME}`)
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSION,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      })

      // Wait for index to be ready
      console.log('Waiting for index to be ready...')
      await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30 seconds
    }

    indexCache = pinecone.index(INDEX_NAME)
    return indexCache
  } catch (error) {
    console.error('Error setting up Pinecone index:', error)
    throw error
  }
}

// Helper: Get or create a collection (maps to Pinecone namespace)
export async function getOrCreateCollection(name: string) {
  const index = await getOrCreateIndex()

  return {
    name,
    upsert: async (data: {
      ids: string[]
      embeddings: number[][]
      metadatas?: Record<string, string | number | boolean>[]
    }) => {
      const vectors = data.ids.map((id, i) => ({
        id,
        values: data.embeddings[i],
        metadata: {
          ...data.metadatas?.[i],
          collection: name,
        },
      }))

      await index.namespace(name).upsert(vectors)
      console.log(
        `Upserted ${vectors.length} vectors to Pinecone namespace ${name}`,
      )
    },
    query: async (params: {
      queryEmbeddings: number[][]
      nResults: number
    }) => {
      const queryResponse = await index.namespace(name).query({
        vector: params.queryEmbeddings[0],
        topK: params.nResults,
        includeMetadata: true,
        includeValues: false,
      })

      // Format response to match ChromaDB structure
      const matches = queryResponse.matches || []
      return {
        ids: [matches.map(m => m.id)],
        documents: [matches.map(m => m.metadata?.content || '')],
        metadatas: [matches.map(m => m.metadata || {})],
        distances: [matches.map(m => 1 - (m.score || 0))], // Convert score to distance
      }
    },
  }
}

// Helper: Upsert embeddings (same interface as ChromaDB)
export async function upsertEmbeddings(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  const collection = await getOrCreateCollection(collectionName)
  return await collection.upsert({ ids, embeddings, metadatas })
}

// Helper: Query embeddings (same interface as ChromaDB)
export async function queryEmbeddings(
  collectionName: string,
  queryEmbeddings: number[][],
  topK = 5,
) {
  const collection = await getOrCreateCollection(collectionName)
  return await collection.query({ queryEmbeddings, nResults: topK })
}

// Additional helper functions for compatibility
export async function getChromaVersion() {
  return { version: 'Pinecone v1.0' }
}

export const chromaClient = {
  // Pinecone equivalents
  stats: async () => {
    const index = await getOrCreateIndex()
    const stats = await index.describeIndexStats()
    return stats
  },
  deleteIndex: async () => {
    await pinecone.deleteIndex(INDEX_NAME)
    indexCache = null
  },
}
