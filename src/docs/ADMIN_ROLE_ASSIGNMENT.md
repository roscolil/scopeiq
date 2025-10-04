# Admin Role Assignment Guide

## 🔒 Security Model: Principle of Least Privilege

**ScopeIQ follows security best practices by restricting who can become an Admin:**

- ✅ **All signups** → Automatically assigned **Owner** role
- ✅ **Admin privileges** → Must be manually assigned by AWS administrators
- ✅ **No self-service** → Users cannot elevate their own privileges

This ensures that admin access is tightly controlled and requires infrastructure-level permissions to grant.

---

## 📋 Overview

### **Signup Flow:**

1. User signs up via `/auth/signup`
2. Account is created with **Owner** role (automatic)
3. User can access their company and manage projects
4. User **cannot** access admin-only features

### **Admin Upgrade Flow:**

1. Owner requests admin access (out-of-band: email, ticket, etc.)
2. **AWS administrator** reviews request
3. AWS admin manually updates role in **AWS Cognito Console**
4. User's next login automatically gets admin privileges via JWT token

---

## 🔧 How to Assign Admin Role (for AWS Administrators)

### **Prerequisites:**

- AWS Console access with Cognito permissions
- User Pool ID for ScopeIQ application

### **Step-by-Step Process:**

#### **Option 1: Update Custom Attribute (Recommended)**

1. **Navigate to Cognito User Pool:**
   - AWS Console → Cognito → User Pools
   - Select your ScopeIQ user pool

2. **Find the User:**
   - Go to "Users" tab
   - Search by email or username

3. **Edit User Attributes:**
   - Click on the user
   - Click "Edit" in the Attributes section
   - Find `custom:role` attribute
   - Change value from `Owner` to `Admin`
   - Click "Save changes"

4. **Update Cognito Group (Optional but Recommended):**
   - In the same user details page
   - Go to "Group memberships" section
   - Remove from "Owner" group (if present)
   - Add to "Admin" group
   - This ensures consistency between attribute and group

5. **User Re-authentication:**
   - User must log out and log back in
   - New JWT token will include Admin role
   - Admin features will now be accessible

#### **Option 2: AWS CLI (for automation)**

```bash
# Update custom attribute
aws cognito-idp admin-update-user-attributes \
  --user-pool-id <USER_POOL_ID> \
  --username <USER_EMAIL> \
  --user-attributes Name=custom:role,Value=Admin

# Add to Admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <USER_POOL_ID> \
  --username <USER_EMAIL> \
  --group-name Admin

# Remove from Owner group (optional)
aws cognito-idp admin-remove-user-from-group \
  --user-pool-id <USER_POOL_ID> \
  --username <USER_EMAIL> \
  --group-name Owner
```

#### **Option 3: Lambda Function (for automated workflows)**

```typescript
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
})

async function upgradeToAdmin(userPoolId: string, email: string) {
  // Update custom attribute
  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [{ Name: 'custom:role', Value: 'Admin' }],
    }),
  )

  // Add to Admin group
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: 'Admin',
    }),
  )
}
```

---

## 🔐 Why This Approach is Secure

### **1. Infrastructure-Level Security:**

- Requires AWS Console access (MFA-protected)
- Governed by AWS IAM policies
- Audit trail in CloudTrail

### **2. No Application Vulnerability:**

- No code path in the app can grant admin access
- Even if the app is compromised, attackers can't self-promote
- Clear separation of concerns

### **3. Manual Approval Process:**

- Human review required for each admin promotion
- Out-of-band communication (email, support ticket)
- Traceable decision-making

### **4. Immutable Audit Trail:**

- All Cognito changes logged to CloudTrail
- Cannot be tampered with by application users
- Meets compliance requirements

---

## 🔄 How It Works Technically

### **When User Logs In:**

1. **Pre-Token-Generation Lambda** (`amplify/functions/pre-token-generation/handler.ts`) runs
2. Lambda fetches user from DynamoDB (synced with Cognito)
3. Lambda reads `custom:role` attribute from Cognito
4. Custom claims added to JWT token:
   ```json
   {
     "custom:role": "Admin",
     "custom:userId": "user-123",
     "custom:companyId": "company-456",
     "custom:projectIds": "[\"proj-1\",\"proj-2\"]"
   }
   ```
5. Frontend reads JWT token and grants appropriate permissions

### **Role Synchronization:**

- DynamoDB `User` table stores the role
- Cognito `custom:role` attribute stores the role
- Pre-token-generation Lambda ensures they stay in sync
- JWT token carries the role for frontend authorization

---

## 📊 Role Comparison

| Role      | Signup             | Invitation | AWS Admin Required |
| --------- | ------------------ | ---------- | ------------------ |
| **User**  | ❌ No              | ✅ Yes     | ❌ No              |
| **Owner** | ✅ Yes (automatic) | ✅ Yes     | ❌ No              |
| **Admin** | ❌ No              | ❌ No      | ✅ **Yes**         |

---

## ✅ Best Practices

### **For AWS Administrators:**

1. ✅ Use MFA on AWS accounts
2. ✅ Document admin approval process
3. ✅ Regular access reviews (quarterly)
4. ✅ Revoke admin when no longer needed
5. ✅ Monitor CloudTrail for privilege changes

### **For Application Owners:**

1. ✅ Request admin access through proper channels
2. ✅ Provide business justification
3. ✅ Understand admin responsibilities
4. ✅ Follow principle of least privilege
5. ✅ Log out/in after role change

---

## 🚫 Downgrading from Admin

To remove admin privileges:

1. Navigate to Cognito User Pool
2. Find the user
3. Edit `custom:role` attribute → Change to `Owner` or `User`
4. Update group memberships accordingly
5. User must log out and back in

**Note:** Always leave at least one active Admin to prevent lockout.

---

## 📝 Audit and Compliance

### **What Gets Logged:**

- ✅ All Cognito attribute changes (CloudTrail)
- ✅ Group membership changes (CloudTrail)
- ✅ Admin operations (CloudTrail)
- ✅ Who made the change (IAM user/role)
- ✅ Timestamp and IP address

### **Compliance Benefits:**

- SOC 2 Type II: Demonstrates access control
- GDPR: Shows data access restrictions
- ISO 27001: Privilege management
- HIPAA: Role-based access control

---

## 🆘 Troubleshooting

### **User doesn't have admin access after role change:**

1. ✅ Verify `custom:role` = `Admin` in Cognito
2. ✅ Check user is in "Admin" group
3. ✅ User must log out and log back in (force token refresh)
4. ✅ Check browser console for JWT token claims
5. ✅ Verify DynamoDB User record shows `role: "Admin"`

### **Pre-token-generation Lambda not updating role:**

1. ✅ Check Lambda logs in CloudWatch
2. ✅ Verify Lambda has DynamoDB read permissions
3. ✅ Ensure User record exists in DynamoDB
4. ✅ Check for errors in Lambda execution

---

## 🔗 Related Documentation

- [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
- [Security Architecture](./SECURITY_ARCHITECTURE.md)
- [User Management Guide](./USER_MANAGEMENT.md)
- [Backend Verification](./RBAC_BACKEND_VERIFICATION.md)
