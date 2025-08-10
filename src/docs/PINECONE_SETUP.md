# Pinecone Integration Setup

This document describes how to set up and use the real Pinecone vector database for ScopeIQ.

## Prerequisites

1. **Pinecone Account**: Create an account at [pinecone.io](https://pinecone.io)
2. **Pinecone Index**: Create an index with the following specifications:
   - **Name**: `scopeiq-documents` (or update `VITE_PINECONE_INDEX_NAME` in .env)
   - **Dimensions**: `1536` (for OpenAI text-embedding-ada-002)
   - **Metric**: `cosine`
   - **Pod Type**: `starter` (for development) or `p1.x1` (for production)

## Environment Variables

The following environment variables are required in your `.env` file:

```env
VITE_PINECONE_API_KEY=your_pinecone_api_key_here
VITE_PINECONE_INDEX_NAME=scopeiq-documents
```

## Features

### Real Pinecone Integration

The updated `src/services/pinecone.ts` now includes:

- **Real vector storage**: Vectors are stored in Pinecone cloud service
- **Namespace support**: Each project gets its own namespace for data isolation
- **Metadata storage**: Document metadata is stored alongside vectors
- **Error handling**: Proper error handling for API failures
- **Utility functions**: Additional functions for managing vectors

### Available Functions

1. **`upsertEmbeddings()`**: Store document embeddings in Pinecone
2. **`queryEmbeddings()`**: Search for similar documents using vector similarity
3. **`deleteEmbeddings()`**: Remove specific documents from the index
4. **`deleteNamespace()`**: Clear all documents from a project namespace
5. **`getIndexStats()`**: Get statistics about your Pinecone index

### Usage in Application

The integration works seamlessly with your existing document upload flow:

1. **Document Upload**: When a document is uploaded via `FileUploader`
2. **Text Extraction**: Text is extracted using PDF.js or other parsers
3. **Embedding Generation**: OpenAI creates embeddings from the text
4. **Vector Storage**: Embeddings are stored in Pinecone with metadata
5. **Semantic Search**: Users can search documents using natural language

### Data Structure

Each vector stored in Pinecone includes:

```typescript
{
  id: string,              // Unique document ID
  values: number[],        // 1536-dimensional embedding vector
  metadata: {
    collection: string,    // Project/namespace identifier
    content: string,       // Original document text
    name: string,         // Document filename
    type: string,         // Document MIME type
    url: string,          // S3 URL for the document
    s3Key: string,        // S3 object key
    companyId: string,    // Company identifier
    size: number,         // File size in bytes
    timestamp: number     // Upload timestamp
  }
}
```

## Security Considerations

- **API Keys**: Keep your Pinecone API key secure and never commit it to version control
- **Namespaces**: Use project-specific namespaces to isolate data between projects
- **Client-side**: The current implementation runs client-side; consider moving to server-side for production

## Production Recommendations

1. **Move to Server-side**: For production, move Pinecone operations to your backend API
2. **Rate Limiting**: Implement rate limiting for embedding operations
3. **Error Recovery**: Add retry logic for failed operations
4. **Monitoring**: Monitor Pinecone usage and costs
5. **Backup**: Consider backup strategies for your vector data

## Troubleshooting

### Common Issues

1. **"VITE_PINECONE_API_KEY environment variable is required"**
   - Add your Pinecone API key to the `.env` file

2. **"Failed to access Pinecone index"**
   - Verify your index name exists in your Pinecone dashboard
   - Check that your API key has the correct permissions

3. **Dimension mismatch errors**
   - Ensure your Pinecone index has 1536 dimensions (for OpenAI embeddings)

4. **Network/CORS errors**
   - Pinecone should work from browsers, but consider server-side implementation

### Debug Tools

Use the browser console to monitor Pinecone operations:

```javascript
// Check index stats
import { getIndexStats } from '@/services/pinecone'
getIndexStats().then(console.log)

// Test upsert
import { upsertEmbeddings } from '@/services/pinecone'
upsertEmbeddings('test', ['doc-1'], [[...1536 numbers]], [{ content: 'test' }])
```

## Cost Optimization

- **Starter Tier**: Free tier includes 100K operations per month
- **Namespaces**: Use namespaces to organize data efficiently
- **Cleanup**: Regularly clean up unused document vectors
- **Monitoring**: Monitor your usage in the Pinecone dashboard

For more information, see the [Pinecone Documentation](https://docs.pinecone.io/).
