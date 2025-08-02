import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  AlertCircle,
  Play,
  Copy,
  ExternalLink,
} from 'lucide-react'

interface AccessDeniedTest {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: string
  solution?: string
  critical?: boolean
}

export const SimpleDocumentTest: React.FC = () => {
  const [testUrl, setTestUrl] = useState('')
  const [results, setResults] = useState<AccessDeniedTest[]>([])
  const [testing, setTesting] = useState(false)

  const runAccessDeniedDiagnostic = async () => {
    if (!testUrl.trim()) {
      setResults([
        {
          test: 'Missing URL',
          status: 'error',
          message: 'Please enter a PDF URL to test',
          solution: 'Paste your failing PDF URL in the field above',
        },
      ])
      return
    }

    setTesting(true)
    const diagnostics: AccessDeniedTest[] = []

    try {
      const url = new URL(testUrl)

      // Test 1: Check if it's an S3 URL and if it's signed
      const isS3 =
        url.hostname.includes('amazonaws.com') || url.hostname.includes('s3.')
      const isSignedUrl = url.searchParams.has('X-Amz-Signature')

      if (!isS3) {
        diagnostics.push({
          test: '❌ Not an S3 URL',
          status: 'error',
          message: "This doesn't appear to be an AWS S3 URL",
          details: `Host: ${url.hostname}`,
          solution:
            "Make sure you're testing with the actual S3 URL from your document storage",
          critical: true,
        })
      } else {
        diagnostics.push({
          test: '✅ Valid S3 URL',
          status: 'success',
          message: 'Confirmed AWS S3 URL',
          details: `Host: ${url.hostname}\nSigned: ${isSignedUrl ? 'Yes' : 'No'}`,
        })
      }

      // Test 2: CRITICAL - Check URL expiration (most common issue)
      if (isSignedUrl) {
        const expiresParam = url.searchParams.get('X-Amz-Expires')
        const dateParam = url.searchParams.get('X-Amz-Date')

        if (expiresParam && dateParam) {
          try {
            const signedDate = new Date(
              dateParam.replace(
                /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
                '$1-$2-$3T$4:$5:$6Z',
              ),
            )
            const expiresInSeconds = parseInt(expiresParam)
            const expirationDate = new Date(
              signedDate.getTime() + expiresInSeconds * 1000,
            )
            const isExpired = new Date() > expirationDate
            const timeLeft = expirationDate.getTime() - new Date().getTime()

            if (isExpired) {
              diagnostics.push({
                test: '🚨 URL EXPIRED',
                status: 'error',
                message: `URL expired ${Math.abs(Math.floor(timeLeft / 60000))} minutes ago`,
                details: `Signed: ${signedDate.toLocaleString()}\nExpired: ${expirationDate.toLocaleString()}\nCurrent: ${new Date().toLocaleString()}`,
                solution:
                  'THIS IS YOUR PROBLEM! The URL has expired. You need to re-upload the document or generate a new URL.',
                critical: true,
              })
            } else {
              diagnostics.push({
                test: '✅ URL Not Expired',
                status: 'success',
                message: `URL valid for ${Math.floor(timeLeft / 60000)} more minutes`,
                details: `Expires: ${expirationDate.toLocaleString()}`,
              })
            }
          } catch (error) {
            diagnostics.push({
              test: '⚠️ Cannot Parse Expiration',
              status: 'warning',
              message: 'Unable to check if URL is expired',
              solution: 'Try re-uploading the document to get a fresh URL',
            })
          }
        }
      } else if (isS3) {
        diagnostics.push({
          test: '⚠️ Non-Signed S3 URL',
          status: 'warning',
          message: 'This S3 URL is not pre-signed',
          solution:
            'Non-signed URLs require the S3 object to be publicly readable OR proper CORS + authentication',
        })
      }

      // Test 3: Basic reachability (bypass CORS)
      try {
        await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' })
        diagnostics.push({
          test: '✅ URL Reachable',
          status: 'success',
          message: 'URL responds to requests (file exists)',
          details:
            'The file exists on S3, so the issue is likely permissions or CORS',
        })
      } catch (error) {
        diagnostics.push({
          test: '❌ URL Not Reachable',
          status: 'error',
          message: 'URL does not respond to requests',
          details:
            'File may not exist, bucket may not exist, or network issues',
          solution: 'Check AWS S3 Console to verify the file actually exists',
          critical: true,
        })
      }

      // Test 4: CORS test
      try {
        const response = await fetch(testUrl, { method: 'HEAD', mode: 'cors' })
        if (response.ok) {
          diagnostics.push({
            test: '✅ CORS Working',
            status: 'success',
            message: `CORS allows access! Status: ${response.status}`,
            details: 'CORS is properly configured for this URL',
          })
        } else {
          diagnostics.push({
            test: '❌ HTTP Error',
            status: 'error',
            message: `Server returned error: ${response.status} ${response.statusText}`,
            solution:
              response.status === 403
                ? 'This is likely an expired URL or insufficient permissions'
                : 'Check the HTTP status code meaning',
          })
        }
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message.toLowerCase().includes('cors')
        ) {
          diagnostics.push({
            test: '❌ CORS Blocked',
            status: 'error',
            message: 'Browser blocked request due to CORS policy',
            solution:
              'Apply the CORS configuration to your S3 bucket using the S3 CORS Config tool',
            critical: true,
          })
        } else {
          diagnostics.push({
            test: '❌ Network Error',
            status: 'error',
            message: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            solution: 'Network connectivity issue or completely invalid URL',
          })
        }
      }

      // Test 5: External testing recommendation
      diagnostics.push({
        test: '🔧 External Test Commands',
        status: 'info',
        message: 'Test this URL outside the browser',
        details: `# Test if URL works at all:\ncurl -I "${testUrl}"\n\n# Test with verbose output:\ncurl -v "${testUrl}" 2>&1 | head -20\n\n# Try to download:\ncurl -L "${testUrl}" -o test.pdf`,
        solution:
          'Run these commands in terminal to test without browser restrictions',
      })
    } catch (error) {
      diagnostics.push({
        test: '❌ Invalid URL',
        status: 'error',
        message: 'URL format is invalid',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        solution: 'Check that the URL is complete and properly formatted',
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
          🚨 Access Denied Troubleshooter
        </CardTitle>
        <p className="text-sm text-gray-600">
          Focused diagnostic for "access denied" errors
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>🎯 Most likely cause:</strong> Your URLs have expired!
            Pre-signed S3 URLs typically expire in 1 hour.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste your failing PDF URL here:
            </label>
            <Input
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="https://your-bucket.s3.amazonaws.com/path/to/document.pdf?X-Amz-..."
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runAccessDeniedDiagnostic}
              disabled={testing || !testUrl.trim()}
              className="flex items-center gap-2"
            >
              {testing ? (
                <Play className="h-4 w-4 animate-pulse" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {testing ? 'Diagnosing...' : 'Find the Problem'}
            </Button>

            {testUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(testUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Test in New Tab
              </Button>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">🔍 Diagnostic Results:</h4>
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
                        {result.test.includes('External Test') && (
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
                            Copy Commands
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

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>📋 Quick Fix Checklist:</strong>
            <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
              <li>
                <strong>Check expiration:</strong> Most "access denied" =
                expired URL
              </li>
              <li>
                <strong>Re-upload document:</strong> Generates fresh URLs with
                new expiration
              </li>
              <li>
                <strong>Verify CORS:</strong> Apply configuration to S3 bucket
              </li>
              <li>
                <strong>Test in terminal:</strong> Use curl commands to bypass
                browser
              </li>
              <li>
                <strong>Check AWS Console:</strong> Verify file exists in S3
                bucket
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
