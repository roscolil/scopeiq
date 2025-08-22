// File Services - Upload, processing, and extraction

// Core file services
export * from './documentUpload'
export * from './ocr'

// Image and PDF processing
export * from './image-processing'
export * from './pdf-image-extraction'

// Default exports for common usage
export { uploadDocumentToS3 } from './documentUpload'
export { enhancedExtractTextFromPDF } from './ocr'
