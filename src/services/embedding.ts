import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'
import {
  processConstructionImage,
  extractTextForEmbedding,
} from './image-processing'

// Use local worker file served from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export async function extractTextFromFile(file: File): Promise<string> {
  let text = ''
  console.log(`Starting extraction for: ${file.name} (${file.type})`)

  try {
    if (file.type === 'text/plain') {
      text = await file.text()
      console.log(
        'TXT extraction complete, extracted',
        text.length,
        'characters',
      )
    } else if (file.type.includes('pdf')) {
      // Enhanced PDF processing with image detection
      const fileArrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: fileArrayBuffer }).promise
      let pdfText = ''
      let hasImages = false

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)

        // Extract text content
        const content = await page.getTextContent()
        const pageText = content.items
          .map(item => {
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')
        pdfText += pageText + ' '

        // Check for images on this page
        try {
          const operatorList = await page.getOperatorList()
          // Simple check for image operations in the PDF
          const hasPageImages = operatorList.fnArray.some(
            (fn: number) =>
              fn === pdfjs.OPS.paintImageXObject ||
              fn === pdfjs.OPS.paintInlineImageXObject ||
              fn === pdfjs.OPS.paintImageMaskXObject,
          )
          if (hasPageImages) {
            hasImages = true
            pdfText += `
[IMAGE DETECTED ON PAGE ${i} - This PDF contains embedded images that may contain additional construction information] `
          }
        } catch (imageCheckError) {
          console.warn(
            `Could not check for images on page ${i}:`,
            imageCheckError,
          )
        }
      }

      text = pdfText

      if (hasImages) {
        text += `

NOTE: This PDF contains embedded images. For complete analysis of technical drawings, blueprints, or diagrams in this document, the images should be extracted and analyzed separately with computer vision.`
      }

      console.log(
        'PDF extraction complete, extracted',
        text.length,
        'characters',
        hasImages ? '(contains images)' : '(text only)',
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
      // Process standalone image files with GPT-4 Turbo Vision
      try {
        console.log(
          'Processing standalone image file with GPT-4 Turbo Vision analysis...',
        )
        const processedImage = await processConstructionImage(file)

        // Extract searchable text content
        text = extractTextForEmbedding(processedImage)

        // Add metadata to indicate this is a standalone image analysis
        text = `STANDALONE IMAGE ANALYSIS (${file.type}):
${text}

Source: Direct image file upload (${file.name})
Analysis Method: GPT-4 Turbo Vision computer vision analysis
Image Type: ${processedImage.analysis.documentType}
Confidence: ${processedImage.analysis.confidence}%`

        console.log('Standalone image processing complete:', {
          fileName: file.name,
          fileType: file.type,
          documentType: processedImage.analysis.documentType,
          textLength: text.length,
          keyElements: processedImage.analysis.keyElements.length,
          confidence: processedImage.analysis.confidence,
        })

        // Store analysis results for potential use in UI
        if (typeof window !== 'undefined') {
          // Store analysis results for potential use in UI
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(window as any).lastImageAnalysis = {
            ...processedImage.analysis,
            isStandaloneImage: true,
            originalFileName: file.name,
            processingMethod: 'GPT-4 Turbo Vision',
          }
        }
      } catch (error) {
        console.warn('Image analysis failed, using fallback:', error)
        text = `Image file: ${file.name}` // Fallback to basic filename
      }
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
  documentId,
}: {
  projectId: string
  query: string
  topK?: number
  documentId?: string
}) {
  const embedding = await generateEmbedding(query)
  const results = await queryEmbeddings(
    projectId,
    [embedding],
    topK,
    documentId,
  )
  return results
}
