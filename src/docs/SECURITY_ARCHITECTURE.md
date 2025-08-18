# ScopeIQ Security Architecture & Cognito Setup

## Overview

This document outlines the comprehensive security architecture for ScopeIQ, implementing role-based access control (RBAC) with AWS Cognito User and Identity Pools following security best practices.

## User Roles & Permissions

### Role Hierarchy

1. **Admin** - Global system administrator
2. **Owner** - Company owner with full company access
3. **User** - Regular user with limited access

### Permission Matrix

| Permission         | Admin | Owner | User |
| ------------------ | ----- | ----- | ---- |
| **Company Level**  |
| Manage Company     | ✅    | ✅    | ❌   |
| Manage Users       | ✅    | ✅    | ❌   |
| View All Projects  | ✅    | ✅    | ❌   |
| **Project Level**  |
| Create Projects    | ✅    | ✅    | ❌   |
| Delete Projects    | ✅    | ✅    | ❌   |
| Edit Projects      | ✅    | ✅    | ❌   |
| **Document Level** |
| Upload Documents   | ✅    | ✅    | ✅   |
| Delete Documents   | ✅    | ✅    | ❌   |
| View Documents     | ✅    | ✅    | ✅   |
| Download Documents | ✅    | ✅    | ✅   |

## AWS Cognito Configuration

### User Pool Settings

- **Email-based authentication** with mandatory email verification
- **Strong password policy**: 12+ characters, mixed case, numbers, symbols
- **MFA support**: Optional TOTP and SMS
- **Account recovery**: Email-only for security
- **Custom attributes** for RBAC and multi-tenancy

### Custom Attributes

- `custom:role` - User role (Admin/Owner/User)
- `custom:companyId` - Associated company ID
- `custom:projectIds` - JSON array of accessible project IDs
- `custom:lastLoginAt` - Last login timestamp

### Cognito Groups

- **Admin** - Global administrators
- **Owner** - Company owners
- **User** - Regular users

### Lambda Triggers

1. **Post Confirmation** - Creates user in database, assigns default company
2. **Pre Token Generation** - Adds custom claims to JWT tokens

## Security Implementation

### 1. Authentication Flow

```
User Sign Up → Email Verification → Post Confirmation Trigger →
Database User Creation → Group Assignment → JWT with Custom Claims
```

### 2. Authorization Layers

- **Route-level protection** using React Router guards
- **Component-level protection** using `ProtectedComponent`
- **API-level protection** using Amplify authorization rules
- **Database-level protection** using GraphQL authorization

### 3. JWT Token Structure

```json
{
  "custom:role": "Owner",
  "custom:companyId": "company-123",
  "custom:projectIds": "[\"proj-1\", \"proj-2\"]",
  "custom:userId": "user-456",
  "custom:userName": "John Doe",
  "custom:isActive": "true",
  "custom:lastLoginAt": "2025-08-17T10:30:00Z",
  "cognito:groups": ["Owner"]
}
```

## Database Authorization Rules

### Company Model

- **Admin**: Full CRUD access across all companies
- **Owner**: Read/Update access to their company
- **User**: Read access to their company only

### User Model

- **Admin**: Full CRUD access to all users
- **Owner**: CRUD access to users in their company
- **User**: Read/Update access to their own profile

### Project Model

- **Admin/Owner**: Full access to all company projects
- **User**: Access only to assigned projects

### Document Model

- **Admin/Owner**: Full access to all company documents
- **User**: Access only to documents in assigned projects

## Security Best Practices Implemented

### 1. Principle of Least Privilege

- Users only get minimum permissions needed for their role
- Project-level access control for granular permissions
- Regular users cannot manage company settings or other users

### 2. Defense in Depth

- Multiple authorization layers (JWT, API, Database, Component)
- Client-side AND server-side permission checks
- Secure token handling with automatic refresh

### 3. Multi-tenancy Security

- Company-level data isolation
- User data scoped to their company
- No cross-company data access

### 4. Secure Token Management

- Short-lived access tokens (1 hour)
- Refresh tokens for seamless experience
- Custom claims for stateless authorization
- Automatic group assignment based on role

### 5. Audit Trail

- Last login tracking
- User action logging (can be extended)
- Role change monitoring

## Usage Examples

### Protecting Components

```tsx
import { ProtectedComponent } from '../utils/authorization'
;<ProtectedComponent
  requireRole={['Admin', 'Owner']}
  fallback={<UnauthorizedAccess />}
>
  <AdminPanel />
</ProtectedComponent>
```

### Using Permission Hooks

```tsx
import { usePermissions } from '../hooks/user-roles'

function DocumentActions({ documentId }) {
  const { hasPermission, canAccessProject } = usePermissions()

  if (!hasPermission('canDeleteDocuments')) {
    return null
  }

  return <DeleteButton documentId={documentId} />
}
```

### Programmatic Authorization

```tsx
import { useAuthorization } from '../hooks/auth-utils'

function ProjectSettings({ projectId }) {
  const { isAuthorized } = useAuthorization()

  const canManage = isAuthorized({
    requireRole: ['Admin', 'Owner'],
    requireProject: projectId,
  })

  if (!canManage) {
    return <div>Access denied</div>
  }

  return <ProjectSettingsForm />
}
```

## Deployment Security Checklist

- [ ] Enable Cognito advanced security features
- [ ] Configure proper CORS settings
- [ ] Set up CloudTrail for audit logging
- [ ] Enable AWS WAF for API protection
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security assessments
- [ ] User access reviews

## Migration & Rollout Plan

1. **Phase 1**: Deploy new auth configuration
2. **Phase 2**: Update existing users with roles
3. **Phase 3**: Implement component-level protection
4. **Phase 4**: Add API-level authorization
5. **Phase 5**: Security testing and validation

This architecture provides enterprise-grade security while maintaining usability and scalability for ScopeIQ's multi-tenant document management platform.
