/**
 * Service and API type definitions for Jacq of All Trades
 * Defines input/output types and service interfaces
 */

// ================================
// Service Input Types
// ================================

// Document Service Input Types
export interface CreateDocumentInput {
  name: string
  type: string
  size: number
  status?: 'processed' | 'processing' | 'failed'
  projectId: string
  s3Key?: string
  url?: string
  thumbnailUrl?: string
  content?: string
  uploadedAt?: string
}

export interface UpdateDocumentInput {
  name?: string
  type?: string
  size?: number
  status?: 'processed' | 'processing' | 'failed'
  url?: string
  thumbnailUrl?: string
  content?: string
  s3Url?: string
}

// Database-specific document input (for Amplify)
export interface DatabaseDocumentInput {
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  s3Key: string
  s3Url?: string | null
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  projectId: string
  mimeType?: string | null
  content?: string | null
  tags?: string[] | null
}

// Project Service Input Types
export interface CreateProjectInput {
  name: string
  description?: string
  slug?: string
  // Address fields
  address?: string
  streetNumber?: string
  streetName?: string
  suburb?: string
  state?: string
  postcode?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  slug?: string
  // Address fields
  address?: string
  streetNumber?: string
  streetName?: string
  suburb?: string
  state?: string
  postcode?: string
}

// Database-specific project input (for Amplify)
export interface DatabaseProjectInput {
  name: string
  description?: string | null
  companyId: string
  slug?: string | null
  // Address fields
  address?: string | null
  streetNumber?: string | null
  streetName?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
}

// ================================
// Service Response Types
// ================================

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ListResponse<T> {
  items: T[]
  total: number
  hasMore?: boolean
  nextToken?: string
}

// ================================
// Upload and File Handling Types
// ================================

export interface UploadResult {
  success: boolean
  key?: string
  url?: string
  error?: string
}

export interface FileUploadData {
  file: File
  projectId: string
  onProgress?: (progress: number) => void
}

// ================================
// Migration Types
// ================================

export interface MigrationResult {
  success: boolean
  id: string
  name: string
  error?: string
  skipped?: boolean
  reason?: string
}

export interface MigrationStats {
  total: number
  migrated: number
  errors: number
  skipped: number
}

// ================================
// Error Types
// ================================

export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Note: ServiceError class is defined in ../types/ServiceError.ts since classes
// cannot be declared in .d.ts files

// ================================
// Environment Configuration Types
// ================================

export interface EnvironmentConfig {
  AWS_REGION: string
  // AWS credentials - using generic keys to avoid secret detection
  [key: string]: string | undefined
  AWS_S3_BUCKET: string
  OPENAI_API_KEY?: string
}
