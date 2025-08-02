import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileUp, Shield, Globe } from 'lucide-react'

export const UploadCORSHelp: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-blue-600" />
          Upload CORS Issues Help
        </CardTitle>
        <p className="text-sm text-gray-600">
          Understanding and fixing document upload CORS errors
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>🚨 Common Upload CORS Error:</strong>
            "Access to fetch at 'https://bucket.s3.amazonaws.com/...' from
            origin 'http://localhost:5173' has been blocked by CORS policy"
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-900">What is CORS?</h4>
            </div>
            <p className="text-sm text-blue-800">
              Cross-Origin Resource Sharing (CORS) is a security feature that
              blocks your browser from making requests to different domains
              unless explicitly allowed.
            </p>
          </div>

          <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <FileUp className="h-4 w-4 text-orange-600" />
              <h4 className="font-semibold text-orange-900">
                Upload Requirements
              </h4>
            </div>
            <p className="text-sm text-orange-800">
              File uploads to S3 require special CORS permissions for PUT/POST
              methods and specific headers like Content-Type.
            </p>
          </div>

          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-green-900">The Fix</h4>
            </div>
            <p className="text-sm text-green-800">
              Configure your S3 bucket CORS policy to allow uploads from your
              domain with the required methods and headers.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">
            🔧 Troubleshooting Steps for Upload CORS:
          </h4>
          <ol className="space-y-2 text-sm list-decimal list-inside">
            <li>
              <strong>Check Browser Console:</strong> Look for CORS error
              messages mentioning your S3 bucket
            </li>
            <li>
              <strong>Verify Methods:</strong> Ensure PUT and POST methods are
              allowed in CORS
            </li>
            <li>
              <strong>Check Headers:</strong> Ensure Content-Type and upload
              headers are allowed
            </li>
            <li>
              <strong>Test Origin:</strong> Make sure your current domain is in
              AllowedOrigins
            </li>
            <li>
              <strong>Apply Configuration:</strong> Use the S3 CORS Config tool
              to update your bucket
            </li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">
            ⚠️ Important Notes:
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>
              • CORS errors only occur in browsers, not in server-side code
            </li>
            <li>• Upload CORS is different from download/viewing CORS</li>
            <li>• Changes to S3 CORS may take a few minutes to take effect</li>
            <li>
              • Always test with the exact domain where uploads will happen
            </li>
          </ul>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Tools Available:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                • <strong>Upload CORS Diagnostic:</strong> Test if your CORS
                allows uploads
              </li>
              <li>
                • <strong>S3 CORS Config:</strong> Apply proper CORS
                configuration
              </li>
              <li>
                • <strong>Simple Document Test:</strong> Test specific URLs for
                access issues
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
