import {
  databaseDocumentService,
  databaseProjectService,
  type DatabaseDocument,
  type DatabaseProject,
  getCurrentCompanyId,
} from './database'
import {
  s3DocumentService,
  s3ProjectService,
  deleteS3File,
} from './s3-metadata'
import { getSignedDownloadUrl } from './documentUpload'
import { createSlug } from '@/utils/navigation'
import { deleteEmbeddings } from './pinecone'
import { sanitizeDocumentId } from './embedding'

/**
 * Hybrid service that implements the migration strategy:
 * - Phase 2: Dual write to both S3 and Database
 * - Reads from Database for better performance
 * - Files still stored in S3, only metadata in Database
 * - Maintains backward compatibility during migration
 */

// Type definitions for hybrid service (compatible with existing S3 types)
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
  slug?: string
  createdAt: string
  updatedAt?: string
  companyId: string
}

export interface HybridProjectWithDocuments extends HybridProject {
  documents: HybridDocument[]
}

// Input types for create/update operations
export interface CreateDocumentInput {
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  url: string
  s3Key?: string // Optional: if provided, use this instead of generating a new one
  thumbnailUrl?: string
  content?: string
}

export interface UpdateDocumentInput {
  name?: string
  type?: string
  size?: number
  status?: 'processed' | 'processing' | 'failed'
  url?: string
  thumbnailUrl?: string
  content?: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  slug?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  slug?: string
}

// Convert between database and S3 document formats
const convertDbDocumentToS3 = (
  dbDoc: DatabaseDocument,
  companyId: string,
): HybridDocument => ({
  id: dbDoc.id, // Include the database document ID to ensure consistency
  name: dbDoc.name,
  type: dbDoc.type,
  size: dbDoc.size,
  status: dbDoc.status,
  url: dbDoc.s3Url || '',
  thumbnailUrl: dbDoc.thumbnailUrl || '',
  projectId: dbDoc.projectId,
  content: dbDoc.content || '',
  createdAt: dbDoc.createdAt || new Date().toISOString(),
  updatedAt: dbDoc.updatedAt || undefined,
})

const convertDbProjectToS3 = (
  dbProject: DatabaseProject,
): Omit<HybridProject, 'id'> => ({
  name: dbProject.name,
  description: dbProject.description || '',
  createdAt: dbProject.createdAt || new Date().toISOString(),
  updatedAt: dbProject.updatedAt || undefined,
  companyId: dbProject.companyId,
})

// Generate S3 keys for file storage
const generateS3Key = (
  companyId: string,
  projectId: string,
  documentId: string,
  fileName: string,
): string => {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${companyId}/${projectId}/files/${documentId}_${timestamp}_${sanitizedFileName}`
}

const generateThumbnailS3Key = (
  companyId: string,
  projectId: string,
  documentId: string,
): string => {
  return `${companyId}/${projectId}/thumbnails/${documentId}.jpg`
}

export const hybridDocumentService = {
  // Get all documents for a project (read from DB)
  async getDocumentsByProject(projectId: string): Promise<HybridDocument[]> {
    try {
      // Read from database for fast queries
      const dbDocuments =
        await databaseDocumentService.getDocumentsByProject(projectId)
      const companyId = await getCurrentCompanyId()

      // Convert to expected format and generate pre-signed URLs if needed
      const documents = await Promise.all(
        dbDocuments.map(async doc => {
          let s3Url = doc.s3Url
          const thumbnailUrl = doc.thumbnailUrl

          // Generate fresh pre-signed URLs if we have S3 keys
          if (doc.s3Key) {
            try {
              s3Url = await getSignedDownloadUrl(doc.s3Key)
              // Update the database with the new URL (async, don't wait)
              databaseDocumentService
                .updateDocument(doc.id, { s3Url })
                .catch(console.error)
            } catch (error) {
              console.warn(`Failed to generate S3 URL for ${doc.s3Key}:`, error)
            }
          } else {
            console.warn(
              `Document ${doc.id} has no S3 key, cannot generate pre-signed URL`,
            )
          }

          return {
            id: doc.id,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            status: doc.status,
            url: s3Url || '',
            thumbnailUrl: thumbnailUrl || '',
            projectId: doc.projectId,
            content: doc.content || '',
            createdAt: doc.createdAt || new Date().toISOString(),
            updatedAt: doc.updatedAt,
          } as HybridDocument
        }),
      )

      return documents
    } catch (error) {
      console.error('Hybrid: Error fetching documents by project:', error)
      throw error
    }
  },

  // Get a single document by ID (read from DB with validation)
  async getDocument(
    companyId: string,
    projectId: string,
    documentId: string,
  ): Promise<HybridDocument | null> {
    try {
      // Read from database
      const dbDocument = await databaseDocumentService.getDocument(documentId)

      // Check if document exists
      if (!dbDocument) {
        return null
      }

      // Generate fresh pre-signed URLs if we have S3 keys
      let s3Url = dbDocument.s3Url
      const thumbnailUrl = dbDocument.thumbnailUrl

      if (dbDocument.s3Key) {
        try {
          // Always generate fresh pre-signed URLs for security and to avoid expiration
          s3Url = await getSignedDownloadUrl(dbDocument.s3Key)

          // Update the database with the new URL (async, don't wait)
          databaseDocumentService
            .updateDocument(documentId, { s3Url })
            .catch(console.error)
        } catch (error) {
          console.warn(
            `Failed to generate S3 URL for ${dbDocument.s3Key}:`,
            error,
          )
          // Keep the existing URL as fallback (though it might not work)
        }
      } else {
        console.warn(
          `Document ${documentId} has no S3 key, cannot generate pre-signed URL`,
        )
      }

      return {
        id: dbDocument.id,
        name: dbDocument.name,
        type: dbDocument.type,
        size: dbDocument.size,
        status: dbDocument.status,
        url: s3Url || '',
        thumbnailUrl: thumbnailUrl || '',
        projectId: dbDocument.projectId,
        content: dbDocument.content || '',
        createdAt: dbDocument.createdAt || new Date().toISOString(),
        updatedAt: dbDocument.updatedAt,
      }
    } catch (error) {
      console.error('Hybrid: Error fetching document by ID:', error)

      try {
        const projectDocuments = await this.getDocumentsByProject(projectId)
        const foundDocument = projectDocuments.find(
          doc => doc.id === documentId,
        )

        if (foundDocument) {
          return foundDocument
        }
      } catch (fallbackError) {
        console.error('Hybrid: Fallback method also failed:', fallbackError)
      }

      throw error
    }
  },

  // Refresh pre-signed URLs for a document (useful when URLs expire)
  async refreshDocumentUrl(
    companyId: string,
    projectId: string,
    documentId: string,
  ): Promise<HybridDocument | null> {
    try {
      // Get the document to access its S3 key
      const dbDocument = await databaseDocumentService.getDocument(documentId)
      if (!dbDocument) {
        return null
      }

      if (!dbDocument.s3Key) {
        console.warn(`Document ${documentId} has no S3 key, cannot refresh URL`)
        return null
      }

      // Generate fresh pre-signed URL
      const newUrl = await getSignedDownloadUrl(dbDocument.s3Key)

      // Update the document with the new URL
      const updatedDocument = await databaseDocumentService.updateDocument(
        documentId,
        { s3Url: newUrl },
      )

      if (!updatedDocument) {
        return null
      }

      return {
        id: updatedDocument.id,
        name: updatedDocument.name,
        type: updatedDocument.type,
        size: updatedDocument.size,
        status: updatedDocument.status,
        url: updatedDocument.s3Url || '',
        thumbnailUrl: updatedDocument.thumbnailUrl || '',
        projectId: updatedDocument.projectId,
        content: updatedDocument.content || '',
        createdAt: updatedDocument.createdAt || new Date().toISOString(),
        updatedAt: updatedDocument.updatedAt,
      }
    } catch (error) {
      console.error('Hybrid: Error refreshing document URL:', error)
      throw error
    }
  },

  // Create a new document (dual write)
  async createDocument(
    companyId: string,
    projectId: string,
    documentData: CreateDocumentInput,
  ): Promise<HybridDocument> {
    try {
      // Generate unique document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Use provided S3 key or generate a new one
      const s3Key =
        documentData.s3Key ||
        generateS3Key(companyId, projectId, documentId, documentData.name)
      const thumbnailS3Key = documentData.thumbnailUrl
        ? generateThumbnailS3Key(companyId, projectId, documentId)
        : undefined

      // Prepare database document
      const dbDocumentData: Omit<
        DatabaseDocument,
        'id' | 'createdAt' | 'updatedAt'
      > = {
        name: documentData.name,
        type: documentData.type,
        size: documentData.size,
        status: documentData.status,
        s3Key,
        s3Url: documentData.url,
        thumbnailS3Key,
        thumbnailUrl: documentData.thumbnailUrl,
        projectId,
        mimeType: documentData.type,
        content: documentData.content,
        tags: [],
      }

      // Write to database first (primary source)
      const dbDocument =
        await databaseDocumentService.createDocument(dbDocumentData)

      // Also write to S3 for backward compatibility (wait for completion to ensure metadata exists)
      const s3DocumentData = convertDbDocumentToS3(dbDocument, companyId)
      try {
        await s3DocumentService.createDocument(
          companyId,
          projectId,
          s3DocumentData,
        )
      } catch (error) {
        console.warn('Hybrid: Failed to write to S3 (non-critical):', error)
        // Don't throw - S3 is backup, database is primary
      }

      const result = {
        id: dbDocument.id,
        name: dbDocument.name,
        type: dbDocument.type,
        size: dbDocument.size,
        status: dbDocument.status,
        url: dbDocument.s3Url || '',
        thumbnailUrl: dbDocument.thumbnailUrl || '',
        projectId: dbDocument.projectId,
        content: dbDocument.content || '',
        createdAt: dbDocument.createdAt || new Date().toISOString(),
        updatedAt: dbDocument.updatedAt,
      }

      return result
    } catch (error) {
      console.error('Hybrid: Error creating document:', error)
      throw error
    }
  },

  // Update document (dual write)
  async updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    updates: UpdateDocumentInput,
  ): Promise<HybridDocument | null> {
    try {
      // Update in database first (primary source)
      const dbDocument = await databaseDocumentService.updateDocument(
        documentId,
        {
          name: updates.name,
          type: updates.type,
          size: updates.size,
          status: updates.status,
          s3Url: updates.url,
          thumbnailUrl: updates.thumbnailUrl,
          content: updates.content,
        },
      )

      if (!dbDocument) {
        return null
      }

      // Also update in S3 for backward compatibility (wait for completion to ensure metadata exists)
      const s3Updates = convertDbDocumentToS3(dbDocument, companyId)
      try {
        await s3DocumentService.updateDocument(
          companyId,
          projectId,
          documentId,
          s3Updates,
        )
      } catch (error) {
        console.warn('Hybrid: Failed to update S3 (non-critical):', error)
        // Don't throw - S3 is backup, database is primary
      }

      return {
        id: dbDocument.id,
        name: dbDocument.name,
        type: dbDocument.type,
        size: dbDocument.size,
        status: dbDocument.status,
        url: dbDocument.s3Url || '',
        thumbnailUrl: dbDocument.thumbnailUrl || '',
        projectId: dbDocument.projectId,
        content: dbDocument.content || '',
        createdAt: dbDocument.createdAt || new Date().toISOString(),
        updatedAt: dbDocument.updatedAt,
      }
    } catch (error) {
      console.error('Hybrid: Error updating document:', error)
      throw error
    }
  },

  // Delete document (dual delete)
  async deleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
  ): Promise<void> {
    try {
      // Get document metadata first to get S3 keys for file deletion
      const dbDocument = await databaseDocumentService.getDocument(documentId)

      // Delete from database first (primary source)
      await databaseDocumentService.deleteDocument(documentId)
      // Delete S3 metadata file for backward compatibility
      try {
        await s3DocumentService.deleteDocument(companyId, projectId, documentId)
        console.log(
          'Hybrid: S3 metadata deleted successfully for document:',
          documentId,
        )
      } catch (error) {
        console.warn(
          'Hybrid: Failed to delete S3 metadata (non-critical):',
          error,
        )
      }

      // Delete the actual S3 file if we have the S3 key
      if (dbDocument?.s3Key) {
        try {
          await deleteS3File(dbDocument.s3Key)
        } catch (error) {
          console.warn(
            'Hybrid: Failed to delete S3 file (non-critical):',
            error,
          )
        }
      } else {
        console.warn(
          'Hybrid: No S3 key found for document, cannot delete S3 file',
        )
      }

      // Also delete thumbnail if it exists
      if (dbDocument?.thumbnailS3Key) {
        try {
          await deleteS3File(dbDocument.thumbnailS3Key)
        } catch (error) {
          console.warn(
            'Hybrid: Failed to delete S3 thumbnail (non-critical):',
            error,
          )
        }
      }

      // Delete embeddings from Pinecone vector database
      try {
        const sanitizedId = sanitizeDocumentId(documentId)
        await deleteEmbeddings(projectId, [sanitizedId])
      } catch (error) {
        console.warn(
          'Hybrid: Failed to delete Pinecone embeddings (non-critical):',
          error,
        )
      }
    } catch (error) {
      console.error('Hybrid: Error deleting document:', error)
      throw error
    }
  },

  // Get all documents for a company (read from DB)
  async getAllDocuments(): Promise<HybridDocument[]> {
    try {
      // Read from database for fast queries
      const dbDocuments = await databaseDocumentService.getAllDocuments()
      const companyId = await getCurrentCompanyId()

      // Convert to expected format
      const documents = dbDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status,
        url: doc.s3Url || '',
        thumbnailUrl: doc.thumbnailUrl || '',
        projectId: doc.projectId,
        content: doc.content || '',
        createdAt: doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt,
      }))
      return documents
    } catch (error) {
      console.error('Hybrid: Error fetching all documents:', error)
      throw error
    }
  },
}

export const hybridProjectService = {
  // Get all projects for a company (read from DB)
  async getProjects(): Promise<HybridProject[]> {
    try {
      // Read from database for fast queries
      const dbProjects = await databaseProjectService.getProjects()

      // Convert to expected format
      const projects = dbProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: project.updatedAt,
        companyId: project.companyId,
      }))

      return projects
    } catch (error) {
      console.error('Hybrid: Error fetching projects:', error)
      throw error
    }
  },

  // Get a single project by ID (read from DB)
  async getProject(
    companyId: string,
    projectId: string,
  ): Promise<HybridProject | null> {
    try {
      // Read from database
      const dbProject = await databaseProjectService.getProject(projectId)

      if (!dbProject) {
        return null
      }

      return {
        id: dbProject.id,
        name: dbProject.name,
        description: dbProject.description || '',
        createdAt: dbProject.createdAt || new Date().toISOString(),
        updatedAt: dbProject.updatedAt,
        companyId: dbProject.companyId,
      }
    } catch (error) {
      console.error('Hybrid: Error fetching project:', error)
      throw error
    }
  },

  // Create a new project (dual write)
  async createProject(
    companyId: string,
    projectData: CreateProjectInput,
  ): Promise<HybridProject> {
    try {
      // Write to database first (primary source)
      const dbProject = await databaseProjectService.createProject({
        name: projectData.name,
        description: projectData.description,
        slug: projectData.slug,
      })

      // Also write to S3 for backward compatibility (async, don't wait)
      const s3ProjectData = convertDbProjectToS3(dbProject)
      s3ProjectService.createProject(companyId, s3ProjectData).catch(error => {
        console.warn('Hybrid: Failed to write to S3 (non-critical):', error)
      })

      return {
        id: dbProject.id,
        name: dbProject.name,
        description: dbProject.description || '',
        createdAt: dbProject.createdAt || new Date().toISOString(),
        updatedAt: dbProject.updatedAt,
        companyId: dbProject.companyId,
      }
    } catch (error) {
      console.error('Hybrid: Error creating project:', error)
      throw error
    }
  },

  // Update project (dual write)
  async updateProject(
    companyId: string,
    projectId: string,
    updates: UpdateProjectInput,
  ): Promise<HybridProject | null> {
    try {
      // Update in database first (primary source)
      const dbProject = await databaseProjectService.updateProject(projectId, {
        name: updates.name,
        description: updates.description,
        slug: updates.slug,
      })

      if (!dbProject) {
        return null
      }

      // Also update in S3 for backward compatibility (async, don't wait)
      const s3Updates = convertDbProjectToS3(dbProject)
      s3ProjectService
        .updateProject(companyId, projectId, s3Updates)
        .catch(error => {
          console.warn('Hybrid: Failed to update S3 (non-critical):', error)
        })

      return {
        id: dbProject.id,
        name: dbProject.name,
        description: dbProject.description || '',
        createdAt: dbProject.createdAt || new Date().toISOString(),
        updatedAt: dbProject.updatedAt,
        companyId: dbProject.companyId,
      }
    } catch (error) {
      console.error('Hybrid: Error updating project:', error)
      throw error
    }
  },

  // Delete project (dual delete)
  async deleteProject(companyId: string, projectId: string): Promise<void> {
    try {
      // Delete from database first (primary source)
      await databaseProjectService.deleteProject(projectId)

      // Also delete from S3 for backward compatibility (async, don't wait)
      s3ProjectService.deleteProject(companyId, projectId).catch(error => {
        console.warn('Hybrid: Failed to delete from S3 (non-critical):', error)
      })
    } catch (error) {
      console.error('Hybrid: Error deleting project:', error)
      throw error
    }
  },

  // Get all projects with their documents (read from DB)
  async getAllProjectsWithDocuments(): Promise<HybridProjectWithDocuments[]> {
    try {
      // Read from database for fast queries
      const projectsWithDocuments =
        await databaseProjectService.getAllProjectsWithDocuments()

      // Convert to expected format
      const result = projectsWithDocuments.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        slug: project.slug,
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: project.updatedAt,
        companyId: project.companyId,
        documents: project.documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          status: doc.status,
          url: doc.s3Url || '',
          thumbnailUrl: doc.thumbnailUrl || '',
          projectId: doc.projectId,
          content: doc.content || '',
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt,
        })),
      }))

      return result
    } catch (error) {
      console.error('Hybrid: Error fetching projects with documents:', error)
      throw error
    }
  },

  // Resolve project by slug or ID (read from DB with fast lookup)
  async resolveProject(slugOrId: string): Promise<HybridProject | null> {
    try {
      // Try direct ID lookup first
      const project = await databaseProjectService.getProject(slugOrId)

      if (project) {
        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          slug: project.slug,
          createdAt: project.createdAt || new Date().toISOString(),
          updatedAt: project.updatedAt,
          companyId: project.companyId,
        }
      }

      // If not found by ID, search by slug
      const projects = await databaseProjectService.getProjects()

      // First try exact slug match
      const projectBySlug = projects.find(p => p.slug === slugOrId)
      if (projectBySlug) {
        return {
          id: projectBySlug.id,
          name: projectBySlug.name,
          description: projectBySlug.description || '',
          slug: projectBySlug.slug,
          createdAt: projectBySlug.createdAt || new Date().toISOString(),
          updatedAt: projectBySlug.updatedAt,
          companyId: projectBySlug.companyId,
        }
      }

      // Fallback: try matching against generated slugs from project names
      for (const p of projects) {
        const generatedSlug = createSlug(p.name)
        if (generatedSlug === slugOrId) {
          return {
            id: p.id,
            name: p.name,
            description: p.description || '',
            slug: p.slug,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt,
            companyId: p.companyId,
          }
        }
      }

      return null
    } catch (error) {
      console.error('Hybrid: Error resolving project:', error)
      throw error
    }
  },
}

// Export a unified service that matches the current S3 API
export const projectService = hybridProjectService
export const documentService = hybridDocumentService
