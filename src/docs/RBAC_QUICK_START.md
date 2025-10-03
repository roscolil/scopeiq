# RBAC Implementation - Quick Start Guide

## 🎯 Executive Summary

Your RBAC system has a **solid foundation** but needs **enforcement in the UI**. The good news: most utilities exist, they just need to be applied consistently across components.

**Status:** ~60% Complete  
**Time to Completion:** ~4 weeks (phased approach)  
**Immediate Action Needed:** Add permission checks to UI components

---

## 🚨 Critical Issues (Fix First)

### 1. **Permission Checks Missing in UI Components**

**Impact:** High - Security risk, poor UX  
**Effort:** Medium (2-3 days)  
**Files Affected:** `Projects.tsx`, `ProjectDetails.tsx`, `DocumentList.tsx`

**Problem:**

```typescript
// Current: Button always visible
<Button onClick={deleteProject}>Delete Project</Button>

// Needed: Check permission first
const { hasPermission } = usePermissions()
{hasPermission('canDeleteProjects') && (
  <Button onClick={deleteProject}>Delete Project</Button>
)}
```

---

### 2. **Two Different Permission Definitions**

**Impact:** High - Confusion, potential bugs  
**Effort:** Low (2 hours)  
**Files:** `src/hooks/user-roles.tsx` vs `src/services/auth/user-management.ts`

**Solution:** Create unified permission interface in `src/types/permissions.ts`

---

### 3. **Project Access Not Enforced**

**Impact:** High - Security risk  
**Effort:** Medium (2 days)  
**Files:** `Projects.tsx`, `ProjectDetails.tsx`

**Problem:** All users see all company projects, but regular Users should only see assigned projects.

**Solution:**

```typescript
// Filter projects based on user assignments
const { hasPermission, userContext } = usePermissions()
const canViewAll = hasPermission('canViewAllProjects')

const visibleProjects = canViewAll
  ? allProjects
  : allProjects.filter(p => userContext.projectIds.includes(p.id))
```

---

## ✅ What's Already Working

### Strong Foundation:

1. **Role Definitions** - Admin, Owner, User clearly defined
2. **Permission Matrix** - Complete permission set for all roles
3. **Utilities** - `usePermissions()`, `useAuthorization()`, `ProtectedComponent`
4. **Database Schema** - User, UserProject, UserInvitation models ready
5. **AWS Cognito** - Groups and JWT tokens configured
6. **AdminGuard** - Admin routes protected

### Available Utilities You Can Use Today:

```typescript
// Get current user's permissions
const { hasPermission, hasRole, canAccessProject } = usePermissions()

// Check specific permission
if (hasPermission('canDeleteProjects')) {
  // Show delete button
}

// Check role
if (hasRole('Admin')) {
  // Show admin features
}

// Check project access
if (canAccessProject(projectId)) {
  // Allow access
}

// Protect entire components
<ProtectedComponent
  requireRole={['Admin', 'Owner']}
  requirePermission="canManageUsers"
  fallback={<UnauthorizedAccess />}
>
  <UserManagementPanel />
</ProtectedComponent>
```

---

## 🔨 Quick Wins (Easy Fixes, High Impact)

### Quick Win #1: Add Permission Checks to Project Pages

**Time:** 2 hours  
**Impact:** Immediately improves security and UX

**Projects.tsx:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

const Projects = () => {
  const { hasPermission } = usePermissions()

  return (
    <>
      {hasPermission('canCreateProjects') && (
        <Button onClick={openCreateDialog}>New Project</Button>
      )}
    </>
  )
}
```

**ProjectDetails.tsx:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

const ProjectDetails = () => {
  const { hasPermission } = usePermissions()

  return (
    <>
      {hasPermission('canEditProjects') && (
        <Button onClick={openEditDialog}>Edit</Button>
      )}
      {hasPermission('canDeleteProjects') && (
        <Button onClick={openDeleteDialog}>Delete</Button>
      )}
    </>
  )
}
```

---

### Quick Win #2: Add Permission Check to Document Delete

**Time:** 1 hour  
**Impact:** Prevents unauthorized document deletion

**DocumentList.tsx:**

```typescript
import { usePermissions } from '@/hooks/user-roles'

export const DocumentList = ({ documents, projectId }) => {
  const { hasPermission, canAccessProject } = usePermissions()
  const canDelete = hasPermission('canDeleteDocuments') && canAccessProject(projectId)

  return (
    <>
      {canDelete && (
        <Button onClick={handleDelete}>Delete</Button>
      )}
    </>
  )
}
```

---

### Quick Win #3: Filter Projects for Regular Users

**Time:** 2 hours  
**Impact:** Major security improvement

**Projects.tsx:**

```typescript
import { useUserContext, usePermissions } from '@/hooks/user-roles'

const Projects = () => {
  const { userContext } = useUserContext()
  const { hasPermission } = usePermissions()
  const [visibleProjects, setVisibleProjects] = useState<Project[]>([])

  useEffect(() => {
    const loadProjects = async () => {
      const allProjects = await projectService.getProjects(companyId)

      const canViewAll = hasPermission('canViewAllProjects')

      if (canViewAll) {
        setVisibleProjects(allProjects)
      } else {
        // Filter to assigned projects only
        const assigned = allProjects.filter(p =>
          userContext?.projectIds.includes(p.id),
        )
        setVisibleProjects(assigned)
      }
    }

    loadProjects()
  }, [companyId, userContext])

  // ... render visibleProjects instead of all projects
}
```

---

## 📋 Phased Implementation Plan

### Phase 1 (Week 1): Critical UI Fixes

**Goal:** Make UI respect permissions

- [ ] Unify permission definitions
- [ ] Add permission checks to Projects page
- [ ] Add permission checks to ProjectDetails page
- [ ] Add permission checks to DocumentList
- [ ] Add permission checks to FileUploader

**Result:** Users can't click buttons they shouldn't see

---

### Phase 2 (Week 2): Access Control

**Goal:** Enforce project-level access

- [ ] Filter projects based on user assignments
- [ ] Create OwnerOrAdminGuard
- [ ] Enhance ProjectGuard with access check
- [ ] Update routes in App.tsx

**Result:** Users only see projects they have access to

---

### Phase 3 (Week 3): User Management

**Goal:** Complete user management features

- [ ] Connect UserManagement page to real context
- [ ] Build project assignment UI
- [ ] Add service methods for UserProject management
- [ ] Test user invitation flow

**Result:** Fully functional user management

---

### Phase 4 (Week 4): Backend & Polish

**Goal:** Verify backend security, add logging

- [ ] Verify Lambda functions work correctly
- [ ] Test authorization rules
- [ ] Add audit logging
- [ ] Update documentation

**Result:** Production-ready RBAC system

---

## 🧪 How to Test

### Test Each Role Manually:

#### Test as Admin:

```bash
# Create test admin user in Cognito
# Sign in and verify:
1. Can create/edit/delete projects ✓
2. Can see all projects ✓
3. Can delete documents ✓
4. Can access user management ✓
5. Can access admin console ✓
```

#### Test as Owner:

```bash
# Create test owner user
# Sign in and verify:
1. Can create/edit/delete projects ✓
2. Can see all company projects ✓
3. Can delete documents ✓
4. Can manage users in company ✓
5. Cannot access global admin ✓
```

#### Test as User:

```bash
# Create test regular user
# Assign to 1 project only
# Sign in and verify:
1. Cannot create projects ✓
2. Only sees assigned project ✓
3. Can upload documents ✓
4. Cannot delete documents ✓
5. Cannot see user management ✓
```

---

## 📊 Current vs Target State

| Feature              | Current     | Target      | Priority  |
| -------------------- | ----------- | ----------- | --------- |
| Role definitions     | ✅ Complete | ✅ Complete | -         |
| Permission utilities | ✅ Complete | ✅ Complete | -         |
| Database schema      | ✅ Complete | ✅ Complete | -         |
| UI enforcement       | ❌ Missing  | ✅ Complete | 🔴 High   |
| Project filtering    | ❌ Missing  | ✅ Complete | 🔴 High   |
| Route guards         | ⚠️ Partial  | ✅ Complete | 🟡 Medium |
| User management      | ⚠️ Partial  | ✅ Complete | 🟡 Medium |
| Audit logging        | ❌ Missing  | ✅ Complete | 🟢 Low    |

---

## 🎬 Get Started Now

### Step 1: Unify Permissions (30 min)

```bash
# Create unified permission interface
touch src/types/permissions.ts
```

### Step 2: Add First Permission Check (15 min)

```typescript
// In Projects.tsx, add at top:
import { usePermissions } from '@/hooks/user-roles'

// In component:
const { hasPermission } = usePermissions()

// Wrap create button:
{hasPermission('canCreateProjects') && (
  <Button>New Project</Button>
)}
```

### Step 3: Test It

```bash
# Sign in as different roles and verify button visibility
```

### Step 4: Repeat for Other Components

- ProjectDetails.tsx
- DocumentList.tsx
- FileUploader.tsx

---

## 🔗 Reference Files

**Key Files to Update:**

```
src/pages/projects/Projects.tsx
src/pages/projects/ProjectDetails.tsx
src/components/documents/DocumentList.tsx
src/components/upload/FileUploader.tsx
src/types/permissions.ts (new)
src/hooks/user-roles.tsx
src/services/auth/user-management.ts
```

**Utilities to Use:**

```
usePermissions() - Check permissions
useAuthorization() - Combined auth logic
useUserContext() - Get current user
ProtectedComponent - Wrap protected UI
AuthUtils - Helper functions
```

---

## ❓ Common Questions

**Q: Do I need to change the database schema?**  
A: No, the schema is already correct. You just need to use it.

**Q: Are the Lambda functions working?**  
A: They exist but need verification. Test signup and signin to check JWT claims.

**Q: Can I start with just one page?**  
A: Yes! Start with Projects.tsx, get it working, then apply the same pattern everywhere.

**Q: How do I test different roles?**  
A: Create test users in Cognito Console and assign them to different groups (Admin, Owner, User).

**Q: What's the fastest way to see progress?**  
A: Fix Projects.tsx first. It's the most visible and has the most obvious issues.

---

## 🚀 Next Steps

1. **Read the full plan:** [RBAC_COMPLETION_PLAN.md](./RBAC_COMPLETION_PLAN.md)
2. **Start with Quick Win #1:** Add permission checks to Projects page
3. **Test immediately:** Create test users and verify it works
4. **Expand:** Apply same pattern to other pages
5. **Move to Phase 2:** Implement project filtering

---

## 📞 Need Help?

- See detailed implementation in [RBAC_COMPLETION_PLAN.md](./RBAC_COMPLETION_PLAN.md)
- Review existing utilities in `src/hooks/user-roles.tsx`
- Check example usage in `src/components/routing/AdminGuard.tsx`
- Reference permission definitions in `src/types/entities.d.ts`

---

**Remember:** You have all the tools. You just need to use them consistently! 🎯
