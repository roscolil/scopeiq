import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUser } from 'aws-amplify/auth'
// Types are now available globally from src/types/*.d.ts files
// No need to import: CreateProjectInput, CreateDocumentInput, DatabaseProject, DatabaseDocument

/**
 * Simple database service to work alongside existing S3 services
 * This allows gradual migration from S3 to database
 */

const client = generateClient<Schema>()

// Helper to get current user's company ID
const getCurrentCompanyId = async (): Promise<string> => {
  try {
    const user = await getCurrentUser()
    // For now, use the user's sub as company ID
    return user.userId
  } catch (error) {
    console.error('Error getting current user:', error)
    return 'default-company'
  }
}

export const databaseService = {
  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing database connection...')

      // Try to list projects (will return empty if none exist)
      const { data, errors } = await client.models.Project.list()

      if (errors && errors.length > 0) {
        console.error('Database connection test failed:', errors)
        return false
      }

      console.log('Database connection successful!', {
        projectCount: data?.length || 0,
      })
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  },

  // Create a project in the database
  async createProject(projectData: {
    name: string
    description?: string
  }): Promise<{ id: string; name: string; description?: string } | null> {
    try {
      const companyId = await getCurrentCompanyId()
      console.log('Creating project in database:', projectData)

      // Temporary workaround for Amplify type generation bug (expecting arrays instead of scalars)
      const { data: project, errors } = await client.models.Project.create({
        name: projectData.name as string & string[], // Workaround for type bug
        description: (projectData.description || '') as string & string[],
        companyId: companyId as string & string[],
        slug: projectData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') as string & string[],
      })

      if (errors) {
        console.error('Error creating project in database:', errors)
        return null
      }

      console.log('Project created in database:', project?.id)
      return {
        id: project?.id || '',
        name: project?.name || projectData.name,
        description: project?.description || undefined,
      }
    } catch (error) {
      console.error('Error creating project in database:', error)
      return null
    }
  },

  // Get all projects from database
  async getProjects(): Promise<
    Array<{ id: string; name: string; description?: string }>
  > {
    try {
      const companyId = await getCurrentCompanyId()
      console.log('Fetching projects from database for company:', companyId)

      const { data: projects, errors } = await client.models.Project.list({
        filter: { companyId: { eq: companyId } },
      })

      if (errors) {
        console.error('Error fetching projects from database:', errors)
        return []
      }

      const result = (projects || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || undefined,
      }))

      console.log(`Found ${result.length} projects in database`)
      return result
    } catch (error) {
      console.error('Error fetching projects from database:', error)
      return []
    }
  },

  // Create a document in the database
  async createDocument(documentData: {
    name: string
    type: string
    size: number
    projectId: string
    s3Key: string
    status?: 'processed' | 'processing' | 'failed'
  }): Promise<{ id: string; name: string } | null> {
    try {
      console.log('Creating document in database:', documentData)

      // Temporary workaround for Amplify type generation bug (expecting arrays instead of scalars)
      const { data: document, errors } = await client.models.Document.create({
        name: documentData.name as string & string[], // Workaround for type bug
        type: documentData.type as string & string[],
        size: documentData.size as number & string[],
        projectId: documentData.projectId as string & string[],
        s3Key: documentData.s3Key as string & string[],
        status: (documentData.status || 'processing') as string & string[],
        mimeType: documentData.type as string & string[],
      })

      if (errors) {
        console.error('Error creating document in database:', errors)
        return null
      }

      console.log('Document created in database:', document?.id)
      return {
        id: document?.id || '',
        name: document?.name || documentData.name,
      }
    } catch (error) {
      console.error('Error creating document in database:', error)
      return null
    }
  },

  // Get documents for a project from database
  async getDocumentsByProject(projectId: string): Promise<
    Array<{
      id: string
      name: string
      type: string
      size: number
      status: string
      s3Key: string
    }>
  > {
    try {
      console.log('Fetching documents from database for project:', projectId)

      const { data: documents, errors } = await client.models.Document.list({
        filter: { projectId: { eq: projectId } },
      })

      if (errors) {
        console.error('Error fetching documents from database:', errors)
        return []
      }

      const result = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status || 'unknown',
        s3Key: doc.s3Key,
      }))

      console.log(`Found ${result.length} documents in database for project`)
      return result
    } catch (error) {
      console.error('Error fetching documents from database:', error)
      return []
    }
  },

  // Delete a project from database
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      console.log('Deleting project from database:', projectId)

      // First delete all documents in the project
      const { data: documents } = await client.models.Document.list({
        filter: { projectId: { eq: projectId } },
      })

      if (documents) {
        for (const doc of documents) {
          await client.models.Document.delete({ id: doc.id })
        }
        console.log(`Deleted ${documents.length} documents from database`)
      }

      // Then delete the project
      const { errors } = await client.models.Project.delete({ id: projectId })

      if (errors) {
        console.error('Error deleting project from database:', errors)
        return false
      }

      console.log('Project deleted from database successfully')
      return true
    } catch (error) {
      console.error('Error deleting project from database:', error)
      return false
    }
  },

  // Delete a document from database
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      console.log('Deleting document from database:', documentId)

      const { errors } = await client.models.Document.delete({ id: documentId })

      if (errors) {
        console.error('Error deleting document from database:', errors)
        return false
      }

      console.log('Document deleted from database successfully')
      return true
    } catch (error) {
      console.error('Error deleting document from database:', error)
      return false
    }
  },
}
