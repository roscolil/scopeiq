// Data Services - Database, S3, and Hybrid Storage

// Primary hybrid service (recommended for most operations)
export * from './hybrid'
export * from './hybrid-projects'

// Database services
export * from './database'
export * from './database-simple'

// S3 services
export * from './s3-metadata'

// S3 API services (import selectively to avoid projectService conflict)
export { documentService as s3DocService } from './s3-api'

// Default exports for common usage
export { documentService } from './hybrid'
export { hybridProjectService } from './hybrid-projects'
export { databaseService } from './database-simple'
