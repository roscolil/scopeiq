/**
 * Image Processing Service
 * Handles image analysis, OCR, and metadata extraction for construction documents
 */

import { analyzeImageWithGPT4Vision } from '../ai/openai'

export interface ImageAnalysisResult {
  description: string
  extractedText: string
  documentType: string
  keyElements: string[]
  confidence: 'high' | 'medium' | 'low'
  suggestions: string[]
}

export interface ProcessedImageData {
  originalFile: File
  analysis: ImageAnalysisResult
  searchableContent: string
  metadata: {
    fileSize: number
    dimensions?: { width: number; height: number }
    format: string
    processedAt: string
  }
}

/**
 * Process an image file for construction document management
 */
export async function processConstructionImage(
  file: File,
): Promise<ProcessedImageData> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  console.log(`Processing construction image: ${file.name} (${file.type})`)

  try {
    // Get image dimensions
    const dimensions = await getImageDimensions(file)

    // Analyze with GPT-4 Vision
    const rawAnalysis = await analyzeImageWithGPT4Vision(
      file,
      `
PERFORM DIRECT VISUAL ANALYSIS of the provided image. You are looking at this image right now.

**SPECIFIC ANALYSIS REQUIRED:**

**Visual Examination:**
- Describe EXACTLY what you see: layouts, shapes, colors, text
- Count specific items: rooms, offices, doors, windows, etc.
- Read ALL visible text, numbers, dimensions, labels
- Note spatial relationships and layouts

**Construction/Architectural Details:**
- Floor plans: Count rooms, identify room types, note dimensions
- Blueprints: Extract specifications, measurements, annotations
- Site photos: Identify structures, equipment, materials, progress
- Permits/Documents: Read all text, dates, signatures, requirements

**Text Extraction Requirements:**
- Transcribe ALL visible text including:
  - Room labels and numbers
  - Dimensions and measurements  
  - Technical specifications
  - Part numbers, model numbers
  - Safety warnings, instructions
  - Dates, signatures, approvals

**Counting Instructions:**
- When floor plans show offices, COUNT them specifically
- When blueprints show components, COUNT and identify each
- When photos show equipment, COUNT and describe each item

**CRITICAL: Provide SPECIFIC, QUANTIFIED analysis. Do not use vague language.**

Examples of GOOD responses:
- "I can see 8 individual offices along the perimeter"
- "The blueprint shows 12 windows on the north wall"
- "Room dimensions are labeled as 12'x15' for the main conference room"

Examples of BAD responses:
- "Various rooms are shown"
- "Multiple offices are visible" 
- "Dimensions would need to be measured"

EXAMINE THE IMAGE DIRECTLY and provide concrete, specific observations.
`,
    )

    // Enhance the analysis with construction-specific insights
    const enhancedAnalysis: ImageAnalysisResult = {
      ...rawAnalysis,
      confidence: assessAnalysisConfidence(rawAnalysis),
      suggestions: generateConstructionSuggestions(rawAnalysis),
    }

    // Create searchable content by combining all text
    const searchableContent = [
      enhancedAnalysis.description,
      enhancedAnalysis.extractedText,
      enhancedAnalysis.documentType,
      ...enhancedAnalysis.keyElements,
    ]
      .filter(Boolean)
      .join(' ')

    const processedData: ProcessedImageData = {
      originalFile: file,
      analysis: enhancedAnalysis,
      searchableContent,
      metadata: {
        fileSize: file.size,
        dimensions,
        format: file.type,
        processedAt: new Date().toISOString(),
      },
    }

    console.log('Image processing complete:', {
      type: enhancedAnalysis.documentType,
      textLength: enhancedAnalysis.extractedText.length,
      keyElements: enhancedAnalysis.keyElements.length,
      confidence: enhancedAnalysis.confidence,
    })

    return processedData
  } catch (error) {
    console.error('Image processing failed:', error)
    throw new Error(
      `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | undefined> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }

    img.src = url
  })
}

/**
 * Assess confidence level of the analysis
 */
function assessAnalysisConfidence(analysis: {
  description?: string
  extractedText?: string
  keyElements?: string[]
  documentType?: string
}): 'high' | 'medium' | 'low' {
  let score = 0

  // Check description quality
  if (analysis.description && analysis.description.length > 100) score += 2
  else if (analysis.description && analysis.description.length > 50) score += 1

  // Check extracted text
  if (analysis.extractedText && analysis.extractedText.length > 50) score += 2
  else if (analysis.extractedText && analysis.extractedText.length > 10)
    score += 1

  // Check key elements
  if (analysis.keyElements && analysis.keyElements.length > 3) score += 2
  else if (analysis.keyElements && analysis.keyElements.length > 0) score += 1

  // Check document type specificity
  if (
    analysis.documentType &&
    !analysis.documentType.toLowerCase().includes('unknown')
  )
    score += 1

  if (score >= 5) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

/**
 * Generate construction-specific suggestions based on analysis
 */
function generateConstructionSuggestions(analysis: {
  description?: string
  extractedText?: string
  documentType?: string
}): string[] {
  const suggestions: string[] = []

  const description = analysis.description?.toLowerCase() || ''
  const documentType = analysis.documentType?.toLowerCase() || ''

  // Blueprint/Plan suggestions
  if (
    description.includes('blueprint') ||
    description.includes('plan') ||
    documentType.includes('blueprint')
  ) {
    suggestions.push('Consider organizing with related architectural drawings')
    suggestions.push('Link to project specifications and materials list')
  }

  // Site photo suggestions
  if (
    description.includes('construction site') ||
    description.includes('building') ||
    documentType.includes('photo')
  ) {
    suggestions.push('Tag with project phase and location')
    suggestions.push('Link to corresponding blueprints or plans')
  }

  // Safety-related suggestions
  if (
    description.includes('safety') ||
    description.includes('warning') ||
    analysis.extractedText?.includes('DANGER')
  ) {
    suggestions.push('Ensure safety compliance documentation is linked')
    suggestions.push('Share with safety team for review')
  }

  // Equipment/Materials suggestions
  if (
    description.includes('equipment') ||
    description.includes('material') ||
    description.includes('tool')
  ) {
    suggestions.push('Link to equipment specifications and manuals')
    suggestions.push('Add to equipment inventory if applicable')
  }

  // Permit/Certificate suggestions
  if (
    documentType.includes('permit') ||
    documentType.includes('certificate') ||
    description.includes('permit')
  ) {
    suggestions.push('Verify expiration dates and renewal requirements')
    suggestions.push('Store in compliance documentation folder')
  }

  return suggestions
}

/**
 * Extract text-only content for embedding generation
 */
export function extractTextForEmbedding(
  processedData: ProcessedImageData,
): string {
  return processedData.searchableContent
}

/**
 * Determine if a file contains images and how to process them
 */
export function analyzeFileImageContent(file: File): {
  hasImages: boolean
  processingMethod: 'standalone-vision' | 'pdf-embedded' | 'none'
  description: string
} {
  if (file.type.includes('image/')) {
    return {
      hasImages: true,
      processingMethod: 'standalone-vision',
      description: `Standalone ${file.type} image file - will be analyzed directly with GPT-4 Turbo Vision`,
    }
  }

  if (file.type.includes('pdf')) {
    return {
      hasImages: true, // Assume PDFs may contain images
      processingMethod: 'pdf-embedded',
      description:
        'PDF document - text will be extracted, embedded images detected but require separate analysis',
    }
  }

  return {
    hasImages: false,
    processingMethod: 'none',
    description: 'Text-based document - no image processing required',
  }
}
export async function generateImageThumbnail(
  file: File,
  maxSize: number = 300,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      const { width, height } = img
      const ratio = Math.min(maxSize / width, maxSize / height)

      canvas.width = width * ratio
      canvas.height = height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
