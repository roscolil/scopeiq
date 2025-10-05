/**
 * Audit Logging Service
 * Tracks security-relevant events for compliance and monitoring
 */

export type AuditAction =
  | 'PERMISSION_CHECK'
  | 'ROLE_CHANGE'
  | 'ACCESS_DENIED'
  | 'ACCESS_GRANTED'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_UPDATED'
  | 'PROJECT_CREATED'
  | 'PROJECT_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'INVITATION_SENT'
  | 'INVITATION_ACCEPTED'

export type AuditResult = 'allowed' | 'denied' | 'success' | 'failure'

export interface AuditLogEntry {
  // Who
  userId: string
  userEmail?: string
  userRole?: string

  // What
  action: AuditAction
  result: AuditResult

  // Where
  resource: string
  resourceId: string

  // When
  timestamp: string

  // Why (optional context)
  metadata?: Record<string, any>

  // Where in code
  component?: string
  route?: string
}

export interface RoleChangeMetadata {
  targetUserId: string
  targetUserEmail: string
  oldRole: string
  newRole: string
  changedBy: string
  reason?: string
}

export interface PermissionCheckMetadata {
  permission?: string
  requiredRole?: string | string[]
  requiredPermission?: string | string[]
  projectId?: string
}

export interface AccessDenialMetadata {
  attemptedAction: string
  requiredPermission?: string
  requiredRole?: string
  userRole: string
  reason: string
}

class AuditLogService {
  private logs: AuditLogEntry[] = []
  private maxLogsInMemory = 1000 // Maximum logs to keep in memory
  private maxLogsInStorage = 1000 // Maximum logs to persist
  private maxLogAgeDays = 7 // Maximum age for logs in days
  private storageKey = 'audit_logs'
  private enabled = true

  constructor() {
    // Load existing logs from localStorage on init
    this.loadLogs()
    // Clean old logs on startup
    this.cleanOldLogs()
  }

  /**
   * Enable or disable audit logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
    console.log(`[AUDIT] Logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Core method to log any audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) return

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    }

    // Add to in-memory logs
    this.logs.unshift(fullEntry)

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(0, this.maxLogsInMemory)
    }

    // Persist to localStorage
    this.saveLogs()

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(fullEntry)
    }

    // In production, you'd send to CloudWatch, Datadog, etc.
    // await this.sendToCloudWatch(fullEntry)
  }

  /**
   * Log a permission check
   */
  async logPermissionCheck(
    userId: string,
    permission: string,
    result: AuditResult,
    metadata?: PermissionCheckMetadata,
  ): Promise<void> {
    await this.log({
      userId,
      action: 'PERMISSION_CHECK',
      result,
      resource: 'Permission',
      resourceId: permission,
      metadata: {
        permission,
        ...metadata,
      },
      component: metadata?.projectId ? 'ProjectGuard' : 'PermissionCheck',
    })
  }

  /**
   * Log a role change
   */
  async logRoleChange(metadata: RoleChangeMetadata): Promise<void> {
    await this.log({
      userId: metadata.changedBy,
      action: 'ROLE_CHANGE',
      result: 'success',
      resource: 'User',
      resourceId: metadata.targetUserId,
      metadata: {
        targetUserId: metadata.targetUserId,
        targetUserEmail: metadata.targetUserEmail,
        oldRole: metadata.oldRole,
        newRole: metadata.newRole,
        reason: metadata.reason,
      },
      component: 'UserManagement',
    })
  }

  /**
   * Log access denied event
   */
  async logAccessDenied(
    userId: string,
    userRole: string,
    resource: string,
    resourceId: string,
    metadata?: AccessDenialMetadata,
  ): Promise<void> {
    await this.log({
      userId,
      userRole,
      action: 'ACCESS_DENIED',
      result: 'denied',
      resource,
      resourceId,
      metadata: {
        attemptedAction: metadata?.attemptedAction || 'access',
        requiredPermission: metadata?.requiredPermission,
        requiredRole: metadata?.requiredRole,
        userRole,
        reason: metadata?.reason || 'Insufficient permissions',
      },
    })
  }

  /**
   * Log access granted event
   */
  async logAccessGranted(
    userId: string,
    userRole: string,
    resource: string,
    resourceId: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId,
      userRole,
      action: 'ACCESS_GRANTED',
      result: 'allowed',
      resource,
      resourceId,
      metadata,
    })
  }

  /**
   * Log user creation
   */
  async logUserCreated(
    createdBy: string,
    newUserId: string,
    newUserEmail: string,
    role: string,
  ): Promise<void> {
    await this.log({
      userId: createdBy,
      action: 'USER_CREATED',
      result: 'success',
      resource: 'User',
      resourceId: newUserId,
      metadata: {
        newUserEmail,
        assignedRole: role,
      },
      component: 'UserManagement',
    })
  }

  /**
   * Log user deletion
   */
  async logUserDeleted(
    deletedBy: string,
    deletedUserId: string,
    deletedUserEmail: string,
  ): Promise<void> {
    await this.log({
      userId: deletedBy,
      action: 'USER_DELETED',
      result: 'success',
      resource: 'User',
      resourceId: deletedUserId,
      metadata: {
        deletedUserEmail,
      },
      component: 'UserManagement',
    })
  }

  /**
   * Log project creation
   */
  async logProjectCreated(
    createdBy: string,
    projectId: string,
    projectName: string,
  ): Promise<void> {
    await this.log({
      userId: createdBy,
      action: 'PROJECT_CREATED',
      result: 'success',
      resource: 'Project',
      resourceId: projectId,
      metadata: {
        projectName,
      },
      component: 'Projects',
    })
  }

  /**
   * Log project deletion
   */
  async logProjectDeleted(
    deletedBy: string,
    projectId: string,
    projectName: string,
  ): Promise<void> {
    await this.log({
      userId: deletedBy,
      action: 'PROJECT_DELETED',
      result: 'success',
      resource: 'Project',
      resourceId: projectId,
      metadata: {
        projectName,
      },
      component: 'ProjectDetails',
    })
  }

  /**
   * Log document upload
   */
  async logDocumentUploaded(
    uploadedBy: string,
    documentId: string,
    documentName: string,
    projectId: string,
  ): Promise<void> {
    await this.log({
      userId: uploadedBy,
      action: 'DOCUMENT_UPLOADED',
      result: 'success',
      resource: 'Document',
      resourceId: documentId,
      metadata: {
        documentName,
        projectId,
      },
      component: 'FileUploader',
    })
  }

  /**
   * Log document deletion
   */
  async logDocumentDeleted(
    deletedBy: string,
    documentId: string,
    documentName: string,
    projectId: string,
  ): Promise<void> {
    await this.log({
      userId: deletedBy,
      action: 'DOCUMENT_DELETED',
      result: 'success',
      resource: 'Document',
      resourceId: documentId,
      metadata: {
        documentName,
        projectId,
      },
      component: 'DocumentList',
    })
  }

  /**
   * Log invitation sent
   */
  async logInvitationSent(
    sentBy: string,
    invitationId: string,
    recipientEmail: string,
    role: string,
    projectIds?: string[],
  ): Promise<void> {
    await this.log({
      userId: sentBy,
      action: 'INVITATION_SENT',
      result: 'success',
      resource: 'UserInvitation',
      resourceId: invitationId,
      metadata: {
        recipientEmail,
        role,
        projectCount: projectIds?.length || 0,
        projectIds,
      },
      component: 'UserManagement',
    })
  }

  /**
   * Get recent audit logs
   */
  getLogs(limit?: number): AuditLogEntry[] {
    return limit ? this.logs.slice(0, limit) : this.logs
  }

  /**
   * Get logs filtered by action
   */
  getLogsByAction(action: AuditAction, limit?: number): AuditLogEntry[] {
    const filtered = this.logs.filter(log => log.action === action)
    return limit ? filtered.slice(0, limit) : filtered
  }

  /**
   * Get logs for a specific user
   */
  getLogsByUser(userId: string, limit?: number): AuditLogEntry[] {
    const filtered = this.logs.filter(log => log.userId === userId)
    return limit ? filtered.slice(0, limit) : filtered
  }

  /**
   * Get logs for a specific resource
   */
  getLogsByResource(
    resource: string,
    resourceId?: string,
    limit?: number,
  ): AuditLogEntry[] {
    let filtered = this.logs.filter(log => log.resource === resource)
    if (resourceId) {
      filtered = filtered.filter(log => log.resourceId === resourceId)
    }
    return limit ? filtered.slice(0, limit) : filtered
  }

  /**
   * Get denied access attempts
   */
  getDeniedAccess(limit?: number): AuditLogEntry[] {
    const filtered = this.logs.filter(
      log => log.result === 'denied' || log.action === 'ACCESS_DENIED',
    )
    return limit ? filtered.slice(0, limit) : filtered
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.logs.length
    const denied = this.getDeniedAccess().length
    const permissionChecks = this.getLogsByAction('PERMISSION_CHECK').length
    const roleChanges = this.getLogsByAction('ROLE_CHANGE').length

    const actionCounts: Record<string, number> = {}
    this.logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    })

    return {
      total,
      denied,
      permissionChecks,
      roleChanges,
      actionCounts,
      deniedRate: total > 0 ? (denied / total) * 100 : 0,
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
    this.saveLogs()
    console.log('[AUDIT] Logs cleared')
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Export logs as CSV
   */
  exportLogsCSV(): string {
    if (this.logs.length === 0) return ''

    const headers = [
      'Timestamp',
      'User ID',
      'User Role',
      'Action',
      'Result',
      'Resource',
      'Resource ID',
      'Component',
      'Metadata',
    ]

    const rows = this.logs.map(log => [
      log.timestamp,
      log.userId,
      log.userRole || '',
      log.action,
      log.result,
      log.resource,
      log.resourceId,
      log.component || '',
      JSON.stringify(log.metadata || {}),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    return csvContent
  }

  /**
   * Clean logs older than maxLogAgeDays
   */
  private cleanOldLogs(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.maxLogAgeDays)
    const cutoffTime = cutoffDate.getTime()

    const originalCount = this.logs.length
    this.logs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime()
      return logTime > cutoffTime
    })

    const removed = originalCount - this.logs.length
    if (removed > 0) {
      console.log(
        `[AUDIT] Cleaned ${removed} old logs (older than ${this.maxLogAgeDays} days)`,
      )
      this.saveLogs()
    }
  }

  /**
   * Private: Load logs from localStorage
   */
  private loadLogs(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const allLogs = JSON.parse(stored)
        // Limit to maxLogsInStorage when loading
        this.logs = allLogs.slice(0, this.maxLogsInStorage)
        console.log(`[AUDIT] Loaded ${this.logs.length} logs from storage`)

        // If we truncated, save the truncated version
        if (allLogs.length > this.maxLogsInStorage) {
          console.log(
            `[AUDIT] Truncated ${allLogs.length - this.maxLogsInStorage} old logs`,
          )
          this.saveLogs()
        }
      }
    } catch (error) {
      console.error('[AUDIT] Error loading logs:', error)
      this.logs = []
    }
  }

  /**
   * Private: Save logs to localStorage
   */
  private saveLogs(): void {
    if (typeof window === 'undefined') return

    try {
      // Only save up to maxLogsInStorage
      const logsToSave = this.logs.slice(0, this.maxLogsInStorage)
      localStorage.setItem(this.storageKey, JSON.stringify(logsToSave))
    } catch (error) {
      console.error('[AUDIT] Error saving logs:', error)
      // If quota exceeded, keep only most recent 100 logs
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[AUDIT] Storage quota exceeded, reducing to 100 logs')
        this.logs = this.logs.slice(0, 100)
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.logs))
        } catch (e) {
          // If still failing, clear audit logs entirely
          console.error(
            '[AUDIT] Cannot save even 100 logs, clearing audit storage',
          )
          localStorage.removeItem(this.storageKey)
          this.logs = []
        }
      }
    }
  }

  /**
   * Private: Log to console in development
   */
  private logToConsole(entry: AuditLogEntry): void {
    const icon =
      entry.result === 'denied' || entry.result === 'failure' ? '🚫' : '✅'
    const color =
      entry.result === 'denied' || entry.result === 'failure'
        ? 'color: red'
        : 'color: green'

    console.log(`%c[AUDIT ${icon}] ${entry.action}`, color, {
      user: entry.userId,
      role: entry.userRole,
      resource: `${entry.resource}:${entry.resourceId}`,
      result: entry.result,
      component: entry.component,
      metadata: entry.metadata,
    })
  }

  /**
   * Send to CloudWatch Logs (for production)
   * This is a placeholder - implement based on your logging infrastructure
   */
  private async sendToCloudWatch(entry: AuditLogEntry): Promise<void> {
    // TODO: Implement CloudWatch integration
    // Example:
    // await cloudWatchLogs.putLogEvents({
    //   logGroupName: '/aws/rbac/audit',
    //   logStreamName: 'permission-checks',
    //   logEvents: [{
    //     message: JSON.stringify(entry),
    //     timestamp: Date.now()
    //   }]
    // })
  }
}

// Export singleton instance
export const auditLog = new AuditLogService()

// Convenience methods for common operations
export const AuditLogger = {
  /**
   * Track permission check with automatic context
   */
  checkPermission: async (
    userId: string,
    permission: string,
    granted: boolean,
    metadata?: PermissionCheckMetadata,
  ) => {
    await auditLog.logPermissionCheck(
      userId,
      permission,
      granted ? 'allowed' : 'denied',
      metadata,
    )
  },

  /**
   * Track route access
   */
  checkRouteAccess: async (
    userId: string,
    userRole: string,
    route: string,
    allowed: boolean,
    metadata?: any,
  ) => {
    await auditLog.log({
      userId,
      userRole,
      action: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      result: allowed ? 'allowed' : 'denied',
      resource: 'Route',
      resourceId: route,
      route,
      metadata,
    })
  },

  /**
   * Track project access
   */
  checkProjectAccess: async (
    userId: string,
    userRole: string,
    projectId: string,
    allowed: boolean,
  ) => {
    await auditLog.log({
      userId,
      userRole,
      action: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      result: allowed ? 'allowed' : 'denied',
      resource: 'Project',
      resourceId: projectId,
      component: 'ProjectGuard',
    })
  },

  /**
   * Get audit statistics
   */
  getStats: () => auditLog.getStats(),

  /**
   * Get recent denied access attempts
   */
  getRecentDenials: (limit = 10) => auditLog.getDeniedAccess(limit),

  /**
   * Export logs for review
   */
  exportJSON: () => auditLog.exportLogs(),
  exportCSV: () => auditLog.exportLogsCSV(),
}
