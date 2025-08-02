import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  AlertCircle,
  Settings,
  Copy,
  Terminal,
  ExternalLink,
} from 'lucide-react'
import {
  getBucketInfo,
  generateCorsCommands,
  getCorsConfigurationJSON,
} from '@/utils/s3-cors'

export const S3CorsConfig: React.FC = () => {
  const [showCommands, setShowCommands] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const bucketInfo = getBucketInfo()
  const corsCommands = generateCorsCommands()

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const openAWSConsole = () => {
    if (bucketInfo.success) {
      const consoleUrl = `https://s3.console.aws.amazon.com/s3/buckets/${bucketInfo.bucketName}?region=${bucketInfo.region}&tab=permissions`
      window.open(consoleUrl, '_blank')
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          S3 CORS Configuration
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configure Cross-Origin Resource Sharing (CORS) for S3 bucket to enable
          PDF viewing in browsers
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> CORS configuration requires AWS admin access
            and cannot be done from the browser for security reasons.
            <br />
            <strong>🎯 Goal:</strong> Allow your browser to download and view
            PDF files from S3 without "access denied" errors.
          </AlertDescription>
        </Alert>

        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Updated CORS Configuration:</strong> The configuration
            below now includes proper headers for PDF viewing, downloading, and
            Range requests for streaming large files.
          </AlertDescription>
        </Alert>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">What this fixes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• "Access Denied" errors when viewing PDFs</li>
            <li>• CORS policy errors in browser console</li>
            <li>• PDF iframe embedding failures</li>
            <li>• Cross-origin request blocks</li>
          </ul>
        </div>

        {bucketInfo.success && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Your S3 Bucket Info:</h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>Bucket:</strong> {bucketInfo.bucketName}
              </p>
              <p>
                <strong>Region:</strong> {bucketInfo.region}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-semibold">Choose your preferred method:</h4>

          {/* AWS Console Method */}
          <div className="border rounded-lg p-4">
            <h5 className="font-semibold mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Method 1: AWS Console (Recommended)
            </h5>
            <p className="text-sm text-gray-700 mb-3">
              Easiest method - configure CORS directly in the AWS S3 Console
            </p>
            <div className="space-y-2">
              <Button
                onClick={openAWSConsole}
                disabled={!bucketInfo.success}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open S3 Console
              </Button>
              <p className="text-xs text-gray-600">
                This will open the S3 permissions page for your bucket. Look for
                "Cross-origin resource sharing (CORS)".
              </p>
            </div>
          </div>

          {/* AWS CLI Method */}
          <div className="border rounded-lg p-4">
            <h5 className="font-semibold mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Method 2: AWS CLI
            </h5>
            <p className="text-sm text-gray-700 mb-3">
              For developers comfortable with command line
            </p>
            <Button
              variant="outline"
              onClick={() => setShowCommands(!showCommands)}
              className="flex items-center gap-2"
            >
              <Terminal className="h-4 w-4" />
              {showCommands ? 'Hide' : 'Show'} CLI Commands
            </Button>

            {showCommands && corsCommands.commands && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    1. Save CORS configuration:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(corsCommands.corsJson, 'cors')
                    }
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copied === 'cors' ? 'Copied!' : 'Copy CORS JSON'}
                  </Button>
                </div>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {corsCommands.corsJson}
                </pre>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    2. Run AWS CLI command:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        `aws s3api put-bucket-cors --bucket ${corsCommands.bucketName} --cors-configuration file://cors.json`,
                        'cli',
                      )
                    }
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copied === 'cli' ? 'Copied!' : 'Copy Command'}
                  </Button>
                </div>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {`aws s3api put-bucket-cors --bucket ${corsCommands.bucketName} --cors-configuration file://cors.json`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Manual JSON Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">
            Manual Configuration (AWS Console):
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            If you prefer to configure manually, paste this CORS configuration
            in the AWS S3 Console:
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyToClipboard(getCorsConfigurationJSON(), 'manual')
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              {copied === 'manual' ? 'Copied!' : 'Copy CORS Config'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyToClipboard(
                  `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000", 
      "https://*.amplifyapp.com",
      "${window.location.origin}"
    ],
    "ExposeHeaders": [
      "Content-Range",
      "Content-Length", 
      "Content-Type",
      "ETag",
      "Last-Modified"
    ],
    "MaxAgeSeconds": 3000
  }
]`,
                  'simple',
                )
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              {copied === 'simple' ? 'Copied!' : 'Copy Simple CORS'}
            </Button>
          </div>
          <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
            {getCorsConfigurationJSON()}
          </pre>
        </div>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>🔧 What this CORS configuration enables:</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>
                <strong>PDF Viewing:</strong> Allows browsers to fetch and
                display PDF files inline
              </li>
              <li>
                <strong>Range Requests:</strong> Enables streaming of large PDF
                files (partial downloads)
              </li>
              <li>
                <strong>Content Headers:</strong> Exposes file size, type, and
                caching information
              </li>
              <li>
                <strong>OPTIONS Support:</strong> Handles browser preflight
                requests for CORS
              </li>
              <li>
                <strong>Multiple Origins:</strong> Works with localhost
                development and production domains
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>After configuring CORS:</strong> PDF viewing should work
            immediately. You may need to refresh the page and clear browser
            cache.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
