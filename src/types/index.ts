/**
 * @deprecated This file now re-exports from the new .d.ts declaration files
 * Types are now organized in:
 * - entities.d.ts - Core entity definitions
 * - services.d.ts - Service and API types
 * - components.d.ts - Component-specific types
 */

// Re-export core types from the new .d.ts files
export type {
  Document,
  Project,
  Company,
  S3Document,
  S3Project,
  DatabaseDocument,
  DatabaseProject,
  DatabaseCompany,
  ProjectWithDocuments,
  HybridDocument,
  HybridProject,
  HybridProjectWithDocuments,
  BaseEntity,
  DocumentStatus,
  FileType,
  CreateInput,
  UpdateInput,
} from './entities'

export type {
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateProjectInput,
  UpdateProjectInput,
  ServiceResponse,
  ListResponse,
  UploadResult,
  FileUploadData,
  MigrationResult,
  MigrationStats,
  APIError,
  EnvironmentConfig,
} from './services'

// Export ServiceError class
export { ServiceError } from './ServiceError'
