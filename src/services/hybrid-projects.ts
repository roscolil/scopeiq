import { databaseService } from './database-simple'
import { projectService as s3ProjectService } from './s3-api'
import { Project } from '@/types'

/**
 * Hybrid service that can work with both S3 and Database
 * This allows for gradual migration and fallback strategies
 */
export class HybridProjectService {
  private useDatabase: boolean

  constructor(useDatabase: boolean = true) {
    this.useDatabase = useDatabase
  }

  /**
   * Switch between database and S3 mode
   */
  setMode(useDatabase: boolean) {
    this.useDatabase = useDatabase
  }

  /**
   * Get all projects with documents
   */
  async getAllProjectsWithDocuments(): Promise<Project[]> {
    try {
      if (this.useDatabase) {
        // Get projects from database
        const dbProjects = await databaseService.getProjects()

        // Transform database projects to Project type
        const transformedProjects: Project[] = await Promise.all(
          dbProjects.map(async dbProject => {
            // Get documents for this project
            const documents = await databaseService.getDocumentsByProject(
              dbProject.id,
            )

            return {
              id: dbProject.id,
              name: dbProject.name || 'Untitled Project',
              description: dbProject.description || '',
              createdAt: new Date().toISOString(), // Database doesn't return these fields yet
              updatedAt: new Date().toISOString(),
              documents: documents.map(doc => ({
                id: doc.id,
                name: doc.name, // Use correct field names from database
                key: doc.s3Key, // Map s3Key to key
                size: doc.size,
                type: doc.type,
                uploadedAt: new Date().toISOString(), // Default for now
                projectId: dbProject.id,
                status: doc.status as 'processed' | 'processing' | 'failed', // Add required status field
              })),
              // Map database fields to Project type (these don't exist in database yet, using defaults)
              address: '', // Database doesn't have address fields yet
              companyId: 'default-company', // TODO: Get from user context
              streetNumber: '',
              streetName: '',
              suburb: '',
              state: '',
              postcode: '',
            }
          }),
        )

        return transformedProjects
      } else {
        // Fallback to S3
        return await s3ProjectService.getAllProjectsWithDocuments()
      }
    } catch (error) {
      console.error('HybridProjectService: Error getting projects:', error)

      // If database fails, try S3 as fallback
      if (this.useDatabase) {
        console.warn('Database failed, falling back to S3...')
        try {
          return await s3ProjectService.getAllProjectsWithDocuments()
        } catch (s3Error) {
          console.error('S3 fallback also failed:', s3Error)
          return []
        }
      }

      return []
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData: {
    name: string
    description: string
    address?: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    state?: string
    postcode?: string
  }) {
    try {
      if (this.useDatabase) {
        // Create in database (only passing supported fields for now)
        const dbProject = await databaseService.createProject({
          name: projectData.name,
          description: projectData.description || '',
          // TODO: Add address fields to database schema later
        })

        return {
          id: dbProject?.id || '',
          name: dbProject?.name || projectData.name,
          description: dbProject?.description || projectData.description || '',
          createdAt: new Date().toISOString(), // Database service doesn't return timestamps yet
          updatedAt: new Date().toISOString(),
          documents: [],
          // Address fields don't exist in database yet, using defaults
          address: projectData.address || '',
          companyId: 'default-company',
          streetNumber: projectData.streetNumber || '',
          streetName: projectData.streetName || '',
          suburb: projectData.suburb || '',
          state: projectData.state || '',
          postcode: projectData.postcode || '',
        }
      } else {
        // Fallback to S3
        return await s3ProjectService.createProject(projectData)
      }
    } catch (error) {
      console.error('HybridProjectService: Error creating project:', error)
      throw error
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      if (this.useDatabase) {
        // Delete from database (this should cascade to documents)
        await databaseService.deleteProject(projectId)
      } else {
        // Fallback to S3
        await s3ProjectService.deleteProject(projectId)
      }
    } catch (error) {
      console.error('HybridProjectService: Error deleting project:', error)
      throw error
    }
  }

  /**
   * Create a document for a project
   */
  async createDocument(
    projectId: string,
    documentData: {
      fileName: string
      fileKey: string
      fileSize: number
      fileType: string
      uploadedAt?: string
    },
  ) {
    try {
      if (this.useDatabase) {
        return await databaseService.createDocument({
          projectId,
          name: documentData.fileName, // Map fileName to name
          type: documentData.fileType, // Map fileType to type
          size: documentData.fileSize, // Map fileSize to size
          s3Key: documentData.fileKey, // Map fileKey to s3Key
          status: 'processing', // Default status
        })
      } else {
        // TODO: Implement S3 document creation if needed
        throw new Error(
          'S3 document creation not implemented in hybrid service',
        )
      }
    } catch (error) {
      console.error('HybridProjectService: Error creating document:', error)
      throw error
    }
  }

  /**
   * Get the current mode
   */
  getCurrentMode(): 'database' | 's3' {
    return this.useDatabase ? 'database' : 's3'
  }

  /**
   * Test connectivity to both services
   */
  async testConnectivity() {
    const results = {
      database: { connected: false, error: null as string | null },
      s3: { connected: false, error: null as string | null },
    }

    // Test database
    try {
      await databaseService.testConnection()
      results.database.connected = true
    } catch (error) {
      results.database.error =
        error instanceof Error ? error.message : 'Unknown error'
    }

    // Test S3
    try {
      await s3ProjectService.getAllProjectsWithDocuments()
      results.s3.connected = true
    } catch (error) {
      results.s3.error =
        error instanceof Error ? error.message : 'Unknown error'
    }

    return results
  }
}

// Create a singleton instance
export const hybridProjectService = new HybridProjectService(true) // Default to database mode

// Export the class for manual instantiation if needed
export default HybridProjectService
