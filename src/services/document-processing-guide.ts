/**
 * Document Processing Guidelines
 * Provides guidance on how to get the best results from different document types
 */

export interface ProcessingGuideline {
  fileType: string
  description: string
  analysisCapability: 'full-vision' | 'text-only' | 'limited-vision'
  recommendations: string[]
  exampleUseCase: string
}

export const PROCESSING_GUIDELINES: ProcessingGuideline[] = [
  {
    fileType: 'Standalone Images (JPG, PNG)',
    description: 'Direct image files uploaded individually',
    analysisCapability: 'full-vision',
    recommendations: [
      'Upload high-resolution images for better text extraction',
      'Ensure images are clear and well-lit',
      'Single-page blueprints work best as standalone images',
      'Floor plans, site photos, and technical drawings get full AI analysis',
    ],
    exampleUseCase:
      'Office floor plan JPG file → Full room counting, layout analysis, dimension extraction',
  },
  {
    fileType: 'PDF Documents',
    description:
      'Multi-page documents with text and potentially embedded images',
    analysisCapability: 'limited-vision',
    recommendations: [
      'Text content is fully extracted and searchable',
      'Embedded images are detected but not analyzed with computer vision',
      'For complete analysis of blueprints/diagrams in PDFs, extract pages as images',
      'Consider using "Save as Image" or screenshot tools for visual content',
    ],
    exampleUseCase:
      'Construction specifications PDF → Text searchable, image locations noted',
  },
  {
    fileType: 'Text Documents (DOC, DOCX, TXT)',
    description: 'Text-based documents without images',
    analysisCapability: 'text-only',
    recommendations: [
      'All text content is extracted and made searchable',
      'Perfect for specifications, reports, and written documentation',
      'No image processing needed or available',
    ],
    exampleUseCase:
      'Project specifications DOCX → Fully searchable text content',
  },
]

/**
 * Get processing guidance for a specific file type
 */
export function getProcessingGuidance(
  fileType: string,
): ProcessingGuideline | null {
  if (fileType.includes('image/')) {
    return PROCESSING_GUIDELINES[0] // Standalone Images
  }

  if (fileType.includes('pdf')) {
    return PROCESSING_GUIDELINES[1] // PDF Documents
  }

  if (
    fileType.includes('text') ||
    fileType.includes('word') ||
    fileType.includes('document')
  ) {
    return PROCESSING_GUIDELINES[2] // Text Documents
  }

  return null
}

/**
 * Get recommendations for optimal image analysis
 */
export function getImageAnalysisRecommendations(): string[] {
  return [
    'For best results with construction drawings, upload as high-resolution JPG or PNG files',
    'Break down multi-page PDFs into individual image files for detailed analysis',
    'Ensure blueprints and floor plans are clearly visible and well-lit',
    'Technical drawings with clear labels and dimensions work best',
    'Site photos should be taken in good lighting conditions',
  ]
}
