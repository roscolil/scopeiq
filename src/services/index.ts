// Services - Organized by feature and responsibility
// Use this main index for cross-cutting imports, or import from specific categories

// Data Services - Database, S3, and Hybrid Storage
export * from './data'

// AI Services - Machine Learning, Embeddings, and AI Processing
export * from './ai'

// Authentication Services - User management and authentication
export * from './auth'

// File Services - Upload, processing, and extraction
export * from './file'

// Utility Services - Background processing and helpers
export * from './utils'

// API Services - Import selectively to avoid conflicts
export { novaSonic } from './api/nova-sonic'
export { contactService } from './api/contact'
export { companyService } from './api/company'

// Commonly used services (convenience exports)
// Note: Import from specific directories to avoid conflicts
import { documentService, hybridProjectService } from './data'
import { callOpenAI, generateEmbedding, semanticSearch } from './ai'
import { uploadDocumentToS3 } from './file'

export {
  documentService,
  hybridProjectService,
  callOpenAI,
  generateEmbedding,
  semanticSearch,
  uploadDocumentToS3,
}
