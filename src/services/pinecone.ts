import { Pinecone, Index } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: import.meta.env.VITE_PINECONE_API_KEY!,
})

const INDEX_NAME = 'scopeiq-documents'
const DIMENSION = 1536
let indexCache: Index | null = null

async function getOrCreateIndex() {
  if (indexCache) return indexCache
  const indexList = await pinecone.listIndexes()
  const existingIndex = indexList.indexes?.find(idx => idx.name === INDEX_NAME)
  if (!existingIndex) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    })
    await new Promise(resolve => setTimeout(resolve, 60000))
  }
  indexCache = pinecone.index(INDEX_NAME)
  return indexCache
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
