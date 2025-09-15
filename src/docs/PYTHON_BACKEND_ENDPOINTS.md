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
