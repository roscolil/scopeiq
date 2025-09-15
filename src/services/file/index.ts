/**
 * File Services Index
 * Centralized exports for all file services
 */

// Existing services
export * from './documentUpload'
export * from './image-processing'
export * from './ocr'

// Python backend services
export * from './python-document-upload'

// Re-export types
export type {
  PythonUploadResult,
  PythonUploadOptions,
} from './python-document-upload'
