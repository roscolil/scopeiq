import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Play, Copy } from 'lucide-react'
import { getS3BucketName, getAWSRegion } from '@/utils/aws-config'

interface UploadCORSTest {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: string
  solution?: string
  critical?: boolean
}

export const UploadCORSDiagnostic: React.FC = () => {
  const [results, setResults] = useState<UploadCORSTest[]>([])
  const [testing, setTesting] = useState(false)

  const runUploadCORSTest = async () => {
    setTesting(true)
    const diagnostics: UploadCORSTest[] = []

    try {
      const bucketName = getS3BucketName()
      const region = getAWSRegion()
      const testUrl = `https://${bucketName}.s3.${region}.amazonaws.com/test-cors-upload`

      // Test 1: OPTIONS preflight request for uploads
      try {
        const optionsResponse = await fetch(testUrl, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
            Origin: window.location.origin,
          },
          mode: 'cors',
        })

        if (optionsResponse.ok) {
          const allowMethods = optionsResponse.headers.get(
            'Access-Control-Allow-Methods',
          )
          const allowHeaders = optionsResponse.headers.get(
            'Access-Control-Allow-Headers',
          )

          diagnostics.push({
            test: '✅ CORS Preflight (OPTIONS)',
            status: 'success',
            message: 'Server accepts CORS preflight for uploads',
            details: `Allow-Methods: ${allowMethods}\nAllow-Headers: ${allowHeaders}`,
          })

          // Check if PUT method is allowed
          if (allowMethods && allowMethods.includes('PUT')) {
            diagnostics.push({
              test: '✅ PUT Method Allowed',
              status: 'success',
              message: 'PUT method is allowed for uploads',
            })
          } else {
            diagnostics.push({
              test: '❌ PUT Method Not Allowed',
              status: 'error',
              message: 'PUT method is not allowed by CORS',
              solution: 'Add PUT method to your S3 CORS configuration',
              critical: true,
            })
          }

          // Check if required headers are allowed
          if (
            allowHeaders &&
            (allowHeaders.includes('*') ||
              allowHeaders.includes('Content-Type'))
          ) {
            diagnostics.push({
              test: '✅ Required Headers Allowed',
              status: 'success',
              message: 'Required upload headers are allowed',
            })
          } else {
            diagnostics.push({
              test: '❌ Headers Not Allowed',
              status: 'error',
              message: 'Required headers for upload not allowed',
              solution: 'Add Content-Type and other required headers to CORS',
              critical: true,
            })
          }
        } else {
          diagnostics.push({
            test: '❌ CORS Preflight Failed',
            status: 'error',
            message: `Preflight request failed: ${optionsResponse.status}`,
            solution:
              'Configure CORS on your S3 bucket to allow OPTIONS requests',
            critical: true,
          })
        }
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message.toLowerCase().includes('cors')
        ) {
          diagnostics.push({
            test: '❌ CORS Preflight Blocked',
            status: 'error',
            message: 'Browser blocked preflight request due to CORS policy',
            solution: 'S3 bucket CORS configuration is missing or incorrect',
            critical: true,
          })
        } else {
          diagnostics.push({
            test: '❌ Preflight Network Error',
            status: 'error',
            message: `Network error during preflight: ${error instanceof Error ? error.message : 'Unknown'}`,
            critical: true,
          })
        }
      }

      // Test 2: Mock upload test (without actually uploading)
      try {
        // Create a tiny test blob
        const testBlob = new Blob(['test'], { type: 'text/plain' })

        const uploadResponse = await fetch(testUrl, {
          method: 'PUT',
          body: testBlob,
          headers: {
            'Content-Type': 'text/plain',
          },
          mode: 'cors',
        })

        if (uploadResponse.ok || uploadResponse.status === 403) {
          // 403 is expected since we don't have auth, but it means CORS works
          diagnostics.push({
            test: '✅ Upload CORS Working',
            status: 'success',
            message: 'Upload request passed CORS validation',
            details:
              uploadResponse.status === 403
                ? 'Got 403 (expected - no auth), but CORS allowed the request'
                : `Status: ${uploadResponse.status}`,
          })
        } else {
          diagnostics.push({
            test: '❌ Upload CORS Failed',
            status: 'error',
            message: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
            solution:
              'Check S3 CORS configuration for PUT method and required headers',
          })
        }
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message.toLowerCase().includes('cors')
        ) {
          diagnostics.push({
            test: '❌ Upload CORS Blocked',
            status: 'error',
            message: 'Browser blocked upload due to CORS policy',
            solution: 'Update S3 CORS to allow PUT method and upload headers',
            critical: true,
          })
        } else {
          diagnostics.push({
            test: '⚠️ Upload Test Failed',
            status: 'warning',
            message: `Upload test error: ${error instanceof Error ? error.message : 'Unknown'}`,
            details: 'This might be due to authentication, not CORS',
          })
        }
      }

      // Test 3: Check current origin
      diagnostics.push({
        test: '🔍 Current Origin Check',
        status: 'info',
        message: `Testing from origin: ${window.location.origin}`,
        details:
          'Make sure this origin is included in your S3 CORS AllowedOrigins',
        solution: `Add "${window.location.origin}" to your CORS AllowedOrigins if not already present`,
      })

      // Test 4: Required CORS configuration
      diagnostics.push({
        test: '📋 Required CORS Configuration',
        status: 'info',
        message: 'Your S3 bucket needs this CORS configuration for uploads',
        details: `{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.amplifyapp.com",
    "${window.location.origin}"
  ],
  "ExposeHeaders": ["ETag", "Location"],
  "MaxAgeSeconds": 3600
}`,
        solution:
          'Apply this configuration to your S3 bucket using AWS CLI or Console',
      })
    } catch (error) {
      diagnostics.push({
        test: '❌ Configuration Error',
        status: 'error',
        message: 'Failed to run CORS tests',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: true,
      })
    }

    setResults(diagnostics)
    setTesting(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'info':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string, critical = false) => {
    if (critical) return 'border-red-500 bg-red-100'
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Upload CORS Diagnostic
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test if your S3 bucket CORS allows document uploads
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>🎯 Upload CORS Issues:</strong> Document uploads require
            PUT/POST methods and specific headers to be allowed by S3 CORS
            configuration.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={runUploadCORSTest}
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <Play className="h-4 w-4 animate-pulse" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {testing ? 'Testing CORS...' : 'Test Upload CORS'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">
              🔍 Upload CORS Test Results:
            </h4>
            {results.map((result, index) => (
              <Alert
                key={index}
                className={getStatusColor(result.status, result.critical)}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div
                      className={`font-medium ${result.critical ? 'text-red-800 text-lg' : ''}`}
                    >
                      {result.test}
                    </div>
                    <div className="text-sm mt-1">{result.message}</div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">
                          Show details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-x-auto whitespace-pre-wrap">
                          {result.details}
                        </pre>
                        {result.test.includes('CORS Configuration') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                result.details || '',
                              )
                            }
                            className="mt-2 flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy CORS Config
                          </Button>
                        )}
                      </details>
                    )}
                    {result.solution && (
                      <div
                        className={`mt-2 p-3 rounded border-l-4 ${result.critical ? 'bg-red-50 border-red-500' : 'bg-white border-blue-500'}`}
                      >
                        <div
                          className={`text-xs font-medium ${result.critical ? 'text-red-700' : 'text-blue-700'}`}
                        >
                          {result.critical
                            ? '🚨 CRITICAL FIX NEEDED:'
                            : '💡 Solution:'}
                        </div>
                        <div
                          className={`text-xs mt-1 ${result.critical ? 'text-red-600 font-medium' : 'text-blue-600'}`}
                        >
                          {result.solution}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>🔧 Quick Upload CORS Fix:</strong>
            <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
              <li>
                <strong>Test CORS:</strong> Run diagnostic above to check
                current configuration
              </li>
              <li>
                <strong>Apply CORS:</strong> Use S3 CORS Config tool to apply
                upload-friendly CORS
              </li>
              <li>
                <strong>Verify methods:</strong> Ensure PUT/POST methods are
                allowed
              </li>
              <li>
                <strong>Check headers:</strong> Ensure Content-Type and other
                headers are allowed
              </li>
              <li>
                <strong>Test again:</strong> Re-run this diagnostic after
                applying CORS
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
