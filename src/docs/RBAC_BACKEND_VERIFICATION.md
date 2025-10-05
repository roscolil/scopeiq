# RBAC Backend Verification Guide

## Overview

This guide helps you verify that the backend RBAC implementation (Lambda functions, JWT tokens, and database authorization rules) is working correctly.

---

## 1. Lambda Functions Review

### ✅ **Post-Confirmation Lambda** (`amplify/functions/post-confirmation/handler.ts`)

**Purpose:** Creates user in DynamoDB after email verification

**What It Does:**

1. ✅ Extracts user email and name from Cognito event
2. ✅ Checks if user already exists in DynamoDB
3. ✅ Creates or retrieves company
4. ✅ Creates User record with:
   - Email, name
   - Default role: Owner (for first users)
   - Company assignment
   - isActive: true
   - acceptedAt timestamp
5. ✅ Updates Cognito custom attributes
6. ✅ Updates lastLoginAt for existing users

**Status:** ✅ **Implementation Complete**

**Role Assignment:**

- ✅ All signups are assigned 'Owner' role (hardcoded for security)
- 🔒 Admin role must be manually assigned via AWS Cognito Console by AWS administrators
- 🔒 Users with 'User' role must be invited (cannot sign up directly)
- ✅ Prevents privilege escalation through signup flow

**Security:**

- ✅ No code path can grant Admin privileges
- ✅ Admin assignment requires AWS Console access (infrastructure-level security)
- ✅ Follows principle of least privilege
- ✅ User role can only be assigned via invitation flow
- ✅ Clear separation between app-level and infrastructure-level privileges

---

### ✅ **Pre-Token-Generation Lambda** (`amplify/functions/pre-token-generation/handler.ts`)

**Purpose:** Adds custom claims to JWT tokens on each login

**What It Does:**

1. ✅ Fetches user from DynamoDB by email
2. ✅ Fetches user's project assignments from UserProject table
3. ✅ Adds custom claims to JWT:
   - `custom:role` - User's role
   - `custom:companyId` - User's company
   - `custom:projectIds` - JSON array of accessible projects
   - `custom:isActive` - Active status
   - `custom:userId` - Database user ID
   - `custom:userName` - User's name
   - `custom:lastLoginAt` - Last login timestamp
   - `custom:tokenIssuedAt` - Token creation time
4. ✅ Assigns user to Cognito group (Admin, Owner, or User)
5. ✅ Updates lastLoginAt in database

**Status:** ✅ **Implementation Complete**

**Excellent Features:**

- ✅ Fetches project assignments dynamically
- ✅ Comprehensive custom claims
- ✅ Fallback to Admin on errors (safe default)
- ✅ Updates last login tracking

---

## 2. Verification Checklist

### **Step 1: Verify Lambda Deployment**

```bash
# Check if Lambda functions are deployed
cd amplify
npx ampx sandbox

# Or if using deployed environment
npx ampx status
```

**Expected Output:**

```
✓ post-confirmation Lambda deployed
✓ pre-token-generation Lambda deployed
✓ Connected to Cognito User Pool
```

---

### **Step 2: Test Signup Flow**

#### **Test 2A: New User Signup**

1. **Action:** Sign up with new email
2. **Expected:**
   - User created in Cognito ✓
   - Email verification sent ✓
   - Post-confirmation triggers ✓
   - User created in DynamoDB ✓
   - Company created (if first user) ✓

3. **Verify in DynamoDB:**

```bash
# Check User table
- New user record exists
- email: correct email
- role: 'Owner' (default)
- companyId: valid UUID
- isActive: true
- acceptedAt: timestamp
```

4. **Verify in Cognito:**

```bash
# Check custom attributes
- custom:companyId: matches DynamoDB
- custom:role: 'Owner'
```

---

#### **Test 2B: User Invitation Flow**

1. **Action:** Invite a User with project assignments
2. **Expected:**
   - UserInvitation created in DynamoDB ✓
   - Email sent with invitation link ✓
   - InvitationProject records created ✓

3. **Action:** User accepts invitation and signs up
4. **Expected:**
   - User created with invited role ✓
   - Project assignments copied from invitation ✓
   - UserProject records created ✓

**To Verify:**

```bash
# Check UserInvitation table
- status: 'pending' → 'accepted'

# Check UserProject table
- Records exist linking userId to projectIds
```

---

### **Step 3: Test JWT Token Claims**

#### **How to Inspect JWT Token:**

**Browser Console Method:**

```javascript
// After signing in, run in browser console:
import { fetchAuthSession } from 'aws-amplify/auth'

const session = await fetchAuthSession()
const idToken = session.tokens?.idToken
console.log('JWT Claims:', idToken.payload)
```

**Expected Claims:**

```json
{
  "sub": "cognito-user-id",
  "email": "user@example.com",
  "cognito:groups": ["Owner"],
  "custom:role": "Owner",
  "custom:companyId": "company-uuid",
  "custom:projectIds": "[\"project-1\", \"project-2\"]",
  "custom:isActive": "true",
  "custom:userId": "user-uuid",
  "custom:userName": "John Doe",
  "custom:lastLoginAt": "2025-10-03T12:00:00Z",
  "custom:tokenIssuedAt": "2025-10-03T12:05:00Z"
}
```

#### **Verification Tests:**

**Test 3A: Admin User Token**

```javascript
// Expected for Admin:
{
  "cognito:groups": ["Admin"],
  "custom:role": "Admin",
  "custom:companyId": "some-company-id",
  "custom:projectIds": "[]", // May be empty (Admin sees all)
}
```

**Test 3B: Owner User Token**

```javascript
// Expected for Owner:
{
  "cognito:groups": ["Owner"],
  "custom:role": "Owner",
  "custom:companyId": "their-company-id",
  "custom:projectIds": "[]", // May be empty (Owner sees all)
}
```

**Test 3C: Regular User Token**

```javascript
// Expected for User:
{
  "cognito:groups": ["User"],
  "custom:role": "User",
  "custom:companyId": "their-company-id",
  "custom:projectIds": "[\"project-abc\", \"project-xyz\"]", // MUST have projects
}
```

---

### **Step 4: Test Database Authorization Rules**

#### **Test 4A: Company Table Access**

**As Admin:**

```typescript
// Should succeed
await client.models.Company.list()
await client.models.Company.create({ name: 'Test Co' })
await client.models.Company.update({ id: 'xxx', name: 'Updated' })
await client.models.Company.delete({ id: 'xxx' })
```

**As User:**

```typescript
// Should fail or return only own company
await client.models.Company.list() // Limited
await client.models.Company.create({ name: 'Test' }) // ❌ FAIL
await client.models.Company.update({ id: 'xxx' }) // ❌ FAIL
```

---

#### **Test 4B: Project Table Access**

**As Admin/Owner:**

```typescript
// Should succeed
await client.models.Project.create({
  name: 'Test Project',
  companyId: 'their-company',
})
await client.models.Project.update({ id: 'xxx', name: 'Updated' })
await client.models.Project.delete({ id: 'xxx' })
```

**As User:**

```typescript
// Should fail
await client.models.Project.create({ ... }) // ❌ FAIL
await client.models.Project.update({ ... }) // ❌ FAIL
await client.models.Project.delete({ ... }) // ❌ FAIL

// Should succeed (read only)
await client.models.Project.list() // ✓ But filtered to assigned projects
```

---

#### **Test 4C: Document Table Access**

**As Admin/Owner:**

```typescript
// Should succeed - full CRUD
await client.models.Document.create({ ... })
await client.models.Document.update({ ... })
await client.models.Document.delete({ ... })
```

**As User:**

```typescript
// Should succeed (read/update in assigned projects)
await client.models.Document.list({ filter: { projectId: { eq: 'assigned-project' } } })
await client.models.Document.update({ id: 'xxx', ... })

// Should fail
await client.models.Document.delete({ id: 'xxx' }) // ❌ FAIL (no delete permission)
```

---

#### **Test 4D: User Table Access**

**As Admin/Owner:**

```typescript
// Should succeed - can manage users in their company
await client.models.User.list({ filter: { companyId: { eq: 'their-company' } } })
await client.models.User.create({ ... })
await client.models.User.update({ ... })
await client.models.User.delete({ ... })
```

**As User:**

```typescript
// Should succeed (read only)
await client.models.User.list() // ✓ Can see other users

// Should succeed (own profile)
await client.models.User.update({ id: 'own-id', name: 'New Name' }) // ✓

// Should fail
await client.models.User.create({ ... }) // ❌ FAIL
await client.models.User.delete({ ... }) // ❌ FAIL
await client.models.User.update({ id: 'other-user-id' }) // ❌ FAIL
```

---

#### **Test 4E: UserProject Access**

**As Admin:**

```typescript
// Should succeed - full control
await client.models.UserProject.create({ userId: 'xxx', projectId: 'yyy' })
await client.models.UserProject.delete({ id: 'xxx' })
```

**As Owner:**

```typescript
// Should succeed in their company
await client.models.UserProject.create({ ... })
await client.models.UserProject.delete({ ... })
```

**As User:**

```typescript
// Should only read
await client.models.UserProject.list() // ✓ Read own assignments
await client.models.UserProject.create({ ... }) // ❌ FAIL
```

---

## 3. Manual Testing Procedures

### **Test Suite 1: User Signup & Token Generation**

```bash
# Test Case 1: New User Signup
1. Navigate to /auth/signup
2. Fill in email, password, company name
3. Submit form
4. Check email for verification link
5. Click verification link
6. Sign in with credentials

Expected Results:
✓ User created in Cognito
✓ User created in DynamoDB (check User table)
✓ Company created (check Company table)
✓ JWT token has all custom claims
✓ Can access dashboard
```

---

### **Test Suite 2: Role-Based Token Claims**

**Create 3 test users with different roles:**

#### **Admin User Test:**

```bash
1. Create user in Cognito Console
2. Assign to "Admin" group
3. Create User record in DynamoDB with role: 'Admin'
4. Sign in as this user
5. Open browser console and run:

   const session = await fetchAuthSession()
   console.log(session.tokens.idToken.payload)

6. Verify custom claims:
   ✓ custom:role = "Admin"
   ✓ cognito:groups = ["Admin"]
   ✓ custom:companyId exists
   ✓ custom:userId exists
```

#### **Owner User Test:**

```bash
1. Create user in Cognito Console
2. Assign to "Owner" group
3. Create User record with role: 'Owner'
4. Sign in and check JWT
5. Verify custom claims:
   ✓ custom:role = "Owner"
   ✓ cognito:groups = ["Owner"]
```

#### **Regular User Test:**

```bash
1. Create user in Cognito Console
2. Assign to "User" group
3. Create User record with role: 'User'
4. Create UserProject assignments
5. Sign in and check JWT
6. Verify custom claims:
   ✓ custom:role = "User"
   ✓ cognito:groups = ["User"]
   ✓ custom:projectIds = ["project-1", "project-2"]
```

---

### **Test Suite 3: Database Authorization Rules**

**Setup:**

```bash
# Sign in as different users and test operations
```

**Test Matrix:**

| Operation       | Admin  | Owner      | User        | Expected |
| --------------- | ------ | ---------- | ----------- | -------- |
| List Companies  | ✅ All | ✅ Own     | ✅ Own      | Pass     |
| Create Company  | ✅ Yes | ✅ Yes     | ❌ No       | Pass     |
| Update Company  | ✅ Yes | ✅ Own     | ❌ No       | Pass     |
| Delete Company  | ✅ Yes | ✅ Own     | ❌ No       | Pass     |
|                 |        |            |             |          |
| List Projects   | ✅ All | ✅ Company | ⚠️ Assigned | Pass     |
| Create Project  | ✅ Yes | ✅ Yes     | ❌ No       | Pass     |
| Update Project  | ✅ Yes | ✅ Yes     | ❌ No       | Pass     |
| Delete Project  | ✅ Yes | ✅ Yes     | ❌ No       | Pass     |
|                 |        |            |             |          |
| List Documents  | ✅ All | ✅ Company | ⚠️ Assigned | Pass     |
| Create Document | ✅ Yes | ✅ Yes     | ✅ Yes      | Pass     |
| Update Document | ✅ Yes | ✅ Yes     | ✅ Own      | Pass     |
| Delete Document | ✅ Yes | ✅ Yes     | ❌ No       | Pass     |
|                 |        |            |             |          |
| List Users      | ✅ All | ✅ Company | ✅ Company  | Pass     |
| Create User     | ✅ Yes | ✅ Company | ❌ No       | Pass     |
| Update User     | ✅ Yes | ✅ Company | ⚠️ Self     | Pass     |
| Delete User     | ✅ Yes | ✅ Company | ❌ No       | Pass     |

---

## 4. Automated Verification Script

### **JWT Token Inspector**

Create this file for easy token inspection:

```typescript
// scripts/inspect-jwt.ts
import { fetchAuthSession } from 'aws-amplify/auth'

export async function inspectJWT() {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken

    if (!idToken) {
      console.error('❌ No ID token found')
      return
    }

    const claims = idToken.payload

    console.log('\n🔍 JWT Token Analysis\n')
    console.log('='.repeat(50))

    // Basic claims
    console.log('\n📋 Basic Claims:')
    console.log('  Sub:', claims.sub)
    console.log('  Email:', claims.email)
    console.log('  Email Verified:', claims.email_verified)

    // Role and groups
    console.log('\n👤 Role & Groups:')
    console.log('  Cognito Groups:', claims['cognito:groups'])
    console.log('  Custom Role:', claims['custom:role'])

    // Company and projects
    console.log('\n🏢 Company & Projects:')
    console.log('  Company ID:', claims['custom:companyId'])
    console.log('  User ID:', claims['custom:userId'])
    console.log('  User Name:', claims['custom:userName'])

    const projectIds = JSON.parse(
      (claims['custom:projectIds'] as string) || '[]',
    )
    console.log('  Project IDs:', projectIds)
    console.log('  Project Count:', projectIds.length)

    // Status
    console.log('\n✅ Status:')
    console.log('  Is Active:', claims['custom:isActive'])
    console.log('  Last Login:', claims['custom:lastLoginAt'])
    console.log('  Token Issued:', claims['custom:tokenIssuedAt'])

    // Validation
    console.log('\n🔐 Validation:')
    const hasRole = !!claims['custom:role']
    const hasCompany = !!claims['custom:companyId']
    const hasUserId = !!claims['custom:userId']
    const inGroup = (claims['cognito:groups'] as string[])?.length > 0

    console.log('  Has Role:', hasRole ? '✅' : '❌')
    console.log('  Has Company:', hasCompany ? '✅' : '❌')
    console.log('  Has User ID:', hasUserId ? '✅' : '❌')
    console.log('  In Cognito Group:', inGroup ? '✅' : '❌')

    // Role-specific checks
    const role = claims['custom:role'] as string
    if (role === 'User') {
      const hasProjects = projectIds.length > 0
      console.log(
        '  Has Projects (required for User):',
        hasProjects ? '✅' : '❌ MISSING!',
      )

      if (!hasProjects) {
        console.warn('\n⚠️  WARNING: User role but no projects assigned!')
      }
    }

    console.log('\n' + '='.repeat(50))

    return {
      role: claims['custom:role'],
      companyId: claims['custom:companyId'],
      projectIds,
      groups: claims['cognito:groups'],
      isValid: hasRole && hasCompany && hasUserId && inGroup,
    }
  } catch (error) {
    console.error('❌ Error inspecting JWT:', error)
    return null
  }
}

// Usage in browser console:
// (async () => { await inspectJWT() })()
```

---

### **Permission Tester**

Add to browser console for quick testing:

```typescript
// scripts/test-permissions.ts
import { usePermissions } from '@/hooks/user-roles'

export function testPermissions() {
  const { hasPermission, hasRole, canAccessProject, userRole, permissions } =
    usePermissions()

  console.log('\n🔐 Permission Test Results\n')
  console.log('Current Role:', userRole)
  console.log('\nAll Permissions:')
  console.log(permissions)

  console.log('\n📊 Key Permission Checks:')
  console.log(
    '  Can Create Projects:',
    hasPermission('canCreateProjects') ? '✅' : '❌',
  )
  console.log(
    '  Can Delete Projects:',
    hasPermission('canDeleteProjects') ? '✅' : '❌',
  )
  console.log(
    '  Can Manage Users:',
    hasPermission('canManageUsers') ? '✅' : '❌',
  )
  console.log(
    '  Can Delete Documents:',
    hasPermission('canDeleteDocuments') ? '✅' : '❌',
  )
  console.log(
    '  Can View All Projects:',
    hasPermission('canViewAllProjects') ? '✅' : '❌',
  )

  // Role checks
  console.log('\n👥 Role Checks:')
  console.log('  Is Admin:', hasRole('Admin') ? '✅' : '❌')
  console.log('  Is Owner:', hasRole('Owner') ? '✅' : '❌')
  console.log('  Is User:', hasRole('User') ? '✅' : '❌')
}
```

---

## 5. Common Issues & Solutions

### **Issue 1: Custom Claims Not Appearing**

**Symptoms:**

- JWT token missing custom:role, custom:companyId, etc.
- Frontend shows "User" role for all users

**Diagnosis:**

```bash
# Check Lambda CloudWatch logs
1. Go to AWS Console → Lambda
2. Find pre-token-generation function
3. Check CloudWatch logs for errors
```

**Common Causes:**

- Lambda not deployed
- Lambda doesn't have DynamoDB read permissions
- User not in DynamoDB User table

**Solution:**

```bash
# Redeploy Amplify backend
npx ampx sandbox --once

# Or
npx ampx deploy
```

---

### **Issue 2: User Not Created in DynamoDB**

**Symptoms:**

- User can sign in to Cognito
- But no User record in DynamoDB
- Pre-token-generation fails to find user

**Diagnosis:**

```bash
# Check post-confirmation Lambda logs
1. AWS Console → Lambda → post-confirmation
2. Check recent invocations
3. Look for errors
```

**Common Causes:**

- Lambda doesn't have DynamoDB write permissions
- Email verification not completed
- Post-confirmation trigger not configured

**Solution:**

```bash
# Check auth configuration
cat amplify/auth/resource.ts

# Verify triggers are configured:
triggers: {
  postConfirmation,
  preTokenGeneration
}
```

---

### **Issue 3: UserProject Assignments Missing**

**Symptoms:**

- User role invited with projects
- But custom:projectIds is empty in JWT
- User cannot access assigned projects

**Diagnosis:**

```typescript
// Check UserProject table
const { data } = await client.models.UserProject.list({
  filter: { userId: { eq: 'user-id-here' } },
})
console.log('User assignments:', data)
```

**Common Causes:**

- InvitationProject records not copied to UserProject
- Invitation acceptance flow incomplete

**Solution:**

```typescript
// In acceptInvitation method, ensure:
1. Fetch invitation
2. Get projectIds from InvitationProject table
3. Create UserProject records
4. Update invitation status to 'accepted'
```

---

### **Issue 4: Permission Checks Always Return False**

**Symptoms:**

- All users see "no permission" messages
- Even Admins can't access features

**Diagnosis:**

```typescript
// In browser console:
import { getCurrentUserContext } from '@/hooks/user-roles'
const context = await getCurrentUserContext()
console.log('User Context:', context)
```

**Look for:**

- Is userContext null? → Auth issue
- Is role undefined? → JWT missing custom:role
- Are permissions empty? → Role permissions not mapped

**Solution:**

1. Verify JWT has custom:role claim
2. Check ROLE_PERMISSIONS mapping in user-roles.tsx
3. Ensure useUserContext hook is working

---

## 6. Production Deployment Checklist

Before deploying to production:

### **Pre-Deployment:**

- [ ] Lambda functions deployed and tested
- [ ] Cognito User Pool configured with groups
- [ ] Custom attributes added to User Pool
- [ ] Triggers connected (post-confirmation, pre-token-generation)
- [ ] DynamoDB tables created with authorization rules
- [ ] Test signup flow end-to-end
- [ ] Test all three roles (Admin, Owner, User)
- [ ] Verify JWT tokens contain all custom claims

### **Post-Deployment:**

- [ ] Monitor CloudWatch logs for Lambda errors
- [ ] Test signup flow in production
- [ ] Verify email delivery (invitation, verification)
- [ ] Test permission checks in production
- [ ] Create first Admin user manually if needed
- [ ] Document admin user creation process

---

## 7. Debugging Tools

### **Browser Console Commands:**

```javascript
// 1. Check current authentication
import { getCurrentUser } from 'aws-amplify/auth'
const user = await getCurrentUser()
console.log('Current User:', user)

// 2. Inspect full session
import { fetchAuthSession } from 'aws-amplify/auth'
const session = await fetchAuthSession()
console.log('Full Session:', session)
console.log('ID Token:', session.tokens?.idToken?.payload)

// 3. Check user context
import { getCurrentUserContext } from '@/hooks/user-roles'
const context = await getCurrentUserContext()
console.log('User Context:', context)

// 4. Test specific permission
import { usePermissions } from '@/hooks/user-roles'
const perms = usePermissions()
console.log('Can Create Projects:', perms.hasPermission('canCreateProjects'))
```

---

## 8. Expected Behavior Summary

### **After Successful Backend Verification:**

✅ **Signup Flow:**

1. User signs up → Post-confirmation creates User record
2. User verifies email → Can sign in
3. User signs in → Pre-token generates JWT with claims
4. Frontend receives JWT → Extracts role and permissions
5. UI updates → Shows appropriate features

✅ **Permission Enforcement:**

1. JWT contains role → Frontend checks role
2. Frontend checks permission → UI shows/hides features
3. User attempts action → Route guard checks access
4. Backend receives request → Database rules enforce authorization

✅ **Project Assignment:**

1. Admin invites User → Selects projects
2. Invitation created → InvitationProject records created
3. User accepts → UserProject records created
4. User signs in → JWT includes projectIds
5. Frontend filters → User sees only assigned projects

---

## 9. Security Verification

### **Critical Security Checks:**

#### **Check 1: JWT Signature Validation**

```typescript
// JWT tokens should be signed by Cognito
// Verify signature is valid and not tampered with
// The fetchAuthSession function does this automatically
```

#### **Check 2: Token Expiration**

```typescript
// Tokens should expire (default: 1 hour)
const exp = idToken.payload.exp
const now = Math.floor(Date.now() / 1000)
console.log('Token expires in:', exp - now, 'seconds')
```

#### **Check 3: Database-Level Authorization**

```typescript
// Test that database denies operations even if frontend allows
// Try to delete a document as User role via GraphQL directly
// Should be blocked by authorization rules
```

#### **Check 4: Cross-Company Access**

```typescript
// User in Company A should NOT access Company B resources
// Test by manually changing companyId in requests
// Should be blocked by authorization rules
```

---

## 10. Next Steps

After verification:

1. **If issues found:**
   - Document in this file
   - Create fix plan
   - Test fixes

2. **If verification passes:**
   - ✅ Move to Phase 4.2 (Test authorization rules)
   - ✅ Or move to Phase 5 (Audit logging)
   - ✅ Or move to production deployment

3. **Testing in production:**
   - Create test accounts for each role
   - Verify invitation flow
   - Monitor CloudWatch logs
   - Set up alerts for auth errors

---

## Appendix: Quick Reference

### **Important Custom Claims:**

- `custom:role` - Admin, Owner, or User
- `custom:companyId` - User's company UUID
- `custom:projectIds` - JSON array of project UUIDs
- `custom:userId` - DynamoDB User record ID
- `custom:userName` - Display name
- `custom:isActive` - Account status
- `custom:lastLoginAt` - Last login timestamp
- `custom:tokenIssuedAt` - Token creation time

### **Cognito Groups:**

- `Admin` - Global administrator
- `Owner` - Company owner
- `User` - Regular user

### **Key Database Tables:**

- `User` - User records with roles
- `Company` - Multi-tenant companies
- `UserProject` - User-to-project assignments
- `UserInvitation` - Pending invitations
- `InvitationProject` - Invitation project assignments

---

**Document Version:** 1.0  
**Last Updated:** October 3, 2025  
**Status:** Ready for verification
