# RBAC User Management System

This document describes the Role-Based Access Control (RBAC) system implemented in the ScopeIQ application.

## Overview

The RBAC system provides three distinct user roles with different levels of access and permissions:

- **Admin**: Full company-level control and user management
- **Owner**: Project-level control and management
- **User**: View-only access to assigned projects

**Note on User Creation:**

- **Direct Signup**: All signups are automatically assigned the 'Owner' role
- **Admin Role**: Cannot be assigned during signup - must be manually granted by AWS administrators via Cognito Console
- **User Role**: Cannot sign up directly - must be invited by an Admin or Owner
- This follows the **principle of least privilege** and ensures proper security controls

**Security Model:**

- ✅ No application code can grant Admin privileges
- ✅ Admin assignment requires AWS Console access (infrastructure-level security)
- ✅ All privilege escalations require human approval and AWS-level permissions
- ✅ Clear audit trail via AWS CloudTrail

See [Admin Role Assignment Guide](./ADMIN_ROLE_ASSIGNMENT.md) for details on granting admin privileges.

## Roles and Permissions

### Admin Role

- **Company Level**: Full company management, user management, view all projects
- **Project Level**: Create, delete, and edit all projects
- **Document Level**: Upload, delete, view, and download all documents

### Owner Role

- **Company Level**: No company management, no user management, assigned projects only
- **Project Level**: Create, delete, and edit assigned projects
- **Document Level**: Upload, delete, view, and download documents in assigned projects

### User Role

- **Company Level**: No company management, no user management, assigned projects only
- **Project Level**: No project creation, deletion, or editing
- **Document Level**: View and download documents in assigned projects only

## File Structure

### Core Types

- `src/types/entities.d.ts` - User, UserRole, UserInvitation, and RolePermissions types
- `src/types/index.ts` - Exports for all RBAC types

### Services

- `src/services/user-management.ts` - Core user management service with CRUD operations
  - User creation, updating, deletion
  - Invitation management
  - Permission checking
  - Role-based filtering

### Hooks

- `src/hooks/use-user-management.tsx` - React hook for user management
  - State management for users and invitations
  - Action handlers for all user operations
  - Permission utilities
  - Statistics computation

### Components

- `src/components/UserForm.tsx` - Form for creating and editing users
  - Role selection with permission preview
  - Project assignment (context-aware based on role)
  - Active status toggle for existing users
- `src/components/UserTable.tsx` - Table displaying all users
  - Search and filtering by role/status
  - Role badges with color coding
  - Action dropdown for edit/delete operations
  - Status indicators and last login tracking

- `src/components/UserStats.tsx` - Statistics dashboard
  - Total/active user counts
  - Role distribution
  - Pending invitation tracking

### Pages

- `src/pages/ProfileSettings.tsx` - Main settings page with user management tabs
  - Profile management (existing)
  - User management tab (Admin only)
  - Invitations tab (Admin only)

## Usage

### Accessing User Management

1. Navigate to Profile Settings
2. Admin users will see "User Management" and "Invitations" tabs
3. Non-admin users only see the "Profile" tab

### Adding Users

1. Click "Add User" button in User Management tab
2. Fill in email, name, and select role
3. For Owner/User roles, assign specific projects
4. System shows permission preview based on selected role
5. Submit to create user account

### Managing Existing Users

1. Use search/filter in the user table
2. Click actions menu (three dots) for any user
3. Edit to modify role, projects, or active status
4. Delete to remove user permanently

### Invitation System

1. When creating users, invitations are automatically sent
2. Track invitation status in the Invitations tab
3. Cancel pending invitations if needed
4. Invitations expire after 1 week

## Permission Checking

The system provides utilities to check permissions:

```typescript
// Check if user can perform specific action
const canEdit = userManagement.canUserPerformAction(userRole, 'canEditProjects')

// Check if user can access specific project
const hasAccess = userManagementService.canUserAccessProject(user, projectId)

// Get all permissions for a role
const permissions = userManagement.getUserPermissions(userRole)
```

## Integration Points

### Authentication

- Integrates with existing `useAuth` hook
- Uses current user context for permission checking
- Respects company/user associations

### Navigation

- Conditionally shows tabs based on user permissions
- Hides functionality that users cannot access
- Provides appropriate error states

### Data Management

- Uses existing project data structure
- Compatible with current document management
- Maintains referential integrity

## Security Considerations

### Frontend Security

- UI elements hidden based on permissions
- Form validation prevents invalid role assignments
- Client-side permission checking for user experience

### Backend Integration

- Service layer designed for easy backend integration
- Permission checks should be enforced server-side
- Invitation tokens should be cryptographically secure

### Data Validation

- TypeScript ensures type safety
- Form validation prevents invalid inputs
- Role assignments validated against business rules

## Future Enhancements

### Advanced Features

- **Custom Roles**: Allow creation of custom roles with granular permissions
- **Team Management**: Group users into teams with shared project access
- **Audit Logging**: Track user actions and permission changes
- **Bulk Operations**: Import/export users, bulk role assignments
- **Advanced Filtering**: Filter by last login, creation date, project assignment

### Integration Improvements

- **SSO Integration**: Single sign-on with corporate identity providers
- **Email Notifications**: Automated invitation and status change emails
- **API Integration**: RESTful API for user management operations
- **Real-time Updates**: WebSocket integration for live user status updates

## Testing

### Unit Tests

- Test permission calculation logic
- Validate role-based filtering
- Check invitation flow logic

### Integration Tests

- Test complete user creation workflow
- Validate permission enforcement
- Check cross-component communication

### E2E Tests

- Test full user management workflow
- Validate different role experiences
- Check permission boundaries

## Deployment Notes

### Environment Variables

- Configure invitation email settings
- Set invitation expiration timeouts
- Configure role permission overrides if needed

### Database Migration

- User table creation with role and project relationships
- Invitation table for pending user invitations
- Indexes for performance on user queries

### Monitoring

- Track user creation and invitation rates
- Monitor role distribution and access patterns
- Alert on failed permission checks or unauthorized access attempts
