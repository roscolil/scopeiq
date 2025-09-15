import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

/**
 * Utility to show database connection information
 */
export const getDatabaseInfo = () => {
  // Get info from amplify_outputs.json
  const amplifyOutputs = {
    region: 'ap-southeast-2', // From your amplify_outputs.json
    graphqlUrl:
      'https://pbpthii7t5gxhlywgog7cpoamy.appsync-api.ap-southeast-2.amazonaws.com/graphql',
    userPoolId: 'ap-southeast-2_1XuQydiVJ',
    identityPoolId: 'ap-southeast-2:aec81434-7492-4e57-b165-5c5ff35980c6',
  }

  return {
    ...amplifyOutputs,
    console_links: {
      amplify:
        'https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2',
      dynamodb:
        'https://ap-southeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-southeast-2#tables',
      appsync:
        'https://ap-southeast-2.console.aws.amazon.com/appsync/home?region=ap-southeast-2#/apis',
      cognito:
        'https://ap-southeast-2.console.aws.amazon.com/cognito/home?region=ap-southeast-2',
    },
  }
}

// Function to test and show database table names
export const inspectDatabaseTables = async () => {
  try {
    console.log('🔍 Inspecting database tables...')

    const info = getDatabaseInfo()
    console.log('📍 Database Location Info:', info)

    // Try to query each model to see if tables exist
    const models = ['Company', 'Project', 'Document', 'UserCompany']
    const tableStatus = {}

    for (const modelName of models) {
      try {
        console.log(`Testing ${modelName} table...`)

        switch (modelName) {
          case 'Company':
            await client.models.Company.list({ limit: 1 })
            tableStatus[modelName] = '✅ Accessible'
            break
          case 'Project':
            await client.models.Project.list({ limit: 1 })
            tableStatus[modelName] = '✅ Accessible'
            break
          case 'Document':
            await client.models.Document.list({ limit: 1 })
            tableStatus[modelName] = '✅ Accessible'
            break
          case 'UserCompany':
            await client.models.UserCompany.list({ limit: 1 })
            tableStatus[modelName] = '✅ Accessible'
            break
        }
      } catch (error) {
        tableStatus[modelName] = `❌ Error: ${error.message}`
      }
    }

    console.log('📊 Table Status:', tableStatus)

    return {
      location: info,
      tables: tableStatus,
      instructions: {
        step1: 'Go to AWS Console and sign in',
        step2: 'Navigate to DynamoDB service',
        step3: 'Make sure you are in region: ap-southeast-2 (Sydney)',
        step4: 'Look for tables with names containing your model names',
        step5:
          'Table names will have random suffixes like: Company-abc123def456',
      },
    }
  } catch (error) {
    console.error('❌ Error inspecting database:', error)
    return null
  }
}

export default getDatabaseInfo
