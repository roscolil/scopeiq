// Mock implementation for client-side compatibility
// In production, Pinecone operations should be handled server-side

interface MockVector {
  id: string
  values: number[]
  metadata?: Record<string, string | number | boolean>
}

interface MockIndex {
  namespace(name: string): {
    upsert: (vectors: MockVector[]) => Promise<void>
    query: (params: {
      vector: number[]
      topK: number
      includeMetadata?: boolean
      includeValues?: boolean
    }) => Promise<{
      matches: Array<{
        id: string
        score: number
        metadata?: Record<string, string | number | boolean>
      }>
    }>
  }
}

// Mock storage for vectors
const mockVectorStore: { [namespace: string]: MockVector[] } = {}

const createMockIndex = (): MockIndex => ({
  namespace: (name: string) => ({
    upsert: async (vectors: MockVector[]) => {
      if (!mockVectorStore[name]) {
        mockVectorStore[name] = []
      }
      // Simulate upsert by replacing existing or adding new
      vectors.forEach(vector => {
        const existingIndex = mockVectorStore[name].findIndex(
          v => v.id === vector.id,
        )
        if (existingIndex >= 0) {
          mockVectorStore[name][existingIndex] = vector
        } else {
          mockVectorStore[name].push(vector)
        }
      })
      console.log(
        `Mock: Upserted ${vectors.length} vectors to namespace ${name}`,
      )
    },
    query: async params => {
      const vectors = mockVectorStore[name] || []
      // Simple mock similarity calculation (random for demo)
      const matches = vectors
        .map(vector => ({
          id: vector.id,
          score: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
          metadata: vector.metadata,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, params.topK)

      console.log(
        `Mock: Queried namespace ${name}, found ${matches.length} matches`,
      )
      return { matches }
    },
  }),
})

const mockIndex = createMockIndex()

async function getOrCreateIndex() {
  // Mock implementation - just return the mock index
  console.log('Mock: Using mock Pinecone index')
  return mockIndex
}

export async function upsertEmbeddings(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  const index = await getOrCreateIndex()
  const vectors = ids.map((id, i) => ({
    id,
    values: embeddings[i],
    metadata: { ...metadatas?.[i], collection: collectionName },
  }))
  await index.namespace(collectionName).upsert(vectors)
}

export async function queryEmbeddings(
  collectionName: string,
  queryEmbeddings: number[][],
  topK = 5,
) {
  const index = await getOrCreateIndex()

  const queryResponse = await index.namespace(collectionName).query({
    vector: queryEmbeddings[0],
    topK,
    includeMetadata: true,
    includeValues: false,
  })

  const matches = queryResponse.matches || []

  const result = {
    ids: [matches.map(m => m.id)],
    documents: [matches.map(m => m.metadata?.content || '')],
    metadatas: [matches.map(m => m.metadata || {})],
    distances: [matches.map(m => 1 - (m.score || 0))],
  }

  return result
}
