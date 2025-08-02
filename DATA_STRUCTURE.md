# Data Structure and Hierarchy Documentation

## Overview

This document explains how files and metadata are organized and stored in the ScopeIQ MVP system.

## Architecture Summary

The system uses **hybrid storage**:

- **DynamoDB**: Primary storage for all metadata (projects, documents, users)
- **S3**: Secondary storage for actual files AND backup JSON metadata
- **Hierarchical Organization**: Company → Project → Document → Files
- **Dual Write Strategy**: Write to DynamoDB first, then backup to S3

## S3 Storage Structure

### S3 Bucket Hierarchy

```
{bucketName}/
├── {companyId}/
│   ├── projects/
│   │   ├── {projectId}.json          # Project metadata
│   │   └── {projectId2}.json
│   ├── {projectId}/
│   │   ├── documents/
│   │   │   ├── {documentId}.json     # Document metadata
│   │   │   └── {documentId2}.json
│   │   └── files/
│   │       ├── {timestamp}_{filename} # Actual uploaded files
│   │       └── {timestamp}_{filename2}
│   └── {projectId2}/
│       ├── documents/
│       └── files/
```

### Example S3 Structure

```
amplify-vitereactshadcnts-amplifyteamdrivebucket28-3sjth3rkm1cu/
├── company123/
│   ├── projects/
│   │   ├── proj_1704067200000_abc123.json    # Project metadata
│   │   └── proj_1704067300000_def456.json
│   ├── proj_1704067200000_abc123/
│   │   ├── documents/
│   │   │   ├── doc_1704067400000_xyz789.json # Document metadata
│   │   │   └── doc_1704067500000_qwe123.json
│   │   └── files/
│   │       ├── 1704067600000_report.pdf      # Actual file
│   │       └── 1704067700000_image.png
│   └── proj_1704067300000_def456/
│       ├── documents/
│       └── files/
```

### S3 Metadata Formats

#### Project Metadata (`{companyId}/projects/{projectId}.json`)

```json
{
  "id": "proj_1704067200000_abc123",
  "name": "Q4 Marketing Campaign",
  "description": "Marketing materials and analysis for Q4 2024",
  "companyId": "company123",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-02T15:30:00.000Z"
}
```

#### Document Metadata (`{companyId}/{projectId}/documents/{documentId}.json`)

```json
{
  "id": "doc_1704067400000_xyz789",
  "name": "Campaign Analysis Report.pdf",
  "type": "application/pdf",
  "size": 2048576,
  "status": "processed",
  "url": "https://bucket.s3.region.amazonaws.com/company123/proj_123/files/1704067600000_report.pdf",
  "thumbnailUrl": "https://bucket.s3.region.amazonaws.com/company123/proj_123/files/thumb_1704067600000_report.jpg",
  "projectId": "proj_1704067200000_abc123",
  "content": "Extracted text content for search...",
  "createdAt": "2024-01-01T10:06:40.000Z",
  "updatedAt": "2024-01-01T10:07:00.000Z"
}
```

## DynamoDB (Amplify DataStore) Structure

### Tables and Schema

#### Company Table

```graphql
type Company @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  name: String!
  description: String
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
  projects: [Project] @hasMany(indexName: "byCompany", fields: ["id"])
  users: [UserCompany] @hasMany(indexName: "byCompany", fields: ["id"])
}
```

#### Project Table

```graphql
type Project @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  name: String!
  description: String
  companyId: ID! @index(name: "byCompany")
  slug: String
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
  company: Company @belongsTo(fields: ["companyId"])
  documents: [Document] @hasMany(indexName: "byProject", fields: ["id"])
}
```

#### Document Table

```graphql
type Document @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  name: String!
  type: String!
  size: Int!
  status: DocumentStatus # enum: processed, processing, failed
  s3Key: String! # Path to actual file in S3
  s3Url: String # Pre-signed URL
  thumbnailS3Key: String # Path to thumbnail in S3
  thumbnailUrl: String # Pre-signed thumbnail URL
  projectId: ID! @index(name: "byProject")
  mimeType: String
  content: String # Processed text content
  tags: [String]
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
  project: Project @belongsTo(fields: ["projectId"])
}
```

### DynamoDB Secondary Indexes

- **byCompany**: `companyId` + `createdAt` (for projects)
- **byProject**: `projectId` + `createdAt` (for documents)
- **byStatus**: `status` (for document processing queries)

## File Upload and Storage Flow

### **🔍 Real File Creation Flow**

**Current Implementation (Hybrid: DynamoDB + S3):**

```typescript
// 1. User uploads file through FileUploader component
const result = await uploadDocumentToS3(file, projectId, companyId)
// File stored at: companyId/projectId/files/timestamp_filename

// 2. Document metadata is created in DynamoDB (PRIMARY) + S3 backup
const document = await documentService.createDocument(companyId, projectId, {
  name: file.name,
  type: file.type,
  size: file.size,
  status: 'processing',
  url: result.url,
})
// Primary: DynamoDB Document table with s3Key reference
// Backup: companyId/projectId/documents/documentId.json
```

### **📁 Actual Data Retrieval Flow**

**Current Implementation (Hybrid: DynamoDB + S3):**

```typescript
// Get all documents for a project (from DynamoDB primary)
const documents = await documentService.getDocumentsByProject(projectId)
// Reads from: DynamoDB Document table with efficient queries

// Get single document with pre-signed URLs
const document = await documentService.getDocument(
  companyId,
  projectId,
  documentId,
)
// Primary: DynamoDB lookup, generates fresh S3 pre-signed URLs as needed
// Backup: S3 JSON files available for consistency checks

// Get actual file from S3
const fileUrl = document.url // Pre-signed S3 URL (1 hour expiration)
```

## Configuration and Environment

### AWS Configuration (via `aws-config.ts`)

```typescript
// Primary source: Amplify outputs
const bucketName = amplifyOutputs.storage?.bucket_name

// Fallback: Environment variables
const bucketName = env.S3_BUCKET_NAME

// Current configuration:
// - Bucket: amplify-vitereactshadcnts-amplifyteamdrivebucket28-3sjth3rkm1cu
// - Region: us-east-1
// - Credentials: From environment variables
```

### Data Access Patterns

#### Creating a Project

1. Generate unique project ID: `proj_${timestamp}_${randomString}`
2. Store project metadata in DynamoDB via GraphQL (PRIMARY)
3. Store backup metadata in S3 at `{companyId}/projects/{projectId}.json` (BACKUP)

#### Uploading a Document

1. Upload file to S3: `${companyId}/${projectId}/files/${timestamp}_${filename}`
2. Create document record in DynamoDB with S3 key reference (PRIMARY)
3. Store document metadata backup in S3: `${companyId}/${projectId}/documents/${documentId}.json` (BACKUP)

#### Retrieving Project Data

1. Query DynamoDB for project and related documents (PRIMARY)
2. Generate signed URLs for S3 file access when needed
3. Use secondary indexes for efficient queries
4. S3 JSON backup available for verification/recovery

## Data Verification Tools

### DataStructureDebugger Component

Navigate to `/data-structure-test` to access the verification tool that:

- ✅ Lists all S3 objects and their hierarchy
- ✅ Analyzes company/project/document structure
- ✅ Verifies metadata consistency
- ✅ Shows file distribution and organization
- ✅ Compares expected vs actual structure

### Verification Functions

```typescript
// Verify complete data structure
const report = await verifyDataStructure(companyId?)

// Print detailed console report
printDataStructureReport(report)

// Quick verification
await quickVerify(companyId?)
```

## Migration and Compatibility

The system implements a **hybrid approach** with dual writes:

- **Primary Storage**: DynamoDB (fast queries, relationships, Amplify integration)
- **Backup Storage**: S3 JSON metadata (legacy compatibility, data recovery)
- **File Storage**: S3 only (with proper hierarchy)

This allows for:

- **Fast queries** via DynamoDB with proper indexing
- **Data durability** with S3 JSON backups
- **Pre-signed URLs** for secure file access
- **Gradual migration** capabilities if needed
- **Data consistency verification** across both systems

## Security and Access Control

### Authentication

- **Amplify Auth**: Cognito User Pools for user authentication
- **Authorization**: Owner-based access control for all data

### S3 Security

- **IAM Policies**: Restrict access to specific bucket paths
- **Signed URLs**: Temporary access to files (1 hour expiration)
- **Path-based isolation**: Each company's data isolated by prefix

### DynamoDB Security

- **GraphQL Authorization**: Amplify-managed access control
- **Field-level security**: Owner can only access their data
- **Secondary indexes**: Optimized queries with auth enforcement

## Best Practices

1. **Always use the hybrid documentService** for data operations (from `services/hybrid.ts`)
2. **Store files in S3** with consistent naming: `${companyId}/${projectId}/files/${timestamp}_${filename}`
3. **Primary storage is DynamoDB** for metadata with S3 backup
4. **Use signed URLs** for temporary file access (1 hour expiration)
5. **Implement proper error handling** for both DynamoDB and S3 operations
6. **Verify data consistency** using the debugging tools regularly

## Monitoring and Debugging

- **Console Logging**: All services log operations for debugging
- **Error Handling**: Comprehensive error catching and reporting
- **Data Structure Verification**: Built-in tools for structure analysis
- **AWS CloudWatch**: Monitor S3 and DynamoDB usage (when configured)

This documentation provides a complete overview of how data flows through the system and where everything is stored. Use the verification tools to confirm the structure matches expectations and troubleshoot any data organization issues.
