import React from 'react'
import { Layout } from '@/components/Layout'
import { BiometricDemo } from '@/components/BiometricDemo'
import { BiometricDiagnostic } from '@/components/BiometricDiagnostic'

const BiometricTestPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Biometric Authentication Testing
          </h1>
          <p className="text-gray-600 mt-2">
            Test and diagnose biometric authentication features
          </p>
        </div>

        <BiometricDiagnostic />

        <BiometricDemo />
      </div>
    </Layout>
  )
}

export default BiometricTestPage
