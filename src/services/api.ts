import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Generate the data client
const client = generateClient<Schema>()

// Document service functions
export const documentService = {
  // Get all documents for a project
  async getDocumentsByProject(projectId: string) {
    try {
      const { data } = await client.models.Document.list({
        filter: { projectId: { eq: projectId } },
      })
      return data
    } catch (error) {
      console.error('Error fetching documents:', error)
      throw error
    }
  },

  // Get a single document by ID
  async getDocument(id: string) {
    try {
      console.log(
        'documentService.getDocument: Attempting to fetch document with ID:',
        id,
      )

      // First, let's try to list all documents to see if we can access any
      console.log(
        'documentService.getDocument: Testing access by listing all documents first...',
      )
      const allDocsResponse = await client.models.Document.list()
      console.log(
        'documentService.getDocument: All documents response:',
        allDocsResponse,
      )
      console.log(
        'documentService.getDocument: Can access documents count:',
        allDocsResponse.data?.length || 0,
      )

      if (allDocsResponse.data && allDocsResponse.data.length > 0) {
        const targetDoc = allDocsResponse.data.find(doc => doc.id === id)
        if (targetDoc) {
          console.log(
            'documentService.getDocument: Found target document in list:',
            targetDoc,
          )
        } else {
          console.log(
            'documentService.getDocument: Target document NOT found in list. Available IDs:',
            allDocsResponse.data.map(doc => doc.id),
          )
        }
      }

      const response = await client.models.Document.get({ id })
      console.log('documentService.getDocument: Raw response:', response)
      console.log('documentService.getDocument: Response data:', response.data)
      const { data } = response
      return data
    } catch (error) {
      console.error('Error fetching document:', error)
      console.error('Document ID that failed:', id)

      // Check if it's an authorization error
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', (error as Error).message)
        if (
          (error as Error).message?.includes('UnauthorizedException') ||
          (error as Error).message?.includes('not authorized')
        ) {
          console.error(
            'This appears to be an authorization issue - user may not own this document',
          )
        }
      }
      throw error
    }
  },

  // Create a new document
  async createDocument(documentData: {
    name: string
    type: string
    size: string
    status: 'processed' | 'processing' | 'failed'
    url?: string
    thumbnailUrl?: string
    projectId?: string
    content?: string
  }) {
    try {
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data } = await client.models.Document.create(documentData)
      return data
    } catch (error) {
      console.error('Error creating document:', error)
      throw error
    }
  },

  // Update document
  async updateDocument(
    id: string,
    updates: Partial<{
      name: string
      type: string
      size: string
      status: 'processed' | 'processing' | 'failed'
      url: string
      thumbnailUrl: string
      content: string
    }>,
  ) {
    try {
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data } = await client.models.Document.update({
        id,
        ...updates,
      })
      return data
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  },

  // Delete document
  async deleteDocument(id: string) {
    try {
      await client.models.Document.delete({ id })
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  },

  // Get all documents (across all projects)
  async getAllDocuments() {
    try {
      console.log('documentService.getAllDocuments: Fetching all documents')
      const { data } = await client.models.Document.list()
      console.log('documentService.getAllDocuments: Found documents:', data)
      console.log(
        'documentService.getAllDocuments: Number of documents:',
        data?.length || 0,
      )
      if (data && data.length > 0) {
        console.log(
          'documentService.getAllDocuments: Document IDs:',
          data.map(doc => doc.id),
        )
      }
      return data
    } catch (error) {
      console.error('Error fetching all documents:', error)
      throw error
    }
  },
}

// Project service functions
export const projectService = {
  // Get all projects
  async getProjects() {
    try {
      const { data } = await client.models.Project.list()
      return data
    } catch (error) {
      console.error('Error fetching projects:', error)
      throw error
    }
  },

  // Get a single project by ID
  async getProject(id: string) {
    try {
      const { data } = await client.models.Project.get({ id })
      return data
    } catch (error) {
      console.error('Error fetching project:', error)
      throw error
    }
  },

  // Get project with its documents
  async getProjectWithDocuments(id: string) {
    try {
      const project = await client.models.Project.get({ id })
      if (!project.data) return null

      const documents = await client.models.Document.list({
        filter: { projectId: { eq: id } },
      })

      return {
        ...project.data,
        documents: documents.data || [],
      }
    } catch (error) {
      console.error('Error fetching project with documents:', error)
      throw error
    }
  },

  // Create a new project
  async createProject(projectData: { name: string; description?: string }) {
    try {
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data } = await client.models.Project.create(projectData)
      return data
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  },

  // Update project
  async updateProject(
    id: string,
    updates: Partial<{
      name: string
      description: string
    }>,
  ) {
    try {
      // Temporary workaround for Amplify type generation bug (expects arrays for all fields)
      // @ts-expect-error - Known issue with Amplify codegen, expecting string[] instead of string
      const { data } = await client.models.Project.update({
        id,
        ...updates,
      })
      return data
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  },

  // Delete project
  async deleteProject(id: string) {
    try {
      // First delete all documents in the project
      const documents = await client.models.Document.list({
        filter: { projectId: { eq: id } },
      })

      for (const doc of documents.data || []) {
        await client.models.Document.delete({ id: doc.id })
      }

      // Then delete the project
      await client.models.Project.delete({ id })
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  },
}

export { client }
