import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import {
  getS3BucketName,
  getAWSRegion,
  getAWSCredentialsSafe,
} from '../../utils/aws-config'

// S3 Configuration
const awsRegion = getAWSRegion()
const credentials = getAWSCredentialsSafe()
const BUCKET_NAME = getS3BucketName()

const s3Client = new S3Client({
  region: awsRegion,
  credentials: credentials
    ? {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    : undefined,
  forcePathStyle: true,
})

export interface S3Document {
  id: string
  name: string
  type: string
  size: number
  status: 'processed' | 'processing' | 'failed'
  url: string
  thumbnailUrl?: string
  projectId: string
  content?: string
  createdAt: string
  updatedAt?: string
}

export interface S3Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
  companyId: string
}

// Helper function to get object content from S3
const getS3Object = async (key: string): Promise<string | null> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    const response = await s3Client.send(command)

    if (response.Body) {
      const content = await response.Body.transformToString()
      return content
    }
    return null
  } catch (error) {
    console.error(`Error getting S3 object ${key}:`, error)
    return null
  }
}

// Helper function to put object to S3
const putS3Object = async (key: string, content: string): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'application/json',
  })
  await s3Client.send(command)
}

// Helper function to list objects in S3
const listS3Objects = async (prefix: string): Promise<string[]> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
    const response = await s3Client.send(command)

    return (response.Contents || [])
      .map(obj => obj.Key!)
      .filter(key => key.endsWith('.json'))
  } catch (error) {
    console.error(`Error listing S3 objects with prefix ${prefix}:`, error)
    return []
  }
}

// Helper function to delete object from S3
const deleteS3Object = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  await s3Client.send(command)
}

// Export the delete function for use by other services
export const deleteS3File = deleteS3Object

export const s3DocumentService = {
  // Get all documents for a project
  async getDocumentsByProject(
    companyId: string,
    projectId: string,
  ): Promise<S3Document[]> {
    try {
      const prefix = `${companyId}/${projectId}/documents/`
      const keys = await listS3Objects(prefix)

      const documents: S3Document[] = []

      for (const key of keys) {
        const content = await getS3Object(key)
        if (content) {
          try {
            const doc = JSON.parse(content) as S3Document
            documents.push(doc)
          } catch (parseError) {
            console.error(`Error parsing document metadata ${key}:`, parseError)
          }
        }
      }

      console.log(`Found ${documents.length} documents for project`)
      return documents
    } catch (error) {
      console.error('Error fetching documents from S3:', error)

      // Check if it's a "no documents exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for projects with no documents yet
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
  async getDocument(
    companyId: string,
    projectId: string,
    documentId: string,
  ): Promise<S3Document | null> {
    try {
      console.log(
        `Fetching document: ${companyId}/${projectId}/documents/${documentId}.json`,
      )

      const key = `${companyId}/${projectId}/documents/${documentId}.json`
      const content = await getS3Object(key)

      if (content) {
        return JSON.parse(content) as S3Document
      }
      return null
    } catch (error) {
      console.error('Error fetching document from S3:', error)
      throw error
    }
  },

  // Create a new document
  async createDocument(
    companyId: string,
    projectId: string,
    documentData:
      | Omit<S3Document, 'createdAt'>
      | Omit<S3Document, 'id' | 'createdAt'>,
  ): Promise<S3Document> {
    try {
      const document: S3Document = {
        ...documentData,
        // Use provided ID if available, otherwise generate new one
        id:
          'id' in documentData && documentData.id
            ? documentData.id
            : `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      }

      console.log('Creating document in S3:', document)

      const key = `${companyId}/${projectId}/documents/${document.id}.json`
      await putS3Object(key, JSON.stringify(document, null, 2))

      console.log(`Document created successfully: ${key}`)
      return document
    } catch (error) {
      console.error('Error creating document in S3:', error)
      throw error
    }
  },

  // Update document
  async updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    updates: Partial<S3Document>,
  ): Promise<S3Document | null> {
    try {
      const existing = await this.getDocument(companyId, projectId, documentId)
      if (!existing) {
        throw new Error('Document not found')
      }

      const updated: S3Document = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID doesn't change
        createdAt: existing.createdAt, // Ensure createdAt doesn't change
        updatedAt: new Date().toISOString(),
      }

      const key = `${companyId}/${projectId}/documents/${documentId}.json`
      await putS3Object(key, JSON.stringify(updated, null, 2))

      return updated
    } catch (error) {
      console.error('Error updating document in S3:', error)
      throw error
    }
  },

  // Delete document
  async deleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
  ): Promise<void> {
    try {
      const key = `${companyId}/${projectId}/documents/${documentId}.json`
      await deleteS3Object(key)
    } catch (error) {
      console.error('Error deleting document from S3:', error)
      throw error
    }
  },

  // Get all documents across all projects for a company
  async getAllDocuments(companyId: string): Promise<S3Document[]> {
    try {
      console.log(`Fetching all documents for company: ${companyId}`)

      const prefix = `${companyId}/`
      console.log(`Using S3 prefix: ${prefix}`)
      const keys = await listS3Objects(prefix)

      console.log(
        `Found ${keys.length} total S3 objects with prefix ${prefix}:`,
        keys,
      )

      const documentKeys = keys.filter(
        key => key.includes('/documents/') && key.endsWith('.json'),
      )
      console.log(
        `Filtered to ${documentKeys.length} document metadata files:`,
        documentKeys,
      )

      const documents: S3Document[] = []

      for (const key of documentKeys) {
        console.log(`Processing document metadata file: ${key}`)
        const content = await getS3Object(key)
        if (content) {
          try {
            const doc = JSON.parse(content) as S3Document
            console.log(`Successfully parsed document:`, doc)
            documents.push(doc)
          } catch (parseError) {
            console.error(`Error parsing document metadata ${key}:`, parseError)
          }
        } else {
          console.warn(`No content found for key: ${key}`)
        }
      }

      console.log(`Found ${documents.length} total documents for company`)
      return documents
    } catch (error) {
      console.error('Error fetching all documents from S3:', error)

      // Check if it's a "no documents exist" scenario
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('The specified key does not exist')
      ) {
        // This is normal for companies with no documents yet
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

export const s3ProjectService = {
  // Get all company IDs that have projects
  async getAllCompanies(): Promise<string[]> {
    try {
      console.log('Scanning S3 bucket for all companies...')

      // List all objects in the bucket to find company directories
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Delimiter: '/', // This groups objects by directory
      })

      const response = await s3Client.send(command)
      const companies: string[] = []

      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            // Extract company ID from prefix like "company-id/"
            const companyId = prefix.Prefix.replace('/', '')
            if (companyId && !companyId.includes('/')) {
              companies.push(companyId)
            }
          }
        }
      }

      console.log(`Found ${companies.length} companies in S3:`, companies)
      return companies
    } catch (error) {
      console.error('Error scanning for companies in S3:', error)
      return []
    }
  },

  // Get all projects for a company
  async getProjects(companyId: string): Promise<S3Project[]> {
    try {
      console.log(`Fetching projects for company: ${companyId}`)

      const prefix = `${companyId}/projects/`
      const keys = await listS3Objects(prefix)

      const projects: S3Project[] = []

      for (const key of keys) {
        const content = await getS3Object(key)
        if (content) {
          try {
            const project = JSON.parse(content) as S3Project
            projects.push(project)
          } catch (parseError) {
            console.error(`Error parsing project metadata ${key}:`, parseError)
          }
        }
      }

      console.log(`Found ${projects.length} projects for company`)
      return projects
    } catch (error) {
      console.error('Error fetching projects from S3:', error)

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
  async getProject(
    companyId: string,
    projectId: string,
  ): Promise<S3Project | null> {
    try {
      console.log(`Fetching project: ${companyId}/projects/${projectId}.json`)

      const key = `${companyId}/projects/${projectId}.json`
      const content = await getS3Object(key)

      if (content) {
        return JSON.parse(content) as S3Project
      }
      return null
    } catch (error) {
      console.error('Error fetching project from S3:', error)
      throw error
    }
  },

  // Create a new project
  async createProject(
    companyId: string,
    projectData: Omit<S3Project, 'id' | 'createdAt' | 'companyId'>,
  ): Promise<S3Project> {
    try {
      const project: S3Project = {
        ...projectData,
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        companyId,
      }

      const key = `${companyId}/projects/${project.id}.json`

      await putS3Object(key, JSON.stringify(project, null, 2))

      return project
    } catch (error) {
      console.error('❌ S3 createProject: Error creating project in S3:', error)
      throw error
    }
  },

  // Update project
  async updateProject(
    companyId: string,
    projectId: string,
    updates: Partial<S3Project>,
  ): Promise<S3Project | null> {
    try {
      const existing = await this.getProject(companyId, projectId)
      if (!existing) {
        throw new Error('Project not found')
      }

      const updated: S3Project = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID doesn't change
        createdAt: existing.createdAt, // Ensure createdAt doesn't change
        companyId: existing.companyId, // Ensure companyId doesn't change
        updatedAt: new Date().toISOString(),
      }

      const key = `${companyId}/projects/${projectId}.json`
      await putS3Object(key, JSON.stringify(updated, null, 2))

      return updated
    } catch (error) {
      console.error('Error updating project in S3:', error)
      throw error
    }
  },

  // Delete project
  async deleteProject(companyId: string, projectId: string): Promise<void> {
    try {
      // First delete all documents in the project
      const documents = await s3DocumentService.getDocumentsByProject(
        companyId,
        projectId,
      )

      for (const doc of documents) {
        await s3DocumentService.deleteDocument(companyId, projectId, doc.id)
      }

      // Then delete the project metadata
      const key = `${companyId}/projects/${projectId}.json`
      await deleteS3Object(key)

      console.log(`Project and all its documents deleted: ${key}`)
    } catch (error) {
      console.error('Error deleting project from S3:', error)
      throw error
    }
  },
}
