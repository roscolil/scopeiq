import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUser } from 'aws-amplify/auth'

// Generate the Amplify client
const client = generateClient<Schema>()

export interface DatabaseDocument {
  id: string
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
  createdAt?: string | null
  updatedAt?: string | null
}

export interface DatabaseProject {
  id: string
  name: string
  description?: string | null
  companyId: string
  slug?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface DatabaseCompany {
  id: string
  name: string
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// Helper to get current user's company ID
export const getCurrentCompanyId = async (): Promise<string> => {
  try {
    const user = await getCurrentUser()
    // For now, we'll use the user's sub as company ID
    // In a real app, you'd query UserCompany relationship
    return user.userId
  } catch (error) {
    console.error('Error getting current user:', error)
    throw new Error('User not authenticated')
  }
}

export const databaseDocumentService = {
  // Get all documents for a project
  async getDocumentsByProject(projectId: string): Promise<DatabaseDocument[]> {
    try {
      console.log('DB: Fetching documents for project:', projectId)
      const { data: documents, errors } = await client.models.Document.list({
        filter: { projectId: { eq: projectId } },
      })

      if (errors) {
        console.error('DB: Error fetching documents:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      console.log('DB: Found documents count:', documents.length)
      return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status as 'processed' | 'processing' | 'failed',
        s3Key: doc.s3Key,
        s3Url: doc.s3Url,
        thumbnailS3Key: doc.thumbnailS3Key,
        thumbnailUrl: doc.thumbnailUrl,
        projectId: doc.projectId,
        mimeType: doc.mimeType,
        content: doc.content,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))
    } catch (error) {
      console.error('DB: Error fetching documents by project:', error)
      throw error
    }
  },

  // Get a single document by ID
  async getDocument(documentId: string): Promise<DatabaseDocument | null> {
    try {
      const { data: document, errors } = await client.models.Document.get({
        id: documentId,
      })

      if (errors) {
        console.error('DB: Error fetching document:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!document) {
        return null
      }

      return {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status as 'processed' | 'processing' | 'failed',
        s3Key: document.s3Key,
        s3Url: document.s3Url,
        thumbnailS3Key: document.thumbnailS3Key,
        thumbnailUrl: document.thumbnailUrl,
        projectId: document.projectId,
        mimeType: document.mimeType,
        content: document.content,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error fetching document:', error)
      throw error
    }
  },

  // Create a new document
  async createDocument(
    documentData: Omit<DatabaseDocument, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatabaseDocument> {
    try {
      console.log('DB: Creating document in database:', documentData.name)

      // Temporary workaround for Amplify type generation bug (expecting arrays instead of scalars)
      const { data: document, errors } = await client.models.Document.create({
        name: documentData.name as string & string[],
        type: documentData.type as string & string[],
        size: documentData.size as number & string[],
        status: documentData.status as string & string[],
        s3Key: documentData.s3Key as string & string[],
        s3Url: documentData.s3Url as string & string[],
        thumbnailS3Key: documentData.thumbnailS3Key as string & string[],
        thumbnailUrl: documentData.thumbnailUrl as string & string[],
        projectId: documentData.projectId as string & string[],
        mimeType: documentData.mimeType as string & string[],
        content: documentData.content as string & string[],
        tags: documentData.tags as string[] & string[], // Already array
      })

      if (errors) {
        console.error('DB: Error creating document:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      console.log('DB: Document created successfully in database:', document.id)
      return {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status as 'processed' | 'processing' | 'failed',
        s3Key: document.s3Key,
        s3Url: document.s3Url,
        thumbnailS3Key: document.thumbnailS3Key,
        thumbnailUrl: document.thumbnailUrl,
        projectId: document.projectId,
        mimeType: document.mimeType,
        content: document.content,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error creating document:', error)
      throw error
    }
  },

  // Update document
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<DatabaseDocument, 'id' | 'createdAt'>>,
  ): Promise<DatabaseDocument | null> {
    try {
      console.log(
        'DB: Updating document in database:',
        documentId,
        'Updates:',
        updates,
      )

      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data: document, errors } = await client.models.Document.update({
        id: documentId,
        ...updates,
      })

      if (errors) {
        console.error('DB: Error updating document:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!document) {
        return null
      }

      return {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status as 'processed' | 'processing' | 'failed',
        s3Key: document.s3Key,
        s3Url: document.s3Url,
        thumbnailS3Key: document.thumbnailS3Key,
        thumbnailUrl: document.thumbnailUrl,
        projectId: document.projectId,
        mimeType: document.mimeType,
        content: document.content,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error updating document:', error)
      throw error
    }
  },

  // Delete document
  async deleteDocument(documentId: string): Promise<void> {
    try {
      console.log('DB: Attempting to delete document:', documentId)
      const { errors } = await client.models.Document.delete({
        id: documentId,
      })

      if (errors) {
        console.error('DB: Error deleting document:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      console.log('DB: Document deleted successfully:', documentId)
    } catch (error) {
      console.error('DB: Error deleting document:', error)
      throw error
    }
  },

  // Get all documents for a company (across all projects)
  async getAllDocuments(): Promise<DatabaseDocument[]> {
    try {
      const companyId = await getCurrentCompanyId()
      // Get all projects for the company first
      const projects = await databaseProjectService.getProjects()
      const projectIds = projects.map(p => p.id)

      if (projectIds.length === 0) {
        return []
      }

      // Get documents for all projects
      const documentPromises = projectIds.map(projectId =>
        this.getDocumentsByProject(projectId),
      )

      const documentArrays = await Promise.all(documentPromises)
      const allDocuments = documentArrays.flat()

      return allDocuments
    } catch (error) {
      console.error('DB: Error fetching all documents:', error)
      throw error
    }
  },
}

export const databaseProjectService = {
  // Get all projects for the current company
  async getProjects(): Promise<DatabaseProject[]> {
    try {
      const companyId = await getCurrentCompanyId()

      const { data: projects, errors } = await client.models.Project.list({
        filter: { companyId: { eq: companyId } },
      })

      if (errors) {
        console.error('DB: Error fetching projects:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.companyId,
        slug: project.slug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }))
    } catch (error) {
      console.error('DB: Error fetching projects:', error)
      throw error
    }
  },

  // Get a single project by ID
  async getProject(projectId: string): Promise<DatabaseProject | null> {
    try {
      const { data: project, errors } = await client.models.Project.get({
        id: projectId,
      })

      if (errors) {
        console.error('DB: Error fetching project:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!project) {
        return null
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.companyId,
        slug: project.slug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error fetching project:', error)
      throw error
    }
  },

  // Create a new project
  async createProject(
    projectData: Omit<
      DatabaseProject,
      'id' | 'companyId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<DatabaseProject> {
    try {
      const companyId = await getCurrentCompanyId()

      // Generate slug if not provided
      const slug =
        projectData.slug ||
        projectData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      // Temporary workaround for Amplify type generation bug
      const { data: project, errors } = await client.models.Project.create({
        name: projectData.name as string & string[],
        description: projectData.description as string & string[],
        companyId: companyId as string & string[],
        slug: slug as string & string[],
      })

      if (errors) {
        console.error('DB: Error creating project:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.companyId,
        slug: project.slug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error creating project:', error)
      throw error
    }
  },

  // Update project
  async updateProject(
    projectId: string,
    updates: Partial<Omit<DatabaseProject, 'id' | 'companyId' | 'createdAt'>>,
  ): Promise<DatabaseProject | null> {
    try {
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data: project, errors } = await client.models.Project.update({
        id: projectId,
        ...updates,
      })

      if (errors) {
        console.error('DB: Error updating project:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      if (!project) {
        return null
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.companyId,
        slug: project.slug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
    } catch (error) {
      console.error('DB: Error updating project:', error)
      throw error
    }
  },

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    try {
      // First delete all documents in the project from the database
      const documents =
        await databaseDocumentService.getDocumentsByProject(projectId)
      for (const doc of documents) {
        await databaseDocumentService.deleteDocument(doc.id)
      }

      // Delete the project
      const { errors } = await client.models.Project.delete({
        id: projectId,
      })

      if (errors) {
        console.error('DB: Error deleting project:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }
    } catch (error) {
      console.error('DB: Error deleting project:', error)
      throw error
    }
  },

  // Get all projects with their documents
  async getAllProjectsWithDocuments(): Promise<
    (DatabaseProject & { documents: DatabaseDocument[] })[]
  > {
    try {
      const projects = await this.getProjects()

      const projectsWithDocuments = await Promise.all(
        projects.map(async project => {
          const documents = await databaseDocumentService.getDocumentsByProject(
            project.id,
          )
          return {
            ...project,
            documents,
          }
        }),
      )

      return projectsWithDocuments
    } catch (error) {
      console.error('DB: Error fetching projects with documents:', error)
      throw error
    }
  },
}
