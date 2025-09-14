import { getCurrentUser } from 'aws-amplify/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'

// Generate the Amplify data client
const client = generateClient<Schema>()

/**
 * Make authenticated request to Pinecone Lambda proxy via GraphQL
 */
async function makePineconeRequest(
  requestBody: PineconeProxyRequest,
): Promise<PineconeProxyResponse> {
  try {
    // Check authentication first
    try {
      const session = await fetchAuthSession()
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required')
      }
    } catch (authError) {
      throw new Error('Authentication required for Pinecone proxy')
    }

    // Use the GraphQL query to call the Lambda function
    const response = await client.queries.pineconeSearch({
      body: JSON.stringify(requestBody),
    })

    // Check for GraphQL errors
    if (response.errors && response.errors.length > 0) {
      throw new Error(
        `GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`,
      )
    }

    if (!response.data) {
      throw new Error('No response data from Pinecone search')
    }

    // Parse response data
    let result: PineconeProxyResponse

    if (typeof response.data === 'string') {
      try {
        result = JSON.parse(response.data) as PineconeProxyResponse
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError}`)
      }
    } else {
      result = response.data as PineconeProxyResponse
    }

    return result
  } catch (error) {
    console.error('Pinecone proxy request error:', error)
    throw error
  }
}

export interface PineconeProxyRequest {
  action: 'query' | 'upsert' | 'delete'
  namespace: string
  vector?: number[]
  topK?: number
  filter?: Record<string, unknown>
  documentId?: string
  vectors?: Array<{
    id: string
    values: number[]
    metadata?: Record<string, unknown>
  }>
  ids?: string[]
}

export interface PineconeProxyResponse {
  success: boolean
  result?: {
    ids?: string[][]
    documents?: string[][]
    metadatas?: Record<string, unknown>[][]
    distances?: number[][]
    upserted?: number
    deleted?: number
  }
  error?: string
  message?: string
}

/**
 * Query embeddings via Lambda proxy to avoid CORS issues
 */
export async function queryEmbeddingsProxy(
  collectionName: string,
  queryEmbeddings: number[][],
  topK = 5,
  documentId?: string,
): Promise<{
  ids: string[][]
  documents: string[][]
  metadatas: Record<string, unknown>[][]
  distances: number[][]
}> {
  try {
    const requestBody: PineconeProxyRequest = {
      action: 'query',
      namespace: collectionName,
      vector: queryEmbeddings[0],
      topK: Math.max(1, Math.floor(Number(topK) || 5)),
      ...(documentId && { documentId }),
    }

    const data = await makePineconeRequest(requestBody)

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Failed to query Pinecone via proxy')
    }

    return {
      ids: data.result.ids || [[]],
      documents: data.result.documents || [[]],
      metadatas: data.result.metadatas || [[]],
      distances: data.result.distances || [[]],
    }
  } catch (error) {
    console.error('Pinecone proxy query error:', error)
    throw error
  }
}

/**
 * Upsert embeddings via Lambda proxy
 */
export async function upsertEmbeddingsProxy(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, unknown>[],
): Promise<void> {
  try {
    const vectors = ids.map((id, i) => ({
      id,
      values: embeddings[i],
      metadata: metadatas?.[i] || {},
    }))

    const requestBody: PineconeProxyRequest = {
      action: 'upsert',
      namespace: collectionName,
      vectors,
    }

    const data = await makePineconeRequest(requestBody)

    if (!data.success) {
      throw new Error(data.error || 'Failed to upsert to Pinecone via proxy')
    }
  } catch (error) {
    console.error('Pinecone proxy upsert error:', error)
    throw error
  }
}

/**
 * Delete embeddings via Lambda proxy
 */
export async function deleteEmbeddingsProxy(
  collectionName: string,
  ids: string[],
): Promise<void> {
  try {
    const requestBody: PineconeProxyRequest = {
      action: 'delete',
      namespace: collectionName,
      ids,
    }

    const data = await makePineconeRequest(requestBody)

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete from Pinecone via proxy')
    }
  } catch (error) {
    console.error('Pinecone proxy delete error:', error)
    throw error
  }
}

// Legacy support - backwards compatibility
export const queryEmbeddings = queryEmbeddingsProxy
export const upsertEmbeddings = upsertEmbeddingsProxy
export const deleteEmbeddings = deleteEmbeddingsProxy
