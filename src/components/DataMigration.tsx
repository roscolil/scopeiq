import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Database,
  Cloud,
  FileText,
  Users,
  Folder,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { projectService } from '@/services/s3-api'
import { s3ProjectService, s3DocumentService } from '@/services/s3-metadata'
import { databaseService } from '@/services/database-simple'
import { Project } from '@/types'

interface MigrationStats {
  total: number
  migrated: number
  errors: number
  skipped: number
}

interface MigrationResult {
  success: boolean
  id: string
  name: string
  error?: string
  skipped?: boolean
  reason?: string
}

export const DataMigration: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [s3Projects, setS3Projects] = useState<Project[]>([])
  const [dbProjects, setDbProjects] = useState<
    Array<{
      id: string
      name: string
      description?: string
      createdAt: string
      updatedAt?: string
    }>
  >([])
  const [allS3Companies, setAllS3Companies] = useState<string[]>([])
  const [detailedScanResults, setDetailedScanResults] = useState<{
    companies: string[]
    projectsByCompany: Record<string, number>
    totalProjects: number
  } | null>(null)
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>(
    [],
  )
  const [currentStep, setCurrentStep] = useState<
    'scan' | 'ready' | 'migrating' | 'complete'
  >('scan')
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<MigrationStats>({
    total: 0,
    migrated: 0,
    errors: 0,
    skipped: 0,
  })

  // Scan existing data across all companies
  const scanData = async () => {
    setIsScanning(true)
    try {
      console.log('Migration: Starting comprehensive S3 scan...')

      // Get all S3 projects across all companies
      const allS3Projects: Project[] = []
      const companiesFound: string[] = []
      const projectsByCompany: Record<string, number> = {}

      // Try to discover companies by scanning S3 bucket structure
      // The S3 structure is: companies/{companyId}/projects/{projectId}.json
      try {
        // Use the s3ProjectService to scan for all companies
        const allCompanies = await s3ProjectService.getAllCompanies() // We'll need to add this method
        console.log('Migration: Found companies in S3:', allCompanies)

        for (const companyId of allCompanies) {
          try {
            const companyProjects =
              await s3ProjectService.getProjects(companyId)
            console.log(
              `Migration: Company ${companyId} has ${companyProjects.length} projects`,
            )

            companiesFound.push(companyId)
            projectsByCompany[companyId] = companyProjects.length

            // Get documents for each project
            for (const project of companyProjects) {
              const documents = await s3DocumentService.getDocumentsByProject(
                companyId,
                project.id,
              )

              // Transform to our Project type
              const transformedProject: Project = {
                id: project.id,
                name: project.name,
                description: project.description || '',
                createdAt: project.createdAt,
                updatedAt: project.updatedAt || project.createdAt,
                documents: documents.map(doc => ({
                  id: doc.id,
                  name: doc.name,
                  key: `${companyId}/${project.id}/${doc.id}`,
                  size: doc.size,
                  type: doc.type,
                  uploadedAt: doc.createdAt,
                  projectId: doc.projectId,
                })),
                address: '', // S3 projects may not have these fields
                companyId: companyId,
                streetNumber: '',
                streetName: '',
                suburb: '',
                state: '',
                postcode: '',
              }

              allS3Projects.push(transformedProject)
            }
          } catch (companyError) {
            console.warn(
              `Migration: Error scanning company ${companyId}:`,
              companyError,
            )
          }
        }
      } catch (scanError) {
        console.error('Migration: Error scanning S3 structure:', scanError)

        // Fallback: try the current approach with known companies
        const fallbackCompanies = ['default-company', 'test-company'] // Add known company IDs
        for (const companyId of fallbackCompanies) {
          try {
            const companyProjects =
              await s3ProjectService.getProjects(companyId)
            if (companyProjects.length > 0) {
              companiesFound.push(companyId)
              projectsByCompany[companyId] = companyProjects.length
              // Add projects to allS3Projects (similar logic as above)
            }
          } catch (error) {
            console.log(`Migration: No projects found for ${companyId}`)
          }
        }
      }

      console.log('Migration: Total S3 projects found:', allS3Projects.length)
      setS3Projects(allS3Projects)
      setAllS3Companies(companiesFound)
      setDetailedScanResults({
        companies: companiesFound,
        projectsByCompany,
        totalProjects: allS3Projects.length,
      })

      // Get existing database projects
      const dbData = await databaseService.getProjects()
      console.log('Migration: Found database projects:', dbData)
      setDbProjects(dbData || [])

      setCurrentStep('ready')
    } catch (error) {
      console.error('Migration: Error scanning data:', error)
    } finally {
      setIsScanning(false)
    }
  }

  // Check if a project already exists in database
  const projectExistsInDb = (s3Project: Project): boolean => {
    return dbProjects.some(
      dbProject =>
        dbProject.name === s3Project.name || dbProject.id === s3Project.id,
    )
  }

  // Migrate a single project
  const migrateProject = async (
    s3Project: Project,
  ): Promise<MigrationResult> => {
    try {
      // Check if project already exists
      if (projectExistsInDb(s3Project)) {
        return {
          success: false,
          id: s3Project.id,
          name: s3Project.name,
          skipped: true,
          reason: 'Project already exists in database',
        }
      }

      // Create project in database
      const dbProject = await databaseService.createProject({
        name: s3Project.name,
        description: s3Project.description || '',
        // Map additional fields as needed
        streetNumber: s3Project.streetNumber || '',
        streetName: s3Project.streetName || '',
        suburb: s3Project.suburb || '',
        state: s3Project.state || '',
        postcode: s3Project.postcode || '',
        address: s3Project.address || '',
      })

      // Migrate documents if any
      let documentCount = 0
      if (s3Project.documents && s3Project.documents.length > 0) {
        for (const doc of s3Project.documents) {
          try {
            await databaseService.createDocument({
              projectId: dbProject.id,
              fileName: doc.name || doc.key || 'Unknown',
              fileKey: doc.key || '',
              fileSize: doc.size || 0,
              fileType: doc.type || 'application/octet-stream',
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
            })
            documentCount++
          } catch (docError) {
            console.warn(`Failed to migrate document ${doc.name}:`, docError)
          }
        }
      }

      return {
        success: true,
        id: s3Project.id,
        name: s3Project.name,
        reason: `Migrated with ${documentCount} documents`,
      }
    } catch (error) {
      console.error(`Migration error for project ${s3Project.name}:`, error)
      return {
        success: false,
        id: s3Project.id,
        name: s3Project.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Run full migration
  const runMigration = async () => {
    setIsMigrating(true)
    setCurrentStep('migrating')
    setProgress(0)
    setMigrationResults([])

    const results: MigrationResult[] = []
    const newStats: MigrationStats = {
      total: s3Projects.length,
      migrated: 0,
      errors: 0,
      skipped: 0,
    }

    for (let i = 0; i < s3Projects.length; i++) {
      const project = s3Projects[i]
      const result = await migrateProject(project)
      results.push(result)

      if (result.success) {
        newStats.migrated++
      } else if (result.skipped) {
        newStats.skipped++
      } else {
        newStats.errors++
      }

      setProgress(((i + 1) / s3Projects.length) * 100)
      setMigrationResults([...results])
      setStats({ ...newStats })
    }

    setCurrentStep('complete')
    setIsMigrating(false)
  }

  // Initial scan on component mount
  useEffect(() => {
    scanData()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Data Migration: S3 → Database
          </CardTitle>
          <CardDescription>
            Migrate your existing projects and documents from S3 metadata to the
            new hybrid database model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Cloud className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">S3 Projects</h3>
                  <p className="text-2xl font-bold">{s3Projects.length}</p>
                  <p className="text-sm text-gray-400">
                    {s3Projects.reduce(
                      (sum, p) => sum + (p.documents?.length || 0),
                      0,
                    )}{' '}
                    documents
                  </p>
                  {detailedScanResults && (
                    <p className="text-xs text-gray-400 mt-1">
                      Across {detailedScanResults.companies.length} companies
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">Database Projects</h3>
                  <p className="text-2xl font-bold">{dbProjects.length}</p>
                  <p className="text-sm text-gray-400">Already migrated</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Scan Results */}
          {detailedScanResults && detailedScanResults.companies.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-2">📊 S3 Scan Details</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Found projects in {detailedScanResults.companies.length}{' '}
                  companies:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {detailedScanResults.companies.map(company => (
                    <div
                      key={company}
                      className="flex justify-between p-2 bg-muted rounded text-sm"
                    >
                      <span className="font-medium">{company}</span>
                      <Badge variant="outline">
                        {detailedScanResults.projectsByCompany[company]}{' '}
                        projects
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* No Projects Found Alert */}
          {currentStep === 'ready' && s3Projects.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>No S3 projects found.</strong> This could mean:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>You don't have any projects in S3 yet</li>
                  <li>Your S3 bucket configuration might be incorrect</li>
                  <li>Projects are stored under different company IDs</li>
                </ul>
                <div className="mt-3 p-2 bg-muted rounded text-xs">
                  <strong>Debug Info:</strong>
                  <br />
                  Current URL: {window.location.pathname}
                  <br />
                  Expected S3 structure: bucket/company-id/projects/project.json
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Migration Controls */}
          {currentStep === 'scan' && (
            <div className="text-center">
              <Button onClick={scanData} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rescan Data
                  </>
                )}
              </Button>
            </div>
          )}

          {currentStep === 'ready' && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to migrate {s3Projects.length} projects from S3 to
                  database.
                  {dbProjects.length > 0 && (
                    <>
                      {' '}
                      Existing database projects will be skipped to avoid
                      duplicates.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={runMigration}
                  disabled={s3Projects.length === 0}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Migration
                </Button>
                <Button variant="outline" onClick={scanData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rescan
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'migrating' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Migration Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {stats.migrated}
                  </div>
                  <div className="text-sm text-gray-400">Migrated</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">
                    {stats.skipped}
                  </div>
                  <div className="text-sm text-gray-400">Skipped</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {stats.errors}
                  </div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Migration completed! {stats.migrated} projects migrated
                  successfully.
                  {stats.errors > 0 && ` ${stats.errors} errors occurred.`}
                  {stats.skipped > 0 &&
                    ` ${stats.skipped} projects were skipped.`}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 justify-center">
                <Button onClick={scanData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan Again
                </Button>
              </div>
            </div>
          )}

          {/* Migration Results */}
          {migrationResults.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <h3 className="font-semibold">Migration Results</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {migrationResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : result.skipped ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.success && (
                        <Badge variant="secondary" className="bg-green-100">
                          Success
                        </Badge>
                      )}
                      {result.skipped && (
                        <Badge variant="secondary" className="bg-yellow-100">
                          Skipped
                        </Badge>
                      )}
                      {result.error && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {currentStep === 'complete' && stats.migrated > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Migration Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                Your data has been successfully migrated to the hybrid model.
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>
                  Update your Projects page to use the database service instead
                  of S3
                </li>
                <li>Test the new database-backed functionality</li>
                <li>
                  Consider keeping S3 as file storage while using database for
                  metadata
                </li>
                <li>
                  You can safely switch to database-only operations once
                  verified
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
