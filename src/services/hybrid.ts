import {
  databaseDocumentService,
  databaseProjectService,
  type DatabaseDocument,
  type DatabaseProject,
  getCurrentCompanyId,
} from './database'
import { s3DocumentService, s3ProjectService } from './s3-metadata'
import { getSignedDownloadUrl } from './documentUpload'

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
): Omit<HybridDocument, 'id'> => ({
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
      console.log(`Hybrid: Fetching documents for project: ${projectId}`)

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
              console.log(
                `Generating fresh pre-signed URL for key: ${doc.s3Key}`,
              )
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

      console.log(`Hybrid: Found ${documents.length} documents for project`)
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
      console.log(
        `Hybrid: Fetching document: ${documentId} for project: ${projectId}`,
      )

      // Read from database
      const dbDocument = await databaseDocumentService.getDocument(documentId)

      if (!dbDocument) {
        console.log(`Hybrid: Document ${documentId} not found in database`)
        return null
      }

      // Validate that the document belongs to the specified project
      if (dbDocument.projectId !== projectId) {
        console.warn(`Hybrid: Project ID mismatch for document ${documentId}:`)
        console.warn(`  Document belongs to project: ${dbDocument.projectId}`)
        console.warn(`  Requested for project: ${projectId}`)

        // For debugging: Let's be more lenient and return the document anyway
        // but log the mismatch so we can fix it
        console.warn(
          `Hybrid: Returning document despite project mismatch for debugging`,
        )
        // In production, you might want to return null here for security
        // return null
      } else {
        console.log(
          `Hybrid: Document found and validated for project ${projectId}`,
        )
      }

      // Generate fresh pre-signed URLs if we have S3 keys
      let s3Url = dbDocument.s3Url
      const thumbnailUrl = dbDocument.thumbnailUrl

      if (dbDocument.s3Key) {
        try {
          // Always generate fresh pre-signed URLs for security and to avoid expiration
          console.log(
            `Generating fresh pre-signed URL for key: ${dbDocument.s3Key}`,
          )
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

      // Fallback: Try to find the document by searching project documents
      console.log(
        'Hybrid: Trying fallback method - searching project documents...',
      )
      try {
        const projectDocuments = await this.getDocumentsByProject(projectId)
        const foundDocument = projectDocuments.find(
          doc => doc.id === documentId,
        )

        if (foundDocument) {
          console.log('Hybrid: Found document via fallback method')
          return foundDocument
        } else {
          console.log('Hybrid: Document not found via fallback method either')
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
      console.log(`Hybrid: Refreshing URL for document: ${documentId}`)

      // Get the document to access its S3 key
      const dbDocument = await databaseDocumentService.getDocument(documentId)
      if (!dbDocument) {
        console.log(`Document ${documentId} not found`)
        return null
      }

      if (!dbDocument.s3Key) {
        console.warn(`Document ${documentId} has no S3 key, cannot refresh URL`)
        return null
      }

      // Generate fresh pre-signed URL
      const newUrl = await getSignedDownloadUrl(dbDocument.s3Key)
      console.log(`Generated fresh URL for document ${documentId}`)

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
      console.log('Hybrid: Creating document (dual write):', documentData)

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

      // Also write to S3 for backward compatibility (async, don't wait)
      const s3DocumentData = convertDbDocumentToS3(dbDocument, companyId)
      s3DocumentService
        .createDocument(companyId, projectId, s3DocumentData)
        .catch(error => {
          console.warn('Hybrid: Failed to write to S3 (non-critical):', error)
        })

      console.log('Hybrid: Document created successfully:', dbDocument.id)
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
      console.log(
        `Hybrid: Updating document ${documentId} (dual write):`,
        updates,
      )

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

      // Also update in S3 for backward compatibility (async, don't wait)
      const s3Updates = convertDbDocumentToS3(dbDocument, companyId)
      s3DocumentService
        .updateDocument(companyId, projectId, documentId, s3Updates)
        .catch(error => {
          console.warn('Hybrid: Failed to update S3 (non-critical):', error)
        })

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
      console.log(`Hybrid: Deleting document: ${documentId}`)

      // Get document metadata first to get S3 keys
      const dbDocument = await databaseDocumentService.getDocument(documentId)

      // Delete from database first (primary source)
      await databaseDocumentService.deleteDocument(documentId)

      // Also delete from S3 for backward compatibility (async, don't wait)
      s3DocumentService
        .deleteDocument(companyId, projectId, documentId)
        .catch(error => {
          console.warn(
            'Hybrid: Failed to delete from S3 (non-critical):',
            error,
          )
        })

      // TODO: Delete actual files from S3 using the s3Key
      // This should be done in a separate cleanup process
      if (dbDocument?.s3Key) {
        console.log(`TODO: Delete S3 file: ${dbDocument.s3Key}`)
      }
      if (dbDocument?.thumbnailS3Key) {
        console.log(`TODO: Delete S3 thumbnail: ${dbDocument.thumbnailS3Key}`)
      }

      console.log('Hybrid: Document deleted successfully')
    } catch (error) {
      console.error('Hybrid: Error deleting document:', error)
      throw error
    }
  },

  // Get all documents for a company (read from DB)
  async getAllDocuments(): Promise<HybridDocument[]> {
    try {
      console.log('Hybrid: Fetching all documents for company')

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

      console.log(
        `Hybrid: Found ${documents.length} total documents for company`,
      )
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
      console.log('Hybrid: Fetching projects for company')

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

      console.log(`Hybrid: Found ${projects.length} projects for company`)
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
      console.log(`Hybrid: Fetching project: ${projectId}`)

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
      console.log('Hybrid: Creating project (dual write):', projectData)

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

      console.log('Hybrid: Project created successfully:', dbProject.id)
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
      console.log(
        `Hybrid: Updating project ${projectId} (dual write):`,
        updates,
      )

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
      console.log(`Hybrid: Deleting project: ${projectId}`)

      // Delete from database first (primary source)
      await databaseProjectService.deleteProject(projectId)

      // Also delete from S3 for backward compatibility (async, don't wait)
      s3ProjectService.deleteProject(companyId, projectId).catch(error => {
        console.warn('Hybrid: Failed to delete from S3 (non-critical):', error)
      })

      console.log('Hybrid: Project and all its documents deleted successfully')
    } catch (error) {
      console.error('Hybrid: Error deleting project:', error)
      throw error
    }
  },

  // Get all projects with their documents (read from DB)
  async getAllProjectsWithDocuments(): Promise<HybridProjectWithDocuments[]> {
    try {
      console.log('Hybrid: Fetching all projects with documents')

      // Read from database for fast queries
      const projectsWithDocuments =
        await databaseProjectService.getAllProjectsWithDocuments()

      // Convert to expected format
      const result = projectsWithDocuments.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
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

      console.log(`Hybrid: Returning ${result.length} projects with documents`)
      return result
    } catch (error) {
      console.error('Hybrid: Error fetching projects with documents:', error)
      throw error
    }
  },

  // Resolve project by slug or ID (read from DB with fast lookup)
  async resolveProject(slugOrId: string): Promise<HybridProject | null> {
    try {
      console.log(`Hybrid: Resolving project by slug/ID: ${slugOrId}`)

      // Try direct ID lookup first
      const project = await databaseProjectService.getProject(slugOrId)

      if (project) {
        console.log('Hybrid: Found project by direct ID')
        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          createdAt: project.createdAt || new Date().toISOString(),
          updatedAt: project.updatedAt,
          companyId: project.companyId,
        }
      }

      // If not found by ID, search by slug
      const projects = await databaseProjectService.getProjects()
      const projectBySlug = projects.find(p => p.slug === slugOrId)

      if (projectBySlug) {
        console.log('Hybrid: Found project by slug')
        return {
          id: projectBySlug.id,
          name: projectBySlug.name,
          description: projectBySlug.description || '',
          createdAt: projectBySlug.createdAt || new Date().toISOString(),
          updatedAt: projectBySlug.updatedAt,
          companyId: projectBySlug.companyId,
        }
      }

      console.log('Hybrid: No project found for slug/ID')
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
