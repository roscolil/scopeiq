import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  verifyDataStructure,
  printDataStructureReport,
  DataStructureReport,
} from '@/utils/data-structure-verification'
import {
  Database,
  FileText,
  Folder,
  Building,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

export const DataStructureDebugger: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(false)
  const [report, setReport] = useState<DataStructureReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState('')

  const runVerification = async () => {
    setIsVerifying(true)
    setError(null)
    setReport(null)

    try {
      console.log('🔍 Starting data structure verification...')
      const verificationReport = await verifyDataStructure(
        companyId || undefined,
      )

      // Print to console as well
      printDataStructureReport(verificationReport)

      setReport(verificationReport)
      console.log('✅ Verification completed successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      console.error('❌ Verification failed:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  const renderS3BucketInfo = () => {
    if (!report) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            S3 Bucket Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Bucket Name</Label>
              <p className="text-sm text-muted-foreground">
                {report.s3Bucket.name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Region</Label>
              <p className="text-sm text-muted-foreground">
                {report.s3Bucket.region}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Total Objects</Label>
              <p className="text-sm text-muted-foreground">
                {report.s3Bucket.totalObjects}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Companies</Label>
              <p className="text-sm text-muted-foreground">
                {report.s3Bucket.structure.companies.length}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Companies Found</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {report.s3Bucket.structure.companies.map((company, i) => (
                <Badge key={i} variant="secondary">
                  {company}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderHierarchyAnalysis = () => {
    if (!report) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Data Hierarchy Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.hierarchy.companies.map((company, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4" />
                <h4 className="font-medium">{company.companyId}</h4>
                <Badge variant="outline">
                  {company.projects.length} projects
                </Badge>
              </div>

              {company.projects.map((project, j) => (
                <div
                  key={j}
                  className="ml-6 border-l-2 border-gray-200 pl-4 mb-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      {project.projectId}
                    </span>
                    {project.s3MetadataExists ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <FileText className="h-3 w-3 inline mr-1" />
                      {project.documentsCount} documents
                    </div>
                    <div>📎 {project.filesCount} files</div>
                    <div>
                      {project.s3MetadataExists
                        ? '✅ Metadata OK'
                        : '❌ No Metadata'}
                    </div>
                  </div>

                  {project.fileKeys.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-xs">Recent Files:</Label>
                      <div className="text-xs text-muted-foreground">
                        {project.fileKeys.slice(0, 2).map((key, k) => (
                          <div key={k} className="truncate">
                            📄 {key.split('/').pop()}
                          </div>
                        ))}
                        {project.fileKeys.length > 2 && (
                          <div>... and {project.fileKeys.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderExpectedStructure = () => {
    if (!report) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle>Expected S3 Structure</CardTitle>
          <CardDescription>
            This shows the expected hierarchy for files and metadata in S3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={report.hierarchy.expectedS3Structure}
            readOnly
            className="h-64 font-mono text-xs"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Structure Debugger</h1>
          <p className="text-muted-foreground">
            Verify and inspect S3 and DynamoDB data hierarchy
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Controls</CardTitle>
          <CardDescription>
            Run verification to analyze the current data structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyId">Company ID (optional)</Label>
            <Input
              id="companyId"
              placeholder="Leave empty to analyze all companies"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            />
          </div>

          <Button
            onClick={runVerification}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Run Data Structure Verification'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Verification Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">
              {error}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-6">
          {renderS3BucketInfo()}
          {renderHierarchyAnalysis()}
          {renderExpectedStructure()}
        </div>
      )}
    </div>
  )
}

export default DataStructureDebugger
