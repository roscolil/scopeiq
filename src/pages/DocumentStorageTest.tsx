import React from 'react'
import { Layout } from '@/components/Layout'
import { DocumentDebugger } from '@/components/DocumentDebugger'
import { SimpleDocumentTest } from '@/components/SimpleDocumentTest'
import { DocumentIDFinder } from '@/components/DocumentIDFinder'
import { ViewerDebugger } from '@/components/ViewerDebugger'
import { S3CorsConfig } from '@/components/S3CorsConfig'

export const DocumentStorageTest: React.FC = () => {
  // Use hardcoded test values for debugging
  const companyId = 'scopeiq-mvp'
  const projectId = 'test-project'

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <h1 className="text-2xl font-bold mb-6">Document Storage Test</h1>

        <S3CorsConfig />

        <DocumentIDFinder />

        <ViewerDebugger />

        <SimpleDocumentTest />

        <DocumentDebugger companyId={companyId} projectId={projectId} />
      </div>
    </Layout>
  )
}
