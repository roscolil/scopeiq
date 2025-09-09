import { defineFunction } from '@aws-amplify/backend'

// Get environment variables with fallbacks
const pineconeApiKey = process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY
const pineconeIndexName = process.env.PINECONE_INDEX_NAME || process.env.VITE_PINECONE_INDEX_NAME || 'scopeiq-documents'

export const pineconeSearch = defineFunction({
  name: 'pinecone-search',
  entry: './handler.ts',
  environment: {
    // Use a placeholder during build if not available - runtime validation in handler
    PINECONE_API_KEY: pineconeApiKey || 'PLACEHOLDER_FOR_BUILD',
    PINECONE_INDEX_NAME: pineconeIndexName,
  },
  runtime: 20,
  timeoutSeconds: 30,
})
