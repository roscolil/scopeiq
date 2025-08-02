import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUser } from 'aws-amplify/auth'

const client = generateClient<Schema>()

/**
 * Test script to verify database connection and schema deployment
 */
export const testDatabase = async () => {
  console.log('🧪 Testing database connection...')

  try {
    // Test 1: Check if we can query the schema
    console.log('1. Testing schema access...')
    const { data: projects, errors } = await client.models.Project.list({
      limit: 1,
    })

    if (errors && errors.length > 0) {
      console.error('❌ Schema access failed:', errors)
      return false
    }

    console.log('✅ Schema access successful')
    console.log(`   Found ${projects?.length || 0} existing projects`)

    // Test 2: Check authentication
    console.log('2. Testing authentication...')
    try {
      const user = await getCurrentUser()
      console.log('✅ Authentication successful')
      console.log(`   User ID: ${user.userId}`)
      console.log(`   Username: ${user.username}`)
    } catch (authError) {
      console.warn('⚠️ Authentication not available (user not logged in)')
      console.log('   This is normal if testing without login')
    }

    // Test 3: Check available models
    console.log('3. Testing available models...')

    const testModels = [
      { name: 'Company', test: () => client.models.Company.list({ limit: 1 }) },
      { name: 'Project', test: () => client.models.Project.list({ limit: 1 }) },
      {
        name: 'Document',
        test: () => client.models.Document.list({ limit: 1 }),
      },
      {
        name: 'UserCompany',
        test: () => client.models.UserCompany.list({ limit: 1 }),
      },
    ]

    for (const model of testModels) {
      try {
        await model.test()
        console.log(`✅ ${model.name} model accessible`)
      } catch (error) {
        console.log(`❌ ${model.name} model failed:`, error)
      }
    }

    console.log('🎉 Database test completed!')
    return true
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return false
  }
}

// Export for use in other files
export default testDatabase
