import * as pdfjs from 'pdfjs-dist'

// Use local worker file served from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export async function extractTextFromFile(file: File): Promise<string> {
  let text = ''
  try {
    if (file.type === 'text/plain') {
      text = await file.text()
      console.log(
        'TXT extraction complete, extracted',
        text.length,
        'characters',
      )
    } else if (file.type.includes('pdf')) {
      const fileArrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: fileArrayBuffer }).promise
      let pdfText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pdfText += content.items
          .map(item => {
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')
      }
      text = pdfText
      console.log(
        'PDF extraction complete, extracted',
        text.length,
        'characters',
      )
    } else if (file.type.includes('word') || file.type.includes('docx')) {
      text = await file.text()
      console.log(
        'DOCX extraction complete, extracted',
        text.length,
        'characters',
      )
    } else if (file.type.includes('image')) {
      text = ''
      console.log('Image file detected, skipping text extraction')
    } else {
      text = ''
      console.log('Unknown file type, skipping text extraction')
    }
  } catch (error) {
    console.error('Error extracting text from file:', error)
    text = ''
  }
  return text.trim()
}

export async function processEmbeddingOnly(
  projectId: string,
  documentId: string,
  content: string,
  metadata: Record<string, string | number | boolean>,
): Promise<void> {
  if (!content || content.trim().length === 0) {
    throw new Error('No text content found in document')
  }
  await upsertDocumentEmbedding({
    projectId,
    documentId,
    content,
    metadata: {
      ...metadata,
      content,
    },
  })
}
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
