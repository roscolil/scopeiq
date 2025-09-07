# Python Backend API Endpoints

## **Current Architecture**

The Python backend provides a comprehensive AI service with enhanced document processing, intelligent search, and conversational AI capabilities. The system supports automatic fallback to existing services when the Python backend is unavailable.

## **Core Endpoints**

### **1. Health Check**
```
GET /api/v1/health
```
**Purpose**: Monitor backend health and service status

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy" | "degraded" | "unhealthy",
    "version": "1.0.0",
    "services": {
      "database": "up" | "down",
      "vector_store": "up" | "down", 
      "ai_models": "up" | "down"
    },
    "uptime_seconds": 3600
  }
}
```

**Implementation Notes**:
- Checks Pinecone connection status
- Verifies OpenAI API connectivity
- Returns uptime since server start
- Sets appropriate HTTP status codes (200 for healthy, 503 for unhealthy)

### **2. Document Upload**
```
POST /api/v1/documents/upload
```
**Purpose**: Upload PDF documents for AI processing and indexing

**Request:** `multipart/form-data`
- `file`: PDF file (required, max 100MB)
- `project_id`: string (required)
- `company_id`: string (required)
- `document_name`: string (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "doc_123",
    "processing_status": "uploaded" | "processing" | "completed" | "failed",
    "original_filename": "document.pdf",
    "sanitized_filename": "document_20240115_120000.pdf",
    "s3_key": "company/project/files/timestamp_filename.pdf",
    "s3_url": "https://bucket.s3.region.amazonaws.com/key",
    "estimated_processing_time": 120,
    "message": "Document uploaded and processing started"
  }
}
```

**Implementation Requirements**:
1. **File Validation**: Ensure file is PDF, check size limits (100MB max)
2. **S3 Upload**: Store file in S3 with proper naming convention
3. **Background Processing**: Start async processing pipeline
4. **Processing Pipeline**:
   - Extract text from PDF using PyPDF2/PyMuPDF
   - Chunk text into manageable segments (500-1000 chars)
   - Generate embeddings using OpenAI text-embedding-ada-002
   - Store embeddings in Pinecone with metadata
   - Perform enhanced document analysis (extract elements like doors, windows, rooms)
   - Update processing status in database/cache
5. **Error Handling**: Return appropriate errors for invalid files, processing failures
6. **Return**: Document ID and initial processing status

### **3. Document Progress**
```
GET /api/v1/documents/{document_id}/progress
```
**Purpose**: Check processing status and progress of uploaded documents

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "doc_123",
    "status": "uploaded" | "processing" | "completed" | "failed",
    "progress_percentage": 75,
    "current_stage": "Generating embeddings",
    "error_message": "string (if failed)",
    "processing_results": {
      "chunks_created": 45,
      "embeddings_generated": 45,
      "enhanced_analysis_completed": true,
      "search_ready": false
    }
  }
}
```

**Implementation Requirements**:
1. **Status Tracking**: Track processing stages (uploaded → processing → completed/failed)
2. **Progress Calculation**: Calculate percentage based on completed steps
3. **Stage Information**: Provide human-readable current stage
4. **Results Summary**: Include processing statistics
5. **Error Information**: Include error details if processing failed
6. **Caching**: Use Redis or in-memory cache for real-time updates

### **4. Chat Conversation (Primary Endpoint)**
```
POST /api/v1/chat/conversation
```
**Purpose**: Handle AI conversations with document context and search capabilities

**Request:**
```json
{
  "query": "How many windows are on the north wall?",
  "project_id": "proj_123",
  "document_id": "doc_123",
  "conversation_history": [
    {
      "role": "user" | "assistant" | "system",
      "content": "What's in this document?",
      "timestamp": "2024-01-15T10:00:00Z",
      "metadata": {
        "search_results_used": true,
        "confidence": 0.95,
        "sources": ["doc_123_chunk_15"]
      }
    }
  ],
  "context_type": "document" | "project",
  "include_search_results": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on the floor plan analysis, there are 6 windows on the north wall of the building.",
    "metadata": {
      "sources_used": ["doc_123_chunk_15", "doc_123_chunk_23"]
    }
  }
}
```

**Implementation Requirements**:
1. **Query Processing**: Analyze the user's question and context
2. **Pinecone Search**: Search the vector database directly for relevant chunks
3. **Context Building**: Combine search results with conversation history
4. **AI Response**: Generate contextual response using LLM (OpenAI GPT-4)
5. **Search Results**: Return both the AI response and raw search results
6. **Error Handling**: Handle API failures gracefully with appropriate error messages


## **Frontend Integration Architecture**

The Python backend integrates seamlessly with the existing React/TypeScript frontend through:

### **Core Services**
- `src/services/ai/python-api-client.ts` - Python backend API client
- `src/services/ai/python-chat-service.ts` - Chat/conversation service
- `src/services/ai/enhanced-ai-workflow-python.ts` - Enhanced workflow with Python integration
- `src/services/file/python-document-upload.ts` - Document upload service

### **React Hooks**
- `src/hooks/usePythonChat.ts` - Chat functionality hook
- `src/hooks/usePythonDocumentUpload.ts` - Document upload hook

### **Components**
- `src/components/ai/AIActionsPython.tsx` - Enhanced AI actions component

### **Configuration**
- `src/config/python-backend.ts` - Backend configuration management

## **Why This Architecture?**

The chat endpoint handles everything internally:

1. **Query Processing** - Analyzes the user's question
2. **Pinecone Search** - Searches the vector database directly
3. **Context Building** - Combines search results with conversation history
4. **AI Response** - Generates contextual response using LLM
5. **Search Results** - Returns both the AI response and raw search results

This approach is more efficient because:
- **Single API call** instead of multiple requests
- **Contextual search** - search is informed by conversation history
- **Unified response** - AI response and search results are coherent
- **Better performance** - no round trips between frontend and backend
- **Automatic fallback** - seamlessly falls back to existing services when Python backend is unavailable

## **Environment Configuration**

Add these environment variables to your `.env` file:

```bash
# Python AI Backend Configuration
VITE_PYTHON_AI_BACKEND_URL=http://localhost:8000
VITE_PYTHON_AI_API_KEY=your-python-backend-api-key
VITE_PYTHON_AI_TIMEOUT=30000
VITE_PYTHON_AI_RETRY_ATTEMPTS=3
VITE_PYTHON_AI_RETRY_DELAY=1000
VITE_ENABLE_AI_BACKEND_FALLBACK=true
VITE_PREFERRED_AI_BACKEND=auto
```

## **Error Handling & Fallback**

The system includes comprehensive error handling and fallback mechanisms:

### **Automatic Fallback**
- When Python backend is unavailable, automatically falls back to existing services
- Configurable fallback behavior via environment variables
- Health checks ensure backend availability before making requests

### **Error Types**
- **Network Errors**: Connection timeouts, DNS failures
- **API Errors**: Invalid requests, authentication failures
- **Processing Errors**: Document processing failures, embedding generation errors
- **Service Errors**: Pinecone unavailability, OpenAI API issues

### **Retry Logic**
- Configurable retry attempts (default: 3)
- Exponential backoff for retry delays
- Circuit breaker pattern for failing services

## **Python Backend Implementation**

```python
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio

app = FastAPI(title="ScopeIQ AI Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/v1/health")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "version": "1.0.0",
            "services": {
                "database": "up",
                "vector_store": "up",
                "ai_models": "up"
            },
            "uptime_seconds": 3600
        }
    }

# Document upload
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    company_id: str = Form(...),
    document_name: Optional[str] = Form(None)
):
    # Implement document upload logic
    # 1. Save file to S3
    # 2. Extract text from PDF
    # 3. Chunk the text
    # 4. Generate embeddings
    # 5. Store in Pinecone
    # 6. Return processing status
    pass

# Document progress
@app.get("/api/v1/documents/{document_id}/progress")
async def get_document_progress(document_id: str):
    # Return current processing status and progress
    pass

# Chat conversation (main endpoint)
@app.post("/api/v1/chat/conversation")
async def chat_conversation(request: ChatRequest):
    # 1. Process the query
    # 2. Search Pinecone for relevant chunks
    # 3. Build context from search results + conversation history
    # 4. Generate AI response using LLM
    # 5. Return response + search results
    pass
```

## **Key Benefits of This Architecture**

1. **Simplified API** - Only 4 core endpoints instead of 11
2. **Better Performance** - Single request for search + AI response
3. **Contextual Search** - Search is informed by conversation history
4. **Unified Response** - AI response and search results are coherent
5. **Easier Maintenance** - Less code to maintain and test
6. **Better User Experience** - Faster responses with more context
7. **Automatic Fallback** - Seamless fallback to existing services when Python backend is unavailable
8. **Enhanced Error Handling** - Comprehensive error handling with retry logic
9. **Real-time Monitoring** - Health checks and progress tracking
10. **Flexible Configuration** - Environment-based configuration for different deployment scenarios

## **Migration Strategy**

### **Phase 1: Parallel Implementation**
1. Deploy Python backend alongside existing services
2. Use feature flags to gradually enable Python backend
3. Monitor performance and error rates

### **Phase 2: Gradual Migration**
1. Enable Python backend for new uploads
2. Migrate existing documents to Python backend processing
3. Update UI components to use new services

### **Phase 3: Full Migration**
1. Make Python backend the primary service
2. Keep existing services as fallback only
3. Remove deprecated code

## **Monitoring & Observability**

Monitor these key metrics:
- Python backend response times
- Error rates and types
- Fallback frequency
- Document processing success rates
- User satisfaction with responses

The frontend has been updated to use this simplified architecture while maintaining backward compatibility with the existing search functions through the chat endpoint.

Your Python backend now only needs to implement **4 endpoints** instead of 11, with the chat endpoint being the primary interface for all AI interactions. This is much cleaner and more efficient!
