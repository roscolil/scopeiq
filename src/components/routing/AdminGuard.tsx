import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthorization } from '@/hooks/auth-utils'
import { PageLoader } from '@/components/shared/PageLoader'
import type { RolePermissions } from '@/types/entities'

/**
 * AdminGuard
 * Protects admin-only routes. Renders children (via <Outlet />) if user has Admin role.
 * Otherwise shows an access denied message (fast fail without redirect latency).
 */
interface AuthorizationReturn {
  userRole: string
  isAuthorized: (config: {
    requireRole?: string | string[]
    requirePermission?:
      | keyof RolePermissions['permissions']
      | Array<keyof RolePermissions['permissions']>
    requireProject?: string
    requireAnyPermission?: boolean
  }) => boolean
}

const AdminGuard: React.FC = () => {
  const { userRole, isAuthorized } =
    useAuthorization() as unknown as AuthorizationReturn

  // We treat absence of authorization utilities gracefully (should not happen)
  const loading = false // useAuthorization internally handles loading via hooks used in user-roles

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <PageLoader type="default" />
      </div>
    )
  }

  const allowed = isAuthorized({ requireRole: 'Admin' })

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You must be an administrator to view this area. Your current role is:{' '}
          <span className="font-medium">{userRole}</span>.
        </p>
      </div>
    )
  }

  return <Outlet />
}

export default AdminGuard
