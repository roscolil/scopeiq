import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Play } from 'lucide-react'

export const CORSTestComponent: React.FC = () => {
  const [testUrl, setTestUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  const testCORS = async () => {
    if (!testUrl.trim()) return

    setTesting(true)
    setResult(null)

    try {
      // Test 1: Basic fetch with CORS
      const response = await fetch(testUrl, {
        method: 'HEAD',
        mode: 'cors',
        headers: {
          Accept: 'application/pdf',
        },
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const contentLength = response.headers.get('content-length')
        const acceptRanges = response.headers.get('accept-ranges')

        setResult({
          success: true,
          message: '✅ CORS is working! PDF should be viewable.',
          details: `Status: ${response.status}\nContent-Type: ${contentType || 'Not exposed'}\nContent-Length: ${contentLength || 'Not exposed'}\nAccept-Ranges: ${acceptRanges || 'Not exposed'}`,
        })
      } else {
        setResult({
          success: false,
          message: `❌ HTTP Error: ${response.status} ${response.statusText}`,
          details:
            'The URL returned an error. Check if the file exists and the URL is valid.',
        })
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        setResult({
          success: false,
          message: '❌ CORS Error: Access blocked by browser',
          details:
            'The S3 bucket CORS policy is not properly configured or the domain is not in the allowed origins list.',
        })
      } else {
        setResult({
          success: false,
          message: `❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details:
            'Check your internet connection and ensure the URL is accessible.',
        })
      }
    } finally {
      setTesting(false)
    }
  }

  const testWithSampleURL = () => {
    setTestUrl(
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    )
    // Auto-run test after setting URL
    setTimeout(() => testCORS(), 100)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 CORS Configuration Test
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test if your CORS configuration is working for PDF access
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">PDF URL to test:</label>
          <div className="flex gap-2">
            <Input
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="https://your-bucket.s3.amazonaws.com/path/to/document.pdf"
              className="flex-1"
            />
            <Button
              onClick={testCORS}
              disabled={testing || !testUrl.trim()}
              className="flex items-center gap-2"
            >
              {testing ? (
                <Play className="h-4 w-4 animate-pulse" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {testing ? 'Testing...' : 'Test CORS'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={testWithSampleURL}
            className="text-sm"
          >
            Test with Sample PDF
          </Button>
          {testUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(testUrl, '_blank')}
              className="text-sm"
            >
              Open in New Tab
            </Button>
          )}
        </div>

        {result && (
          <Alert
            className={
              result.success
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{result.message}</div>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-gray-600">
                      Show technical details
                    </summary>
                    <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-x-auto">
                      {result.details}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </Alert>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <strong>How to interpret results:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                • <strong>✅ Success:</strong> CORS is properly configured, PDFs
                should work
              </li>
              <li>
                • <strong>❌ CORS Error:</strong> Need to configure S3 bucket
                CORS policy
              </li>
              <li>
                • <strong>❌ HTTP Error:</strong> URL may be expired, invalid,
                or file missing
              </li>
              <li>
                • <strong>❌ Network Error:</strong> Connection issues or
                malformed URL
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
