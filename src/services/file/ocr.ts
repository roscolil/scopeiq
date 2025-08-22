import Tesseract from 'tesseract.js'
import * as pdfjs from 'pdfjs-dist'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export interface OCRResult {
  text: string
  confidence: number
  method: 'pdfjs' | 'tesseract' | 'hybrid'
  metadata: {
    pages: number
    avgConfidence?: number
    hasImages: boolean
    hasText: boolean
    processingTime: number
  }
}

export interface OCROptions {
  language?: string
  fallbackToOCR?: boolean
  ocrThreshold?: number // Minimum text length to skip OCR
  tessractOptions?: Partial<Tesseract.RecognizeOptions>
}

/**
 * Enhanced OCR service that combines PDF.js text extraction with Tesseract.js OCR
 * Automatically determines the best approach based on document content
 */
export class EnhancedOCRService {
  private static instance: EnhancedOCRService
  private tesseractWorker: Tesseract.Worker | null = null
  private isInitialized = false

  static getInstance(): EnhancedOCRService {
    if (!EnhancedOCRService.instance) {
      EnhancedOCRService.instance = new EnhancedOCRService()
    }
    return EnhancedOCRService.instance
  }

  async initialize(language = 'eng'): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('Initializing Tesseract.js worker...')
      this.tesseractWorker = await Tesseract.createWorker(language, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        },
      })
      this.isInitialized = true
      console.log('Tesseract.js worker initialized')
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error)
    }
  }

  async terminate(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate()
      this.tesseractWorker = null
      this.isInitialized = false
    }
  }

  /**
   * Extract text using PDF.js native text extraction
   */
  private async extractTextWithPDFJS(file: File): Promise<{
    text: string
    hasText: boolean
    hasImages: boolean
    pages: number
  }> {
    console.log('Attempting PDF.js text extraction...')
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

      let totalText = ''
      let hasImages = false
      let hasText = false

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)

        // Check for images using operator list
        try {
          const operatorList = await page.getOperatorList()
          for (const fn of operatorList.fnArray) {
            if (
              fn === pdfjs.OPS.paintImageXObject ||
              fn === pdfjs.OPS.paintInlineImageXObject ||
              fn === pdfjs.OPS.paintImageMaskXObject
            ) {
              hasImages = true
              break
            }
          }
        } catch (err) {
          console.warn(`Could not analyze page ${i} operators:`, err)
        }

        // Extract text
        try {
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map(item => (item as { str?: string }).str || '')
            .join(' ')
            .trim()

          if (pageText.length > 10) {
            hasText = true
            totalText += pageText + '\n'
          }
        } catch (err) {
          console.warn(`Could not extract text from page ${i}:`, err)
        }
      }

      console.log(`PDF.js extraction completed in ${Date.now() - startTime}ms`)
      console.log(
        `Text length: ${totalText.length}, Has images: ${hasImages}, Has text: ${hasText}`,
      )

      return {
        text: totalText,
        hasText,
        hasImages,
        pages: pdf.numPages,
      }
    } catch (error) {
      console.error('PDF.js extraction failed:', error)
      return {
        text: '',
        hasText: false,
        hasImages: false,
        pages: 0,
      }
    }
  }

  /**
   * Convert PDF to images and perform OCR
   */
  private async extractTextWithOCR(
    file: File,
    options: OCROptions = {},
  ): Promise<{
    text: string
    confidence: number
    pages: number
  }> {
    if (!this.isInitialized || !this.tesseractWorker) {
      throw new Error('OCR service not initialized')
    }

    console.log('Starting OCR extraction...')
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

      let totalText = ''
      let totalConfidence = 0
      let pageCount = 0

      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages} with OCR...`)

        try {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better OCR

          // Create canvas to render PDF page
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          canvas.height = viewport.height
          canvas.width = viewport.width

          // Render PDF page to canvas
          await page.render({
            canvasContext: context,
            canvas: canvas,
            viewport: viewport,
          }).promise

          // Convert canvas to blob for Tesseract
          const blob = await new Promise<Blob>(resolve => {
            canvas.toBlob(blob => resolve(blob!), 'image/png', 0.95)
          })

          // Perform OCR on the image
          const { data } = await this.tesseractWorker!.recognize(blob, {
            ...options.tessractOptions,
          })

          if (data.text.trim().length > 0) {
            totalText += data.text + '\n'
            totalConfidence += data.confidence
            pageCount++
          }

          console.log(
            `Page ${i} OCR completed. Confidence: ${data.confidence.toFixed(1)}%`,
          )
        } catch (pageError) {
          console.warn(`OCR failed for page ${i}:`, pageError)
        }
      }

      const avgConfidence = pageCount > 0 ? totalConfidence / pageCount : 0

      console.log(`OCR extraction completed in ${Date.now() - startTime}ms`)
      console.log(`Average confidence: ${avgConfidence.toFixed(1)}%`)

      return {
        text: totalText,
        confidence: avgConfidence,
        pages: pageCount,
      }
    } catch (error) {
      console.error('OCR extraction failed:', error)
      throw error
    }
  }

  /**
   * Smart text extraction that chooses the best method based on document analysis
   */
  async extractText(file: File, options: OCROptions = {}): Promise<OCRResult> {
    const startTime = Date.now()

    // Set defaults
    const {
      language = 'eng',
      fallbackToOCR = true,
      ocrThreshold = 100,
      tessractOptions = {},
    } = options

    // Initialize OCR if needed
    await this.initialize(language)

    try {
      // First, try PDF.js extraction
      const pdfResult = await this.extractTextWithPDFJS(file)

      // Determine if we need OCR
      const needsOCR =
        (pdfResult.text.length < ocrThreshold || // Very little text extracted
          (pdfResult.hasImages && pdfResult.text.length < 500) || // Has images with little text
          !pdfResult.hasText) && // No text detected at all
        fallbackToOCR

      if (!needsOCR && pdfResult.text.length > 0) {
        // PDF.js extraction was sufficient
        return {
          text: pdfResult.text,
          confidence: 95, // High confidence for native PDF text
          method: 'pdfjs',
          metadata: {
            pages: pdfResult.pages,
            hasImages: pdfResult.hasImages,
            hasText: pdfResult.hasText,
            processingTime: Date.now() - startTime,
          },
        }
      }

      if (needsOCR) {
        console.log('PDF.js extraction insufficient, falling back to OCR...')
        console.log(
          `Reasons: text length ${pdfResult.text.length}, has images: ${pdfResult.hasImages}`,
        )

        try {
          const ocrResult = await this.extractTextWithOCR(file, options)

          // If we have both PDF.js and OCR results, combine them intelligently
          if (pdfResult.text.length > 50 && ocrResult.text.length > 50) {
            const combinedText = this.combineExtractionResults(
              pdfResult.text,
              ocrResult.text,
            )

            return {
              text: combinedText,
              confidence: Math.min(85, ocrResult.confidence), // Slightly lower confidence for hybrid
              method: 'hybrid',
              metadata: {
                pages: Math.max(pdfResult.pages, ocrResult.pages),
                avgConfidence: ocrResult.confidence,
                hasImages: pdfResult.hasImages,
                hasText: pdfResult.hasText,
                processingTime: Date.now() - startTime,
              },
            }
          }

          // OCR only
          return {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            method: 'tesseract',
            metadata: {
              pages: ocrResult.pages,
              avgConfidence: ocrResult.confidence,
              hasImages: pdfResult.hasImages,
              hasText: false,
              processingTime: Date.now() - startTime,
            },
          }
        } catch (ocrError) {
          console.error('OCR fallback failed:', ocrError)

          // Return PDF.js result even if it's minimal
          if (pdfResult.text.length > 0) {
            return {
              text: pdfResult.text,
              confidence: 50, // Lower confidence due to OCR failure
              method: 'pdfjs',
              metadata: {
                pages: pdfResult.pages,
                hasImages: pdfResult.hasImages,
                hasText: pdfResult.hasText,
                processingTime: Date.now() - startTime,
              },
            }
          }

          throw ocrError
        }
      }

      // Fallback to empty result
      return {
        text: '',
        confidence: 0,
        method: 'pdfjs',
        metadata: {
          pages: pdfResult.pages,
          hasImages: pdfResult.hasImages,
          hasText: pdfResult.hasText,
          processingTime: Date.now() - startTime,
        },
      }
    } catch (error) {
      console.error('Text extraction failed completely:', error)
      throw error
    }
  }

  /**
   * Intelligently combine PDF.js and OCR results
   */
  private combineExtractionResults(pdfText: string, ocrText: string): string {
    console.log('Combining PDF.js and OCR results...')

    // If one result is significantly longer, prefer it
    if (ocrText.length > pdfText.length * 1.5) {
      console.log('Using OCR result (significantly longer)')
      return `[ENHANCED EXTRACTION - OCR PRIMARY]\n${ocrText}\n\n[PDF.JS BACKUP]\n${pdfText}`
    }

    if (pdfText.length > ocrText.length * 1.5) {
      console.log('Using PDF.js result (significantly longer)')
      return `[ENHANCED EXTRACTION - PDF.JS PRIMARY]\n${pdfText}\n\n[OCR BACKUP]\n${ocrText}`
    }

    // Similar lengths - combine with clear sections
    console.log('Combining both results (similar lengths)')
    return `[ENHANCED EXTRACTION - HYBRID]\n\n[PDF.JS EXTRACTION]\n${pdfText}\n\n[OCR EXTRACTION]\n${ocrText}`
  }
}

// Singleton instance for easy access
export const ocrService = EnhancedOCRService.getInstance()

/**
 * Convenience function for enhanced PDF text extraction
 */
export async function enhancedExtractTextFromPDF(
  file: File,
  options: OCROptions = {},
): Promise<OCRResult> {
  return await ocrService.extractText(file, options)
}
