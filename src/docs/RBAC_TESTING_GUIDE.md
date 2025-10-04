# RBAC Testing Guide

## Overview

This guide provides step-by-step instructions for testing the Role-Based Access Control (RBAC) system across all three roles: Admin, Owner, and User.

---

## Prerequisites

Before testing:

- [ ] Amplify backend deployed (`npx ampx sandbox`)
- [ ] Lambda functions deployed
- [ ] DynamoDB tables created
- [ ] Cognito User Pool configured with groups
- [ ] Frontend running (`npm run dev`)

---

## Test User Setup

### **Create Test Users**

You'll need 3 test users with different roles:

#### **1. Admin User (admin@test.com)**

```bash
# Via AWS Cognito Console:
1. Go to Cognito User Pool
2. Create user: admin@test.com
3. Set temporary password
4. Add to "Admin" group
5. Create User record in DynamoDB:
   - email: admin@test.com
   - name: Test Admin
   - role: Admin
   - companyId: <your-test-company-id>
   - isActive: true
```

#### **2. Owner User (owner@test.com)**

```bash
# Via AWS Cognito Console:
1. Create user: owner@test.com
2. Set temporary password
3. Add to "Owner" group
4. Create User record in DynamoDB:
   - email: owner@test.com
   - name: Test Owner
   - role: Owner
   - companyId: <your-test-company-id>
   - isActive: true
```

#### **3. Regular User (user@test.com)**

```bash
# Via AWS Cognito Console:
1. Create user: user@test.com
2. Set temporary password
3. Add to "User" group
4. Create User record in DynamoDB:
   - email: user@test.com
   - name: Test User
   - role: User
   - companyId: <your-test-company-id>
   - isActive: true

5. Create UserProject assignments (at least 1):
   - userId: <test-user-id>
   - projectId: <test-project-id>
```

---

## Testing Procedures

### **Test Suite 1: JWT Token Verification**

#### **Test 1.1: Admin JWT**

**Steps:**

1. Sign in as admin@test.com
2. Open browser console
3. Run:

```javascript
import { fetchAuthSession } from 'aws-amplify/auth'
const session = await fetchAuthSession()
console.log('JWT Payload:', session.tokens.idToken.payload)
```

**Expected Results:**

```javascript
{
  "email": "admin@test.com",
  "cognito:groups": ["Admin"], // ✅
  "custom:role": "Admin", // ✅
  "custom:companyId": "<company-id>", // ✅
  "custom:userId": "<user-id>", // ✅
  "custom:userName": "Test Admin", // ✅
  "custom:projectIds": "[]", // ✅ (Admin sees all, may be empty)
  "custom:isActive": "true", // ✅
  "custom:lastLoginAt": "<timestamp>", // ✅
  "custom:tokenIssuedAt": "<timestamp>" // ✅
}
```

**✅ Pass Criteria:**

- All custom claims present
- Role matches "Admin"
- In Admin group

---

#### **Test 1.2: Owner JWT**

**Steps:**

1. Sign out
2. Sign in as owner@test.com
3. Check JWT payload

**Expected Results:**

```javascript
{
  "email": "owner@test.com",
  "cognito:groups": ["Owner"], // ✅
  "custom:role": "Owner", // ✅
  "custom:companyId": "<company-id>", // ✅
  "custom:projectIds": "[]", // ✅ (Owner sees all)
}
```

**✅ Pass Criteria:**

- Role is "Owner"
- In Owner group
- Has companyId

---

#### **Test 1.3: User JWT**

**Steps:**

1. Sign out
2. Sign in as user@test.com
3. Check JWT payload

**Expected Results:**

```javascript
{
  "email": "user@test.com",
  "cognito:groups": ["User"], // ✅
  "custom:role": "User", // ✅
  "custom:companyId": "<company-id>", // ✅
  "custom:projectIds": "[\"project-abc\", \"project-xyz\"]", // ✅ MUST NOT BE EMPTY
}
```

**✅ Pass Criteria:**

- Role is "User"
- In User group
- projectIds array has at least 1 project
- ⚠️ **CRITICAL:** If projectIds is empty, User won't see any projects!

---

### **Test Suite 2: UI Permission Checks**

#### **Test 2.1: Projects Page (as Admin)**

**Steps:**

1. Sign in as admin@test.com
2. Navigate to `/company-id/projects`

**Expected UI:**

- ✅ Can see "New Project" button
- ✅ Can see all company projects
- ✅ Each project shows Edit and Delete buttons

**Actions:**

- ✅ Click "New Project" → Form appears
- ✅ Create project → Success
- ✅ Click Edit on project → Form appears
- ✅ Click Delete → Confirmation dialog

---

#### **Test 2.2: Projects Page (as Owner)**

**Steps:**

1. Sign in as owner@test.com
2. Navigate to `/company-id/projects`

**Expected UI:**

- ✅ Can see "New Project" button
- ✅ Can see all company projects
- ✅ Each project shows Edit and Delete buttons

**Same behavior as Admin** ✓

---

#### **Test 2.3: Projects Page (as User)**

**Steps:**

1. Sign in as user@test.com
2. Navigate to `/company-id/projects`

**Expected UI:**

- ❌ NO "New Project" button visible
- ⚠️ ONLY sees assigned projects (not all company projects)
- ❌ NO Edit or Delete buttons on projects

**Actions to Test:**

- Try to manually navigate to unassigned project URL
- Should see "You don't have access to this project"

---

#### **Test 2.4: Document Operations (as User)**

**Steps:**

1. Sign in as user@test.com
2. Navigate to assigned project
3. View document list

**Expected UI:**

- ✅ Can see documents in assigned project
- ✅ Can click "Add Document" / "Upload"
- ✅ Upload dialog appears
- ✅ Can upload documents

**Document Actions:**

- ✅ Can view documents
- ✅ Can download documents (if permission granted)
- ❌ NO Delete option in dropdown menu

---

#### **Test 2.5: Document Operations (as Admin/Owner)**

**Steps:**

1. Sign in as admin@test.com or owner@test.com
2. Navigate to any project
3. View document list

**Expected UI:**

- ✅ Can see all documents
- ✅ Can upload documents
- ✅ Delete option visible in dropdown
- ✅ Can delete documents

---

### **Test Suite 3: Route Guards**

#### **Test 3.1: AdminGuard**

**As User or Owner:**

```bash
1. Sign in as user@test.com or owner@test.com
2. Navigate to /admin
3. Expected: "Access Denied" page ✓
4. Message: "You must be an administrator..."
```

**As Admin:**

```bash
1. Sign in as admin@test.com
2. Navigate to /admin
3. Expected: AdminConsole page ✓
```

---

#### **Test 3.2: ProjectGuard**

**As User (accessing unassigned project):**

```bash
1. Sign in as user@test.com
2. Get ID of project NOT assigned to this user
3. Navigate to /company-id/unassigned-project-id
4. Expected: "You don't have access to this project" ✓
```

**As User (accessing assigned project):**

```bash
1. Get ID of project assigned to user
2. Navigate to /company-id/assigned-project-id
3. Expected: Project details page loads ✓
```

---

#### **Test 3.3: DocumentGuard**

**As User (accessing document in unassigned project):**

```bash
1. Sign in as user@test.com
2. Navigate to /company-id/unassigned-project-id/document-id
3. Expected: "You don't have access to this document" ✓
```

**As Admin:**

```bash
1. Sign in as admin@test.com
2. Navigate to any document URL
3. Expected: Document viewer loads ✓
```

---

### **Test Suite 4: User Invitation Flow**

#### **Test 4.1: Invite User Without Projects (Should Fail)**

**Steps:**

1. Sign in as admin@test.com
2. Navigate to User Management (when implemented)
3. Click "Invite User"
4. Enter email
5. Select "User" role
6. Leave project selection empty
7. Click "Send Invitation"

**Expected:**

- ❌ Error message: "Users must be assigned to at least one project"
- ❌ Invitation NOT created
- Submit button should be disabled

---

#### **Test 4.2: Invite User With Projects (Should Succeed)**

**Steps:**

1. Sign in as admin@test.com
2. Invite new user
3. Enter email: newuser@test.com
4. Select "User" role
5. Select 1+ projects from dropdown
6. Click "Send Invitation"

**Expected:**

- ✅ Success message
- ✅ UserInvitation created in DynamoDB
- ✅ InvitationProject records created
- ✅ Email sent (check logs if SES not configured)

**Verify in Database:**

```sql
-- UserInvitation table
email: newuser@test.com
role: User
status: pending
companyId: <company-id>

-- InvitationProject table
invitationId: <invitation-id>
projectId: <selected-project-id>
```

---

#### **Test 4.3: Invite Admin/Owner (No Projects Required)**

**Steps:**

1. Invite user with "Admin" or "Owner" role
2. Should NOT require project selection
3. Should succeed without projects

**Expected:**

- ✅ Success without project selection
- ✅ UserInvitation created
- ⚠️ InvitationProject records NOT created (not needed)

---

### **Test Suite 5: Database Authorization**

#### **Test 5.1: Cross-Company Access Prevention**

**Setup:**
Create 2 companies with users:

- Company A: admin-a@test.com (Admin)
- Company B: owner-b@test.com (Owner)

**Test:**

```bash
1. Sign in as owner-b@test.com (Company B)
2. Try to access Company A's project:
   /company-a-id/project-id
3. Expected: Access denied or filtered out ✓
```

---

#### **Test 5.2: Document Delete Permission**

**As User:**

```javascript
// In browser console:
import { generateClient } from 'aws-amplify/data'
const client = generateClient()

// Try to delete a document
const result = await client.models.Document.delete({
  id: 'some-document-id',
})

// Expected: Error (not authorized)
console.log('Should fail:', result.errors)
```

**As Admin:**

```javascript
// Same code
const result = await client.models.Document.delete({
  id: 'some-document-id',
})

// Expected: Success (no errors)
console.log('Should succeed:', result.data)
```

---

#### **Test 5.3: User Management Permission**

**As User:**

```javascript
// Try to create a user
const result = await client.models.User.create({
  email: 'test@test.com',
  name: 'Test',
  role: 'User',
  companyId: 'some-company',
})

// Expected: Error (not authorized)
```

**As Owner:**

```javascript
// Try to create a user in their company
const result = await client.models.User.create({
  email: 'test@test.com',
  name: 'Test',
  role: 'User',
  companyId: userContext.companyId, // Own company
})

// Expected: Success ✓
```

---

### **Test Suite 6: Frontend Permission Logic**

#### **Test 6.1: Permission Hook**

```javascript
// In browser console after signing in:
import { getCurrentUserContext } from '@/hooks/user-roles'

const context = await getCurrentUserContext()
console.log('User Context:', context)

// Verify structure:
{
  userId: string, // ✅
  email: string, // ✅
  name: string, // ✅
  role: 'Admin' | 'Owner' | 'User', // ✅
  companyId: string, // ✅
  projectIds: string[], // ✅
  isActive: boolean, // ✅
  permissions: { ... } // ✅ All permission flags
}
```

---

#### **Test 6.2: Project Filtering**

**As User:**

```javascript
// Check what projects are visible
const projects =
  /* load from Projects page */
  console.log('Visible projects:', projects.length)

// Should ONLY show assigned projects
// Compare with userContext.projectIds
const context = await getCurrentUserContext()
console.log('Assigned projects:', context.projectIds)

// projects should match context.projectIds
```

---

## Critical Test Scenarios

### **Scenario 1: User Tries to Delete Project**

**Steps:**

1. Sign in as user@test.com
2. Navigate to project page
3. Look for Delete button

**Expected:**

- ❌ Delete button NOT visible
- ❌ Edit button NOT visible
- ✅ Only "Show/Hide AI Tools" visible

**If buttons visible:** BUG - permission check not working

---

### **Scenario 2: User Navigates to Unassigned Project**

**Steps:**

1. Sign in as user@test.com
2. Get URL of unassigned project
3. Navigate directly via URL

**Expected:**

- ⚠️ ProjectGuard intercepts
- Shows: "You don't have access to this project"
- Cannot view project details

**If project loads:** BUG - ProjectGuard not working

---

### **Scenario 3: Owner Invites User Without Projects**

**Steps:**

1. Sign in as owner@test.com
2. Navigate to User Management
3. Try to invite user with User role
4. Don't select any projects
5. Click Submit

**Expected:**

- ❌ Validation error
- Submit button disabled
- Message: "Users must be assigned to at least one project"

**If submission succeeds:** BUG - validation not working

---

### **Scenario 4: User Uploads to Unassigned Project**

**Steps:**

1. Sign in as user@test.com
2. Try to access upload dialog for unassigned project
3. Attempt upload

**Expected:**

- ⚠️ ProjectGuard blocks access to project page
- OR
- 🔒 FileUploader shows "Upload Not Permitted" message

---

## Automated Test Script

### **Quick Verification Script**

Run this in your browser console after signing in:

```javascript
// RBAC Quick Test
async function quickRBACTest() {
  console.log('\n🧪 RBAC Quick Test Starting...\n')

  // 1. Check Auth Session
  console.log('1️⃣ Checking Authentication...')
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.payload

  if (!token) {
    console.error('❌ No JWT token found - not authenticated')
    return
  }
  console.log('✅ Authenticated')

  // 2. Check Custom Claims
  console.log('\n2️⃣ Checking Custom Claims...')
  const requiredClaims = [
    'custom:role',
    'custom:companyId',
    'custom:userId',
    'custom:userName',
    'custom:projectIds',
    'custom:isActive',
  ]

  const missingClaims = requiredClaims.filter(claim => !token[claim])

  if (missingClaims.length > 0) {
    console.error('❌ Missing claims:', missingClaims)
  } else {
    console.log('✅ All required claims present')
  }

  // 3. Check User Context
  console.log('\n3️⃣ Checking User Context...')
  const context = await getCurrentUserContext()

  if (!context) {
    console.error('❌ User context is null')
    return
  }

  console.log('✅ User Context:', {
    role: context.role,
    companyId: context.companyId,
    projectCount: context.projectIds.length,
  })

  // 4. Check Permissions
  console.log('\n4️⃣ Checking Permissions...')
  console.log('Role:', context.role)
  console.log('Permissions:', context.permissions)

  // 5. Role-Specific Checks
  console.log('\n5️⃣ Role-Specific Validation...')

  if (context.role === 'User') {
    if (context.projectIds.length === 0) {
      console.error('❌ CRITICAL: User role but no projects assigned!')
      console.error('   User will not be able to see any projects')
    } else {
      console.log(`✅ User assigned to ${context.projectIds.length} project(s)`)
    }

    if (context.permissions.canCreateProjects) {
      console.error('❌ BUG: User should NOT have canCreateProjects')
    }
    if (context.permissions.canDeleteDocuments) {
      console.error('❌ BUG: User should NOT have canDeleteDocuments')
    }
  }

  if (context.role === 'Admin' || context.role === 'Owner') {
    if (!context.permissions.canCreateProjects) {
      console.error('❌ BUG: Admin/Owner should have canCreateProjects')
    }
    if (!context.permissions.canManageUsers) {
      console.error('❌ BUG: Admin/Owner should have canManageUsers')
    }
  }

  console.log('\n✅ RBAC Quick Test Complete!\n')
}

// Run the test
await quickRBACTest()
```

---

## Expected Test Results

### **Test Result Matrix**

| Test                            | Admin    | Owner      | User             |
| ------------------------------- | -------- | ---------- | ---------------- |
| **JWT Token**                   |
| Has custom:role                 | ✅ Admin | ✅ Owner   | ✅ User          |
| In cognito:groups               | ✅ Admin | ✅ Owner   | ✅ User          |
| Has projectIds                  | ✅ []    | ✅ []      | ✅ [ids]         |
| **UI Visibility**               |
| "New Project" button            | ✅ Show  | ✅ Show    | ❌ Hide          |
| "Edit Project" button           | ✅ Show  | ✅ Show    | ❌ Hide          |
| "Delete Project" button         | ✅ Show  | ✅ Show    | ❌ Hide          |
| "Delete Document" option        | ✅ Show  | ✅ Show    | ❌ Hide          |
| Upload dialog                   | ✅ Show  | ✅ Show    | ✅ Show          |
| **Project Access**              |
| See all company projects        | ✅ Yes   | ✅ Yes     | ❌ Assigned only |
| Access unassigned project       | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| Create project                  | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| Delete project                  | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| **Document Access**             |
| Upload to assigned project      | ✅ Yes   | ✅ Yes     | ✅ Yes           |
| Delete document                 | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| **User Management**             |
| Access user management          | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| Invite users                    | ✅ Yes   | ✅ Yes     | ❌ Blocked       |
| Change user roles               | ✅ Yes   | ✅ Company | ❌ Blocked       |
| **Route Guards**                |
| Access /admin                   | ✅ Allow | ❌ Deny    | ❌ Deny          |
| Access /health                  | ✅ Allow | ❌ Deny    | ❌ Deny          |
| Access unassigned project route | ✅ Allow | ✅ Allow   | ❌ Deny          |

---

## Common Test Failures & Solutions

### **Failure 1: All Users See All Projects**

**Symptom:** Regular Users see projects they're not assigned to

**Diagnosis:**

```javascript
// Check if filtering is working
const context = await getCurrentUserContext()
console.log('User projectIds:', context.projectIds)
console.log('Has canViewAllProjects:', context.permissions.canViewAllProjects)

// If canViewAllProjects is true for User role → BUG
```

**Solution:** Check `ROLE_PERMISSIONS` in `src/hooks/user-roles.tsx`

---

### **Failure 2: Buttons Still Visible for Users**

**Symptom:** User can see Edit/Delete buttons

**Diagnosis:**

```javascript
// Check permission check is working
const { hasPermission } = usePermissions()
console.log('Can delete projects:', hasPermission('canDeleteProjects'))

// Should be false for User role
```

**Solution:** Verify permission checks are wrapped around buttons

---

### **Failure 3: JWT Missing Custom Claims**

**Symptom:** JWT doesn't have custom:role, custom:projectIds, etc.

**Diagnosis:**

- Check Lambda CloudWatch logs
- Look for errors in pre-token-generation

**Common Causes:**

- User not in DynamoDB
- Lambda doesn't have read permissions
- Lambda not triggered

**Solution:**

```bash
# Redeploy backend
npx ampx sandbox --once

# Check Lambda is connected to Cognito
# Check User exists in DynamoDB
```

---

### **Failure 4: User Has No Projects in JWT**

**Symptom:** `custom:projectIds` is `[]` for User role

**Diagnosis:**

```bash
# Check UserProject table
Filter: userId = <user-id>

# Should have at least 1 record
```

**Solution:**

- Create UserProject records manually
- Or reinvite user with projects selected

---

## Performance Testing

### **Test Response Times:**

| Operation                | Expected Time | Acceptable |
| ------------------------ | ------------- | ---------- |
| JWT token inspection     | < 10ms        | < 50ms     |
| Permission check         | < 5ms         | < 20ms     |
| Route guard (cached)     | < 10ms        | < 50ms     |
| Route guard (first load) | < 200ms       | < 500ms    |
| Project filtering        | < 50ms        | < 200ms    |

**How to Test:**

```javascript
console.time('permission-check')
const canCreate = hasPermission('canCreateProjects')
console.timeEnd('permission-check')
// Should be < 5ms
```

---

## Security Testing

### **Attempt Unauthorized Actions:**

#### **Test: User Tries to Delete Project via API**

```javascript
// Sign in as user@test.com
import { generateClient } from 'aws-amplify/data'
const client = generateClient()

// Attempt delete (should fail)
const result = await client.models.Project.delete({
  id: 'some-project-id',
})

// Expected:
console.log('Errors:', result.errors)
// Should have authorization error
```

#### **Test: User Tries to Access Another Company**

```javascript
// Sign in as user in Company A
// Try to list users from Company B

const result = await client.models.User.list({
  filter: { companyId: { eq: 'company-b-id' } },
})

// Expected: Empty or error (can't see other company's users)
```

---

## Regression Testing

After any changes to RBAC:

### **Quick Smoke Test:**

1. [ ] Sign in as each role
2. [ ] Check JWT has correct claims
3. [ ] Verify correct buttons visible
4. [ ] Test project creation (Admin/Owner)
5. [ ] Test project access (User)
6. [ ] Test document upload (all roles)
7. [ ] Test document delete (Admin/Owner only)
8. [ ] Test user invitation (Admin/Owner only)

---

## Test Documentation

### **Record Test Results:**

Create a test log file:

```markdown
# RBAC Test Log

## Test Date: YYYY-MM-DD

## Tester: Name

## Environment: Development/Staging/Production

### Test Results:

**Admin Role:**

- [ ] JWT tokens correct
- [ ] All buttons visible
- [ ] Can create/delete projects
- [ ] Can access admin console
- [ ] Can manage users

**Owner Role:**

- [ ] JWT tokens correct
- [ ] Management buttons visible
- [ ] Can create/delete projects
- [ ] Cannot access global admin
- [ ] Can manage company users

**User Role:**

- [ ] JWT tokens correct
- [ ] No management buttons
- [ ] Only sees assigned projects
- [ ] Cannot delete documents
- [ ] Cannot access user management

**Route Guards:**

- [ ] AdminGuard works
- [ ] ProjectGuard works
- [ ] DocumentGuard works

**Issues Found:**

- None / List issues here

**Overall Status:** ✅ Pass / ❌ Fail
```

---

## Conclusion

After completing all tests:

### **If All Pass:**

✅ RBAC implementation is working correctly
✅ Ready for production deployment
✅ Move to audit logging or documentation

### **If Some Fail:**

⚠️ Document failures
⚠️ Create fix plan
⚠️ Retest after fixes

### **Critical Failures (Block Production):**

- Users can see buttons they shouldn't
- Users can access unassigned projects
- JWT missing custom claims
- Database authorization not working

### **Non-Critical Failures (Can Ship):**

- Minor UI text issues
- Performance slightly slow
- Logging not comprehensive

---

**Document Version:** 1.0  
**Last Updated:** October 3, 2025  
**Next Review:** After first production deployment
