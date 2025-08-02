import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Database,
  Cloud,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getAWSConfigDebugInfo } from '../utils/aws-config'

export const S3ConfigDebugger: React.FC = () => {
  const [showConfig, setShowConfig] = useState(false)
  const [bucketName, setBucketName] = useState<string>('')
  const [region, setRegion] = useState<string>('')
  const [hasCredentials, setHasCredentials] = useState(false)
  const [configSource, setConfigSource] = useState<{
    bucket: string
    region: string
  }>({ bucket: '', region: '' })

  useEffect(() => {
    try {
      // Get config from new AWS configuration utility
      const awsConfig = getAWSConfigDebugInfo()
      setBucketName(awsConfig.bucketName || 'Not configured')
      setRegion(awsConfig.region || 'Not configured')
      setHasCredentials(awsConfig.hasCredentials)
      setConfigSource(awsConfig.source)
    } catch (error) {
      console.error('Error getting AWS config:', error)
      setBucketName('Configuration Error')
      setRegion('Configuration Error')
      setHasCredentials(false)
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          S3 Configuration Debug
        </CardTitle>
        <CardDescription>
          Check your S3 configuration to troubleshoot migration issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Show configuration details</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show
              </>
            )}
          </Button>
        </div>

        {showConfig && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium">S3 Bucket Name</span>
                  <p className="text-sm text-muted-foreground">{bucketName}</p>
                </div>
                <Badge
                  variant={
                    bucketName !== 'Not configured' ? 'default' : 'destructive'
                  }
                >
                  {bucketName !== 'Not configured' ? 'Configured' : 'Missing'}
                </Badge>
              </div>

              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium">AWS Region</span>
                  <p className="text-sm text-muted-foreground">{region}</p>
                </div>
                <Badge
                  variant={
                    region !== 'Not configured' ? 'default' : 'destructive'
                  }
                >
                  {region !== 'Not configured' ? 'Set' : 'Missing'}
                </Badge>
              </div>

              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium">AWS Credentials</span>
                  <p className="text-sm text-muted-foreground">
                    Access Key ID and Secret Key
                  </p>
                </div>
                <Badge variant={hasCredentials ? 'default' : 'destructive'}>
                  {hasCredentials ? 'Present' : 'Missing'}
                </Badge>
              </div>
            </div>

            {(!hasCredentials ||
              bucketName === 'Not configured' ||
              bucketName === 'Configuration Error') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuration Issues Found:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {(bucketName === 'Not configured' ||
                      bucketName === 'Configuration Error') && (
                      <li>
                        S3 bucket name not found in Amplify outputs or
                        environment variables
                      </li>
                    )}
                    {!hasCredentials && (
                      <li>
                        Set <code>VITE_AWS_ACCESS_KEY_ID</code> and{' '}
                        <code>VITE_AWS_SECRET_ACCESS_KEY</code>
                      </li>
                    )}
                    {region === 'Not configured' && (
                      <li>
                        Set <code>VITE_AWS_REGION</code> (defaults to us-east-1)
                      </li>
                    )}
                  </ul>
                  <div className="mt-2 text-sm">
                    <strong>Configuration Sources:</strong>
                    <br />
                    Bucket:{' '}
                    {configSource.bucket === 'amplify'
                      ? 'Amplify outputs'
                      : 'Environment variable'}
                    <br />
                    Region:{' '}
                    {configSource.region === 'amplify'
                      ? 'Amplify outputs'
                      : 'Environment variable'}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="p-3 bg-muted rounded text-sm">
              <p className="font-medium mb-2">Expected S3 Structure:</p>
              <code className="block text-xs">
                {bucketName}/<br />
                ├── company-id-1/
                <br />
                │ └── projects/
                <br />
                │ ├── project-1.json
                <br />
                │ └── project-2.json
                <br />
                └── company-id-2/
                <br />
                └── projects/
                <br />
                └── project-3.json
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
