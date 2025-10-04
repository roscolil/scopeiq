# RBAC Implementation Completion Plan

## Executive Summary

This document outlines the gaps in the current Role-Based Access Control (RBAC) implementation and provides a comprehensive plan to complete it. The system has a solid foundation with role definitions, permissions, and utilities in place, but lacks enforcement in the UI and complete integration across all components.

---

## Current State Analysis

### ✅ What's Implemented

#### 1. **Role & Permission Foundation**

- **Roles Defined:** Admin, Owner, User
- **Permission Matrix:** Complete matrix covering company, project, and document levels
- **Location:**
  - `src/hooks/user-roles.tsx`
  - `src/services/auth/user-management.ts`
  - `src/types/entities.d.ts`

#### 2. **Authentication Infrastructure**

- AWS Cognito User Pools with groups (Admin, Owner, User)
- JWT token integration with custom claims
- Session management via `aws-amplify/auth`

#### 3. **Database Schema**

- Enhanced User model with role field
- UserInvitation system
- UserProject for granular access control
- Authorization rules at data layer (`amplify/data/resource.ts`)

#### 4. **Permission Utilities**

- `useUserContext()` - extracts user context from JWT
- `usePermissions()` - permission checking hooks
- `useAuthorization()` - combined authorization logic
- `ProtectedComponent` - component wrapper
- `withAuthorization()` - HOC for protecting components
- `AuthUtils` - common authorization patterns

#### 5. **UI Components**

- UserManagement page
- UserForm component
- UserTable component
- User invitation flow

#### 6. **Route Protection**

- `AdminGuard` component
- Admin routes protected in App.tsx

---

## ❌ Critical Gaps Identified

### 1. **Permission Enforcement Not Applied in UI** (HIGH PRIORITY)

**Issue:** Pages and components don't conditionally render based on user permissions.

**Affected Areas:**

- `src/pages/projects/Projects.tsx` - "New Project" button always visible
- `src/pages/projects/ProjectDetails.tsx` - Edit/Delete buttons always visible
- `src/components/documents/DocumentList.tsx` - Delete action always available
- `src/pages/dashboard/Dashboard.tsx` - All features visible to all roles

**Impact:** Users see and can click buttons they shouldn't have access to, leading to errors or unauthorized actions.

---

### 2. **Inconsistent Permission Definitions** (HIGH PRIORITY)

**Issue:** Two different permission sets exist in the codebase:

**Set 1** (`src/hooks/user-roles.tsx`):

```typescript
{
  ;(canManageCompany,
    canManageUsers,
    canViewAllProjects,
    canCreateProjects,
    canDeleteProjects,
    canEditProjects,
    canUploadDocuments,
    canDeleteDocuments,
    canViewDocuments,
    canDownloadDocuments)
}
```

**Set 2** (`src/services/auth/user-management.ts`):

```typescript
{
  ;(canInviteUsers,
    canDeleteUsers,
    canManageProjects,
    canViewAllProjects,
    canEditProjects,
    canDeleteProjects,
    canAccessAnalytics,
    canManageSettings)
}
```

**Impact:** Confusion about which permissions to use, potential security gaps.

---

### 3. **Project-Level Access Control Not Enforced** (MEDIUM PRIORITY)

**Issue:** UserProject assignments exist in the database schema but aren't used in the frontend.

**Problems:**

- All authenticated users see all projects in their company
- No filtering based on project assignments
- `canAccessProject()` function exists but isn't called consistently
- Regular Users should only see assigned projects

**Current Implementation:**

```typescript
// In user-roles.tsx - exists but not used
const canAccessProject = (projectId: string): boolean => {
  if (!userContext) return false

  // Admin and Owner can access all projects
  if (userContext.role === 'Admin' || userContext.role === 'Owner') {
    return true
  }

  // Regular users can only access assigned projects
  return userContext.projectIds.includes(projectId)
}
```

**Impact:** Security issue - Users can access projects they shouldn't.

---

### 4. **Missing Route Guards** (MEDIUM PRIORITY)

**Current State:**

- Only `AdminGuard` exists
- `CompanyGuard`, `ProjectGuard`, `DocumentGuard` are imported but implementation unclear
- No Owner-specific guards
- No project-specific access verification on routes

**Needed Guards:**

- `OwnerOrAdminGuard` - for management features
- Enhanced `ProjectGuard` - verify user has access to specific project
- Enhanced `DocumentGuard` - verify user has access to document's project

---

### 5. **Document Operations Missing Permission Checks** (HIGH PRIORITY)

**Issue:** Document upload/delete operations don't verify permissions.

**Problems in `DocumentList.tsx`:**

- Delete button always shown (line 358-361)
- No check for `canDeleteDocuments` permission
- No verification of project access

**Problems in Upload Components:**

- Upload dialog doesn't check `canUploadDocuments`
- No project access verification before upload

---

### 6. **User Management Page Not Integrated** (MEDIUM PRIORITY)

**Issues in `src/pages/admin/UserManagement.tsx`:**

```typescript
// Line 52, 122 - Hardcoded values
const companyId = 'company-1'
const invitedBy = 'current-user-id'
```

**Should be:**

```typescript
const { userContext } = useUserContext()
const companyId = userContext?.companyId || ''
const invitedBy = userContext?.userId || ''
```

**Impact:** User management features non-functional in production.

---

### 7. **Project Creation/Deletion Not Protected** (HIGH PRIORITY)

**Issue:** No permission checks before project operations.

**In `Projects.tsx` (line 309-316):**

```typescript
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  {projects.length > 0 && (
    <DialogTrigger asChild>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-1" />
        New Project
      </Button>
    </DialogTrigger>
  )}
</Dialog>
```

**Should check:**

```typescript
const { hasPermission } = usePermissions()
const canCreateProject = hasPermission('canCreateProjects')

{canCreateProject && projects.length > 0 && (
  <DialogTrigger asChild>...</DialogTrigger>
)}
```

---

### 8. **Backend Authorization Rules Need Verification** (LOW PRIORITY)

**Current Status:**

- Authorization rules defined in `amplify/data/resource.ts`
- Lambda triggers mentioned but implementation unclear:
  - `post-confirmation` - Creates user in database
  - `pre-token-generation` - Adds custom claims to JWT

**Needs:**

- Verify Lambda functions are deployed and working
- Test authorization rules with different roles
- Ensure custom claims are properly added to JWT tokens

---

### 9. **Missing Permission Persistence** (MEDIUM PRIORITY)

**Issue:** UserProject assignments aren't persisted or managed.

**Problems:**

- No UI to assign users to projects
- No service methods to manage UserProject records
- Project assignments in invitation flow unclear

**Needed:**

- Add project assignment UI in UserForm
- Service methods: `assignUserToProject()`, `removeUserFromProject()`
- Bulk assignment capabilities

---

### 10. **No Audit Trail** (LOW PRIORITY)

**Missing:**

- No logging of permission checks
- No audit trail for role changes
- No tracking of who assigned permissions
- No history of access denials

---

## 📋 Implementation Plan

### Phase 1: Fix Critical Permission Enforcement (HIGH PRIORITY)

#### Task 1.1: Unify Permission Definitions

**Time: 2 hours**

**Goal:** Create single source of truth for permissions.

**Steps:**

1. Create new unified permission interface:

```typescript
// src/types/permissions.ts
export interface UnifiedPermissions {
  // Company level
  canManageCompany: boolean
  canManageUsers: boolean
  canInviteUsers: boolean
  canDeleteUsers: boolean
  canViewAllProjects: boolean

  // Project level
  canCreateProjects: boolean
  canEditProjects: boolean
  canDeleteProjects: boolean
  canManageProjects: boolean // Alias for edit + delete

  // Document level
  canUploadDocuments: boolean
  canDeleteDocuments: boolean
  canViewDocuments: boolean
  canDownloadDocuments: boolean

  // Feature level
  canAccessAnalytics: boolean
  canManageSettings: boolean
}
```

2. Update `ROLE_PERMISSIONS` in both locations to use unified interface
3. Create migration guide for developers

**Files to Update:**

- `src/types/permissions.ts` (new)
- `src/hooks/user-roles.tsx`
- `src/services/auth/user-management.ts`
- `src/types/entities.d.ts`

---

#### Task 1.2: Implement Permission Checks in Project Pages

**Time: 3 hours**

**Projects.tsx Updates:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

const Projects = () => {
  const { hasPermission } = usePermissions()
  const canCreateProject = hasPermission('canCreateProjects')

  return (
    <>
      {/* ... */}
      {canCreateProject && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </DialogTrigger>
          {/* ... */}
        </Dialog>
      )}
    </>
  )
}
```

**ProjectDetails.tsx Updates:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

const ProjectDetails = () => {
  const { hasPermission, canAccessProject } = usePermissions()
  const canEditProject = hasPermission('canEditProjects')
  const canDeleteProject = hasPermission('canDeleteProjects')
  const hasProjectAccess = canAccessProject(projectId)

  // Early return if no access
  if (!hasProjectAccess) {
    return <UnauthorizedAccess message="You don't have access to this project" />
  }

  return (
    <>
      {/* ... */}
      <div className="flex gap-2">
        {canEditProject && (
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4" /> Edit Project
          </Button>
        )}
        {canDeleteProject && (
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    </>
  )
}
```

**Files to Update:**

- `src/pages/projects/Projects.tsx`
- `src/pages/projects/ProjectDetails.tsx`

---

#### Task 1.3: Implement Permission Checks in Document Operations

**Time: 2 hours**

**DocumentList.tsx Updates:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

export const DocumentList = ({ documents, projectId, ... }: DocumentListProps) => {
  const { hasPermission, canAccessProject } = usePermissions()
  const canDelete = hasPermission('canDeleteDocuments') && canAccessProject(projectId)
  const canDownload = hasPermission('canDownloadDocuments')

  return (
    <>
      {/* ... */}
      <DropdownMenuContent align="end">
        {canDownload && (
          <DropdownMenuItem onClick={() => downloadDocument(document)}>
            <Download className="h-4 w-4 mr-2" /> Download
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={() => handleDeleteClick(document)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </>
  )
}
```

**FileUploader Updates:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

export const FileUploader = ({ projectId, ... }: FileUploaderProps) => {
  const { hasPermission, canAccessProject } = usePermissions()
  const canUpload = hasPermission('canUploadDocuments') && canAccessProject(projectId)

  if (!canUpload) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">
          You don't have permission to upload documents to this project.
        </p>
      </div>
    )
  }

  // ... existing uploader code
}
```

**Files to Update:**

- `src/components/documents/DocumentList.tsx`
- `src/components/upload/FileUploader.tsx`
- `src/pages/documents/Documents.tsx`

---

### Phase 2: Implement Project-Level Access Control (MEDIUM PRIORITY)

#### Task 2.1: Filter Projects Based on User Role

**Time: 2 hours**

**Goal:** Regular Users only see assigned projects; Admins/Owners see all.

**Projects.tsx Updates:**

```typescript
import { useUserContext, usePermissions } from '@/hooks/user-roles'

const Projects = () => {
  const { userContext } = useUserContext()
  const { hasPermission } = usePermissions()
  const [projects, setProjects] = useState<Project[]>([])

  const loadProjects = async () => {
    try {
      const allProjects = await projectService.getProjects(companyId)

      // Filter based on role
      const canViewAll = hasPermission('canViewAllProjects')

      if (canViewAll) {
        setProjects(allProjects)
      } else {
        // Filter to only assigned projects
        const assignedProjects = allProjects.filter(p =>
          userContext?.projectIds.includes(p.id),
        )
        setProjects(assignedProjects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [companyId, userContext])

  // ... rest of component
}
```

**Files to Update:**

- `src/pages/projects/Projects.tsx`
- `src/pages/dashboard/Dashboard.tsx`

---

#### Task 2.2: Create Enhanced Route Guards

**Time: 3 hours**

**Create OwnerOrAdminGuard:**

```typescript
// src/components/routing/OwnerOrAdminGuard.tsx
import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthorization } from '@/hooks/auth-utils'
import { UnauthorizedAccess } from '@/utils/auth/authorization'

export const OwnerOrAdminGuard: React.FC = () => {
  const { isAuthorized } = useAuthorization()
  const allowed = isAuthorized({ requireRole: ['Admin', 'Owner'] })

  if (!allowed) {
    return <UnauthorizedAccess message="This area is restricted to administrators and owners." />
  }

  return <Outlet />
}
```

**Enhance ProjectGuard:**

```typescript
// src/components/routing/ProjectGuard.tsx
import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { usePermissions } from '@/hooks/user-roles'
import { UnauthorizedAccess } from '@/utils/auth/authorization'
import { PageLoader } from '@/components/shared/PageLoader'

export const ProjectGuard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const { canAccessProject } = usePermissions()

  if (!projectId) {
    return <PageLoader type="default" />
  }

  const hasAccess = canAccessProject(projectId)

  if (!hasAccess) {
    return <UnauthorizedAccess message="You don't have access to this project." />
  }

  return <Outlet />
}
```

**Update App.tsx routes:**

```typescript
// Admin-only routes
<Route element={<AdminGuard />}>
  <Route path="admin" element={<AdminConsole />} />
  <Route path="health" element={<HealthConsole />} />
</Route>

// Owner or Admin routes
<Route element={<OwnerOrAdminGuard />}>
  <Route path=":companyId/settings" element={<CompanySettings />} />
  <Route path=":companyId/users" element={<UserManagement />} />
</Route>

// Project-specific routes with access check
<Route path=":companyId/projects/:projectId" element={<ProjectGuard />}>
  <Route index element={<ProjectDetails />} />
  <Route path="documents/:documentId" element={<Viewer />} />
</Route>
```

**Files to Create:**

- `src/components/routing/OwnerOrAdminGuard.tsx`

**Files to Update:**

- `src/components/routing/ProjectGuard.tsx`
- `src/components/routing/DocumentGuard.tsx`
- `src/App.tsx`

---

### Phase 3: Complete User Management Integration (MEDIUM PRIORITY)

#### Task 3.1: Connect UserManagement to Real User Context

**Time: 2 hours**

**UserManagement.tsx Updates:**

```typescript
import { useUserContext } from '@/hooks/user-roles'

export default function UserManagement() {
  const { userContext } = useUserContext()

  // Use real context instead of hardcoded values
  const companyId = userContext?.companyId || ''
  const currentUserId = userContext?.userId || ''
  const currentUserName = userContext?.name || 'Current User'

  // Don't render if no context
  if (!userContext) {
    return <PageLoader type="default" />
  }

  // Check permission to manage users
  if (!userContext.permissions.canManageUsers) {
    return <UnauthorizedAccess message="You don't have permission to manage users." />
  }

  // ... rest of component using real companyId and currentUserId
}
```

**Files to Update:**

- `src/pages/admin/UserManagement.tsx`
- `src/pages/dashboard/ProfileSettings.tsx`

---

#### Task 3.2: Implement User-Project Assignment UI

**Time: 4 hours**

**Goal:** Allow Admins/Owners to assign users to specific projects.

**Create ProjectAssignment Component:**

```typescript
// src/components/admin/ProjectAssignment.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import type { Project, User } from '@/types'

interface ProjectAssignmentProps {
  user: User
  projects: Project[]
  onAssign: (userId: string, projectIds: string[]) => Promise<void>
}

export const ProjectAssignment: React.FC<ProjectAssignmentProps> = ({
  user,
  projects,
  onAssign,
}) => {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(user.projectIds || [])
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = (projectId: string) => {
    const newSelected = new Set(selectedProjects)
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId)
    } else {
      newSelected.add(projectId)
    }
    setSelectedProjects(newSelected)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onAssign(user.id, Array.from(selectedProjects))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Assign Projects to {user.name}</h3>
      <div className="space-y-2 mb-4">
        {projects.map(project => (
          <div key={project.id} className="flex items-center gap-2">
            <Checkbox
              id={`project-${project.id}`}
              checked={selectedProjects.has(project.id)}
              onCheckedChange={() => handleToggle(project.id)}
            />
            <Label htmlFor={`project-${project.id}`}>{project.name}</Label>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Assignments'}
      </Button>
    </Card>
  )
}
```

**Add Service Methods:**

```typescript
// src/services/auth/user-management.ts

class UserManagementService {
  // ... existing methods ...

  async assignUserToProjects(
    userId: string,
    projectIds: string[],
  ): Promise<boolean> {
    try {
      // First, remove existing assignments
      // Then, create new assignments
      for (const projectId of projectIds) {
        await client.models.UserProject.create({
          userId: userId as string & string[],
          projectId: projectId as string & string[],
        })
      }
      return true
    } catch (error) {
      console.error('Error assigning user to projects:', error)
      return false
    }
  }

  async removeUserFromProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    try {
      // Query and delete UserProject record
      const { data: assignments } = await client.models.UserProject.list({
        filter: {
          userId: { eq: userId },
          projectId: { eq: projectId },
        },
      })

      if (assignments && assignments.length > 0) {
        await client.models.UserProject.delete({ id: assignments[0].id })
      }

      return true
    } catch (error) {
      console.error('Error removing user from project:', error)
      return false
    }
  }

  async getUserProjectAssignments(userId: string): Promise<string[]> {
    try {
      const { data: assignments } = await client.models.UserProject.list({
        filter: { userId: { eq: userId } },
      })

      return assignments?.map(a => a.projectId) || []
    } catch (error) {
      console.error('Error getting user project assignments:', error)
      return []
    }
  }
}
```

**Files to Create:**

- `src/components/admin/ProjectAssignment.tsx`

**Files to Update:**

- `src/services/auth/user-management.ts`
- `src/components/admin/UserForm.tsx`

---

### Phase 4: Backend Verification & Testing (LOW PRIORITY)

#### Task 4.1: Verify Lambda Functions

**Time: 2 hours**

**Check post-confirmation Lambda:**

```typescript
// amplify/functions/post-confirmation/handler.ts
// Verify it:
// 1. Creates User record in DynamoDB
// 2. Assigns default role
// 3. Adds user to default company
// 4. Handles errors gracefully
```

**Check pre-token-generation Lambda:**

```typescript
// amplify/functions/pre-token-generation/handler.ts
// Verify it:
// 1. Fetches user data from DynamoDB
// 2. Adds custom claims to JWT:
//    - custom:role
//    - custom:companyId
//    - custom:projectIds
//    - custom:userId
//    - custom:userName
//    - custom:isActive
```

**Testing Steps:**

1. Deploy Lambda functions
2. Test signup flow → verify User created
3. Test signin flow → inspect JWT token for custom claims
4. Test role change → verify JWT updated on next login

**Files to Review:**

- `amplify/functions/post-confirmation/handler.ts`
- `amplify/functions/pre-token-generation/handler.ts`

---

#### Task 4.2: Test Authorization Rules

**Time: 3 hours**

**Test Matrix:**

| Action                  | Admin | Owner | User | Expected Result                 |
| ----------------------- | ----- | ----- | ---- | ------------------------------- |
| Create Company          | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |
| Create Project          | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |
| Delete Project          | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |
| Upload Document         | ✅    | ✅    | ✅   | All succeed                     |
| Delete Document         | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |
| View Assigned Project   | ✅    | ✅    | ✅   | All succeed                     |
| View Unassigned Project | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |
| Manage Users            | ✅    | ✅    | ❌   | Admin/Owner succeed, User fails |

**Testing Script:**

```typescript
// tests/rbac/authorization.test.ts
describe('RBAC Authorization', () => {
  describe('Admin Role', () => {
    it('should allow project creation', async () => {
      // Test implementation
    })
    it('should allow user management', async () => {
      // Test implementation
    })
  })

  describe('Owner Role', () => {
    it('should allow project creation', async () => {
      // Test implementation
    })
    it('should allow user management in own company', async () => {
      // Test implementation
    })
  })

  describe('User Role', () => {
    it('should NOT allow project creation', async () => {
      // Test implementation
    })
    it('should only see assigned projects', async () => {
      // Test implementation
    })
  })
})
```

**Files to Create:**

- `tests/rbac/authorization.test.ts`

---

### Phase 5: Polish & Documentation (LOW PRIORITY)

#### Task 5.1: Add Audit Logging

**Time: 3 hours**

**Create Audit Service:**

```typescript
// src/services/audit/audit-log.ts
interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId: string
  result: 'allowed' | 'denied'
  timestamp: string
  metadata?: Record<string, any>
}

class AuditLogService {
  async logPermissionCheck(entry: AuditLogEntry): Promise<void> {
    // Log to CloudWatch or DynamoDB
    console.log('[AUDIT]', JSON.stringify(entry))
  }

  async logRoleChange(
    userId: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
  ): Promise<void> {
    await this.logPermissionCheck({
      userId: changedBy,
      action: 'ROLE_CHANGE',
      resource: 'User',
      resourceId: userId,
      result: 'allowed',
      timestamp: new Date().toISOString(),
      metadata: { oldRole, newRole },
    })
  }
}

export const auditLog = new AuditLogService()
```

**Integrate with Permission Checks:**

```typescript
// In useAuthorization hook
const isAuthorized = (config): boolean => {
  const result =
    /* ... existing logic ... */

    // Log the check
    auditLog.logPermissionCheck({
      userId: userContext?.userId || 'unknown',
      action: config.requirePermission?.toString() || 'unknown',
      resource: config.requireProject || 'general',
      resourceId: config.requireProject || 'n/a',
      result: result ? 'allowed' : 'denied',
      timestamp: new Date().toISOString(),
    })

  return result
}
```

**Files to Create:**

- `src/services/audit/audit-log.ts`

**Files to Update:**

- `src/hooks/auth-utils.ts`
- `src/services/auth/user-management.ts`

---

#### Task 5.2: Update Documentation

**Time: 2 hours**

**Update Existing Docs:**

- `src/docs/RBAC_IMPLEMENTATION.md` - Add completed features
- `src/docs/SECURITY_ARCHITECTURE.md` - Update with actual implementation
- `src/docs/USER_MANAGEMENT.md` - Add project assignment section

**Create New Docs:**

- `src/docs/PERMISSION_GUIDE.md` - Guide for developers
- `src/docs/TESTING_RBAC.md` - How to test permissions

**Files to Update:**

- `src/docs/RBAC_IMPLEMENTATION.md`
- `src/docs/SECURITY_ARCHITECTURE.md`
- `src/docs/USER_MANAGEMENT.md`

**Files to Create:**

- `src/docs/PERMISSION_GUIDE.md`
- `src/docs/TESTING_RBAC.md`

---

## 🎯 Implementation Priority & Timeline

### Week 1: Critical Fixes (HIGH PRIORITY)

- **Day 1-2:** Task 1.1 - Unify permission definitions
- **Day 2-3:** Task 1.2 - Add permission checks to project pages
- **Day 3-4:** Task 1.3 - Add permission checks to document operations
- **Day 5:** Testing and bug fixes

**Deliverable:** Core RBAC enforcement working in UI

---

### Week 2: Access Control (MEDIUM PRIORITY)

- **Day 1-2:** Task 2.1 - Implement project filtering
- **Day 3-4:** Task 2.2 - Create and integrate route guards
- **Day 5:** Testing and bug fixes

**Deliverable:** Project-level access control enforced

---

### Week 3: User Management (MEDIUM PRIORITY)

- **Day 1-2:** Task 3.1 - Connect UserManagement to real context
- **Day 3-5:** Task 3.2 - Build project assignment UI and services

**Deliverable:** Full user management capabilities

---

### Week 4: Backend & Polish (LOW PRIORITY)

- **Day 1-2:** Task 4.1 - Verify Lambda functions
- **Day 2-3:** Task 4.2 - Test authorization rules
- **Day 4:** Task 5.1 - Add audit logging
- **Day 5:** Task 5.2 - Update documentation

**Deliverable:** Production-ready RBAC system

---

## 🧪 Testing Checklist

### Manual Testing

#### As Admin:

- [ ] Can create/edit/delete projects
- [ ] Can see all projects in company
- [ ] Can upload/delete documents
- [ ] Can access user management
- [ ] Can assign roles to users
- [ ] Can access admin console

#### As Owner:

- [ ] Can create/edit/delete projects
- [ ] Can see all projects in company
- [ ] Can upload/delete documents
- [ ] Can access user management in own company
- [ ] Can invite users
- [ ] Cannot access global admin features

#### As User:

- [ ] Cannot create projects
- [ ] Only sees assigned projects
- [ ] Can upload documents
- [ ] Cannot delete documents
- [ ] Cannot access user management
- [ ] Cannot see edit/delete project buttons

### Automated Testing

```typescript
// Example test structure
describe('RBAC System', () => {
  describe('Project Access', () => {
    it('Admin can access all projects')
    it('Owner can access all company projects')
    it('User can only access assigned projects')
    it('User cannot access unassigned projects')
  })

  describe('Document Operations', () => {
    it('User can upload to assigned project')
    it('User cannot delete documents')
    it('Admin can delete any document')
  })

  describe('UI Rendering', () => {
    it('Shows create button only to Admin/Owner')
    it('Shows delete button only to Admin/Owner')
    it('Hides user management from regular users')
  })
})
```

---

## 🚨 Security Considerations

### 1. **Defense in Depth**

- Frontend checks are UX, not security
- Backend authorization rules are the actual security layer
- Never trust client-side permission checks alone

### 2. **JWT Token Validation**

- Verify custom claims are properly signed
- Check token expiration on every request
- Invalidate tokens on role changes

### 3. **Project Access Verification**

- Always verify project access on backend
- Check both role permissions AND project assignments
- Use database-level authorization rules

### 4. **Audit Trail**

- Log all permission checks
- Track role changes
- Monitor failed authorization attempts

---

## 📊 Success Metrics

### Functional Metrics:

- ✅ All UI elements conditionally rendered based on permissions
- ✅ All route guards properly enforcing access control
- ✅ Users can only see/access projects they're assigned to
- ✅ Document operations respect role permissions
- ✅ User management fully integrated with real user context

### Security Metrics:

- ✅ Zero unauthorized access incidents in testing
- ✅ All backend authorization rules verified
- ✅ JWT tokens contain correct custom claims
- ✅ Audit logs capturing all permission checks

### User Experience Metrics:

- ✅ No confusing "access denied" errors after clicking buttons
- ✅ Clear indication of user's role and permissions
- ✅ Appropriate fallback messages when access is denied

---

## 🔗 Related Documentation

- [RBAC Implementation](./src/docs/RBAC_IMPLEMENTATION.md)
- [Security Architecture](./src/docs/SECURITY_ARCHITECTURE.md)
- [User Management](./src/docs/USER_MANAGEMENT.md)
- [Auth Token Security](./src/docs/AUTH_TOKEN_SECURITY.md)

---

## 📞 Questions & Support

For questions about this implementation plan:

1. Review existing documentation in `src/docs/`
2. Check code comments in permission-related files
3. Consult with the team lead

---

**Document Version:** 1.0  
**Last Updated:** October 3, 2025  
**Next Review:** After Phase 1 completion
