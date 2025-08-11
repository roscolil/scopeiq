# ScopeIQ User Management & Authentication Architecture

## Overview

ScopeIQ uses a **hybrid authentication and user management system** that combines **AWS Cognito User Pools** for authentication with **DynamoDB** for business logic and role-based access control (RBAC). This approach provides the security and scalability of managed authentication while maintaining flexibility for complex business requirements.

## Architecture Components

### 🔐 AWS Cognito User Pools (Authentication Layer)

**Purpose**: Handles core authentication functionality

- User registration and login
- Password management and reset
- Email verification
- Session management
- Basic user attributes storage

**Configuration**: `amplify/auth/resource.ts`

```typescript
export const auth = defineAuth({
  loginWith: {
    email: {
      /* email verification config */
    },
  },
  groups: ['Admin', 'Owner', 'User'],
  userAttributes: {
    email: { required: true, mutable: false },
    givenName: { required: false, mutable: true },
    'custom:role': { dataType: 'String', mutable: true },
    'custom:companyId': { dataType: 'String', mutable: true },
  },
  triggers: { postConfirmation }, // Lambda trigger for DynamoDB sync
})
```

### 🗄️ DynamoDB (Business Logic Layer)

**Purpose**: Manages business logic, relationships, and detailed user information

- Multi-tenant company structure
- Role-based permissions (Admin/Owner/User)
- Project assignments and access control
- User invitations and onboarding
- Detailed user metadata and activity tracking

**Key Models**: `amplify/data/resource.ts`

- `Company`: Multi-tenant organization structure
- `User`: Extended user profiles with roles and company associations
- `UserProject`: Granular project-level permissions
- `UserInvitation`: Invitation and onboarding system

## Synchronization Strategy

### 🔄 Automatic Sync (Production)

**Lambda Post-Confirmation Trigger**: `amplify/functions/post-confirmation/`

When a user completes email verification in Cognito:

1. **Trigger**: Lambda function executes automatically
2. **Check**: Verify if user exists in DynamoDB
3. **Create**: If new user, create Company and User records
4. **Update**: Sync Cognito custom attributes with DynamoDB data
5. **Fallback**: Frontend sync handles any missed cases

```typescript
// Simplified flow
export const handler: PostConfirmationTriggerHandler = async event => {
  const { email, name } = event.request.userAttributes

  // Check if user exists in DynamoDB
  const existingUser = await findUserByEmail(email)

  if (!existingUser) {
    // Create company and user records
    const company = await createDefaultCompany(name)
    const user = await createUser({
      email,
      name,
      companyId: company.id,
      role: 'Owner',
    })

    // Update Cognito attributes
    event.response.userAttributes['custom:companyId'] = company.id
    event.response.userAttributes['custom:role'] = 'Owner'
  }

  return event
}
```

### 🔄 Frontend Sync (Immediate Fallback)

**User Service**: `src/services/user.ts`

The frontend auth system also performs synchronization:

1. **Login**: After successful Cognito authentication
2. **Background**: Sync user data with DynamoDB
3. **Cache**: Store complete user profile in session
4. **Fallback**: Creates DynamoDB records if Lambda missed them

```typescript
// In auth hook after successful login
const dbUser = await userService.createOrSyncUser()
const fullUserData = {
  id: amplifyUser.userId,
  email: attrs.email,
  name: attrs.name,
  role: dbUser.role, // From DynamoDB
  companyId: dbUser.companyId, // From DynamoDB
  ...attrs,
}
```

## User Roles & Permissions

### 👑 Admin

- **Scope**: System-wide access
- **Permissions**:
  - Manage all companies and users
  - System configuration
  - Platform-level operations
- **Use Case**: ScopeIQ platform administrators

### 🏢 Owner

- **Scope**: Company-wide access
- **Permissions**:
  - Manage company settings
  - Invite/remove users
  - Access all company projects
  - Assign user roles and project access
- **Use Case**: Company administrators

### 👤 User

- **Scope**: Assigned projects only
- **Permissions**:
  - Access assigned projects
  - Upload and manage documents
  - Query document content
- **Use Case**: Regular team members

## Multi-Tenancy Model

### 🏗️ Company Isolation

Each user belongs to exactly one company, ensuring data isolation:

```typescript
// All data operations are scoped by company
const projects = await client.models.Project.list({
  filter: { companyId: { eq: currentUser.companyId } },
})

const documents = await client.models.Document.list({
  filter: {
    projectId: { eq: projectId },
    // Project ownership implies company access control
  },
})
```

### 🔐 Authorization Patterns

**DynamoDB Authorization**: `amplify/data/resource.ts`

```typescript
User: a.model({
  // ... fields
}).authorization(allow => [
  allow.owner(), // Users can manage their own record
  allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']), // Admins have full access
  allow.groups(['Owner']).to(['read', 'update']), // Owners can read/update users
  allow.groups(['User']).to(['read']), // Users can read user records
])
```

## Authentication Flow

### 📱 User Registration

1. **Frontend**: User submits email/password via `signUp()`
2. **Cognito**: Creates user account (unverified state)
3. **Email**: Verification code sent to user
4. **Verification**: User enters code via `confirmSignUp()`
5. **Lambda Trigger**: Post-confirmation function executes
6. **DynamoDB**: User and Company records created
7. **Sync**: Cognito custom attributes updated

### 🔑 User Login

1. **Frontend**: User submits credentials via `signIn()`
2. **Cognito**: Validates credentials and returns session
3. **Background Sync**: Frontend syncs with DynamoDB
4. **Session**: Complete user profile cached locally
5. **Navigation**: User redirected to dashboard

### 🚪 User Logout

1. **Frontend**: `signOut()` called
2. **Cognito**: Session invalidated
3. **Cleanup**: Local cache cleared
4. **Redirect**: User sent to login page

## Development Workflow

### 🚀 Setting Up Authentication

1. **Deploy Backend**:

   ```bash
   npx ampx sandbox
   ```

2. **Lambda Function**: The post-confirmation trigger will be deployed automatically

3. **Test Registration**: Create a new account to verify sync

4. **Monitor Logs**: Check CloudWatch logs for Lambda execution

### 🔧 Adding New User Fields

1. **Update Schema**: Add fields to User model in `amplify/data/resource.ts`
2. **Update Interface**: Modify `DatabaseUser` interface in `src/services/user.ts`
3. **Update Lambda**: Modify post-confirmation handler if needed
4. **Deploy**: Run `npx ampx sandbox` to deploy changes

### 🧪 Testing User Management

```typescript
// Create test users
const testUser = await userService.createOrSyncUser()

// Check permissions
const isOwner = testUser.role === 'Owner'
const canManageUsers = ['Admin', 'Owner'].includes(testUser.role)

// Test company isolation
const companyUsers = await userService.getCompanyUsers()
```

## Security Considerations

### 🛡️ Data Protection

- **Encryption**: All data encrypted at rest (DynamoDB) and in transit (HTTPS)
- **Access Control**: Row-level security via Cognito groups
- **Isolation**: Strict company-based data separation
- **Auditing**: User activity tracked with timestamps

### 🔒 Authentication Security

- **Password Policy**: Enforced by Cognito (configurable)
- **Email Verification**: Required for account activation
- **Session Management**: Automatic token refresh and expiration
- **Rate Limiting**: Built-in protection against brute force attacks

### ✅ Best Practices

- **Principle of Least Privilege**: Users get minimum required access
- **Regular Sync**: Automatic synchronization prevents data drift
- **Graceful Degradation**: Frontend fallback ensures reliability
- **Error Handling**: Failed operations don't break auth flow

## Monitoring & Troubleshooting

### 📊 Key Metrics

- **Sync Success Rate**: Lambda execution success percentage
- **User Creation Time**: Time from signup to DynamoDB record creation
- **Authentication Latency**: Login response times
- **Company Isolation**: Verify no cross-tenant data access

### 🔍 Common Issues

**Issue**: User exists in Cognito but not DynamoDB
**Solution**: Frontend sync will create missing records automatically

**Issue**: Lambda function fails during signup
**Solution**: Check CloudWatch logs; frontend sync provides fallback

**Issue**: User roles not syncing
**Solution**: Verify Cognito custom attributes are properly configured

### 🛠️ Debugging Commands

```bash
# Check Lambda logs
aws logs tail /aws/lambda/post-confirmation --follow

# Test DynamoDB access
aws dynamodb scan --table-name User-[environment]

# Verify Cognito user attributes
aws cognito-idp admin-get-user --user-pool-id [pool-id] --username [email]
```

## Future Enhancements

### 🎯 Planned Features

- **SSO Integration**: SAML/OAuth2 for enterprise customers
- **Advanced RBAC**: Custom roles and granular permissions
- **Audit Logging**: Comprehensive activity tracking
- **User Analytics**: Usage patterns and engagement metrics

### 🔄 Migration Strategy

When implementing changes:

1. **Backward Compatibility**: Ensure existing users continue to work
2. **Gradual Rollout**: Test with small user groups first
3. **Data Migration**: Scripts to update existing user records
4. **Monitoring**: Track metrics during and after changes

---

This architecture provides a robust, scalable foundation for user management while maintaining the flexibility to evolve with business requirements.
