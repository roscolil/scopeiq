# ScopeIQ — Solution Document

**Platform:** ScopeIQ by Exelion  
**Version:** MVP (Production)  
**Classification:** Technical Pitch — Architecture & Capabilities

---

## Executive Summary

ScopeIQ is a cloud-native, AI-powered document intelligence platform purpose-built for the construction industry. It eliminates the friction of manual document review by enabling teams to upload project files — drawings, schedules, specifications, site photos — and interrogate them in plain language. Instead of hunting through folders or scrolling PDFs, a project manager types or speaks a question and receives a precise, sourced answer drawn from the project's entire document corpus.

The platform is multi-tenant, mobile-first, and production-deployed on AWS. It combines frontier AI models (OpenAI GPT-4 Turbo Vision), high-performance vector search (Pinecone), enterprise-grade authentication (AWS Cognito), and an adaptive voice interface that works across devices without manual configuration.

**Core value proposition:** *Stop Searching. Start Knowing.*

---

## Problem Statement

Construction projects generate enormous volumes of documentation — RFIs, submittals, drawings, specifications, safety plans, inspection reports, change orders. This information is critical but chronically inaccessible:

- Information is siloed across file shares, email threads, and physical binders.
- Keyword search returns too many irrelevant results or misses conceptually related content.
- Reviewing drawings and images for quantities or compliance details requires trained eyes and significant time.
- Field teams on mobile devices cannot realistically navigate complex desktop document tools.

The result is costly rework, missed specifications, compliance exposure, and project delays — all caused by an information access problem, not an information availability problem. ScopeIQ solves the access layer.

---

## Key Features

### 1. Semantic Document Search

ScopeIQ moves beyond keyword matching. Documents are chunked, embedded using OpenAI's `text-embedding-ada-002` model (1,536-dimensional vectors), and indexed in Pinecone. When a user submits a query, the system performs cosine similarity search across the relevant vector namespace, returning semantically matched passages regardless of exact word choice.

**Capabilities:**
- Project-scoped search across the entire document corpus
- Document-scoped search for precision queries within a single file
- Hybrid search combining project-specific content with a curated common terms knowledge base (building codes, OSHA standards, ASTM specifications)
- Smart routing that automatically selects the optimal namespace based on query context
- 30–50% faster retrieval for common industry queries via the shared knowledge layer

### 2. GPT-4 Turbo Vision Analysis

Images and PDFs with embedded images are processed through OpenAI's `gpt-4-turbo` vision model with construction-specific prompt engineering. The system does not treat images as black boxes — it extracts structured, queryable intelligence from them.

**Capabilities:**
- Quantity counting: rebar, pipes, lumber, fixings, openings
- Material identification and specification matching
- Drawing interpretation: floor plans, schematics, elevation drawings
- Safety compliance assessment: PPE presence, hazard identification
- Construction progress assessment from site photographs
- Accuracy improvement of 25–28 percentage points over standard text-only processing on construction documents

### 3. Intelligent Document Processing Pipeline

Every document entering the system passes through a multi-stage processing pipeline before it becomes searchable.

```
Upload → S3 Storage → File Type Classification → Content Extraction → 
AI Embedding / Vision Analysis → Pinecone Indexing → Query-Ready
```

**File type handling:**
- **PDFs:** Text extracted via PDF.js worker (client-side, no server round-trip for text), embedded images detected and routed to GPT-4 Vision
- **Images:** Direct vision analysis pipeline
- **Text documents:** Fast-path text extraction and embedding generation

Metadata — document name, project, company, S3 key, timestamp, MIME type — is stored alongside every vector, enabling precise filtering at the database level.

### 4. Multi-Modal Voice Interface

Voice is a first-class interaction modality, not a bolt-on feature. ScopeIQ implements a device-aware dual-architecture voice system that prevents the recognition conflicts and duplicate submission issues common to naive implementations.

**Input — Web Speech API:**
- Desktop (≥768px): `VoiceInput` component with 2.5-second silence detection, manual start/stop control
- Mobile (<768px): `VoiceShazamButton` with 1.3-second silence detection, one-tap auto-submit experience
- Real-time transcript display as the user speaks
- Error recovery: accumulated transcript submitted even on recognition failure
- Voice loop prevention: input recognition paused during AI response playback

**Output — AWS Nova Sonic / Polly:**
- AWS Bedrock Nova Sonic (`amazon.nova-sonic-v1:0`) for AI-quality voice synthesis
- Contextual voice prompts: welcome, guidance, listening confirmation, result narration, error handling
- Multiple voice options; default is "Ruth" (professional female, 24kHz MP3)
- Graceful degradation to browser TTS when AWS is unavailable

### 5. Multi-Tenant Role-Based Access Control

ScopeIQ is architecturally multi-tenant from the ground up. Every data access path enforces company-level isolation. Within each company, a three-tier RBAC model controls what users can see and do.

| Capability | Admin | Owner | User |
|---|:---:|:---:|:---:|
| Manage company settings | ✅ | ✅ | ❌ |
| Invite & manage users | ✅ | ✅ | ❌ |
| Create / delete projects | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ✅ |
| Delete documents | ✅ | ✅ | ❌ |
| View / download documents | ✅ | ✅ | ✅ |

Roles are encoded as custom Cognito claims (`custom:role`, `custom:companyId`, `custom:projectIds`) and injected into JWT access tokens via a Pre Token Generation Lambda trigger. Authorization is enforced at four independent layers: route guards, React component guards, AppSync GraphQL resolvers, and DynamoDB authorization rules — providing defense in depth with no single point of authorization bypass.

### 6. Project & Document Management

- Hierarchical organization: Company → Projects → Documents
- Project creation, editing, archiving with metadata
- Document viewer with in-app rendering (PDFs, images)
- Upload progress tracking with real-time status updates
- Bulk operations and document lifecycle management
- User invitation system with time-limited cryptographic invitation tokens

### 7. Admin & AI Training Console

Platform administrators access a dedicated console for system-level management:
- **AI Training Console:** Fine-tune domain terminology, manage embeddings, configure model parameters
- **Common Terms Management:** Curate the shared industry knowledge base (building codes, safety regulations, material specifications)
- **User Management:** Company-level user administration with role assignment
- **Migration tooling:** Data migration utilities for onboarding customers from legacy systems

### 8. Progressive Web App

ScopeIQ is deployed as a PWA with:
- Service worker caching for offline document access
- Add-to-home-screen on iOS and Android
- Mobile-optimized touch UI and responsive layout
- Idle-time route prefetching for perceived instant navigation

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                              │
│  React 18 + TypeScript + Vite   │   PWA / Service Workers         │
│  shadcn/ui + Tailwind CSS       │   Route-based code splitting    │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────────────┐
│                     AWS AMPLIFY HOSTING                            │
│             CloudFront CDN  ←→  Static Web Hosting                 │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────────────────────────────────────┐
│  AUTH LAYER   │   │              API & DATA LAYER                  │
│               │   │                                               │
│ AWS Cognito   │   │  AppSync GraphQL API                          │
│ User Pools    │   │  DynamoDB (multi-tenant, indexed)             │
│ JWT + RBAC    │   │  S3 (documents + thumbnails)                  │
│ MFA support   │   │  Lambda Functions (serverless)                │
└───────┬───────┘   └───────────────────┬───────────────────────────┘
        │                               │
        └──────────────┬────────────────┘
                       │
┌──────────────────────▼────────────────────────────────────────────┐
│                        AI / SEARCH LAYER                          │
│                                                                    │
│  OpenAI GPT-4 Turbo Vision   │   OpenAI text-embedding-ada-002   │
│  Pinecone Vector DB           │   AWS Nova Sonic (TTS)            │
│  PDF.js (client-side)         │   AWS Polly (TTS fallback)        │
│  Construction Terminology DB  │   Python AI Backend (optional)    │
└───────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 + TypeScript | UI runtime |
| Build tooling | Vite | Bundling, HMR, tree-shaking |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| Package management | pnpm | Dependency management |
| Backend platform | AWS Amplify Gen 2 | IaC, CI/CD, hosting |
| API | AWS AppSync (GraphQL) | Real-time API with subscriptions |
| Auth | AWS Cognito User Pools | JWT-based authentication, MFA |
| Database | Amazon DynamoDB | NoSQL multi-tenant storage |
| File storage | Amazon S3 | Document and asset storage |
| CDN | Amazon CloudFront | Global edge distribution |
| Serverless compute | AWS Lambda | Backend triggers and processing |
| AI language model | OpenAI GPT-4 Turbo | Document Q&A, context synthesis |
| AI vision model | OpenAI GPT-4 Turbo Vision | Image and drawing analysis |
| AI embeddings | OpenAI text-embedding-ada-002 | Semantic vector generation |
| Vector database | Pinecone | High-performance similarity search |
| Voice output | AWS Nova Sonic / Polly | TTS voice synthesis |
| Voice input | Web Speech API | Browser-native speech recognition |
| Monitoring | Amazon CloudWatch | Logging, metrics, alerting |

### Data Flow: Document Upload to Query-Ready

```
1. User uploads file via FileUploader component
   └─► File validated, chunked if necessary
   
2. S3 upload via pre-signed URL (no credentials exposed to client)
   └─► Metadata written to DynamoDB via AppSync mutation
   
3. File type classification
   ├─► PDF  → PDF.js text extraction + embedded image detection
   ├─► Image → Direct to GPT-4 Vision pipeline
   └─► Text  → Direct to embedding pipeline
   
4. AI processing
   ├─► Text content → OpenAI embeddings (1,536-dim vectors)
   └─► Images → GPT-4 Vision analysis → structured JSON → embeddings
   
5. Pinecone upsert
   └─► Vectors stored in project-namespaced index with full metadata
   
6. Document status updated in DynamoDB → UI reflects searchable state
```

### Data Flow: Query Execution

```
1. User submits query (text or voice)
   └─► Query scope determined (document-level vs. project-level)
   
2. OpenAI embedding generated for query text

3. Pinecone similarity search
   ├─► Project namespace queried (cosine similarity, top-K results)
   └─► Common terms namespace queried if hybrid mode active
   
4. Top passages retrieved with metadata (source document, confidence)

5. GPT-4 synthesises answer from retrieved context + query
   └─► Response streamed to UI
   
6. (Optional) Nova Sonic TTS: answer spoken aloud
```

### Security Architecture

- **Encryption in transit:** TLS 1.2+ enforced everywhere; Amplify enforces HTTPS
- **Encryption at rest:** S3 SSE-S3; DynamoDB encryption at rest enabled
- **S3 access:** Pre-signed URLs with time-limited expiry; no public bucket access
- **JWT tokens:** 1-hour access token TTL; Cognito refresh token rotation
- **Custom claims:** Role, companyId, projectIds embedded in token; verified server-side on every request
- **DynamoDB rules:** Row-level scoping by companyId enforced at GraphQL resolver level
- **Environment secrets:** All API keys stored as environment variables; never committed to VCS
- **CORS:** Restrictive cross-origin policy; CloudFront origin enforcement

---

## Quantified Capabilities

| Metric | Value |
|---|---|
| Document types supported | PDF, PNG, JPG, WEBP, TIFF, plain text |
| Embedding dimensions | 1,536 (OpenAI ada-002) |
| Vector index metric | Cosine similarity |
| Vision model accuracy uplift (floor plans) | +27 percentage points vs. text-only |
| Vision model accuracy uplift (door schedules) | +25 percentage points |
| Search performance uplift (common terms cache) | 30–50% faster for industry queries |
| Storage reduction (deduplication via common terms) | 20–40% reduction in duplicate embeddings |
| Time-to-query after upload | < 60 seconds for typical PDF |
| Mobile voice silence detection | 1.3 seconds |
| Desktop voice silence detection | 2.5 seconds |
| JWT access token TTL | 60 minutes |
| Pinecone namespace isolation | Per-project namespace |

---

## Business Impact

### For Project Managers
- Retrieve specification details, RFI answers, and drawing notes in seconds rather than minutes
- Reduce document review time by an estimated 70% for common lookup tasks
- Voice-first mobile experience enables queries from the field without returning to a desktop

### For Estimators
- Automated quantity extraction from drawings (door counts, window schedules, room dimensions)
- Structured data outputs with confidence scores for auditability
- 50% faster quantity takeoffs on structured document sets

### For Compliance & Safety Teams
- Natural language queries against OSHA and building code content from the shared knowledge base
- GPT-4 Vision safety assessment on site photographs
- Audit trail via user action logging and Cognito session records

### For IT / Platform Owners
- Serverless architecture eliminates infrastructure management overhead
- Amplify Gen 2 IaC enables reproducible, branch-based deployments
- Multi-tenant isolation by design; no custom sharding logic required
- CloudWatch metrics and logs available out of the box

---

## Pricing

| Tier | Price | Projects | Documents | Storage |
|---|---|---|---|---|
| Starter | $29 / month | Up to 5 | 100 per project | 1 GB |
| Professional | $79 / month | Up to 25 | Unlimited | 10 GB |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

All plans include a 14-day free trial. Enterprise plans include SSO integration, dedicated support, custom AI model training, and advanced security configuration.

---

## Deployment & Scalability

**Infrastructure as Code:** The entire backend is defined in TypeScript using Amplify Gen 2 (`amplify/backend.ts`). Environments (dev, staging, production) are branch-mapped and deploy automatically on push.

**Serverless-first:** Lambda functions handle event-driven processing (post-confirmation user setup, document processing triggers, invitation emails). Auto-scaling is implicit; there are no instances to manage.

**Global delivery:** CloudFront CDN serves the SPA and static assets from edge locations. Dynamic API traffic routes through AppSync with DynamoDB auto-scaling.

**Vector scale:** Pinecone handles similarity search at scale with sub-10ms P95 query latency. Namespacing per project means cross-tenant queries are architecturally impossible.

**Optional Python backend:** A FastAPI sidecar service provides enhanced PDF chunking, structured element extraction, and multi-turn conversational AI. The frontend detects availability at runtime and falls back gracefully to the native AWS/OpenAI stack when the Python backend is absent.

---

## Competitive Differentiation

| Capability | ScopeIQ | Generic Document AI | Procore / PlanGrid |
|---|:---:|:---:|:---:|
| Construction-domain vision analysis | ✅ | ❌ | Partial |
| Voice-to-query with auto-submission | ✅ | ❌ | ❌ |
| Hybrid vector + knowledge base search | ✅ | ❌ | ❌ |
| Multi-tenant RBAC with project-level isolation | ✅ | Varies | ✅ |
| Document-scoped vs. project-scoped query toggle | ✅ | ❌ | ❌ |
| Serverless, zero-ops backend | ✅ | Varies | ❌ |
| 14-day free trial, transparent pricing | ✅ | Varies | ❌ |

---

## Roadmap Highlights

- **Computer Vision expansion:** Real-time progress photo analysis with delta detection across site visit series
- **Enhanced extraction accuracy:** Structured element extraction (doors, windows, rooms, measurements) with spatial relationship mapping — POC demonstrates 92% accuracy on floor plans
- **SSO / IdP integration:** SAML 2.0 and OIDC federation for enterprise identity providers
- **Advanced embedding fine-tuning:** Domain-adapted embedding models trained on construction corpora
- **Biometric authentication:** WebAuthn/FIDO2 passkey support for mobile field access
- **Real-time collaboration:** AppSync subscriptions for live multi-user document annotation

---

## Summary

ScopeIQ is not a search tool with an AI label on it. It is a purpose-built intelligence layer that sits between construction teams and their documentation, converting static files into a live, queryable knowledge base accessible by voice or text from any device. The architecture is production-grade, the security model is enterprise-ready, and the AI stack is built on the frontier models available today.

The construction industry is a $13 trillion global market underserved by software that understands what construction teams actually need to know. ScopeIQ closes that gap.

---

*For technical due diligence, architecture deep-dives, or enterprise sales inquiries: contact@scopeiq.com*
