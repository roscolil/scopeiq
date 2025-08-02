import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Play, Copy, Eye } from 'lucide-react'

interface PDFViewingTest {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: string
  solution?: string
  critical?: boolean
}

export const PDFViewingCORSDiagnostic: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState('')
  const [results, setResults] = useState<PDFViewingTest[]>([])
  const [testing, setTesting] = useState(false)

  const runPDFViewingTest = async () => {
    if (!pdfUrl.trim()) {
      setResults([
        {
          test: 'Missing PDF URL',
          status: 'error',
          message: 'Please enter a PDF URL to test',
          solution: 'Paste your failing PDF URL in the field above',
        },
      ])
      return
    }

    setTesting(true)
    const diagnostics: PDFViewingTest[] = []

    try {
      const url = new URL(pdfUrl)

      // Test 1: Check if it's an S3 URL
      const isS3 =
        url.hostname.includes('amazonaws.com') || url.hostname.includes('s3.')
      const isSignedUrl = url.searchParams.has('X-Amz-Signature')

      if (isS3) {
        diagnostics.push({
          test: '✅ S3 URL Detected',
          status: 'success',
          message: `S3 URL detected - ${isSignedUrl ? 'Pre-signed' : 'Public'}`,
          details: `Host: ${url.hostname}\nSigned: ${isSignedUrl ? 'Yes' : 'No'}`,
        })

        // Test URL expiration if signed
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

              if (isExpired) {
                diagnostics.push({
                  test: '🚨 URL EXPIRED',
                  status: 'error',
                  message: 'Pre-signed URL has expired',
                  details: `Expired: ${expirationDate.toLocaleString()}`,
                  solution: 'Re-upload the document to generate a new URL',
                  critical: true,
                })
              } else {
                const timeLeft = expirationDate.getTime() - new Date().getTime()
                diagnostics.push({
                  test: '✅ URL Valid',
                  status: 'success',
                  message: `URL expires in ${Math.floor(timeLeft / 60000)} minutes`,
                })
              }
            } catch (error) {
              diagnostics.push({
                test: '⚠️ Cannot Parse Expiration',
                status: 'warning',
                message: 'Unable to determine URL expiration',
              })
            }
          }
        }
      }

      // Test 2: CORS preflight for PDF viewing
      try {
        const optionsResponse = await fetch(pdfUrl, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Range, Content-Type',
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
          const allowOrigin = optionsResponse.headers.get(
            'Access-Control-Allow-Origin',
          )

          diagnostics.push({
            test: '✅ CORS Preflight OK',
            status: 'success',
            message: 'Server accepts CORS preflight for PDF viewing',
            details: `Allow-Origin: ${allowOrigin}\nAllow-Methods: ${allowMethods}\nAllow-Headers: ${allowHeaders}`,
          })

          // Check if Range requests are supported (needed for PDF streaming)
          if (
            allowHeaders &&
            (allowHeaders.includes('*') || allowHeaders.includes('Range'))
          ) {
            diagnostics.push({
              test: '✅ Range Requests Supported',
              status: 'success',
              message: 'Range header allowed (good for PDF streaming)',
            })
          } else {
            diagnostics.push({
              test: '⚠️ Range Requests May Not Work',
              status: 'warning',
              message: 'Range header not explicitly allowed',
              solution: 'Add "Range" to AllowedHeaders in CORS configuration',
            })
          }
        } else {
          diagnostics.push({
            test: '❌ CORS Preflight Failed',
            status: 'error',
            message: `Preflight failed: ${optionsResponse.status}`,
            solution: 'Check S3 CORS configuration allows OPTIONS method',
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
            message: 'Browser blocked preflight due to CORS policy',
            solution: 'S3 bucket CORS missing or incorrect for PDF viewing',
            critical: true,
          })
        }
      }

      // Test 3: Actual GET request test
      try {
        const response = await fetch(pdfUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            Range: 'bytes=0-1023', // Test partial content request
          },
        })

        if (response.ok || response.status === 206) {
          diagnostics.push({
            test: '✅ PDF GET Request Works',
            status: 'success',
            message: `PDF accessible via GET request (${response.status})`,
            details:
              response.status === 206
                ? 'Partial content supported (good for large PDFs)'
                : 'Full content request successful',
          })

          // Check content type
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('pdf')) {
            diagnostics.push({
              test: '✅ Correct Content Type',
              status: 'success',
              message: `Content-Type: ${contentType}`,
            })
          } else {
            diagnostics.push({
              test: '⚠️ Unexpected Content Type',
              status: 'warning',
              message: `Content-Type: ${contentType || 'Unknown'}`,
              solution: 'Verify this is actually a PDF file',
            })
          }
        } else if (response.status === 403) {
          diagnostics.push({
            test: '❌ Access Denied (403)',
            status: 'error',
            message: 'Server returned 403 Forbidden',
            solution: 'Most likely expired URL or insufficient permissions',
            critical: true,
          })
        } else {
          diagnostics.push({
            test: '❌ HTTP Error',
            status: 'error',
            message: `Server error: ${response.status} ${response.statusText}`,
            solution: 'Check if the URL is correct and file exists',
          })
        }
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message.toLowerCase().includes('cors')
        ) {
          diagnostics.push({
            test: '❌ CORS Blocked PDF Access',
            status: 'error',
            message: 'Browser blocked PDF request due to CORS policy',
            solution: 'Update S3 CORS to allow GET requests from your domain',
            critical: true,
          })
        } else {
          diagnostics.push({
            test: '❌ Network Error',
            status: 'error',
            message: `Request failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            critical: true,
          })
        }
      }

      // Test 4: Origin check
      diagnostics.push({
        test: '🔍 Origin Check',
        status: 'info',
        message: `Your origin: ${window.location.origin}`,
        details: 'Ensure this origin is in your S3 CORS AllowedOrigins',
        solution: `Add "${window.location.origin}" to CORS AllowedOrigins if missing`,
      })

      // Test 5: Browser PDF viewer test
      diagnostics.push({
        test: '🔧 Browser Test',
        status: 'info',
        message: 'Test PDF in browser tab',
        details: 'Click "Test in Browser" to open PDF in new tab',
        solution:
          "If this works but iframe doesn't, issue is with iframe embedding policies",
      })
    } catch (error) {
      diagnostics.push({
        test: '❌ Invalid URL',
        status: 'error',
        message: 'URL format is invalid',
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
          <Eye className="h-5 w-5 text-blue-600" />
          PDF Viewing CORS Diagnostic
        </CardTitle>
        <p className="text-sm text-gray-600">
          Diagnose PDF viewing and CORS issues specifically
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>🎯 PDF Viewing Requirements:</strong> PDFs need GET method,
            Range headers for streaming, and proper CORS origin configuration.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              PDF URL to test:
            </label>
            <Input
              value={pdfUrl}
              onChange={e => setPdfUrl(e.target.value)}
              placeholder="https://your-bucket.s3.amazonaws.com/path/to/document.pdf?X-Amz-..."
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runPDFViewingTest}
              disabled={testing || !pdfUrl.trim()}
              className="flex items-center gap-2"
            >
              {testing ? (
                <Play className="h-4 w-4 animate-pulse" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {testing ? 'Testing PDF...' : 'Test PDF Viewing'}
            </Button>

            {pdfUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Test in Browser
              </Button>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">
              🔍 PDF Viewing Test Results:
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

        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ PDF Viewing CORS Checklist:</strong>
            <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
              <li>
                <strong>Check URL expiration:</strong> Most common cause of
                access denied
              </li>
              <li>
                <strong>Verify CORS origin:</strong> Ensure your domain is in
                AllowedOrigins
              </li>
              <li>
                <strong>Allow GET method:</strong> Required for PDF downloads
              </li>
              <li>
                <strong>Allow Range headers:</strong> Needed for PDF
                streaming/partial downloads
              </li>
              <li>
                <strong>Test in new tab:</strong> Bypasses iframe restrictions
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
