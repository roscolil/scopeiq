import { Pinecone } from '@pinecone-database/pinecone'

// Pinecone configuration
const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY
const PINECONE_INDEX_NAME =
  import.meta.env.VITE_PINECONE_INDEX_NAME || 'scopeiq-documents'

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null

async function getPineconeClient(): Promise<Pinecone> {
  if (!pineconeClient) {
    if (!PINECONE_API_KEY) {
      throw new Error('VITE_PINECONE_API_KEY environment variable is required')
    }

    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    })
  }
  return pineconeClient
}

async function getOrCreateIndex() {
  const pc = await getPineconeClient()

  try {
    // Try to get existing index
    const index = pc.index(PINECONE_INDEX_NAME)
    return index
  } catch (error) {
    console.error('Error accessing Pinecone index:', error)
    throw new Error(`Failed to access Pinecone index: ${PINECONE_INDEX_NAME}`)
  }
}

export async function upsertEmbeddings(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  try {
    const index = await getOrCreateIndex()

    // Prepare vectors for upsert
    const vectors = ids.map((id, i) => ({
      id,
      values: embeddings[i],
      metadata: {
        ...metadatas?.[i],
        collection: collectionName,
        timestamp: Date.now(),
      },
    }))

    // Upsert vectors to the specified namespace (collection)
    await index.namespace(collectionName).upsert(vectors)

    console.log(
      `Successfully upserted ${vectors.length} vectors to Pinecone namespace: ${collectionName}`,
    )
  } catch (error) {
    console.error('Error upserting embeddings to Pinecone:', error)
    throw error
  }
}

export async function queryEmbeddings(
  collectionName: string,
  queryEmbeddings: number[][],
  topK = 5,
  documentId?: string,
) {
  try {
    const index = await getOrCreateIndex()

    // Build query parameters
    const queryParams = {
      vector: queryEmbeddings[0],
      topK,
      includeMetadata: true,
      includeValues: false,
      ...(documentId && {
        filter: {
          document_id: { $eq: documentId },
        },
      }),
    }

    // Query the specific namespace (collection)
    const queryResponse = await index
      .namespace(collectionName)
      .query(queryParams)

    const matches = queryResponse.matches || []

    console.log(
      `Pinecone query returned ${matches.length} matches for namespace: ${collectionName}`,
    )

    // Transform the response to match the expected format
    const result = {
      ids: [matches.map(m => m.id)],
      documents: [matches.map(m => (m.metadata?.content as string) || '')],
      metadatas: [matches.map(m => m.metadata || {})],
      distances: [matches.map(m => 1 - (m.score || 0))], // Convert similarity to distance
    }

    return result
  } catch (error) {
    console.error('Error querying embeddings from Pinecone:', error)
    throw error
  }
}

// Additional utility functions for Pinecone operations

export async function deleteEmbeddings(collectionName: string, ids: string[]) {
  try {
    const index = await getOrCreateIndex()
    await index.namespace(collectionName).deleteMany(ids)
    console.log(
      `Deleted ${ids.length} vectors from Pinecone namespace: ${collectionName}`,
    )
  } catch (error) {
    console.error('Error deleting embeddings from Pinecone:', error)
    throw error
  }
}

export async function deleteNamespace(collectionName: string) {
  try {
    const index = await getOrCreateIndex()
    await index.namespace(collectionName).deleteAll()
    console.log(
      `Deleted all vectors from Pinecone namespace: ${collectionName}`,
    )
  } catch (error) {
    console.error('Error deleting namespace from Pinecone:', error)
    throw error
  }
}

export async function getIndexStats() {
  try {
    const index = await getOrCreateIndex()
    const stats = await index.describeIndexStats()
    console.log('Pinecone index stats:', stats)
    return stats
  } catch (error) {
    console.error('Error getting Pinecone index stats:', error)
    throw error
  }
}
