import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'

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
    } else if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      // Handle .docx files using mammoth
      const fileArrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({
        arrayBuffer: fileArrayBuffer,
      })
      text = result.value
      console.log(
        'DOCX extraction complete, extracted',
        text.length,
        'characters',
      )
      if (result.messages && result.messages.length > 0) {
        console.log('DOCX extraction messages:', result.messages)
      }
    } else if (
      file.type === 'application/msword' ||
      file.name.toLowerCase().endsWith('.doc')
    ) {
      // Handle legacy .doc files - these are binary format and harder to parse
      // For now, we'll attempt basic text extraction but it may not be perfect
      try {
        text = await file.text()
        // Filter out binary characters and keep only readable text
        text = text
        // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        console.log(
          'DOC extraction complete (basic), extracted',
          text.length,
          'characters',
        )
      } catch (error) {
        console.warn(
          'DOC extraction failed, file may be corrupted or binary:',
          error,
        )
        text = ''
      }
    } else if (file.type.includes('word')) {
      // Fallback for other Word document types
      text = await file.text()
      console.log(
        'Word document extraction complete, extracted',
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
