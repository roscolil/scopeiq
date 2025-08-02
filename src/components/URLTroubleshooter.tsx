import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'

interface URLAnalysis {
  isValid: boolean
  isS3: boolean
  isSigned: boolean
  isExpired: boolean | null
  domain: string
  path: string
  issues: string[]
  recommendations: string[]
}

export const URLTroubleshooter: React.FC = () => {
  const [url, setUrl] = useState('')
  const [analysis, setAnalysis] = useState<URLAnalysis | null>(null)
  const [testing, setTesting] = useState(false)

  const analyzeURL = async () => {
    if (!url.trim()) return

    setTesting(true)
    try {
      const urlObj = new URL(url)
      const analysis: URLAnalysis = {
        isValid: true,
        isS3:
          urlObj.hostname.includes('amazonaws.com') ||
          urlObj.hostname.includes('s3'),
        isSigned: urlObj.searchParams.has('X-Amz-Signature'),
        isExpired: null,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        issues: [],
        recommendations: [],
      }

      // Check for common URL issues
      if (!url.startsWith('https://')) {
        analysis.issues.push('URL should use HTTPS for security')
        analysis.recommendations.push(
          'Ensure your document URLs are generated with HTTPS',
        )
      }

      if (analysis.isS3) {
        if (!analysis.isSigned) {
          analysis.issues.push(
            'S3 URL is not signed - may require public read access',
          )
          analysis.recommendations.push(
            'Enable public read on S3 bucket OR use pre-signed URLs',
          )
        } else {
          // Check expiration for signed URLs
          const expiresParam = urlObj.searchParams.get('X-Amz-Expires')
          const dateParam = urlObj.searchParams.get('X-Amz-Date')

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
              analysis.isExpired = new Date() > expirationDate

              if (analysis.isExpired) {
                analysis.issues.push(
                  `Pre-signed URL expired on ${expirationDate.toLocaleString()}`,
                )
                analysis.recommendations.push(
                  'Re-upload the document to generate a new pre-signed URL',
                )
              }
            } catch (e) {
              analysis.issues.push('Cannot parse URL expiration date')
            }
          }
        }

        // Check bucket region
        const region = urlObj.hostname.split('.')[1]
        if (region && region !== 'us-east-1') {
          analysis.recommendations.push(
            `Bucket appears to be in ${region} region - ensure your app is configured for this region`,
          )
        }
      } else {
        analysis.issues.push(
          'Not an S3 URL - may have different CORS/access requirements',
        )
        analysis.recommendations.push(
          'Verify the hosting service supports CORS for browser access',
        )
      }

      // Check file extension
      if (!analysis.path.toLowerCase().endsWith('.pdf')) {
        analysis.issues.push('URL does not end with .pdf extension')
        analysis.recommendations.push(
          'Ensure the file is actually a PDF and the URL is correct',
        )
      }

      setAnalysis(analysis)
    } catch (error) {
      setAnalysis({
        isValid: false,
        isS3: false,
        isSigned: false,
        isExpired: null,
        domain: '',
        path: '',
        issues: [
          `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        recommendations: [
          'Check the URL format - it should be a complete, valid HTTP/HTTPS URL',
        ],
      })
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const testInNewTab = () => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const generateCurlCommand = () => {
    return `curl -I "${url}"`
  }

  const generateWgetCommand = () => {
    return `wget --spider -S "${url}"`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 URL Troubleshooter
        </CardTitle>
        <p className="text-sm text-gray-600">
          Analyze your PDF URL to identify specific access issues
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            PDF URL to analyze:
          </label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-bucket.s3.amazonaws.com/path/to/document.pdf"
              className="flex-1"
            />
            <Button onClick={analyzeURL} disabled={testing || !url.trim()}>
              {testing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </div>

        {url && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={testInNewTab}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Test in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generateCurlCommand())}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy cURL Command
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generateWgetCommand())}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy wget Command
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Valid URL:</strong> {analysis.isValid ? '✅' : '❌'}
              </div>
              <div>
                <strong>S3 URL:</strong> {analysis.isS3 ? '✅' : '❌'}
              </div>
              <div>
                <strong>Pre-signed:</strong> {analysis.isSigned ? '✅' : '❌'}
              </div>
              <div>
                <strong>Expired:</strong>{' '}
                {analysis.isExpired === null
                  ? '❓'
                  : analysis.isExpired
                    ? '❌'
                    : '✅'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                <strong>Domain:</strong> {analysis.domain || 'N/A'}
              </div>
              <div className="text-sm">
                <strong>Path:</strong> {analysis.path || 'N/A'}
              </div>
            </div>

            {analysis.issues.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="font-medium text-red-800 mb-2">
                    Issues Found:
                  </div>
                  <ul className="text-red-700 text-sm space-y-1">
                    {analysis.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {analysis.recommendations.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="font-medium text-blue-800 mb-2">
                    Recommendations:
                  </div>
                  <ul className="text-blue-700 text-sm space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>If URL fails even bypassing CORS:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                1. <strong>Expired pre-signed URL:</strong> URLs typically
                expire in 1 hour
              </li>
              <li>
                2. <strong>Wrong AWS credentials:</strong> URL generated with
                different/invalid credentials
              </li>
              <li>
                3. <strong>S3 bucket doesn't exist:</strong> Bucket may have
                been deleted or renamed
              </li>
              <li>
                4. <strong>File not found:</strong> Document may not have been
                uploaded successfully
              </li>
              <li>
                5. <strong>Region mismatch:</strong> App configured for
                different AWS region than bucket
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">💡 Quick Debug Commands:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Test URL in terminal:</strong>
              <code className="block bg-white p-2 rounded mt-1 text-xs">
                {generateCurlCommand()}
              </code>
            </div>
            <div>
              <strong>Check headers:</strong>
              <code className="block bg-white p-2 rounded mt-1 text-xs">
                {`curl -v "${url || 'YOUR_URL'}" 2>&1 | head -20`}
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
