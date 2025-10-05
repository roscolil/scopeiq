# Developer Tools Guide

## 🔧 Overview

ScopeIQ includes a **Developer Tools panel** that makes testing RBAC (role-based access control) functionality easy during development. This tool allows you to quickly switch between roles and test different permission scenarios without modifying AWS Cognito.

**⚠️ IMPORTANT: This feature is ONLY available in development mode and is automatically disabled in production builds.**

---

## 🎯 Features

### **1. Role Switching**

Instantly switch between Admin, Owner, and User roles to test:

- Permission checks
- UI visibility
- Route guards
- Feature access

### **2. Project Assignment Override**

For testing User role behavior:

- Specify which projects the user has access to
- Test project filtering
- Verify project-level permissions

### **3. Persistent Overrides**

- Overrides persist across page reloads
- Stored in localStorage
- Easy to clear and reset

### **4. Visual Feedback**

- See current active role
- Badge indicator when overrides are active
- Real-time status display

---

## 📖 How to Use

### **Accessing Dev Tools**

1. **Start development server:**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Look for the orange "Dev Tools" button** in the bottom-right corner of the screen

3. **Click to open** the Developer Tools panel

### **Switching Roles**

1. Open the Dev Tools panel
2. Select a role from the "Override Role" dropdown:
   - **Admin** - Full system access
   - **Owner** - Company-level access
   - **User** - Limited project access
3. Page will automatically reload
4. You now have the selected role's permissions

### **Testing User Role with Project Access**

When testing the User role, you can specify which projects they have access to:

1. Switch to "User" role
2. Enter project IDs in the "Override Projects" field:
   ```
   proj-123, proj-456, proj-789
   ```
3. Press Enter or click outside the field
4. Page reloads with specified project access

**Leave empty to test "no project access" scenario**

### **Clearing Overrides**

To return to your actual role:

1. Open Dev Tools panel
2. Click **"Clear All Overrides"** button
3. Page reloads with your real Cognito-assigned role

---

## 🧪 Testing Scenarios

### **Scenario 1: Test Admin Features**

```
Goal: Verify admin-only features are working

Steps:
1. Open Dev Tools
2. Select "Admin" role
3. Navigate to /admin
4. Verify you can access:
   - User management
   - Audit logs
   - All projects
   - All documents
```

### **Scenario 2: Test Owner Permissions**

```
Goal: Verify owner can manage their company

Steps:
1. Open Dev Tools
2. Select "Owner" role
3. Verify you can:
   - Create projects
   - Edit projects
   - Upload documents
   - Invite users
4. Verify you CANNOT:
   - Access /admin
   - See other companies
```

### **Scenario 3: Test User Restrictions**

```
Goal: Verify user has limited access

Steps:
1. Open Dev Tools
2. Select "User" role
3. Set projects: "proj-123"
4. Verify you can:
   - View assigned project
   - View documents in assigned project
   - Download documents
5. Verify you CANNOT:
   - Create projects
   - Delete projects
   - Delete documents
   - See other projects
   - Access user management
```

### **Scenario 4: Test No Project Access**

```
Goal: Verify user without projects sees appropriate message

Steps:
1. Open Dev Tools
2. Select "User" role
3. Leave projects field empty
4. Navigate to /projects
5. Verify:
   - Empty state or "No Projects" message
   - Cannot create projects
```

---

## 🔍 Technical Details

### **How It Works**

1. **localStorage Storage:**
   - `dev:roleOverride` - Stores the override role
   - `dev:projectsOverride` - Stores comma-separated project IDs

2. **Hook Integration:**
   - `useUserContext` checks for dev overrides
   - Applies overrides AFTER fetching real user data
   - Merges override with actual context

3. **Production Safety:**
   - Component checks `import.meta.env.DEV`
   - Returns `null` in production builds
   - Dev keys are stripped from production bundle

### **Code Example**

```typescript
// In useUserContext hook (src/hooks/user-roles.tsx)
if (import.meta.env.DEV && context) {
  const roleOverride = localStorage.getItem(
    'dev:roleOverride',
  ) as UserRole | null

  if (roleOverride) {
    context = {
      ...context,
      role: roleOverride,
      permissions: ROLE_PERMISSIONS[roleOverride],
    }
  }
}
```

---

## 🚨 Important Notes

### **Development Only**

- ✅ Works in `npm run dev` / `pnpm dev`
- ❌ Does NOT work in production builds
- ❌ Does NOT modify actual Cognito data
- ❌ Does NOT affect other users

### **Limitations**

- Overrides are client-side only
- Backend authorization still uses real roles
- Can't override company ID (security measure)
- Can't test invitation flows (requires real DB data)

### **Security**

- Zero impact on production
- No backend API for role changes
- localStorage is client-side only
- Completely removed in production build

---

## 🐛 Troubleshooting

### **Dev Tools button not showing**

```
Cause: Not in development mode
Fix: Ensure you're running `npm run dev` or `pnpm dev`
```

### **Override not taking effect**

```
Cause: Page didn't reload
Fix: Manually refresh the page (F5)
```

### **Still seeing old role after clearing**

```
Cause: Browser cache
Fix:
1. Open Dev Tools (F12)
2. Application > Local Storage
3. Clear dev:roleOverride and dev:projectsOverride
4. Refresh page
```

### **Console shows "Role override active" but permissions unchanged**

```
Cause: Backend authorization using real role
Fix: This is expected - backend always uses real Cognito role
     Dev overrides only affect frontend UI/routing
```

---

## 💡 Best Practices

### **For Development**

1. ✅ Test all three roles before pushing code
2. ✅ Clear overrides when testing auth flows
3. ✅ Document edge cases you discover
4. ✅ Use specific project IDs from your dev database

### **For Testing**

1. ✅ Test happy path (correct permissions)
2. ✅ Test edge cases (no projects, wrong role)
3. ✅ Test UI state (buttons, menus, routes)
4. ✅ Test transitions (role switches, project changes)

### **Before Deployment**

1. ✅ Verify DevTools doesn't appear in production build
2. ✅ Test with actual Cognito roles
3. ✅ Clear all dev overrides
4. ✅ Test as real users would experience it

---

## 🔗 Related Documentation

- [RBAC Implementation](./RBAC_IMPLEMENTATION.md) - Role definitions
- [Admin Role Assignment](./ADMIN_ROLE_ASSIGNMENT.md) - How to assign real admin roles
- [Security Architecture](./SECURITY_ARCHITECTURE.md) - Overall security model

---

## 📝 Keyboard Shortcuts

- **Open Dev Tools:** Click the orange button (bottom-right)
- **Close Dev Tools:** Click the down arrow
- **Clear Overrides:** Click "Clear All Overrides" button

---

## 🎨 UI Components

### **Dev Tools Button**

- **Position:** Fixed, bottom-right
- **Color:** Orange (distinctive from production UI)
- **Icon:** Settings gear
- **Z-index:** 9999 (always on top)

### **Dev Tools Panel**

- **Size:** 400px width
- **Border:** 2px orange
- **Shadow:** Heavy shadow for visibility
- **Content:**
  - Current status section
  - Role override dropdown
  - Project override input
  - Clear button
  - Tips and instructions

---

## 🚀 Quick Start

**One-minute setup for testing:**

```bash
# 1. Start dev server
pnpm dev

# 2. Login to the app
# 3. Look for orange "Dev Tools" button (bottom-right)
# 4. Click it
# 5. Select "Admin" role
# 6. Page reloads → You're now Admin
# 7. Test away! 🎉
```

---

## ⚡ Pro Tips

1. **Keyboard Shortcut:** Add `Ctrl+Shift+D` to toggle Dev Tools (future enhancement)
2. **Role Presets:** Save common test scenarios (future enhancement)
3. **Quick Switch:** Add role buttons for one-click switching (future enhancement)
4. **Session Mode:** Add option for session-only overrides (no persistence)

---

## 📊 Testing Checklist

Use this checklist when testing RBAC:

- [ ] **Admin Role**
  - [ ] Can access /admin
  - [ ] Can manage users
  - [ ] Can see all projects
  - [ ] Can create/edit/delete projects
  - [ ] Can upload/delete documents

- [ ] **Owner Role**
  - [ ] Cannot access /admin
  - [ ] Can manage users
  - [ ] Can see all company projects
  - [ ] Can create/edit/delete projects
  - [ ] Can upload/delete documents

- [ ] **User Role**
  - [ ] Cannot access /admin
  - [ ] Cannot manage users
  - [ ] Can only see assigned projects
  - [ ] Cannot create/edit/delete projects
  - [ ] Can upload but not delete documents
  - [ ] Can view and download documents

- [ ] **Edge Cases**
  - [ ] User with no projects
  - [ ] User with invalid project IDs
  - [ ] Switching roles mid-session
  - [ ] Clearing overrides
  - [ ] Page refresh with overrides

---

**Happy Testing! 🎉**
