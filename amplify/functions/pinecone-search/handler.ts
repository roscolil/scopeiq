import type { AppSyncResolverHandler } from 'aws-lambda'
import { Pinecone } from '@pinecone-database/pinecone'

// Environment variables
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'scopeiq-documents'

// Lazy initialization to avoid build-time errors
let pineconeClient: Pinecone | null = null

const initializePinecone = () => {
  if (pineconeClient) {
    return pineconeClient
  }

  const PINECONE_API_KEY = process.env.PINECONE_API_KEY
  
  // Runtime validation - only fail when actually used
  if (!PINECONE_API_KEY || PINECONE_API_KEY === 'PLACEHOLDER_FOR_BUILD') {
    throw new Error('PINECONE_API_KEY environment variable is required and not properly configured')
  }

  pineconeClient = new Pinecone({
    apiKey: PINECONE_API_KEY,
  })

  return pineconeClient
}

interface PineconeMetadata {
  [key: string]: string | number | boolean
}

interface PineconeVector {
  id: string
  values: number[]
  metadata?: PineconeMetadata
}

interface PineconeFilter {
  [key: string]: unknown
}

interface PineconeSearchRequest {
  action: 'query' | 'upsert' | 'delete' | 'search'
  namespace: string
  query?: string
  vector?: number[]
  topK?: number
  filter?: PineconeFilter
  documentId?: string
  vectors?: PineconeVector[]
  ids?: string[]
}

// AppSync resolver handler for GraphQL queries
export const handler: AppSyncResolverHandler<{ body: string }, Record<string, unknown>> = async (event) => {
  try {
    // Initialize Pinecone client (with runtime validation)
    const pinecone = initializePinecone()

    // Parse the body argument from GraphQL
    const requestBody: PineconeSearchRequest = JSON.parse(event.arguments.body)
    const { action, namespace, vector, topK = 5, filter, documentId, vectors, ids } = requestBody

    const index = pinecone.index(PINECONE_INDEX_NAME)
    let result: unknown

    switch (action) {
      case 'query': {
        if (!vector) {
          throw new Error('Vector is required for query action')
        }

        const queryParams: {
          vector: number[]
          topK: number
          includeMetadata: boolean
          includeValues: boolean
          filter?: Record<string, unknown>
        } = {
          vector,
          topK: Math.max(1, Math.floor(Number(topK) || 5)),
          includeMetadata: true,
          includeValues: false,
        }

        if (documentId) {
          queryParams.filter = {
            document_id: { $eq: documentId },
          }
        } else if (filter) {
          queryParams.filter = filter
        }

        console.log(`Querying Pinecone namespace "${namespace}" with topK=${queryParams.topK}`)
        
        const queryResponse = await index.namespace(namespace).query(queryParams)
        const matches = queryResponse.matches || []

        result = {
          ids: [matches.map(m => m.id)],
          documents: [matches.map(m => (m.metadata?.content as string) || '')],
          metadatas: [matches.map(m => m.metadata || {})],
          distances: [matches.map(m => 1 - (m.score || 0))], // Convert similarity to distance
        }
        break
      }

      case 'upsert': {
        if (!vectors || vectors.length === 0) {
          throw new Error('Vectors are required for upsert action')
        }

        const upsertVectors = vectors.map(v => ({
          ...v,
          metadata: {
            ...v.metadata,
            collection: namespace,
            timestamp: Date.now(),
          },
        }))

        await index.namespace(namespace).upsert(upsertVectors)
        
        result = { success: true, upserted: upsertVectors.length }
        break
      }

      case 'delete': {
        if (!ids || ids.length === 0) {
          throw new Error('IDs are required for delete action')
        }

        await index.namespace(namespace).deleteMany(ids)
        
        result = { success: true, deleted: ids.length }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    const response = { success: true, result }
    
    return response

  } catch (error) {
    console.error('Pinecone Search Error:', error)
    
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
