import {
  queryEmbeddingsProxy as queryEmbeddingsInternal,
  upsertEmbeddingsProxy as upsertEmbeddingsInternal,
  deleteEmbeddingsProxy as deleteEmbeddingsInternal,
} from './pinecone-proxy'

// Legacy Pinecone direct access - now using proxy to avoid CORS
// Note: All direct Pinecone calls now route through Lambda proxy to avoid CORS issues in Safari

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

export async function upsertEmbeddings(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas?: Record<string, string | number | boolean>[],
) {
  try {
    console.log(
      `Upserting ${embeddings.length} vectors to Pinecone namespace: ${collectionName}`,
    )

    await upsertEmbeddingsInternal(collectionName, ids, embeddings, metadatas)

    console.log(
      `Successfully upserted ${embeddings.length} vectors to Pinecone namespace: ${collectionName}`,
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
    console.log(
      `Querying Pinecone namespace "${collectionName}" with topK=${topK}`,
    )

    const result = await queryEmbeddingsInternal(
      collectionName,
      queryEmbeddings,
      topK,
      documentId,
    )

    console.log(
      `Pinecone query returned ${result.ids[0]?.length || 0} matches for namespace: ${collectionName}`,
    )

    return result
  } catch (error) {
    console.error('Error querying embeddings from Pinecone:', error)
    throw error
  }
}

// Additional utility functions for Pinecone operations

export async function deleteEmbeddings(collectionName: string, ids: string[]) {
  try {
    await deleteEmbeddingsInternal(collectionName, ids)
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
    // Note: deleteAll functionality would need to be implemented in Lambda
    // For now, this is a placeholder
    console.log(
      `Delete namespace operation not yet implemented for: ${collectionName}`,
    )
    throw new Error('Delete namespace not implemented in proxy mode')
  } catch (error) {
    console.error('Error deleting namespace from Pinecone:', error)
    throw error
  }
}

export async function getIndexStats() {
  try {
    // Note: Index stats functionality would need to be implemented in Lambda
    // For now, this is a placeholder
    console.log('Index stats operation not yet implemented in proxy mode')
    throw new Error('Index stats not implemented in proxy mode')
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
