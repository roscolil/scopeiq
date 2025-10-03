# Audit Logging - Quick Reference

## 🚀 Quick Start

### **Import:**

```typescript
import { AuditLogger, auditLog } from '@/services/audit/audit-log'
```

### **Automatic Logging (Already Working):**

✅ Permission checks (via `useAuthorization`)  
✅ Route access (ProjectGuard, DocumentGuard)  
✅ User invitations  
✅ User creation

---

## 📝 Common Use Cases

### **1. Log User Action:**

```typescript
await auditLog.log({
  userId: userContext.userId,
  userRole: userContext.role,
  action: 'DOCUMENT_UPLOADED',
  result: 'success',
  resource: 'Document',
  resourceId: documentId,
  metadata: { documentName, projectId },
})
```

### **2. Log Access Denial:**

```typescript
await AuditLogger.checkRouteAccess(
  userId,
  userRole,
  '/project/123',
  false, // denied
  { reason: 'Not assigned to project' },
)
```

### **3. Log Role Change:**

```typescript
await auditLog.logRoleChange({
  targetUserId: user.id,
  targetUserEmail: user.email,
  oldRole: 'User',
  newRole: 'Owner',
  changedBy: currentUser.userId,
})
```

---

## 🔍 Viewing Logs

### **In Component:**

```typescript
import { AuditLogViewer } from '@/components/admin/AuditLogViewer'

<AuditLogViewer />
```

### **In Console:**

```javascript
// Get recent logs
auditLog.getLogs(20)

// Get statistics
auditLog.getStats()

// Get denied access
auditLog.getDeniedAccess(10)

// Search by user
auditLog.getLogsByUser('user-123')

// Export
auditLog.exportLogs() // JSON
auditLog.exportLogsCSV() // CSV
```

---

## 📊 Statistics

```typescript
const stats = auditLog.getStats()

console.log(stats)
// {
//   total: 1250,
//   denied: 15,
//   permissionChecks: 890,
//   roleChanges: 5,
//   actionCounts: { ... },
//   deniedRate: 1.2
// }
```

---

## 🎯 What Gets Logged

| Event             | Auto    | Manual |
| ----------------- | ------- | ------ |
| Permission checks | ✅ Auto | -      |
| Route access      | ✅ Auto | -      |
| Project access    | ✅ Auto | -      |
| User invitations  | ✅ Auto | -      |
| User creation     | ✅ Auto | -      |
| User deletion     | -       | ⚠️ Add |
| Role changes      | -       | ⚠️ Add |
| Project creation  | -       | ⚠️ Add |
| Project deletion  | -       | ⚠️ Add |
| Document upload   | -       | ⚠️ Add |
| Document deletion | -       | ⚠️ Add |

---

## ⚙️ Configuration

### **Enable/Disable:**

```typescript
auditLog.setEnabled(true) // Enable
auditLog.setEnabled(false) // Disable
```

### **Clear Logs:**

```typescript
auditLog.clearLogs()
```

---

## 📤 Export Logs

### **JSON Export:**

```typescript
const json = auditLog.exportLogs()
// Download or send to server
```

### **CSV Export:**

```typescript
const csv = auditLog.exportLogsCSV()
// Open in Excel/Google Sheets
```

---

## 🔒 Security

**⚠️ Important:**

- Only show audit logs to Admins
- Logs contain sensitive information
- Export securely
- Rotate logs regularly
- Don't log passwords/tokens

---

## 📖 Full Documentation

See [AUDIT_LOGGING.md](./src/docs/AUDIT_LOGGING.md) for complete guide.

---

**Quick Access:**

- Service: `src/services/audit/audit-log.ts`
- Viewer: `src/components/admin/AuditLogViewer.tsx`
- Docs: `src/docs/AUDIT_LOGGING.md`

