/**
 * Data Structure Verification Utility
 * This utility helps verify and inspect the S3 and DynamoDB data hierarchy
 */

import {
  getS3BucketName,
  getAWSRegion,
  getAWSCredentialsSafe,
} from './aws-config'
import {
  s3DocumentService,
  s3ProjectService,
  S3Document,
} from '../services/s3-metadata'
import { databaseDocumentService } from '../services/database'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

// Initialize S3 client for direct inspection
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

export interface DataStructureReport {
  s3Bucket: {
    name: string
    region: string
    structure: S3BucketStructure
    totalObjects: number
  }
  dynamodb: {
    tables: string[]
    documentCount: number
    projectCount: number
  }
  hierarchy: {
    expectedS3Structure: string
    actualS3Objects: string[]
    companies: CompanyStructure[]
  }
}

export interface S3BucketStructure {
  companies: string[]
  projects: Record<string, string[]> // companyId -> projectIds
  documents: Record<string, string[]> // projectId -> documentIds
  files: Record<string, string[]> // projectId -> file keys
}

export interface CompanyStructure {
  companyId: string
  projects: ProjectStructure[]
}

export interface ProjectStructure {
  projectId: string
  s3MetadataExists: boolean
  documentsCount: number
  filesCount: number
  documentMetadata: S3Document[]
  fileKeys: string[]
}

/**
 * Verify and analyze the complete data structure
 */
export const verifyDataStructure = async (
  companyId?: string,
): Promise<DataStructureReport> => {
  console.log('🔍 Starting data structure verification...')

  try {
    // 1. Analyze S3 bucket structure
    const s3Structure = await analyzeS3Structure()

    // 2. Get DynamoDB counts (if available)
    const dynamoInfo = await analyzeDynamoDBStructure()

    // 3. Analyze specific company if provided
    const companyStructures = companyId
      ? [await analyzeCompanyStructure(companyId)]
      : await analyzeAllCompanies(s3Structure)

    const report: DataStructureReport = {
      s3Bucket: {
        name: BUCKET_NAME,
        region: awsRegion,
        structure: s3Structure,
        totalObjects:
          s3Structure.companies.length +
          Object.values(s3Structure.projects).flat().length +
          Object.values(s3Structure.documents).flat().length +
          Object.values(s3Structure.files).flat().length,
      },
      dynamodb: dynamoInfo,
      hierarchy: {
        expectedS3Structure: getExpectedS3Structure(),
        actualS3Objects: await listAllS3Objects(),
        companies: companyStructures,
      },
    }

    console.log('✅ Data structure verification complete')
    return report
  } catch (error) {
    console.error('❌ Error during data structure verification:', error)
    throw error
  }
}

/**
 * Analyze S3 bucket structure
 */
const analyzeS3Structure = async (): Promise<S3BucketStructure> => {
  const structure: S3BucketStructure = {
    companies: [],
    projects: {},
    documents: {},
    files: {},
  }

  try {
    // List all objects in the bucket
    const allObjects = await listAllS3Objects()

    console.log(`📊 Found ${allObjects.length} objects in S3 bucket`)

    for (const key of allObjects) {
      const pathParts = key.split('/')

      if (pathParts.length >= 2) {
        const companyId = pathParts[0]

        // Track companies
        if (!structure.companies.includes(companyId)) {
          structure.companies.push(companyId)
        }

        if (pathParts[1] === 'projects' && pathParts.length >= 3) {
          // Project metadata: companyId/projects/projectId.json
          const projectId = pathParts[2].replace('.json', '')
          if (!structure.projects[companyId]) {
            structure.projects[companyId] = []
          }
          if (!structure.projects[companyId].includes(projectId)) {
            structure.projects[companyId].push(projectId)
          }
        } else if (pathParts.length >= 4 && pathParts[2] === 'documents') {
          // Document metadata: companyId/projectId/documents/documentId.json
          const projectId = pathParts[1]
          const documentId = pathParts[3].replace('.json', '')

          if (!structure.documents[projectId]) {
            structure.documents[projectId] = []
          }
          if (!structure.documents[projectId].includes(documentId)) {
            structure.documents[projectId].push(documentId)
          }
        } else if (pathParts.length >= 4 && pathParts[2] === 'files') {
          // Actual files: companyId/projectId/files/filename
          const projectId = pathParts[1]

          if (!structure.files[projectId]) {
            structure.files[projectId] = []
          }
          structure.files[projectId].push(key)
        }
      }
    }

    return structure
  } catch (error) {
    console.error('Error analyzing S3 structure:', error)
    throw error
  }
}

/**
 * List all objects in the S3 bucket
 */
const listAllS3Objects = async (): Promise<string[]> => {
  const objects: string[] = []
  let continuationToken: string | undefined

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const response = await s3Client.send(command)

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            objects.push(obj.Key)
          }
        }
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    return objects
  } catch (error) {
    console.error('Error listing S3 objects:', error)
    return []
  }
}

/**
 * Analyze DynamoDB structure (basic info)
 */
const analyzeDynamoDBStructure = async () => {
  try {
    // Since we can't directly query table info without more setup,
    // we'll just return what we know from the schema
    return {
      tables: ['Company', 'Project', 'Document', 'UserCompany'],
      documentCount: 0, // Would need to query to get actual count
      projectCount: 0, // Would need to query to get actual count
    }
  } catch (error) {
    console.error('Error analyzing DynamoDB structure:', error)
    return {
      tables: [],
      documentCount: 0,
      projectCount: 0,
    }
  }
}

/**
 * Analyze structure for a specific company
 */
const analyzeCompanyStructure = async (
  companyId: string,
): Promise<CompanyStructure> => {
  console.log(`🏢 Analyzing structure for company: ${companyId}`)

  try {
    // Get all projects for this company
    const projects = await s3ProjectService.getProjects(companyId)

    const projectStructures: ProjectStructure[] = []

    for (const project of projects) {
      const projectStructure = await analyzeProjectStructure(
        companyId,
        project.id,
      )
      projectStructures.push(projectStructure)
    }

    return {
      companyId,
      projects: projectStructures,
    }
  } catch (error) {
    console.error(`Error analyzing company ${companyId}:`, error)
    return {
      companyId,
      projects: [],
    }
  }
}

/**
 * Analyze structure for all companies
 */
const analyzeAllCompanies = async (
  s3Structure: S3BucketStructure,
): Promise<CompanyStructure[]> => {
  const companyStructures: CompanyStructure[] = []

  for (const companyId of s3Structure.companies) {
    const companyStructure = await analyzeCompanyStructure(companyId)
    companyStructures.push(companyStructure)
  }

  return companyStructures
}

/**
 * Analyze structure for a specific project
 */
const analyzeProjectStructure = async (
  companyId: string,
  projectId: string,
): Promise<ProjectStructure> => {
  console.log(`📁 Analyzing project: ${companyId}/${projectId}`)

  try {
    // Check if project metadata exists in S3
    let s3MetadataExists = false
    try {
      await s3ProjectService.getProject(companyId, projectId)
      s3MetadataExists = true
    } catch (error) {
      s3MetadataExists = false
    }

    // Get documents metadata
    let documentMetadata: S3Document[] = []
    try {
      documentMetadata = await s3DocumentService.getDocumentsByProject(
        companyId,
        projectId,
      )
    } catch (error) {
      console.log(`No documents found for project ${projectId}`)
    }

    // Get file keys by listing S3 objects with project prefix
    const filePrefix = `${companyId}/${projectId}/files/`
    const fileKeys = await listS3ObjectsWithPrefix(filePrefix)

    return {
      projectId,
      s3MetadataExists,
      documentsCount: documentMetadata.length,
      filesCount: fileKeys.length,
      documentMetadata,
      fileKeys,
    }
  } catch (error) {
    console.error(`Error analyzing project ${projectId}:`, error)
    return {
      projectId,
      s3MetadataExists: false,
      documentsCount: 0,
      filesCount: 0,
      documentMetadata: [],
      fileKeys: [],
    }
  }
}

/**
 * List S3 objects with a specific prefix
 */
const listS3ObjectsWithPrefix = async (prefix: string): Promise<string[]> => {
  const objects: string[] = []

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
    })

    const response = await s3Client.send(command)

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push(obj.Key)
        }
      }
    }

    return objects
  } catch (error) {
    console.error(`Error listing S3 objects with prefix ${prefix}:`, error)
    return []
  }
}

/**
 * Get the expected S3 structure documentation
 */
const getExpectedS3Structure = (): string => {
  return `
Expected S3 Bucket Hierarchy:

{companyId}/
├── projects/
│   ├── {projectId}.json           # Project metadata
│   └── {projectId2}.json
├── {projectId}/
│   ├── documents/
│   │   ├── {documentId}.json      # Document metadata
│   │   └── {documentId2}.json
│   └── files/
│       ├── {timestamp}_{filename} # Actual uploaded files
│       └── {timestamp}_{filename2}
└── {projectId2}/
    ├── documents/
    └── files/

Example:
company123/
├── projects/
│   ├── proj_1234.json
│   └── proj_5678.json
├── proj_1234/
│   ├── documents/
│   │   ├── doc_abc.json
│   │   └── doc_def.json
│   └── files/
│       ├── 1625097600000_report.pdf
│       └── 1625097700000_image.png
└── proj_5678/
    ├── documents/
    └── files/
  `.trim()
}

/**
 * Print a formatted report to console
 */
export const printDataStructureReport = (report: DataStructureReport): void => {
  console.log('\n' + '='.repeat(80))
  console.log('📊 DATA STRUCTURE VERIFICATION REPORT')
  console.log('='.repeat(80))

  console.log('\n🗄️ S3 BUCKET INFORMATION:')
  console.log(`   Name: ${report.s3Bucket.name}`)
  console.log(`   Region: ${report.s3Bucket.region}`)
  console.log(`   Total Objects: ${report.s3Bucket.totalObjects}`)
  console.log(`   Companies: ${report.s3Bucket.structure.companies.length}`)

  console.log('\n🏢 COMPANIES FOUND:')
  report.s3Bucket.structure.companies.forEach((company, i) => {
    console.log(`   ${i + 1}. ${company}`)
  })

  console.log('\n📁 PROJECT DISTRIBUTION:')
  Object.entries(report.s3Bucket.structure.projects).forEach(
    ([company, projects]) => {
      console.log(`   ${company}: ${projects.length} projects`)
      projects.forEach(project => {
        console.log(`      - ${project}`)
      })
    },
  )

  console.log('\n📄 DOCUMENT DISTRIBUTION:')
  Object.entries(report.s3Bucket.structure.documents).forEach(
    ([project, docs]) => {
      console.log(`   ${project}: ${docs.length} documents`)
    },
  )

  console.log('\n📎 FILE DISTRIBUTION:')
  Object.entries(report.s3Bucket.structure.files).forEach(
    ([project, files]) => {
      console.log(`   ${project}: ${files.length} files`)
    },
  )

  console.log('\n🗂️ DETAILED COMPANY ANALYSIS:')
  report.hierarchy.companies.forEach((company, i) => {
    console.log(`\n   ${i + 1}. Company: ${company.companyId}`)
    console.log(`      Projects: ${company.projects.length}`)

    company.projects.forEach((project, j) => {
      console.log(`      ${j + 1}. Project: ${project.projectId}`)
      console.log(
        `         S3 Metadata: ${project.s3MetadataExists ? '✅' : '❌'}`,
      )
      console.log(`         Documents: ${project.documentsCount}`)
      console.log(`         Files: ${project.filesCount}`)

      if (project.fileKeys.length > 0) {
        console.log(`         File Examples:`)
        project.fileKeys.slice(0, 3).forEach(key => {
          console.log(`           - ${key}`)
        })
        if (project.fileKeys.length > 3) {
          console.log(`           ... and ${project.fileKeys.length - 3} more`)
        }
      }
    })
  })

  console.log('\n📋 EXPECTED STRUCTURE:')
  console.log(report.hierarchy.expectedS3Structure)

  console.log('\n' + '='.repeat(80))
  console.log('✅ REPORT COMPLETE')
  console.log('='.repeat(80) + '\n')
}

/**
 * Quick verification function for console testing
 */
export const quickVerify = async (companyId?: string): Promise<void> => {
  try {
    const report = await verifyDataStructure(companyId)
    printDataStructureReport(report)
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}
