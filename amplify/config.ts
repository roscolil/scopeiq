// Amplify configuration for environment variables
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') })

export const config = {
  pinecone: {
    apiKey: process.env.VITE_PINECONE_API_KEY || '',
    indexName: process.env.VITE_PINECONE_INDEX_NAME || 'scopeiq-documents',
  },
  ses: {
    fromEmail: 'ross@exelion.ai',
    toEmail: 'ross@exelion.ai',
  },
}
