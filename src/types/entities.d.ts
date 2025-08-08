/**
 * Core entity type definitions for ScopeIQ
 * Defines the main data structures used throughout the application
 */

// ================================
// Base Entity
// ================================

export interface BaseEntity {
  id: string
  createdAt?: string | null
  updatedAt?: string | null
}

// ================================
// Document Entity Types
// ================================

export interface Document extends BaseEntity {
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  url?: string
  thumbnailUrl?: string
  projectId: string
  content?: string
  key?: string // S3 key
  uploadedAt?: string
}

export interface S3Document extends BaseEntity {
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  url: string
  thumbnailUrl?: string
  projectId: string
  content?: string
}

export interface DatabaseDocument extends BaseEntity {
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  s3Key: string // Path to actual file in S3
  s3Url?: string | null // Pre-signed URL
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  projectId: string
  mimeType?: string | null
  content?: string | null // Processed text content
  tags?: string[] | null
}

// ================================
// Project Entity Types
// ================================

export interface Project extends BaseEntity {
  name: string
  description?: string
  companyId: string
  documents?: Document[]
  // Address fields
  address?: string
  streetNumber?: string
  streetName?: string
  suburb?: string
  state?: string
  postcode?: string
  slug?: string
}

export interface S3Project extends BaseEntity {
  name: string
  description?: string
  companyId: string
}

export interface DatabaseProject extends BaseEntity {
  name: string
  description?: string | null
  companyId: string
  slug?: string | null
  // Address fields for enhanced projects
  address?: string | null
  streetNumber?: string | null
  streetName?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
}

export interface ProjectWithDocuments extends Project {
  documents: Document[]
}

// ================================
// Company Entity Types
// ================================

export interface Company extends BaseEntity {
  name: string
  description?: string | null
}

export interface DatabaseCompany extends BaseEntity {
  name: string
  description?: string | null
}

// ================================
// User and Role Entity Types
// ================================

export type UserRole = 'Admin' | 'Owner' | 'User'

export interface User extends BaseEntity {
  email: string
  name: string
  role: UserRole
  companyId: string
  projectIds: string[] // Projects this user has access to
  isActive: boolean
  lastLoginAt?: string | null
  invitedAt?: string | null
  acceptedAt?: string | null
}

export interface UserInvitation extends BaseEntity {
  email: string
  role: UserRole
  companyId: string
  projectIds: string[]
  invitedBy: string // User ID of who sent the invitation
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
}

export interface RolePermissions {
  role: UserRole
  permissions: {
    // Company level permissions
    canManageCompany: boolean
    canManageUsers: boolean
    canViewAllProjects: boolean

    // Project level permissions
    canCreateProjects: boolean
    canDeleteProjects: boolean
    canEditProjects: boolean

    // Document level permissions
    canUploadDocuments: boolean
    canDeleteDocuments: boolean
    canViewDocuments: boolean
    canDownloadDocuments: boolean
  }
}

// ================================
// Hybrid Service Entity Types
// ================================

export interface HybridDocument {
  id: string
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  url: string
  thumbnailUrl: string
  projectId: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface HybridProject {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt?: string
  companyId: string
}

export interface HybridProjectWithDocuments extends HybridProject {
  documents: HybridDocument[]
}

// ================================
// Utility Entity Types
// ================================

export type DocumentStatus = 'processed' | 'processing' | 'failed'
export type FileType = 'pdf' | 'image' | 'document' | 'other'

// Helper types for Omit with BaseEntity
export type CreateInput<T extends BaseEntity> = Omit<T, keyof BaseEntity>
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'createdAt'>
>

// ================================
// Legacy Compatibility Types
// ================================

// For backward compatibility with existing code
export type LegacyDocument = Document
export type LegacyProject = Project
