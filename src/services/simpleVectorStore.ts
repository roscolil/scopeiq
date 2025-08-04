/**
 * Simple In-Memory Vector Search Service
 * A lightweight alternative to ChromaDB for document search
 */

export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown>
}

export interface SearchResult {
  id: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

class SimpleVectorStore {
  private documents: Map<string, VectorDocument> = new Map()
  private collections: Map<string, Map<string, VectorDocument>> = new Map()

  /**
   * Get or create a collection
   */
  getOrCreateCollection(name: string): Map<string, VectorDocument> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map())
    }
    return this.collections.get(name)!
  }

  /**
   * Add documents to a collection
   */
  async upsertDocuments(
    collectionName: string,
    documents: Array<{
      id: string
      content: string
      embedding: number[]
      metadata?: Record<string, unknown>
    }>,
  ): Promise<void> {
    const collection = this.getOrCreateCollection(collectionName)

    for (const doc of documents) {
      const vectorDoc: VectorDocument = {
        id: doc.id,
        content: doc.content,
        embedding: doc.embedding,
        metadata: doc.metadata || {},
      }
      collection.set(doc.id, vectorDoc)
    }

    console.log(
      `Added ${documents.length} documents to collection ${collectionName}`,
    )
  }

  /**
   * Search for similar documents using cosine similarity
   */
  async queryDocuments(
    collectionName: string,
    queryEmbedding: number[],
    topK: number = 5,
    minSimilarity: number = 0.0,
  ): Promise<SearchResult[]> {
    const collection = this.collections.get(collectionName)
    if (!collection) {
      return []
    }

    const results: SearchResult[] = []

    for (const [id, doc] of collection) {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding)

      if (similarity >= minSimilarity) {
        results.push({
          id: doc.id,
          content: doc.content,
          similarity,
          metadata: doc.metadata,
        })
      }
    }

    // Sort by similarity (highest first) and take top K
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Get collection stats
   */
  getCollectionStats(collectionName: string): { documentCount: number } {
    const collection = this.collections.get(collectionName)
    return {
      documentCount: collection ? collection.size : 0,
    }
  }

  /**
   * Delete a collection
   */
  deleteCollection(collectionName: string): boolean {
    return this.collections.delete(collectionName)
  }

  /**
   * List all collections
   */
  listCollections(): string[] {
    return Array.from(this.collections.keys())
  }
}

// Create a singleton instance
export const simpleVectorStore = new SimpleVectorStore()

// Helper functions that match ChromaDB interface
export async function getOrCreateCollection(name: string) {
  return {
    name,
    upsert: async (data: {
      ids: string[]
      embeddings: number[][]
      metadatas?: Record<string, unknown>[]
    }) => {
      const documents = data.ids.map((id, i) => ({
        id,
        content: String(data.metadatas?.[i]?.content || ''),
        embedding: data.embeddings[i],
        metadata: data.metadatas?.[i] || {},
      }))
      await simpleVectorStore.upsertDocuments(name, documents)
    },
    query: async (params: {
      queryEmbeddings: number[][]
      nResults: number
    }) => {
      const results = await simpleVectorStore.queryDocuments(
        name,
        params.queryEmbeddings[0],
        params.nResults,
      )

      // Format results to match ChromaDB response structure
      return {
        ids: [results.map(r => r.id)],
        documents: [results.map(r => r.content)],
        metadatas: [results.map(r => r.metadata)],
        distances: [results.map(r => 1 - r.similarity)], // Convert similarity to distance
      }
    },
  }
}

export async function upsertEmbeddings(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  const collection = await getOrCreateCollection(collectionName)
  return await collection.upsert({ ids, embeddings, metadatas })
}

export async function queryEmbeddings(
  collectionName: string,
  queryEmbeddings: number[][],
  topK = 5,
) {
  const collection = await getOrCreateCollection(collectionName)
  return await collection.query({ queryEmbeddings, nResults: topK })
}
