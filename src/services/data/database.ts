import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'
import { getCurrentUser } from 'aws-amplify/auth'

// Generate the Amplify client
const client = generateClient<Schema>()

export interface DatabaseDocument {
  id: string
  name: string
  type: string
  size: number
  // Backend schema now includes additional statuses ('ready', 'error'); include them to prevent narrowing issues
  status: 'processed' | 'processing' | 'failed' | 'ready' | 'error'
  s3Key: string // Path to actual file in S3
  s3Url?: string | null // Pre-signed URL
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  projectId: string
  mimeType?: string | null
  content?: string | null // Processed text content
  tags?: string[] | null
  categoryIds?: string[] | null
  primaryCategoryId?: string | null
  suggestedCategoryIds?: string[] | null
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
      // Accumulate all raw document model items (Amplify returns generated model objects)
      interface RawDoc {
        id: string | string[]
        name: string | string[]
        type: string | string[]
        size: number | string | string[]
        status: string | string[]
        s3Key: string | string[]
        s3Url?: string | string[] | null
        thumbnailS3Key?: string | string[] | null
        thumbnailUrl?: string | string[] | null
        projectId: string | string[]
        mimeType?: string | string[] | null
        content?: string | string[] | null
        tags?: string[] | string
        categoryIds?: string[] | string
        primaryCategoryId?: string | string[] | null
        suggestedCategoryIds?: string[] | string
        createdAt?: string | string[] | null
        updatedAt?: string | string[] | null
      }

      const all: RawDoc[] = []

      let nextToken: string | undefined = undefined
      let page = 0
      // Helper fallback when deployed backend schema is missing new category fields
      const fetchWithoutCategoryFields = async (): Promise<
        DatabaseDocument[]
      > => {
        console.warn(
          '⚠️ Backend schema appears outdated (category fields undefined). Falling back to minimal query without category fields. Redeploy Amplify backend to add: categoryIds, primaryCategoryId, suggestedCategoryIds.',
        )
        // Raw GraphQL query excluding the new fields so we can still render documents
        const minimalQuery = /* GraphQL */ `
          #graphql
          query ListDocumentsLegacy(
            $filter: ModelDocumentFilterInput
            $limit: Int
            $nextToken: String
          ) {
            listDocuments(
              filter: $filter
              limit: $limit
              nextToken: $nextToken
            ) {
              items {
                id
                name
                type
                size
                status
                s3Key
                s3Url
                thumbnailS3Key
                thumbnailUrl
                projectId
                mimeType
                content
                tags
                createdAt
                updatedAt
              }
              nextToken
            }
          }
        `

        interface LegacyDocItem {
          id: string
          name: string
          type: string
          size: number | string
          status: string
          s3Key: string
          s3Url?: string | null
          thumbnailS3Key?: string | null
          thumbnailUrl?: string | null
          projectId: string
          mimeType?: string | null
          content?: string | null
          tags?: string[] | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        interface LegacyListResponse {
          listDocuments?: {
            items?: LegacyDocItem[]
            nextToken?: string | null
          } | null
        }

        let legacyNext: string | undefined = undefined
        const legacyAll: LegacyDocItem[] = []
        let legacyPage = 0
        do {
          legacyPage++
          // The client.graphql type is broader; cast the response shape afterward
          const legacyResp = (await (
            client as unknown as {
              graphql: (input: {
                query: string
                variables?: Record<string, unknown>
              }) => Promise<{ data?: LegacyListResponse }>
            }
          ).graphql({
            query: minimalQuery,
            variables: {
              filter: { projectId: { eq: projectId } },
              nextToken: legacyNext,
            },
          })) as { data?: LegacyListResponse }
          const listResult = legacyResp.data?.listDocuments
          if (!listResult) break
          legacyAll.push(...(listResult.items || []))
          legacyNext = listResult.nextToken || undefined
        } while (legacyNext)

        const allowedStatuses: DatabaseDocument['status'][] = [
          'processed',
          'processing',
          'failed',
          'ready',
          'error',
        ]
        return legacyAll.map(raw => {
          const statusCandidate =
            typeof raw.status === 'string' ? raw.status : 'processed'
          const status = (
            allowedStatuses.includes(
              statusCandidate as DatabaseDocument['status'],
            )
              ? statusCandidate
              : 'processed'
          ) as DatabaseDocument['status']
          return {
            id: raw.id,
            name: raw.name,
            type: raw.type,
            size:
              typeof raw.size === 'number'
                ? raw.size
                : parseInt(raw.size || '0', 10),
            status,
            s3Key: raw.s3Key,
            s3Url: raw.s3Url || undefined,
            thumbnailS3Key: raw.thumbnailS3Key || undefined,
            thumbnailUrl: raw.thumbnailUrl || undefined,
            projectId: raw.projectId,
            mimeType: raw.mimeType || undefined,
            content: raw.content || undefined,
            tags: raw.tags || undefined,
            categoryIds: undefined, // unavailable until backend redeploy
            primaryCategoryId: undefined,
            suggestedCategoryIds: undefined,
            createdAt: raw.createdAt || undefined,
            updatedAt: raw.updatedAt || undefined,
          }
        })
      }

      let schemaOutdatedFallbackUsed = false

      do {
        page++
        const {
          data: pageData,
          errors,
          nextToken: newToken,
        } = await client.models.Document.list({
          filter: { projectId: { eq: projectId } },
          nextToken,
        })

        if (errors) {
          const fieldUndefinedErrors = errors.filter(e =>
            /Field '?(categoryIds|primaryCategoryId|suggestedCategoryIds)'? in type 'Document' is undefined/.test(
              e.message || '',
            ),
          )
          if (
            fieldUndefinedErrors.length === errors.length &&
            fieldUndefinedErrors.length > 0
          ) {
            schemaOutdatedFallbackUsed = true
            return await fetchWithoutCategoryFields()
          }
          console.error('DB: Error fetching documents page:', page, errors)
          throw new Error(
            `Database error (page ${page}): ${errors
              .map(e => e.message)
              .join(', ')}`,
          )
        }

        all.push(...pageData)
        nextToken = newToken as string | undefined
      } while (nextToken)

      const mappedDocuments: DatabaseDocument[] = all.map(raw => {
        // Some generated Amplify model fields may appear as arrays due to codegen quirks; normalize scalars.
        const norm = <T = unknown>(val: unknown): T => {
          if (Array.isArray(val)) {
            return val[0] as unknown as T
          }
          return val as T
        }
        return {
          id: norm(raw.id) as string,
          name: norm(raw.name) as string,
          type: norm(raw.type) as string,
          // size may come back as string; coerce to number safely
          size:
            typeof raw.size === 'number'
              ? raw.size
              : parseInt(norm(raw.size) || '0', 10),
          status: norm(raw.status) as 'processed' | 'processing' | 'failed',
          s3Key: norm(raw.s3Key) as string,
          s3Url: norm(raw.s3Url) || undefined,
          thumbnailS3Key: norm(raw.thumbnailS3Key) || undefined,
          thumbnailUrl: norm(raw.thumbnailUrl) || undefined,
          projectId: norm(raw.projectId) as string,
          mimeType: norm(raw.mimeType) || undefined,
          content: norm(raw.content) || undefined,
          tags: Array.isArray(raw.tags)
            ? raw.tags
            : raw.tags
              ? [raw.tags]
              : undefined,
          categoryIds: Array.isArray(raw.categoryIds)
            ? raw.categoryIds
            : raw.categoryIds
              ? [raw.categoryIds]
              : undefined,
          primaryCategoryId: norm(raw.primaryCategoryId) || undefined,
          suggestedCategoryIds: Array.isArray(raw.suggestedCategoryIds)
            ? raw.suggestedCategoryIds
            : raw.suggestedCategoryIds
              ? [raw.suggestedCategoryIds]
              : undefined,
          createdAt: norm(raw.createdAt) || new Date().toISOString(),
          updatedAt: norm(raw.updatedAt) || undefined,
        }
      })

      if (schemaOutdatedFallbackUsed) {
        console.warn(
          '⚠️ Returned documents without category fields due to outdated backend schema. Redeploy Amplify backend to enable category taxonomy fields.',
        )
      }

      return mappedDocuments
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
        categoryIds: document.categoryIds,
        primaryCategoryId: document.primaryCategoryId,
        suggestedCategoryIds: document.suggestedCategoryIds,
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
      console.log(`📝 DB: Creating document:`, {
        name: documentData.name,
        projectId: documentData.projectId,
        status: documentData.status,
        s3Key: documentData.s3Key,
      })

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
        categoryIds: documentData.categoryIds as string[] & string[],
        primaryCategoryId: documentData.primaryCategoryId as string & string[],
        suggestedCategoryIds: documentData.suggestedCategoryIds as string[] &
          string[],
      })

      if (errors) {
        console.error('DB: Error creating document:', errors)

        // Check for authorization errors and provide more descriptive messages
        const authError = errors.find(
          error =>
            error.message?.includes('Not Authorized') ||
            error.message?.includes('Unauthorized') ||
            error.errorType === 'Unauthorized',
        )

        if (authError) {
          throw new Error(
            'You do not have authorization to create documents. Please contact your administrator.',
          )
        }

        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }

      console.log(`✅ DB: Document created successfully:`, {
        id: document.id,
        name: document.name,
        projectId: document.projectId,
        status: document.status,
      })

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
        categoryIds: document.categoryIds,
        primaryCategoryId: document.primaryCategoryId,
        suggestedCategoryIds: document.suggestedCategoryIds,
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
      // First, get the current document to ensure it exists and we have the latest version
      const currentDocument = await this.getDocument(documentId)
      if (!currentDocument) {
        console.error('DB: Document not found for update:', documentId)
        return null
      }

      // Prepare the update data with proper type handling
      const updateData: { id: string; [key: string]: unknown } = {
        id: documentId,
      }

      // Only include fields that are being updated and are not undefined
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.size !== undefined) updateData.size = updates.size
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.s3Key !== undefined) updateData.s3Key = updates.s3Key
      if (updates.s3Url !== undefined) updateData.s3Url = updates.s3Url
      if (updates.thumbnailS3Key !== undefined)
        updateData.thumbnailS3Key = updates.thumbnailS3Key
      if (updates.thumbnailUrl !== undefined)
        updateData.thumbnailUrl = updates.thumbnailUrl
      if (updates.projectId !== undefined)
        updateData.projectId = updates.projectId
      if (updates.mimeType !== undefined) updateData.mimeType = updates.mimeType
      if (updates.content !== undefined) updateData.content = updates.content
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.categoryIds !== undefined)
        updateData.categoryIds = updates.categoryIds
      if (updates.primaryCategoryId !== undefined)
        updateData.primaryCategoryId = updates.primaryCategoryId
      if (updates.suggestedCategoryIds !== undefined)
        updateData.suggestedCategoryIds = updates.suggestedCategoryIds

      // Add updatedAt timestamp
      updateData.updatedAt = new Date().toISOString()

      // Perform the update
      // Temporary workaround for Amplify type generation bug (expecting arrays instead of scalars)
      const { data: document, errors } = await client.models.Document.update(
        updateData as Parameters<typeof client.models.Document.update>[0],
      )

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
        categoryIds: document.categoryIds,
        primaryCategoryId: document.primaryCategoryId,
        suggestedCategoryIds: document.suggestedCategoryIds,
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
      const { errors } = await client.models.Document.delete({
        id: documentId,
      })

      if (errors) {
        console.error('DB: Error deleting document:', errors)
        throw new Error(
          `Database error: ${errors.map(e => e.message).join(', ')}`,
        )
      }
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
      // Check for authorization errors and provide more descriptive messages
      const authError = errors.find(
        error =>
          error.message?.includes('Not Authorized') ||
          error.message?.includes('Unauthorized') ||
          error.errorType === 'Unauthorized',
      )

      if (authError) {
        throw new Error(
          'You do not have authorization to create projects. Please contact your administrator.',
        )
      }

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
