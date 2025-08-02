import React, { useState } from 'react'
import DatabaseTestComponent from '@/components/DatabaseTestComponent'
import { DataMigration } from '@/components/DataMigration'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, ArrowRight, TestTube } from 'lucide-react'

const DatabaseTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Database Management Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test database connectivity and migrate your data from S3 to the
            hybrid model
          </p>
        </div>

        <Tabs defaultValue="test" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Database Testing
            </TabsTrigger>
            <TabsTrigger value="migrate" className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Data Migration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-6">
            <DatabaseTestComponent />
          </TabsContent>

          <TabsContent value="migrate" className="space-y-6">
            <DataMigration />
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use the Database Testing tab to verify your connection and AWS
            access.
            <br />
            Use the Data Migration tab to move your existing S3 data to the new
            hybrid database model.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DatabaseTest
