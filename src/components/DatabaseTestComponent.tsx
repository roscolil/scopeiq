import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import testDatabase from '@/utils/test-database'
import { databaseService } from '@/services/database-simple'
import { getDatabaseInfo, inspectDatabaseTables } from '@/utils/database-info'

export const DatabaseTestComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [projectName, setProjectName] = useState('Test Project')
  const [projectDescription, setProjectDescription] = useState(
    'Created from database test',
  )
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string; description?: string }>
  >([])
  const [showDatabaseInfo, setShowDatabaseInfo] = useState(false)
  const [databaseInfo, setDatabaseInfo] = useState<object | null>(null)

  const inspectDatabase = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Inspecting database location and tables...')

      const info = await inspectDatabaseTables()
      setDatabaseInfo(info)
      setShowDatabaseInfo(true)

      console.log('Database inspection complete:', info)
    } catch (error) {
      console.error('Failed to inspect database:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runDatabaseTest = async () => {
    setIsLoading(true)
    setTestResults([])

    // Capture console logs
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    const logs: string[] = []

    console.log = (...args) => {
      logs.push(`LOG: ${args.join(' ')}`)
      originalLog(...args)
    }

    console.error = (...args) => {
      logs.push(`ERROR: ${args.join(' ')}`)
      originalError(...args)
    }

    console.warn = (...args) => {
      logs.push(`WARN: ${args.join(' ')}`)
      originalWarn(...args)
    }

    try {
      const result = await testDatabase()
      setIsConnected(result)

      // Also load existing projects
      if (result) {
        await loadProjects()
      }
    } catch (error) {
      setIsConnected(false)
      logs.push(`FATAL: ${error}`)
    } finally {
      // Restore console
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn

      setTestResults(logs)
      setIsLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const projectList = await databaseService.getProjects()
      setProjects(projectList)
      console.log(`Loaded ${projectList.length} projects from database`)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const createTestProject = async () => {
    try {
      setIsLoading(true)
      console.log('Creating test project...')

      const newProject = await databaseService.createProject({
        name: projectName,
        description: projectDescription,
      })

      if (newProject) {
        console.log('✅ Project created successfully:', newProject)
        await loadProjects() // Refresh the list
        setProjectName('') // Clear the form
        setProjectDescription('')
      } else {
        console.error('❌ Failed to create project')
      }
    } catch (error) {
      console.error('❌ Error creating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run test on component mount
    runDatabaseTest()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Database Connection Test
          {isConnected !== null && (
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Failed'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Testing the enhanced Amplify database schema deployment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button
            onClick={runDatabaseTest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Run Database Test'}
          </Button>

          <Button
            onClick={inspectDatabase}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Inspecting...' : 'Show Database Location'}
          </Button>
        </div>

        {/* Database Location Info */}
        {showDatabaseInfo && databaseInfo && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-200 text-lg">
                🗄️ Database Location in AWS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold mb-2">📍 Quick Access Links:</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Region:</strong> ap-southeast-2 (Sydney)
                    </div>
                    <div>
                      <a
                        href="https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        🚀 Amplify Console
                      </a>
                    </div>
                    <div>
                      <a
                        href="https://ap-southeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-southeast-2#tables"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        🗄️ DynamoDB Tables
                      </a>
                    </div>
                    <div>
                      <a
                        href="https://ap-southeast-2.console.aws.amazon.com/appsync/home?region=ap-southeast-2#/apis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        🔗 GraphQL API (AppSync)
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">
                    📋 How to Find Your Tables:
                  </h5>
                  <div className="text-sm space-y-1">
                    <div>1. Click "DynamoDB Tables" link above</div>
                    <div>2. Look for tables with these prefixes:</div>
                    <div className="ml-4">
                      <div>
                        • <code>Company-</code>
                      </div>
                      <div>
                        • <code>Project-</code>
                      </div>
                      <div>
                        • <code>Document-</code>
                      </div>
                      <div>
                        • <code>UserCompany-</code>
                      </div>
                    </div>
                    <div>3. Table names have random suffixes</div>
                    <div>4. Click on any table to see its data</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <h6 className="font-semibold mb-2">
                  📊 Database Connection Details:
                </h6>
                <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div>
                    <strong>GraphQL Endpoint:</strong>
                  </div>
                  <div className="break-all text-xs">
                    https://pbpthii7t5gxhlywgog7cpoamy.appsync-api.ap-southeast-2.amazonaws.com/graphql
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Test Results:</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono mb-1 ${
                    result.startsWith('ERROR:') || result.startsWith('FATAL:')
                      ? 'text-red-600 dark:text-red-400'
                      : result.startsWith('WARN:')
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : result.includes('✅')
                          ? 'text-green-600 dark:text-green-400'
                          : result.includes('❌')
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {isConnected === true && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                ✅ Database Successfully Connected!
              </h4>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Your enhanced Amplify schema is deployed and working. You can
                now:
              </p>
              <ul className="list-disc list-inside text-green-700 dark:text-green-300 text-sm mt-2 space-y-1">
                <li>Create and manage companies</li>
                <li>Create projects with proper relationships</li>
                <li>Store document metadata in the database</li>
                <li>Use fast queries with secondary indexes</li>
                <li>Start migrating from S3 metadata to database</li>
              </ul>
            </div>

            {/* Interactive Database Testing */}
            <Card>
              <CardHeader>
                <CardTitle>Test Database Operations</CardTitle>
                <CardDescription>
                  Try creating projects and testing database functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Description</Label>
                    <Input
                      id="projectDescription"
                      value={projectDescription}
                      onChange={e => setProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </div>
                </div>

                <Button
                  onClick={createTestProject}
                  disabled={isLoading || !projectName.trim()}
                  className="w-full"
                >
                  {isLoading ? 'Creating...' : 'Create Test Project'}
                </Button>

                {/* Display existing projects */}
                {projects.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold">
                      Existing Projects ({projects.length}):
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {projects.map(project => (
                        <div
                          key={project.id}
                          className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
                        >
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {project.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            ID: {project.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isConnected === false && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              ❌ Database Connection Failed
            </h4>
            <p className="text-red-700 dark:text-red-300 text-sm">
              There was an issue connecting to the database. Check the test
              results above for details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DatabaseTestComponent
