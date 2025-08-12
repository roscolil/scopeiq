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
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  hasBiometricCredentials,
  setupBiometricAuth,
} from '@/services/biometric-cognito'

export const BiometricDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState({
    loading: true,
    isHTTPS: false,
    webAuthnSupported: false,
    platformAvailable: false,
    hasCredentials: false,
    localStorage: {
      credentialIds: [],
      credentialData: [],
    },
  })
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({ ...prev, loading: true }))

    try {
      // Basic environment checks
      const isHTTPS =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost'
      const webAuthnSupported = isBiometricSupported()
      const platformAvailable = await isPlatformAuthenticatorAvailable()
      const hasCredentials = hasBiometricCredentials()

      // Check localStorage
      const credentialIds = JSON.parse(
        localStorage.getItem('biometric_credential_ids') || '[]',
      )
      const credentialData = credentialIds
        .map((id: string) => {
          const data = localStorage.getItem(`biometric_creds_${id}`)
          return data ? JSON.parse(data) : null
        })
        .filter(Boolean)

      setDiagnostics({
        loading: false,
        isHTTPS,
        webAuthnSupported,
        platformAvailable,
        hasCredentials,
        localStorage: {
          credentialIds,
          credentialData,
        },
      })
    } catch (error) {
      console.error('Diagnostic error:', error)
      setDiagnostics(prev => ({ ...prev, loading: false }))
    }
  }

  const testBiometricSetup = async () => {
    setTestResult('Testing...')

    try {
      // Use dummy credentials for testing
      const result = await setupBiometricAuth(
        'test@example.com',
        'testpassword123',
      )

      if (result.success) {
        setTestResult('✅ Biometric setup test successful!')
        runDiagnostics() // Refresh diagnostics
      } else {
        setTestResult(`❌ Biometric setup failed: ${result.error}`)
      }
    } catch (error) {
      setTestResult(
        `❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  const clearAllData = () => {
    localStorage.removeItem('biometric_credential_ids')
    diagnostics.localStorage.credentialIds.forEach((id: string) => {
      localStorage.removeItem(`biometric_creds_${id}`)
    })
    runDiagnostics()
    setTestResult('🧹 All biometric data cleared')
  }

  if (diagnostics.loading) {
    return <div>Running diagnostics...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Biometric Authentication Diagnostics</CardTitle>
          <CardDescription>
            Check browser and device compatibility for biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Checks */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Environment</h4>
              <div
                className={`flex items-center gap-2 ${diagnostics.isHTTPS ? 'text-green-600' : 'text-red-600'}`}
              >
                {diagnostics.isHTTPS ? '✅' : '❌'} HTTPS/Localhost
              </div>
              <div
                className={`flex items-center gap-2 ${diagnostics.webAuthnSupported ? 'text-green-600' : 'text-red-600'}`}
              >
                {diagnostics.webAuthnSupported ? '✅' : '❌'} WebAuthn Support
              </div>
              <div
                className={`flex items-center gap-2 ${diagnostics.platformAvailable ? 'text-green-600' : 'text-red-600'}`}
              >
                {diagnostics.platformAvailable ? '✅' : '❌'} Platform
                Authenticator
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Storage</h4>
              <div
                className={`flex items-center gap-2 ${diagnostics.hasCredentials ? 'text-green-600' : 'text-orange-600'}`}
              >
                {diagnostics.hasCredentials ? '✅' : '⚠️'} Has Credentials
              </div>
              <div className="text-gray-600">
                Stored IDs: {diagnostics.localStorage.credentialIds.length}
              </div>
              <div className="text-gray-600">
                Credential Data:{' '}
                {diagnostics.localStorage.credentialData.length}
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {!diagnostics.isHTTPS && (
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ WebAuthn requires HTTPS or localhost. Current URL:{' '}
                {window.location.href}
              </AlertDescription>
            </Alert>
          )}

          {!diagnostics.webAuthnSupported && (
            <Alert variant="destructive">
              <AlertDescription>
                ❌ WebAuthn is not supported in this browser. Try Chrome,
                Safari, or Firefox.
              </AlertDescription>
            </Alert>
          )}

          {!diagnostics.platformAvailable && diagnostics.webAuthnSupported && (
            <Alert variant="destructive">
              <AlertDescription>
                ❌ No platform authenticator found. Ensure your device has Touch
                ID, Face ID, or Windows Hello enabled.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Actions */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex gap-2">
              <Button
                onClick={testBiometricSetup}
                variant="outline"
                disabled={!diagnostics.platformAvailable}
              >
                Test Biometric Setup
              </Button>
              <Button onClick={runDiagnostics} variant="outline">
                Refresh Diagnostics
              </Button>
              <Button
                onClick={clearAllData}
                variant="outline"
                className="text-red-600"
              >
                Clear All Data
              </Button>
            </div>

            {testResult && (
              <Alert>
                <AlertDescription>{testResult}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Raw Data */}
          <details className="text-xs bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium">
              Raw Diagnostic Data
            </summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify(
                {
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  diagnostics,
                  localStorage: diagnostics.localStorage,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}

export default BiometricDiagnostic
