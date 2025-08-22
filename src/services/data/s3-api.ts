// S3-based API service that replaces the DynamoDB-based api.ts
import {
  s3DocumentService,
  s3ProjectService,
  S3Document,
  S3Project,
} from './s3-metadata'
import { createSlug } from '@/utils/ui/navigation'

// Helper function to get current user's company ID
// In a real app, this would come from authentication/user context
const getCurrentCompanyId = (): string => {
  // Extract from URL pathname like /:companyId/:projectId/:documentId
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  console.log('URL path parts for company ID extraction:', pathParts)

  // Company ID is the first path segment
  const companyId = pathParts[0] || 'default-company'
  console.log('Extracted company ID:', companyId)
  return companyId
}

// Helper function to get current project ID (might be a slug)
const getCurrentProjectId = (): string => {
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  console.log('URL path parts for project ID extraction:', pathParts)

  // Project ID is the second path segment
  const projectId = pathParts[1] || 'default-project'
  console.log('Extracted project ID/slug:', projectId)
  return projectId
}

// Project service functions using S3
export const projectService = {
  // Resolve a project slug or ID to the actual project
  async resolveProject(slugOrId: string) {
    try {
      const companyId = getCurrentCompanyId()
      console.log(
        `🔍 S3 projectService: Resolving project "${slugOrId}" for company "${companyId}"`,
      )

      // First try to get it as a direct project ID
      let directProject = null
      try {
        directProject = await s3ProjectService.getProject(companyId, slugOrId)
        if (directProject) {
          console.log(
            `✅ S3 projectService: Found project by direct ID "${slugOrId}"`,
          )
          return directProject
        }
      } catch (error) {
        console.log(
          `❌ S3 projectService: Not found by direct ID, trying slug resolution`,
        )
      }

      // If not found, search all projects for one with a matching slug
      console.log(
        `🔍 S3 projectService: Searching all projects for slug match...`,
      )
      try {
        const allProjects = await s3ProjectService.getProjects(companyId)
        console.log(
          `📊 S3 projectService: Found ${allProjects.length} total projects to search`,
        )

        if (allProjects.length > 0) {
          console.log(`📋 S3 projectService: Available projects:`)
          allProjects.forEach((p, i) => {
            const slug = createSlug(p.name)
            console.log(
              `  ${i + 1}. ID: "${p.id}", Name: "${p.name}", Generated Slug: "${slug}"`,
            )
          })
        }

        for (const project of allProjects) {
          const projectSlug = createSlug(project.name)
          console.log(
            `🔍 S3 projectService: Checking "${project.name}" (slug: "${projectSlug}") against target "${slugOrId}"`,
          )
          if (projectSlug === slugOrId) {
            console.log(
              `✅ S3 projectService: MATCH FOUND! Slug "${slugOrId}" resolves to project ID: "${project.id}"`,
            )
            return project
          }
        }
      } catch (projectFetchError) {
        console.error(
          `❌ S3 projectService: Error fetching projects for slug resolution:`,
          projectFetchError,
        )
      }

      console.log(
        `❌ S3 projectService: No project found for slug/ID "${slugOrId}"`,
      )
      return null
    } catch (error) {
      console.error('❌ Error resolving project:', error)
      throw error
    }
  },

  // Get all projects for a company
  async getProjects() {
    const companyId = getCurrentCompanyId()
    try {
      console.log(
        `S3 projectService: Fetching projects for company ${companyId}`,
      )

      const projects = await s3ProjectService.getProjects(companyId)
      console.log(`S3 projectService: Found ${projects.length} projects`)
      return projects
    } catch (error) {
      console.error('Error fetching projects:', error)

      // Check if it's a "no projects exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for new companies with no projects yet
        console.log(
          `No projects found for company ${companyId} - returning empty array`,
        )
        return []
      }

      // Re-throw other errors
      throw error
    }
  },

  // Get a single project by ID
  async getProject(id: string) {
    try {
      const companyId = getCurrentCompanyId()
      console.log(
        `S3 projectService: Fetching project ${id} for company ${companyId}`,
      )

      const project = await s3ProjectService.getProject(companyId, id)
      console.log(
        `S3 projectService: ${project ? 'Found' : 'Not found'} project ${id}`,
      )
      return project
    } catch (error) {
      console.error('Error fetching project:', error)
      throw error
    }
  },

  // Get project with its documents
  async getProjectWithDocuments(id: string) {
    try {
      const companyId = getCurrentCompanyId()
      console.log(`S3 projectService: Fetching project ${id} with documents`)

      const project = await s3ProjectService.getProject(companyId, id)
      if (!project) return null

      const documents = await s3DocumentService.getDocumentsByProject(
        companyId,
        id,
      )

      return {
        ...project,
        documents: documents || [],
      }
    } catch (error) {
      console.error('Error fetching project with documents:', error)
      throw error
    }
  },

  // Create a new project
  async createProject(projectData: { name: string; description?: string }) {
    try {
      const companyId = getCurrentCompanyId()
      console.log(`S3 projectService: Creating project in company ${companyId}`)

      const project = await s3ProjectService.createProject(companyId, {
        name: projectData.name,
        description: projectData.description || '',
      })

      console.log(`S3 projectService: Created project ${project.id}`)
      return project
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
      const companyId = getCurrentCompanyId()
      console.log(`S3 projectService: Updating project ${id}`)

      const project = await s3ProjectService.updateProject(
        companyId,
        id,
        updates,
      )
      console.log(`S3 projectService: Updated project ${id}`)
      return project
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  },

  // Delete project
  async deleteProject(id: string) {
    try {
      const companyId = getCurrentCompanyId()
      console.log(`S3 projectService: Deleting project ${id}`)

      await s3ProjectService.deleteProject(companyId, id)
      console.log(`S3 projectService: Deleted project ${id}`)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  },

  // Get all projects with their documents for comprehensive view
  async getAllProjectsWithDocuments() {
    try {
      const companyId = getCurrentCompanyId()
      console.log(
        `S3 projectService: Fetching all projects with documents for company ${companyId}`,
      )

      const projects = await s3ProjectService.getProjects(companyId)
      console.log(`S3 projectService: Found ${projects.length} projects`)

      // For each project, fetch its documents
      const projectsWithDocuments = await Promise.all(
        projects.map(async project => {
          const documents = await s3DocumentService.getDocumentsByProject(
            companyId,
            project.id,
          )
          console.log(
            `S3 projectService: Project "${project.name}" has ${documents.length} documents`,
          )
          return {
            ...project,
            documents,
          }
        }),
      )

      console.log(
        `S3 projectService: Returning ${projectsWithDocuments.length} projects with documents`,
      )
      return projectsWithDocuments
    } catch (error) {
      console.error('Error fetching projects with documents:', error)

      // Check if it's a "no projects exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for new companies with no projects yet
        const companyId = getCurrentCompanyId()
        console.log(
          `No projects found for company ${companyId} - returning empty array`,
        )
        return []
      }

      // Re-throw other errors
      throw error
    }
  },
}

// Document service functions using S3
export const documentService = {
  // Resolve a document slug or ID to the actual document
  async resolveDocument(
    companyId: string,
    projectId: string,
    slugOrId: string,
  ) {
    try {
      console.log(
        `🔍 S3 documentService: Resolving document "${slugOrId}" in ${companyId}/${projectId}`,
      )

      // First try to get it as a direct document ID
      try {
        const directDocument = await s3DocumentService.getDocument(
          companyId,
          projectId,
          slugOrId,
        )
        if (directDocument) {
          console.log(
            `✅ S3 documentService: Found document by direct ID "${slugOrId}"`,
          )
          return directDocument
        }
      } catch (error) {
        console.log(
          `❌ S3 documentService: Not found by direct ID, trying slug resolution`,
        )
      }

      // If not found, search all documents in the project for one with a matching slug
      try {
        const allDocuments = await s3DocumentService.getDocumentsByProject(
          companyId,
          projectId,
        )
        console.log(
          `📊 S3 documentService: Found ${allDocuments.length} documents in project to search`,
        )

        if (allDocuments.length > 0) {
          console.log(`📋 S3 documentService: Available documents:`)
          allDocuments.forEach((d, i) => {
            const slug = createSlug(d.name)
            console.log(
              `  ${i + 1}. ID: "${d.id}", Name: "${d.name}", Generated Slug: "${slug}"`,
            )
          })
        }

        for (const document of allDocuments) {
          const documentSlug = createSlug(document.name)
          console.log(
            `🔍 S3 documentService: Checking "${document.name}" (slug: "${documentSlug}") against target "${slugOrId}"`,
          )
          if (documentSlug === slugOrId) {
            console.log(
              `✅ S3 documentService: MATCH FOUND! Slug "${slugOrId}" resolves to document ID: "${document.id}"`,
            )
            return document
          }
        }
      } catch (error) {
        console.error(
          `❌ S3 documentService: Error fetching documents for slug resolution:`,
          error,
        )
      }

      console.log(
        `❌ S3 documentService: No document found for slug/ID "${slugOrId}"`,
      )
      return null
    } catch (error) {
      console.error('❌ Error resolving document:', error)
      throw error
    }
  },

  // Get all documents for a project
  async getDocumentsByProject(projectId: string) {
    try {
      const companyId = getCurrentCompanyId()
      const documents = await s3DocumentService.getDocumentsByProject(
        companyId,
        projectId,
      )
      console.log(`S3 documentService: Found ${documents.length} documents`)
      return documents
    } catch (error) {
      console.error('Error fetching documents:', error)

      // Check if it's a "no documents exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for projects with no documents yet
        const companyId = getCurrentCompanyId()
        console.log(
          `No documents found for project ${companyId}/${projectId} - returning empty array`,
        )
        return []
      }

      // Re-throw other errors
      throw error
    }
  },

  // Get a single document by ID
  async getDocument(id: string) {
    try {
      const companyId = getCurrentCompanyId()
      const projectSlugOrId = getCurrentProjectId()

      console.log(`🔍 S3 documentService: Searching for document "${id}"`)
      console.log(
        `📍 S3 documentService: Company: "${companyId}", Project slug/ID: "${projectSlugOrId}"`,
      )

      // First try to resolve the project slug/ID to actual project ID
      const resolvedProject =
        await projectService.resolveProject(projectSlugOrId)

      if (resolvedProject) {
        console.log(
          `✅ S3 documentService: Resolved project "${projectSlugOrId}" to "${resolvedProject.id}"`,
        )

        // Now try to resolve the document slug/ID to actual document
        const resolvedDocument = await this.resolveDocument(
          companyId,
          resolvedProject.id,
          id,
        )

        if (resolvedDocument) {
          console.log(
            `✅ S3 documentService: Found document "${id}" -> ID: "${resolvedDocument.id}" in project "${resolvedProject.id}"`,
          )
          return resolvedDocument
        } else {
          console.log(
            `❌ S3 documentService: Document "${id}" not found in project "${resolvedProject.id}"`,
          )
        }
      } else {
        console.log(
          `❌ S3 documentService: Could not resolve project "${projectSlugOrId}"`,
        )
      }

      // If not found in the resolved project, search across all projects (fallback)
      console.log(
        `🔍 S3 documentService: Document not found in resolved project, searching all projects...`,
      )
      const allDocuments = await s3DocumentService.getAllDocuments(companyId)
      console.log(
        `📊 S3 documentService: Found ${allDocuments.length} total documents across all projects`,
      )

      // Try direct ID match first
      let foundDocument = allDocuments.find(doc => doc.id === id)

      // If not found by ID, try slug match
      if (!foundDocument) {
        console.log(
          `🔍 S3 documentService: Trying slug match across all documents...`,
        )
        foundDocument = allDocuments.find(doc => createSlug(doc.name) === id)
        if (foundDocument) {
          console.log(
            `✅ S3 documentService: Found document by slug "${id}" -> ID: "${foundDocument.id}"`,
          )
        }
      }

      if (foundDocument) {
        console.log(`✅ S3 documentService: Found document in fallback search`)
      } else {
        console.log(
          `❌ S3 documentService: Document "${id}" not found anywhere`,
        )
      }

      return foundDocument || null
    } catch (error) {
      console.error('❌ Error fetching document:', error)
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
    companyId?: string
    content?: string
  }) {
    try {
      const companyId = documentData.companyId || getCurrentCompanyId()
      const projectId = documentData.projectId || getCurrentProjectId()

      console.log(
        `S3 documentService: Creating document in ${companyId}/${projectId}`,
      )
      console.log('S3 documentService: Document data:', documentData)

      const document = await s3DocumentService.createDocument(
        companyId,
        projectId,
        {
          name: documentData.name,
          type: documentData.type,
          size: parseInt(documentData.size) || 0,
          status: documentData.status,
          url: documentData.url || '',
          thumbnailUrl: documentData.thumbnailUrl,
          projectId,
          content: documentData.content,
        },
      )
      return document
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
      const companyId = getCurrentCompanyId()

      // Find the document first to get its projectId
      const allDocuments = await s3DocumentService.getAllDocuments(companyId)
      const existingDoc = allDocuments.find(doc => doc.id === id)

      if (!existingDoc) {
        throw new Error('Document not found')
      }

      console.log(
        `S3 documentService: Updating document ${id} in ${companyId}/${existingDoc.projectId}`,
      )

      const updatedDoc = await s3DocumentService.updateDocument(
        companyId,
        existingDoc.projectId,
        id,
        {
          ...updates,
          size: updates.size ? parseInt(updates.size) : undefined,
        },
      )

      console.log(`S3 documentService: Updated document ${id}`)
      return updatedDoc
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  },

  // Delete document
  async deleteDocument(id: string) {
    try {
      const companyId = getCurrentCompanyId()

      // Find the document first to get its projectId
      const allDocuments = await s3DocumentService.getAllDocuments(companyId)
      const existingDoc = allDocuments.find(doc => doc.id === id)

      if (!existingDoc) {
        throw new Error('Document not found')
      }

      console.log(
        `S3 documentService: Deleting document ${id} from ${companyId}/${existingDoc.projectId}`,
      )

      await s3DocumentService.deleteDocument(
        companyId,
        existingDoc.projectId,
        id,
      )
      console.log(`S3 documentService: Deleted document ${id}`)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  },

  // Get all documents (across all projects)
  async getAllDocuments() {
    try {
      const companyId = getCurrentCompanyId()
      console.log(
        `S3 documentService: Fetching all documents for company ${companyId}`,
      )

      const documents = await s3DocumentService.getAllDocuments(companyId)
      console.log(
        `S3 documentService: Found ${documents.length} total documents`,
      )

      if (documents.length > 0) {
        console.log(
          'S3 documentService: Document IDs:',
          documents.map(doc => doc.id),
        )
      }

      return documents
    } catch (error) {
      console.error('Error fetching all documents:', error)

      // Check if it's a "no documents exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for companies with no documents yet
        const companyId = getCurrentCompanyId()
        console.log(
          `No documents found for company ${companyId} - returning empty array`,
        )
        return []
      }

      // Re-throw other errors
      throw error
    }
  },
}

export { s3DocumentService, s3ProjectService }
