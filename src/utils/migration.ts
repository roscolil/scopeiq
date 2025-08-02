import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { s3ProjectService, s3DocumentService } from '../services/s3-metadata'
import { getCurrentUser } from 'aws-amplify/auth'

/**
 * Migration script to move data from S3 JSON files to Amplify Database
 *
 * This script:
 * 1. Reads existing S3 metadata files
 * 2. Creates corresponding database records
 * 3. Maintains S3 files for file storage (not metadata)
 * 4. Provides rollback functionality
 */

const client = generateClient<Schema>()

export interface MigrationReport {
  projectsMigrated: number
  documentsMigrated: number
  errors: string[]
  success: boolean
}

// Helper to get current company ID (user ID for now)
const getCurrentCompanyId = async (): Promise<string> => {
  try {
    const user = await getCurrentUser()
    return user.userId
  } catch (error) {
    console.error('Error getting current user:', error)
    throw new Error('User not authenticated')
  }
}

export const migrationService = {
  // Migrate all data from S3 to Database
  async migrateFromS3ToDatabase(): Promise<MigrationReport> {
    const report: MigrationReport = {
      projectsMigrated: 0,
      documentsMigrated: 0,
      errors: [],
      success: false,
    }

    try {
      console.log('🚀 Starting migration from S3 to Database...')
      const companyId = await getCurrentCompanyId()

      // First, create or ensure company exists
      try {
        await client.models.Company.create({
          name: 'Default Company', // You can update this later
          description: 'Migrated from S3',
        })
        console.log('✅ Company record created')
      } catch (error) {
        console.log('ℹ️ Company might already exist, continuing...')
      }

      // Get all projects from S3
      console.log('📁 Migrating projects...')
      const s3Projects = await s3ProjectService.getProjects(companyId)
      console.log(`Found ${s3Projects.length} projects in S3`)

      for (const s3Project of s3Projects) {
        try {
          // Check if project already exists in database
          const existingProject = await client.models.Project.get({
            id: s3Project.id,
          })

          if (existingProject.data) {
            console.log(
              `⏭️ Project ${s3Project.name} already exists in database, skipping`,
            )
            continue
          }

          // Create project in database
          const { data: dbProject, errors } =
            await client.models.Project.create({
              id: s3Project.id, // Keep the same ID
              name: s3Project.name,
              description: s3Project.description || '',
              companyId,
              slug: s3Project.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''),
              createdAt: s3Project.createdAt,
            })

          if (errors) {
            report.errors.push(
              `Failed to migrate project ${s3Project.name}: ${errors.map(e => e.message).join(', ')}`,
            )
            continue
          }

          console.log(`✅ Migrated project: ${s3Project.name}`)
          report.projectsMigrated++

          // Now migrate documents for this project
          console.log(`📄 Migrating documents for project ${s3Project.name}...`)
          const s3Documents = await s3DocumentService.getDocumentsByProject(
            companyId,
            s3Project.id,
          )
          console.log(
            `Found ${s3Documents.length} documents for project ${s3Project.name}`,
          )

          for (const s3Document of s3Documents) {
            try {
              // Check if document already exists
              const existingDocument = await client.models.Document.get({
                id: s3Document.id,
              })

              if (existingDocument.data) {
                console.log(
                  `⏭️ Document ${s3Document.name} already exists in database, skipping`,
                )
                continue
              }

              // Generate S3 keys for file storage (files will stay in S3)
              const s3Key = `${companyId}/${s3Project.id}/files/${s3Document.id}_${s3Document.name}`
              const thumbnailS3Key = s3Document.thumbnailUrl
                ? `${companyId}/${s3Project.id}/thumbnails/${s3Document.id}.jpg`
                : undefined

              // Create document in database
              const { data: dbDocument, errors: docErrors } =
                await client.models.Document.create({
                  id: s3Document.id, // Keep the same ID
                  name: s3Document.name,
                  type: s3Document.type,
                  size: parseInt(String(s3Document.size)), // Ensure it's a number
                  status: s3Document.status,
                  s3Key, // Where the actual file is stored
                  s3Url: s3Document.url,
                  thumbnailS3Key,
                  thumbnailUrl: s3Document.thumbnailUrl,
                  projectId: s3Project.id,
                  mimeType: s3Document.type,
                  content: s3Document.content || '',
                  createdAt: s3Document.createdAt,
                })

              if (docErrors) {
                report.errors.push(
                  `Failed to migrate document ${s3Document.name}: ${docErrors.map(e => e.message).join(', ')}`,
                )
                continue
              }

              console.log(`✅ Migrated document: ${s3Document.name}`)
              report.documentsMigrated++
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error)
              report.errors.push(
                `Error migrating document ${s3Document.name}: ${errorMessage}`,
              )
              console.error(
                `❌ Failed to migrate document ${s3Document.name}:`,
                error,
              )
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          report.errors.push(
            `Error migrating project ${s3Project.name}: ${errorMessage}`,
          )
          console.error(
            `❌ Failed to migrate project ${s3Project.name}:`,
            error,
          )
        }
      }

      report.success = report.errors.length === 0
      console.log(
        `🎉 Migration completed! Projects: ${report.projectsMigrated}, Documents: ${report.documentsMigrated}, Errors: ${report.errors.length}`,
      )

      return report
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      report.errors.push(`Migration failed: ${errorMessage}`)
      console.error('❌ Migration failed:', error)
      return report
    }
  },

  // Check migration status
  async checkMigrationStatus(): Promise<{
    s3Projects: number
    s3Documents: number
    dbProjects: number
    dbDocuments: number
    migrationNeeded: boolean
  }> {
    try {
      const companyId = await getCurrentCompanyId()

      // Count S3 records
      const s3Projects = await s3ProjectService.getProjects(companyId)
      let s3DocumentCount = 0
      for (const project of s3Projects) {
        const docs = await s3DocumentService.getDocumentsByProject(
          companyId,
          project.id,
        )
        s3DocumentCount += docs.length
      }

      // Count database records
      const { data: dbProjects } = await client.models.Project.list({
        filter: { companyId: { eq: companyId } },
      })
      const { data: dbDocuments } = await client.models.Document.list()

      const dbProjectCount = dbProjects?.length || 0
      const dbDocumentCount = dbDocuments?.length || 0

      return {
        s3Projects: s3Projects.length,
        s3Documents: s3DocumentCount,
        dbProjects: dbProjectCount,
        dbDocuments: dbDocumentCount,
        migrationNeeded:
          s3Projects.length > dbProjectCount ||
          s3DocumentCount > dbDocumentCount,
      }
    } catch (error) {
      console.error('Error checking migration status:', error)
      throw error
    }
  },

  // Rollback migration (delete database records, keep S3)
  async rollbackMigration(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Rolling back migration...')
      const companyId = await getCurrentCompanyId()

      // Delete all documents first (due to foreign key constraints)
      const { data: documents } = await client.models.Document.list()
      if (documents) {
        for (const doc of documents) {
          await client.models.Document.delete({ id: doc.id })
        }
        console.log(`🗑️ Deleted ${documents.length} documents from database`)
      }

      // Delete all projects
      const { data: projects } = await client.models.Project.list({
        filter: { companyId: { eq: companyId } },
      })
      if (projects) {
        for (const project of projects) {
          await client.models.Project.delete({ id: project.id })
        }
        console.log(`🗑️ Deleted ${projects.length} projects from database`)
      }

      console.log('✅ Rollback completed successfully')
      return { success: true }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('❌ Rollback failed:', error)
      return { success: false, error: errorMessage }
    }
  },
}
