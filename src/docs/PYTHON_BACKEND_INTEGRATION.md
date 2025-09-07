# Python Backend Integration Guide

This guide explains how to integrate the separate Python AI backend with your existing React/TypeScript frontend.

## Overview

The Python backend integration provides:
- **Enhanced PDF processing** with advanced chunking and analysis
- **Intelligent search** with structured document understanding
- **Conversational AI** with context-aware responses
- **Automatic fallback** to existing services when Python backend is unavailable
- **Real-time progress tracking** for document processing
- **Comprehensive error handling** with retry logic and circuit breakers

## Architecture

```
Frontend (React/TypeScript) ←→ Python AI Backend (FastAPI)
                                    ↓
                            AWS Services (S3, DynamoDB, etc.)
                                    ↓
                            Vector Database (Pinecone)
                                    ↓
                            AI Models (OpenAI GPT-4)
```

## Key Features

### **Smart Backend Selection**
- Automatic detection of Python backend availability
- Seamless fallback to existing services
- Configurable backend preferences

### **Enhanced Document Processing**
- Advanced PDF text extraction
- Intelligent chunking with context preservation
- Structured element extraction (doors, windows, rooms, etc.)
- Real-time processing progress updates

### **Conversational AI**
- Context-aware responses using conversation history
- Multi-turn conversations with document context
- Source attribution and confidence scoring
- Voice input and output support

## Implementation Files

### Core Services
- `src/services/ai/python-api-client.ts` - Python backend API client with comprehensive error handling
- `src/services/ai/python-chat-service.ts` - Chat/conversation service with fallback support
- `src/services/ai/enhanced-ai-workflow-python.ts` - Enhanced workflow with Python integration
- `src/services/file/python-document-upload.ts` - Document upload service with progress tracking

### React Hooks
- `src/hooks/usePythonChat.ts` - Chat functionality hook with conversation history
- `src/hooks/usePythonDocumentUpload.ts` - Document upload hook with progress monitoring

### Components
- `src/components/ai/AIActionsPython.tsx` - Enhanced AI actions component with backend status

### Configuration
- `src/config/python-backend.ts` - Backend configuration management with validation

### Type Definitions
- `src/types/services.d.ts` - Updated with Python backend types
- `src/types/components.d.ts` - Updated with new component interfaces

## Environment Variables

Add these to your `.env` file:

```bash
# Python AI Backend Configuration
VITE_PYTHON_AI_BACKEND_URL=http://localhost:8000
VITE_PYTHON_AI_API_KEY=your-python-backend-api-key
VITE_PYTHON_AI_TIMEOUT=30000
VITE_PYTHON_AI_RETRY_ATTEMPTS=3
VITE_PYTHON_AI_RETRY_DELAY=1000
VITE_ENABLE_AI_BACKEND_FALLBACK=true
VITE_PREFERRED_AI_BACKEND=auto

# Optional: Debug Configuration
VITE_DEBUG_PYTHON_BACKEND=false
```

### Configuration Options

- `VITE_PYTHON_AI_BACKEND_URL`: Base URL for the Python backend API
- `VITE_PYTHON_AI_API_KEY`: API key for authentication (if required)
- `VITE_PYTHON_AI_TIMEOUT`: Request timeout in milliseconds (default: 30000)
- `VITE_PYTHON_AI_RETRY_ATTEMPTS`: Number of retry attempts for failed requests (default: 3)
- `VITE_PYTHON_AI_RETRY_DELAY`: Delay between retry attempts in milliseconds (default: 1000)
- `VITE_ENABLE_AI_BACKEND_FALLBACK`: Enable automatic fallback to existing services (default: true)
- `VITE_PREFERRED_AI_BACKEND`: Preferred backend selection (`auto`, `python`, `existing`)
- `VITE_DEBUG_PYTHON_BACKEND`: Enable debug logging for Python backend requests (default: false)

## Usage Examples

### 1. Basic Chat Integration

```typescript
import { usePythonChat } from '@/hooks/usePythonChat'

function ChatComponent() {
  const { 
    sendMessage, 
    messages, 
    loading, 
    error, 
    currentStage,
    clearMessages 
  } = usePythonChat({
    projectId: 'your-project-id',
    documentId: 'optional-document-id',
    contextType: 'project',
    searchType: 'hybrid',
    includeSearchResults: true,
  })

  const handleSendMessage = async () => {
    const result = await sendMessage('How many doors are in this project?', (stage) => {
      console.log('Processing stage:', stage)
    })
    
    if (result) {
      console.log('AI Response:', result.response)
      console.log('Sources used:', result.metadata.sourcesUsed)
    }
  }

  return (
    <div>
      {currentStage && (
        <div className="text-sm text-gray-600">
          Status: {currentStage}
        </div>
      )}
      
      {messages.map(message => (
        <div key={message.id} className={`message ${message.type}`}>
          <strong>{message.type}:</strong> {message.content}
          {message.metadata?.sourcesUsed && (
            <div className="text-xs text-gray-500">
              Sources: {message.metadata.sourcesUsed.join(', ')}
            </div>
          )}
        </div>
      ))}
      
      <button onClick={handleSendMessage} disabled={loading}>
        {loading ? 'Sending...' : 'Send Message'}
      </button>
      
      <button onClick={clearMessages} disabled={loading}>
        Clear Chat
      </button>
    </div>
  )
}
```

### 2. Document Upload Integration

```typescript
import { usePythonDocumentUpload } from '@/hooks/usePythonDocumentUpload'

function UploadComponent() {
  const { 
    uploadDocument, 
    uploadProgress, 
    isUploading,
    uploadError 
  } = usePythonDocumentUpload({
    projectId: 'your-project-id',
    companyId: 'your-company-id',
    onUploadComplete: (result) => {
      console.log('Upload completed:', result)
      console.log('Document ID:', result.documentId)
      console.log('Processing status:', result.processingStatus)
    },
    onUploadError: (error) => {
      console.error('Upload failed:', error)
    },
    onProgress: (progress) => {
      console.log('Upload progress:', progress)
    },
    onStatusUpdate: (status) => {
      console.log('Status update:', status)
    },
  })

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadDocument(file, {
        documentName: 'Custom Document Name',
        onProgress: (progress) => {
          console.log('Custom progress handler:', progress)
        }
      })
      
      if (result) {
        console.log('Document uploaded successfully:', result.documentId)
        console.log('S3 URL:', result.s3Url)
        console.log('Estimated processing time:', result.estimatedProcessingTime)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <div>
      <input 
        type="file" 
        accept=".pdf"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        disabled={isUploading}
      />
      
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <div className="progress-text">
            {uploadProgress.percentage}% - {uploadProgress.stage}
          </div>
        </div>
      )}
      
      {uploadError && (
        <div className="error-message">
          Error: {uploadError}
        </div>
      )}
    </div>
  )
}
```

### 3. Enhanced AI Actions Component

```typescript
import { AIActionsPython } from '@/components/ai/AIActionsPython'

function DocumentViewer() {
  return (
    <AIActionsPython
      documentId="document-123"
      projectId="project-456"
      projectName="My Construction Project"
      companyId="company-789"
    />
  )
}
```

**Features of AIActionsPython Component:**
- **Backend Status Display**: Shows current backend (Python/Existing) with health indicators
- **Conversation History**: Maintains chat history with timestamps and metadata
- **Voice Input/Output**: Supports voice commands and text-to-speech responses
- **Query Scope Selection**: Choose between document-specific or project-wide queries
- **Real-time Progress**: Shows processing stages and progress indicators
- **Export Functionality**: Export conversation history
- **Error Handling**: Comprehensive error display and recovery

### 4. Direct API Usage

```typescript
import { pythonAPIClient } from '@/services/ai/python-api-client'

// Health check
const healthResult = await pythonAPIClient.healthCheck()
if (healthResult.success) {
  console.log('Backend status:', healthResult.data?.status)
}

// Upload document
const uploadResult = await pythonAPIClient.uploadDocument({
  file: pdfFile,
  project_id: 'project-123',
  company_id: 'company-456',
  document_name: 'Custom Document Name'
})

if (uploadResult.success) {
  console.log('Document ID:', uploadResult.data?.document_id)
  
  // Monitor processing progress
  const progressResult = await pythonAPIClient.getDocumentProgress(
    uploadResult.data?.document_id
  )
  console.log('Processing status:', progressResult.data?.status)
}

// Chat conversation
const chatResult = await pythonAPIClient.chatConversation({
  query: 'How many windows are in this document?',
  project_id: 'project-123',
  document_id: 'doc-123',
  context_type: 'document',
  conversation_history: [
    {
      role: 'user',
      content: 'What is this document about?',
      timestamp: '2024-01-15T10:00:00Z'
    }
  ],
  include_search_results: true
})

if (chatResult.success) {
  console.log('AI Response:', chatResult.data?.response)
  console.log('Sources used:', chatResult.data?.metadata.sources_used)
}
```

## Backend Selection & Fallback

The system supports intelligent backend selection with automatic fallback:

### **Smart Backend Selection**

```typescript
import { 
  handleEnhancedAIQueryWithPython,
  getBackendConfig 
} from '@/services/ai/enhanced-ai-workflow-python'

// Get current backend configuration
const config = getBackendConfig()
console.log('Backend config:', config)

// Enhanced AI query with automatic backend selection
const result = await handleEnhancedAIQueryWithPython({
  query: 'How many doors are in this project?',
  projectId: 'project-123',
  documentId: 'doc-456',
  projectName: 'My Construction Project',
  queryScope: 'project',
  onProgress: (stage) => {
    console.log('Processing stage:', stage)
  },
  options: {
    usePythonBackend: true,
    fallbackToExisting: true, // Enable automatic fallback
    onBackendSwitch: (backend) => {
      console.log(`Switched to ${backend} backend`)
    },
  },
})
```

### **Fallback Behavior**

When the Python backend is unavailable, the system automatically falls back to existing services:

```typescript
import { isPythonChatAvailable } from '@/services/ai/python-chat-service'

// Check Python backend availability
const isPythonAvailable = await isPythonChatAvailable()
if (!isPythonAvailable) {
  console.log('Python backend unavailable, using existing services')
}

// The system will automatically handle fallback in the background
```

### **Backend Configuration**

```typescript
import { 
  getPythonBackendConfig,
  validatePythonBackendConfig 
} from '@/config/python-backend'

// Get configuration
const config = getPythonBackendConfig()

// Validate configuration
const validation = validatePythonBackendConfig(config)
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)
}
```

## Error Handling & Monitoring

All services include comprehensive error handling and monitoring:

### **Error Handling**

```typescript
try {
  const result = await sendMessage('Your question')
} catch (error) {
  if (error.message.includes('Python backend')) {
    // Handle Python backend specific errors
    console.log('Python backend error:', error.message)
  } else if (error.message.includes('Network')) {
    // Handle network errors
    console.log('Network error:', error.message)
  } else {
    // Handle general errors
    console.log('General error:', error.message)
  }
}
```

### **Health Monitoring**

```typescript
import { checkPythonBackendHealth } from '@/services/file/python-document-upload'

// Check backend health
const isHealthy = await checkPythonBackendHealth()
if (!isHealthy) {
  console.log('Python backend is not available')
}

// Monitor health periodically
setInterval(async () => {
  const health = await checkPythonBackendHealth()
  console.log('Backend health:', health ? 'Healthy' : 'Unhealthy')
}, 30000) // Check every 30 seconds
```

### **Error Types**

The system handles various error types:

- **Network Errors**: Connection timeouts, DNS failures
- **API Errors**: Invalid requests, authentication failures  
- **Processing Errors**: Document processing failures, embedding generation errors
- **Service Errors**: Pinecone unavailability, OpenAI API issues
- **Validation Errors**: Invalid file types, missing required fields

### **Retry Logic**

```typescript
// Automatic retry with exponential backoff
const result = await pythonAPIClient.chatConversation({
  query: 'Your question',
  project_id: 'project-123',
  context_type: 'document'
})

// The client automatically retries failed requests based on configuration
```

## Configuration Options

### **Backend Selection**
- `auto` - Automatically select the best available backend (recommended)
- `python` - Prefer Python backend, fallback to existing if unavailable
- `existing` - Use existing backend only

### **Fallback Behavior**
- `VITE_ENABLE_AI_BACKEND_FALLBACK=true` - Enable automatic fallback (recommended)
- `VITE_ENABLE_AI_BACKEND_FALLBACK=false` - Disable fallback (fail if Python backend unavailable)

### **Performance Tuning**
- `VITE_PYTHON_AI_TIMEOUT` - Request timeout (default: 30000ms)
- `VITE_PYTHON_AI_RETRY_ATTEMPTS` - Retry attempts (default: 3)
- `VITE_PYTHON_AI_RETRY_DELAY` - Retry delay (default: 1000ms)

### **Debug Configuration**
- `VITE_DEBUG_PYTHON_BACKEND=true` - Enable debug logging
- `VITE_DEBUG_PYTHON_BACKEND=false` - Disable debug logging (default)

## Migration Strategy

### **Phase 1: Parallel Implementation**
1. Deploy Python backend alongside existing services
2. Use feature flags to gradually enable Python backend
3. Monitor performance and error rates
4. Test fallback mechanisms thoroughly

### **Phase 2: Gradual Migration**
1. Enable Python backend for new uploads
2. Migrate existing documents to Python backend processing
3. Update UI components to use new services
4. Monitor user experience and performance

### **Phase 3: Full Migration**
1. Make Python backend the primary service
2. Keep existing services as fallback only
3. Remove deprecated code
4. Optimize performance and monitoring

## Testing

### **Unit Tests**

```typescript
import { pythonAPIClient } from '@/services/ai/python-api-client'

// Mock the Python backend for testing
jest.mock('@/services/ai/python-api-client', () => ({
  pythonAPIClient: {
    chatConversation: jest.fn(),
    uploadDocument: jest.fn(),
    healthCheck: jest.fn(),
  },
}))

// Test chat functionality
test('should handle chat conversation', async () => {
  const mockResponse = {
    success: true,
    data: {
      response: 'Test response',
      metadata: { sources_used: ['doc_1'] }
    }
  }
  
  pythonAPIClient.chatConversation.mockResolvedValue(mockResponse)
  
  const result = await pythonAPIClient.chatConversation({
    query: 'Test query',
    project_id: 'test-project',
    context_type: 'document'
  })
  
  expect(result.success).toBe(true)
  expect(result.data?.response).toBe('Test response')
})
```

### **Integration Tests**

```typescript
// Test with real Python backend
test('should connect to Python backend', async () => {
  const result = await pythonAPIClient.healthCheck()
  expect(result.success).toBe(true)
  expect(result.data?.status).toBe('healthy')
})
```

### **End-to-End Tests**

```typescript
// Test complete document upload and chat flow
test('should upload document and chat about it', async () => {
  // Upload document
  const uploadResult = await pythonAPIClient.uploadDocument({
    file: testPdfFile,
    project_id: 'test-project',
    company_id: 'test-company'
  })
  
  expect(uploadResult.success).toBe(true)
  
  // Wait for processing
  await waitForProcessing(uploadResult.data?.document_id)
  
  // Chat about document
  const chatResult = await pythonAPIClient.chatConversation({
    query: 'What is this document about?',
    project_id: 'test-project',
    document_id: uploadResult.data?.document_id,
    context_type: 'document'
  })
  
  expect(chatResult.success).toBe(true)
  expect(chatResult.data?.response).toBeDefined()
})
```

## Performance Considerations

1. **Connection Pooling** - Python backend client reuses connections
2. **Request Timeouts** - Configurable timeouts prevent hanging requests
3. **Retry Logic** - Automatic retries for transient failures
4. **Caching** - Consider implementing response caching for repeated queries
5. **Progress Tracking** - Real-time progress updates for long-running operations
6. **Batch Processing** - Efficient handling of multiple document uploads

## Security

1. **API Keys** - Store Python backend API keys securely
2. **HTTPS** - Use HTTPS for all production communications
3. **Input Validation** - Validate all inputs before sending to Python backend
4. **Rate Limiting** - Implement rate limiting to prevent abuse
5. **Authentication** - Secure API endpoints with proper authentication
6. **Data Privacy** - Ensure sensitive document data is handled securely

## Monitoring & Observability

Monitor these key metrics:
- Python backend response times
- Error rates and types
- Fallback frequency
- Document processing success rates
- User satisfaction with responses
- Memory and CPU usage
- Network latency

### **Health Checks**

```typescript
// Periodic health monitoring
setInterval(async () => {
  const health = await checkPythonBackendHealth()
  if (!health) {
    console.warn('Python backend health check failed')
    // Trigger alerts or fallback mechanisms
  }
}, 60000) // Check every minute
```

## Troubleshooting

### **Common Issues**

1. **Python Backend Unavailable**
   - Check if Python backend is running
   - Verify URL and API key configuration
   - Check network connectivity
   - Review backend logs

2. **Slow Responses**
   - Increase timeout values
   - Check Python backend performance
   - Consider implementing caching
   - Monitor resource usage

3. **Fallback Not Working**
   - Verify `VITE_ENABLE_AI_BACKEND_FALLBACK=true`
   - Check existing service availability
   - Review error logs
   - Test fallback mechanisms

4. **Document Processing Failures**
   - Check file format and size limits
   - Verify S3 permissions
   - Review processing logs
   - Test with smaller files

### **Debug Mode**

Enable debug logging:

```bash
# Add to your environment
VITE_DEBUG_PYTHON_BACKEND=true
```

This will log all Python backend requests and responses to the console.

### **Error Logging**

```typescript
// Enhanced error logging
try {
  const result = await pythonAPIClient.chatConversation(request)
} catch (error) {
  console.error('Python backend error:', {
    error: error.message,
    request: request,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  })
}
```

## Next Steps

1. **Deploy Python Backend** - Set up the separate Python AI service
2. **Configure Environment** - Add environment variables
3. **Test Integration** - Use the provided examples to test functionality
4. **Gradual Rollout** - Start with a subset of users
5. **Monitor Performance** - Track metrics and user feedback
6. **Full Migration** - Complete the transition to Python backend
7. **Optimize Performance** - Fine-tune based on usage patterns
8. **Scale Infrastructure** - Prepare for increased load

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs and monitoring dashboards
3. Test with the provided examples
4. Check backend health status
5. Contact the development team

## Conclusion

The Python backend integration provides a robust, scalable solution for enhanced AI capabilities while maintaining backward compatibility and automatic fallback mechanisms. The system is designed to be production-ready with comprehensive error handling, monitoring, and testing capabilities.
