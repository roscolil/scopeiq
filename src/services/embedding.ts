import { upsertEmbeddings, queryEmbeddings } from './pinecone'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key missing')
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  })
  if (!response.ok) throw new Error('Failed to get embedding')
  const data = await response.json()
  return data.data[0].embedding
}

export async function upsertDocumentEmbedding({
  projectId,
  documentId,
  content,
  metadata,
}: {
  projectId: string
  documentId: string
  content: string
  metadata?: Record<string, string | number | boolean>
}) {
  const embedding = await generateEmbedding(content)
  await upsertEmbeddings(
    projectId,
    [documentId],
    [embedding],
    metadata ? [{ ...metadata, content }] : [{ content }],
  )
}

export async function semanticSearch({
  projectId,
  query,
  topK = 5,
}: {
  projectId: string
  query: string
  topK?: number
}) {
  const embedding = await generateEmbedding(query)
  const results = await queryEmbeddings(projectId, [embedding], topK)
  return results
}
