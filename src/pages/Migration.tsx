import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { DataMigration } from '@/components/DataMigration'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Database,
  Cloud,
  ArrowRight,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { hybridProjectService } from '@/services/hybrid-projects'

const Migration: React.FC = () => {
  const [connectivity, setConnectivity] = useState<{
    database: { connected: boolean; error: string | null }
    s3: { connected: boolean; error: string | null }
  } | null>(null)
  const [currentMode, setCurrentMode] = useState<'database' | 's3'>('database')
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false)

  // Test connectivity on load
  const testConnectivity = async () => {
    setIsTestingConnectivity(true)
    try {
      const results = await hybridProjectService.testConnectivity()
      setConnectivity(results)
      setCurrentMode(hybridProjectService.getCurrentMode())
    } catch (error) {
      console.error('Error testing connectivity:', error)
    } finally {
      setIsTestingConnectivity(false)
    }
  }

  useEffect(() => {
    testConnectivity()
  }, [])

  const handleModeSwitch = (mode: 'database' | 's3') => {
    hybridProjectService.setMode(mode === 'database')
    setCurrentMode(mode)
  }

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid gradient background layers with more variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-slate-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/6 to-violet-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text mb-4">
              Data Migration Center
            </h1>
            <p className="text-slate-200">
              Migrate your data from S3 metadata to the hybrid database model
            </p>
          </div>

          {/* Connectivity Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Check connectivity to both S3 and database systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Current Mode:</span>
                <Badge
                  variant={currentMode === 'database' ? 'default' : 'secondary'}
                >
                  {currentMode === 'database' ? 'Database' : 'S3'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-6 w-6 text-blue-500" />
                      <div>
                        <h4 className="font-semibold">Database</h4>
                        <p className="text-sm text-gray-400">
                          DynamoDB + GraphQL
                        </p>
                      </div>
                    </div>
                    {connectivity ? (
                      connectivity.database.connected ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    )}
                  </div>
                  {connectivity?.database.error && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {connectivity.database.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cloud className="h-6 w-6 text-blue-500" />
                      <div>
                        <h4 className="font-semibold">S3 Storage</h4>
                        <p className="text-sm text-gray-400">
                          Current metadata
                        </p>
                      </div>
                    </div>
                    {connectivity ? (
                      connectivity.s3.connected ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    )}
                  </div>
                  {connectivity?.s3.error && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {connectivity.s3.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={testConnectivity}
                  disabled={isTestingConnectivity}
                >
                  {isTestingConnectivity ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Connectivity
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mode Switching */}
          <Card>
            <CardHeader>
              <CardTitle>Service Mode</CardTitle>
              <CardDescription>
                Switch between database and S3 mode for your Projects page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-center">
                <Button
                  variant={currentMode === 'database' ? 'default' : 'outline'}
                  onClick={() => handleModeSwitch('database')}
                  disabled={!connectivity?.database.connected}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Use Database
                </Button>
                <Button
                  variant={currentMode === 's3' ? 'default' : 'outline'}
                  onClick={() => handleModeSwitch('s3')}
                  disabled={!connectivity?.s3.connected}
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Use S3
                </Button>
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                This affects how your Projects page loads and saves data
              </p>
            </CardContent>
          </Card>

          {/* Migration Interface */}
          <DataMigration />

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Migration Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Follow these steps to complete your migration:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>Test Connectivity:</strong> Ensure both systems are
                  accessible
                </li>
                <li>
                  <strong>Run Migration:</strong> Use the migration tool above
                  to transfer your S3 data
                </li>
                <li>
                  <strong>Switch Mode:</strong> Set your Projects page to use
                  Database mode
                </li>
                <li>
                  <strong>Verify Data:</strong> Check that your projects appear
                  correctly
                </li>
                <li>
                  <strong>Update Code:</strong> Replace S3 service calls with
                  hybrid service in your Projects.tsx
                </li>
              </ol>

              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Code Update Required:</strong> After migration, update
                  your Projects.tsx to use
                  <code className="mx-1 px-1 bg-muted rounded">
                    hybridProjectService
                  </code>{' '}
                  instead of
                  <code className="mx-1 px-1 bg-muted rounded">
                    projectService
                  </code>{' '}
                  for full database functionality.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default Migration
