import React from 'react'
import { usePermissions } from '../../hooks/user-roles'
import { useAuthorization } from '../../hooks/auth-utils'
import type { UserRole, RolePermissions } from '../../types/entities'

// Authorization component props
interface ProtectedComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireRole?: UserRole | UserRole[]
  requirePermission?:
    | keyof RolePermissions['permissions']
    | Array<keyof RolePermissions['permissions']>
  requireProject?: string // Project ID for project-specific access
  requireAnyPermission?: boolean // If true, user needs ANY of the permissions. If false, needs ALL
}

/**
 * Component wrapper for role-based and permission-based access control
 */
export function ProtectedComponent({
  children,
  fallback = null,
  requireRole,
  requirePermission,
  requireProject,
  requireAnyPermission = false,
}: ProtectedComponentProps): React.ReactElement | null {
  const { hasRole, hasAnyRole, hasPermission, canAccessProject } =
    usePermissions()

  // Check role requirements
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole]
    if (!hasAnyRole(roles)) {
      return fallback as React.ReactElement
    }
  }

  // Check permission requirements
  if (requirePermission) {
    const permissions = Array.isArray(requirePermission)
      ? requirePermission
      : [requirePermission]

    const hasRequiredPermissions = requireAnyPermission
      ? permissions.some(permission => hasPermission(permission))
      : permissions.every(permission => hasPermission(permission))

    if (!hasRequiredPermissions) {
      return fallback as React.ReactElement
    }
  }

  // Check project access requirements
  if (requireProject && !canAccessProject(requireProject)) {
    return fallback as React.ReactElement
  }

  return children as React.ReactElement
}

/**
 * React component for displaying unauthorized access message
 */
export function UnauthorizedAccess({
  message = 'You do not have permission to access this resource.',
  showReturnHome = true,
}: {
  message?: string
  showReturnHome?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Access Denied
        </h2>
        <p className="text-red-600 mb-4">{message}</p>
        {showReturnHome && (
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  )
}
