import { Pinecone } from '@pinecone-database/pinecone'

// Pinecone configuration
const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY
const PINECONE_INDEX_NAME =
  import.meta.env.VITE_PINECONE_INDEX_NAME || 'scopeiq-documents'

// Namespace configuration
export const NAMESPACE_CONFIG = {
  project: (projectId: string) => `project_${projectId}`,
  common: 'common_terms',
  standards: 'building_codes',
  materials: 'material_specs',
  safety: 'safety_regulations',
} as const

// Common terms content types
export const COMMON_CONTENT_TYPES = [
  'building_codes',
  'safety_regulations',
  'material_specifications',
  'industry_standards',
  'technical_definitions',
  'measurement_units',
  'equipment_specs',
  'compliance_requirements',
] as const

export type CommonContentType = (typeof COMMON_CONTENT_TYPES)[number]

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

    // Ensure topK is a valid integer
    const validTopK = Math.max(1, Math.floor(Number(topK) || 5))

    // Build query parameters
    const queryParams = {
      vector: queryEmbeddings[0],
      topK: validTopK,
      includeMetadata: true,
      includeValues: false,
      ...(documentId && {
        filter: {
          document_id: { $eq: documentId },
        },
      }),
    }

    console.log(
      `Querying Pinecone namespace "${collectionName}" with topK=${validTopK}`,
    )

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

// Enhanced query functions for common terms namespace

export async function hybridQuery(
  projectId: string,
  embeddingVectors: number[][],
  options: {
    topK?: number
    documentId?: string
    includeCommon?: boolean
    commonWeight?: number
  } = {},
) {
  const {
    topK = 10,
    documentId,
    includeCommon = true,
    commonWeight = 0.3,
  } = options

  try {
    // Ensure topK is a valid integer
    const validTopK = Math.max(1, Math.floor(Number(topK) || 10))

    const projectNamespace = NAMESPACE_CONFIG.project(projectId)
    const projectK = Math.max(1, Math.ceil(validTopK * (1 - commonWeight)))
    const commonK = Math.max(1, Math.floor(validTopK * commonWeight))

    console.log(
      `Smart query: topK=${validTopK}, projectK=${projectK}, commonK=${commonK}`,
    )

    // Query project-specific namespace
    const projectResults = await queryEmbeddings(
      projectNamespace,
      embeddingVectors,
      projectK,
      documentId,
    )

    if (!includeCommon) {
      return projectResults
    }

    // Query common terms namespace
    const commonResults = await queryEmbeddings(
      NAMESPACE_CONFIG.common,
      embeddingVectors,
      commonK,
    )

    // Merge and rank results
    return mergeQueryResults(projectResults, commonResults, {
      projectWeight: 1 - commonWeight,
      commonWeight,
    })
  } catch (error) {
    console.error('Error in hybrid query:', error)
    throw error
  }
}

export async function smartQuery(
  projectId: string,
  embeddingVectors: number[][],
  query: string,
  options: {
    topK?: number
    documentId?: string
  } = {},
) {
  const queryType = classifyQuery(query)

  if (queryType.isGeneric) {
    // Search common terms first for generic queries
    return await queryEmbeddings(
      NAMESPACE_CONFIG.common,
      embeddingVectors,
      options.topK,
      options.documentId,
    )
  } else if (queryType.isProjectSpecific) {
    // Search project only for project-specific queries
    return await queryEmbeddings(
      NAMESPACE_CONFIG.project(projectId),
      embeddingVectors,
      options.topK,
      options.documentId,
    )
  } else {
    // Use hybrid search for mixed queries
    return await hybridQuery(projectId, embeddingVectors, options)
  }
}

export async function upsertCommonTerms(
  contentType: CommonContentType,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  const enhancedMetadatas = metadatas?.map(meta => ({
    ...meta,
    content_type: contentType,
    is_common: true,
    namespace_type: 'common',
  }))

  return await upsertEmbeddings(
    NAMESPACE_CONFIG.common,
    ids,
    embeddings,
    enhancedMetadatas,
  )
}

// Utility functions

interface QueryResult {
  ids: string[][]
  documents: string[][]
  metadatas: Record<string, unknown>[][]
  distances: number[][]
}

function mergeQueryResults(
  projectResults: QueryResult,
  commonResults: QueryResult,
  weights: { projectWeight: number; commonWeight: number },
): QueryResult {
  const { projectWeight, commonWeight } = weights

  // Adjust scores based on weights and merge
  const projectMatches =
    projectResults.ids[0]?.map((id: string, i: number) => ({
      id,
      document: projectResults.documents[0][i],
      metadata: { ...projectResults.metadatas[0][i], source: 'project' },
      distance: projectResults.distances[0][i],
      adjustedScore: (1 - projectResults.distances[0][i]) * projectWeight,
    })) || []

  const commonMatches =
    commonResults.ids[0]?.map((id: string, i: number) => ({
      id,
      document: commonResults.documents[0][i],
      metadata: { ...commonResults.metadatas[0][i], source: 'common' },
      distance: commonResults.distances[0][i],
      adjustedScore: (1 - commonResults.distances[0][i]) * commonWeight,
    })) || []

  // Merge and sort by adjusted score
  const allMatches = [...projectMatches, ...commonMatches].sort(
    (a, b) => b.adjustedScore - a.adjustedScore,
  )

  // Convert back to expected format
  return {
    ids: [allMatches.map(m => m.id)],
    documents: [allMatches.map(m => m.document)],
    metadatas: [allMatches.map(m => m.metadata)],
    distances: [allMatches.map(m => m.distance)],
  }
}

function classifyQuery(query: string): {
  isGeneric: boolean
  isProjectSpecific: boolean
  suggestedNamespace?: string
} {
  const genericTerms = [
    'building code',
    'safety regulation',
    'material specification',
    'industry standard',
    'compliance',
    'osha',
    'ada',
    'ibc',
    'fire safety',
    'structural engineering',
    'concrete',
    'steel',
    'insulation',
    'hvac',
    'electrical code',
    'plumbing code',
  ]

  const projectSpecificTerms = [
    'site plan',
    'project schedule',
    'contractor',
    'permit',
    'inspection',
    'change order',
    'progress report',
    'budget',
    'timeline',
    'milestone',
    'deliverable',
    'stakeholder',
  ]

  const lowerQuery = query.toLowerCase()

  const hasGeneric = genericTerms.some(term => lowerQuery.includes(term))
  const hasProjectSpecific = projectSpecificTerms.some(term =>
    lowerQuery.includes(term),
  )

  return {
    isGeneric: hasGeneric && !hasProjectSpecific,
    isProjectSpecific: hasProjectSpecific && !hasGeneric,
    suggestedNamespace: hasGeneric ? NAMESPACE_CONFIG.common : undefined,
  }
}
