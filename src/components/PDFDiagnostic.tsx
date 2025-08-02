import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
  solution?: string
}

interface PDFDiagnosticProps {
  document: {
    id: string
    name: string
    url?: string | null
    s3Url?: string | null
    type: string
  }
}

export const PDFDiagnostic: React.FC<PDFDiagnosticProps> = ({ document }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [testing, setTesting] = useState(false)

  const runDiagnostics = async () => {
    setTesting(true)
    const diagnostics: DiagnosticResult[] = []

    // Test 1: Check if URLs exist
    diagnostics.push({
      test: 'URL Availability',
      status: document.url || document.s3Url ? 'success' : 'error',
      message:
        document.url || document.s3Url
          ? 'PDF URL is available'
          : 'No PDF URL found',
      details: `Primary URL: ${document.url || 'None'}\nS3 URL: ${document.s3Url || 'None'}`,
      solution:
        !document.url && !document.s3Url
          ? 'Document may still be processing. Wait for upload to complete.'
          : undefined,
    })

    // Test 2: URL Format Check
    const primaryUrl = document.url || document.s3Url
    if (primaryUrl) {
      const isS3Url = primaryUrl.includes('amazonaws.com')
      const hasSignature = primaryUrl.includes('X-Amz-Signature')
      const isHttps = primaryUrl.startsWith('https://')

      diagnostics.push({
        test: 'URL Format',
        status: isS3Url && isHttps ? 'success' : 'warning',
        message: `URL appears to be ${isS3Url ? 'valid S3 URL' : 'non-S3 URL'}`,
        details: `HTTPS: ${isHttps}\nS3 URL: ${isS3Url}\nSigned: ${hasSignature}\nURL: ${primaryUrl.substring(0, 100)}...`,
        solution: !isHttps ? 'URL should use HTTPS for security' : undefined,
      })

      // Test 3: URL Accessibility
      try {
        const response = await fetch(primaryUrl, {
          method: 'HEAD',
          mode: 'cors',
        })

        diagnostics.push({
          test: 'URL Accessibility (CORS)',
          status: response.ok ? 'success' : 'error',
          message: response.ok
            ? `URL accessible (${response.status})`
            : `Access failed (${response.status})`,
          details: `Status: ${response.status} ${response.statusText}\nContent-Type: ${response.headers.get('content-type') || 'Unknown'}\nContent-Length: ${response.headers.get('content-length') || 'Unknown'}`,
          solution: !response.ok
            ? 'Check CORS configuration and URL expiration'
            : undefined,
        })
      } catch (error) {
        diagnostics.push({
          test: 'URL Accessibility (CORS)',
          status: 'error',
          message: 'CORS or network error',
          details: error instanceof Error ? error.message : String(error),
          solution:
            'This is likely a CORS configuration issue. The URL may be valid but blocked by browser security.',
        })
      }

      // Test 4: Multiple URL validation approaches
      try {
        // Method 1: Image test (most permissive)
        const imgTest = new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve('success')
          img.onerror = () => reject('failed')
          img.src = primaryUrl
          // Timeout after 5 seconds
          setTimeout(() => reject('timeout'), 5000)
        })

        const imgResult = await imgTest
        diagnostics.push({
          test: 'Image Load Test',
          status: 'success',
          message: 'URL loads as image (bypasses CORS)',
          details:
            'The URL can be loaded as an image, indicating basic accessibility',
          solution: undefined,
        })
      } catch (error) {
        diagnostics.push({
          test: 'Image Load Test',
          status: 'error',
          message: 'URL fails to load even as image',
          details: `Error: ${error}. This suggests the URL is fundamentally broken.`,
          solution:
            'The URL itself is invalid, expired, or requires authentication. Check: 1) URL format, 2) Expiration time, 3) AWS credentials, 4) S3 bucket existence',
        })

        // Test 5: URL structure analysis
        try {
          const urlObj = new URL(primaryUrl)
          const isS3 =
            urlObj.hostname.includes('amazonaws.com') ||
            urlObj.hostname.includes('s3')
          const hasValidPath = urlObj.pathname.length > 1
          const hasQueryParams = urlObj.search.length > 0

          const urlIssues = []
          if (!isS3) urlIssues.push('Not an S3 URL')
          if (!hasValidPath) urlIssues.push('Missing file path')
          if (isS3 && !hasQueryParams)
            urlIssues.push('Missing S3 signature/auth params')

          diagnostics.push({
            test: 'URL Structure Analysis',
            status: urlIssues.length > 0 ? 'warning' : 'success',
            message:
              urlIssues.length > 0
                ? `URL structure issues: ${urlIssues.join(', ')}`
                : 'URL structure appears valid',
            details: `Host: ${urlObj.hostname}\nPath: ${urlObj.pathname}\nQuery params: ${urlObj.search ? 'Present' : 'None'}\nProtocol: ${urlObj.protocol}`,
            solution:
              urlIssues.length > 0
                ? 'URL structure suggests it may be malformed or missing required authentication parameters'
                : undefined,
          })
        } catch (urlError) {
          diagnostics.push({
            test: 'URL Structure Analysis',
            status: 'error',
            message: 'URL is malformed',
            details: `Cannot parse URL: ${urlError}`,
            solution:
              'Fix the URL format - it appears to be completely invalid',
          })
        }
      }

      // Test 6: Network connectivity test (using a known working URL)
      try {
        const testResponse = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          mode: 'no-cors',
        })
        diagnostics.push({
          test: 'Network Connectivity',
          status: 'success',
          message: 'Network connection is working',
          details: 'Successfully reached external test endpoint',
          solution: undefined,
        })
      } catch (networkError) {
        diagnostics.push({
          test: 'Network Connectivity',
          status: 'error',
          message: 'Network connectivity issues',
          details: `Cannot reach external endpoints: ${networkError}`,
          solution: 'Check your internet connection and firewall settings',
        })
      }

      // Test 5: URL Expiration Check (for signed URLs)
      if (primaryUrl.includes('X-Amz-Expires')) {
        try {
          const urlObj = new URL(primaryUrl)
          const expiresParam = urlObj.searchParams.get('X-Amz-Expires')
          const dateParam = urlObj.searchParams.get('X-Amz-Date')

          if (expiresParam && dateParam) {
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

            diagnostics.push({
              test: 'URL Expiration',
              status: isExpired ? 'error' : 'success',
              message: isExpired
                ? 'Pre-signed URL has expired'
                : 'Pre-signed URL is still valid',
              details: `Signed: ${signedDate.toISOString()}\nExpires: ${expirationDate.toISOString()}\nCurrent: ${new Date().toISOString()}`,
              solution: isExpired
                ? 'Request a new pre-signed URL from the server'
                : undefined,
            })
          }
        } catch (error) {
          diagnostics.push({
            test: 'URL Expiration',
            status: 'warning',
            message: 'Could not parse URL expiration',
            details: error instanceof Error ? error.message : String(error),
            solution: undefined,
          })
        }
      }

      // Test 6: Content-Type Check
      try {
        const response = await fetch(primaryUrl, {
          method: 'HEAD',
          mode: 'no-cors',
        })

        // Note: no-cors mode doesn't allow reading headers, so this is limited
        diagnostics.push({
          test: 'Content-Type (Limited)',
          status: 'warning',
          message: 'Cannot verify content-type due to CORS restrictions',
          details:
            'Browser security prevents reading response headers in no-cors mode',
          solution: 'Verify the file is actually a PDF in your S3 bucket',
        })
      } catch (error) {
        // This is expected with no-cors mode
      }
    }

    setResults(diagnostics)
    setTesting(false)
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <Info className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
    }
  }

  const openUrlInNewTab = () => {
    const url = document.url || document.s3Url
    if (url) {
      window.open(url, '_blank')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 PDF Access Diagnostic
        </CardTitle>
        <p className="text-sm text-gray-600">
          Comprehensive testing to identify why PDF access is failing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostics}
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>

          {(document.url || document.s3Url) && (
            <Button
              variant="outline"
              onClick={openUrlInNewTab}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Test URL in New Tab
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Diagnostic Results:</h4>
            {results.map((result, index) => (
              <Alert key={index} className={getStatusColor(result.status)}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm mt-1">{result.message}</div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-gray-600">
                          Show details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-x-auto">
                          {result.details}
                        </pre>
                      </details>
                    )}
                    {result.solution && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <div className="text-xs font-medium text-blue-700">
                          💡 Solution:
                        </div>
                        <div className="text-xs text-blue-600">
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
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Common solutions:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                • <strong>CORS:</strong> Configure S3 bucket CORS policy
              </li>
              <li>
                • <strong>Expired URL:</strong> Re-upload or regenerate the
                document URL
              </li>
              <li>
                • <strong>Authentication:</strong> Ensure you're logged in with
                proper permissions
              </li>
              <li>
                • <strong>File Processing:</strong> Wait for document upload to
                complete
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
