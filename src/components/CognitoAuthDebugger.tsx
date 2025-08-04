import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'
import { Amplify } from 'aws-amplify'
import outputs from '../../amplify_outputs.json'

const CognitoAuthDebugger = () => {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const addResult = (message: string) => {
    setResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ])
  }

  const runDiagnostics = async () => {
    setTesting(true)
    setResults([])
    setError('')

    try {
      addResult('🔧 Starting Cognito authentication diagnostics...')

      // Check Amplify configuration
      addResult('📋 Checking Amplify configuration...')
      const config = Amplify.getConfig()
      addResult(
        `✅ Amplify configured with region: ${config.Auth?.Cognito?.userPoolId ? 'Yes' : 'No'}`,
      )

      if (outputs.auth) {
        addResult(`✅ User Pool ID: ${outputs.auth.user_pool_id}`)
        addResult(`✅ Client ID: ${outputs.auth.user_pool_client_id}`)
        addResult(`✅ Region: ${outputs.auth.aws_region}`)
        addResult(`✅ Identity Pool: ${outputs.auth.identity_pool_id}`)
      } else {
        addResult('❌ No auth configuration found in amplify_outputs.json')
      }

      // Check current authentication status
      addResult('🔐 Checking current authentication status...')

      try {
        const currentUser = await getCurrentUser()
        addResult(`✅ User authenticated: ${currentUser.userId}`)

        try {
          const attributes = await fetchUserAttributes()
          addResult(`✅ User attributes fetched`)
          addResult(`   📧 Email: ${attributes.email || 'Not set'}`)
          addResult(`   👤 Name: ${attributes.name || 'Not set'}`)
          addResult(
            `   🏢 Company: ${attributes['custom:Company'] || 'Not set'}`,
          )
          addResult(`   🎭 Groups: ${attributes['cognito:groups'] || 'None'}`)
          addResult(
            `   ✅ Email verified: ${attributes.email_verified || 'Unknown'}`,
          )
        } catch (attrError) {
          addResult(
            `❌ Failed to fetch user attributes: ${attrError instanceof Error ? attrError.message : 'Unknown error'}`,
          )
        }
      } catch (userError) {
        addResult(`ℹ️ No user currently authenticated`)
        addResult(
          `   Reason: ${userError instanceof Error ? userError.message : 'Unknown'}`,
        )
      }

      // Check AWS credentials (if any)
      addResult('🔑 Checking AWS credentials configuration...')
      if (process.env.VITE_AWS_ACCESS_KEY_ID) {
        addResult(`⚠️ WARNING: AWS Access Key found in environment variables`)
        addResult(`   This may interfere with Cognito authentication`)
        addResult(
          `   Consider removing VITE_AWS_ACCESS_KEY_ID for auth testing`,
        )
      } else {
        addResult(`✅ No conflicting AWS credentials in environment`)
      }

      // Check network connectivity
      addResult('🌐 Testing network connectivity to Cognito...')
      try {
        const testUrl = `https://cognito-idp.${outputs.auth.aws_region}.amazonaws.com/`
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-amz-json-1.1' },
          body: JSON.stringify({}),
        })
        addResult(
          `✅ Network connectivity to Cognito: ${response.status === 400 ? 'OK (expected 400)' : response.status}`,
        )
      } catch (networkError) {
        addResult(
          `❌ Network connectivity issue: ${networkError instanceof Error ? networkError.message : 'Unknown'}`,
        )
      }

      addResult('✅ Diagnostics completed!')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      setError(`Diagnostics failed: ${errorMessage}`)
      addResult(`❌ Diagnostics failed: ${errorMessage}`)
    } finally {
      setTesting(false)
    }
  }

  const clearResults = () => {
    setResults([])
    setError('')
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>AWS Cognito Authentication Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={testing}>
            {testing ? 'Running Diagnostics...' : 'Run Auth Diagnostics'}
          </Button>
          <Button onClick={clearResults} variant="outline" disabled={testing}>
            Clear Results
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Diagnostic Results:</h4>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`${
                    result.includes('❌')
                      ? 'text-red-600'
                      : result.includes('⚠️')
                        ? 'text-yellow-600'
                        : result.includes('✅')
                          ? 'text-green-600'
                          : 'text-gray-700'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>
            <strong>Common Authentication Issues:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Incorrect user pool configuration</li>
            <li>User not confirmed (check email for verification)</li>
            <li>Password policy not met during sign-up</li>
            <li>Network/CORS issues</li>
            <li>Conflicting AWS credentials in environment</li>
            <li>User account disabled or deleted</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default CognitoAuthDebugger
