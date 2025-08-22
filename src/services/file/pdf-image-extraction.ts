/**
 * PDF Image Extraction Service
 * Handles extraction and analysis of images embedded within PDF files
 */

import * as pdfjs from 'pdfjs-dist'
import { processConstructionImage } from './image-processing'
import { analyzeImageWithGPT4Vision } from '../ai/openai'

// Use local worker file served from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export interface PDFImageAnalysis {
  pageNumber: number
  imageIndex: number
  analysis: {
    description: string
    extractedText: string
    documentType: string
    keyElements: string[]
  }
  imageData: string // base64 encoded image
}

export interface PDFProcessingResult {
  textContent: string
  imageAnalyses: PDFImageAnalysis[]
  hasImages: boolean
  totalPages: number
}

/**
 * Extract and analyze both text and images from a PDF file
 */
export async function extractFromPDF(file: File): Promise<PDFProcessingResult> {
  const fileArrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: fileArrayBuffer }).promise

  let textContent = ''
  const imageAnalyses: PDFImageAnalysis[] = []

  console.log(`Processing PDF: ${file.name} with ${pdf.numPages} pages`)

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)

    // Extract text content
    const textContentPage = await page.getTextContent()
    const pageText = textContentPage.items
      .map(item => {
        if ('str' in item) {
          return item.str
        }
        return ''
      })
      .join(' ')

    textContent += pageText + '\n'

    // Extract images from the page
    try {
      const operatorList = await page.getOperatorList()
      const pageImages = await extractImagesFromPage(
        page,
        operatorList,
        pageNum,
      )
      imageAnalyses.push(...pageImages)
    } catch (error) {
      console.warn(`Failed to extract images from page ${pageNum}:`, error)
    }
  }

  console.log(
    `PDF processing complete: ${textContent.length} chars text, ${imageAnalyses.length} images`,
  )

  return {
    textContent: textContent.trim(),
    imageAnalyses,
    hasImages: imageAnalyses.length > 0,
    totalPages: pdf.numPages,
  }
}

/**
 * Extract images from a specific PDF page
 */
async function extractImagesFromPage(
  page: pdfjs.PDFPageProxy,
  operatorList: unknown, // PDF.js operator list type
  pageNumber: number,
): Promise<PDFImageAnalysis[]> {
  const imageAnalyses: PDFImageAnalysis[] = []

  try {
    // Get page resources to find images
    const resources = await page.objs.get('resources')

    if (resources && resources.XObject) {
      let imageIndex = 0

      for (const [name, ref] of Object.entries(resources.XObject)) {
        try {
          const obj = await page.objs.get(name)

          // Check if this is an image object
          if (obj && obj.bitmap) {
            imageIndex++
            console.log(
              `Found image on page ${pageNumber}, index ${imageIndex}`,
            )

            // Convert image to base64 for analysis
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = obj.bitmap.width
            canvas.height = obj.bitmap.height

            if (ctx) {
              ctx.drawImage(obj.bitmap, 0, 0)
              const base64Image = canvas.toDataURL('image/png').split(',')[1]

              // Create a File object from the base64 data for analysis
              const imageBlob = await fetch(
                `data:image/png;base64,${base64Image}`,
              ).then(r => r.blob())
              const imageFile = new File(
                [imageBlob],
                `pdf_image_p${pageNumber}_${imageIndex}.png`,
                { type: 'image/png' },
              )

              // Analyze the extracted image with GPT-4 Vision
              const analysis = await analyzeImageWithGPT4Vision(
                imageFile,
                `
This image was extracted from page ${pageNumber} of a PDF document. Analyze it carefully:

1. What type of construction document or image is this?
2. What specific elements can you see?
3. What text or labels can you read?
4. If it's a technical drawing, count any rooms, components, or elements
5. What construction-relevant information does this image contain?

Provide detailed analysis since this image is part of a larger document.
`,
              )

              imageAnalyses.push({
                pageNumber,
                imageIndex,
                analysis,
                imageData: base64Image,
              })

              console.log(
                `Analyzed image from page ${pageNumber}: ${analysis.documentType}`,
              )
            }
          }
        } catch (imageError) {
          console.warn(
            `Failed to process image ${name} on page ${pageNumber}:`,
            imageError,
          )
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to extract images from page ${pageNumber}:`, error)
  }

  return imageAnalyses
}

/**
 * Combine text and image analysis results for embedding
 */
export function combineAnalysisForEmbedding(
  result: PDFProcessingResult,
): string {
  let combinedContent = result.textContent

  if (result.hasImages && result.imageAnalyses.length > 0) {
    combinedContent += '\n\n--- EMBEDDED IMAGES ANALYSIS ---\n'

    result.imageAnalyses.forEach((imageAnalysis, index) => {
      combinedContent += `\nIMAGE ${index + 1} (Page ${imageAnalysis.pageNumber}):\n`
      combinedContent += `Type: ${imageAnalysis.analysis.documentType}\n`
      combinedContent += `Description: ${imageAnalysis.analysis.description}\n`
      combinedContent += `Extracted Text: ${imageAnalysis.analysis.extractedText}\n`
      combinedContent += `Key Elements: ${imageAnalysis.analysis.keyElements.join(', ')}\n`
    })
  }

  return combinedContent
}

/**
 * Determine the primary document type based on content analysis
 */
export function determinePDFDocumentType(result: PDFProcessingResult): string {
  if (!result.hasImages) {
    return 'PDF Text Document'
  }

  const imageTypes = result.imageAnalyses.map(img => img.analysis.documentType)
  const uniqueTypes = [...new Set(imageTypes)]

  if (uniqueTypes.length === 1) {
    return `PDF with ${uniqueTypes[0]} Images`
  } else {
    return `PDF with Mixed Content (${uniqueTypes.join(', ')})`
  }
}
