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
      const response = await client.models.Document.get({ id })
      const { data } = response
      return data
    } catch (error) {
      console.error('Error fetching document:', error)
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
      const { data } = await client.models.Document.list()
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
