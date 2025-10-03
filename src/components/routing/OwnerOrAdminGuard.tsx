import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthorization } from '@/hooks/auth-utils'
import { PageLoader } from '@/components/shared/PageLoader'
import { UnauthorizedAccess } from '@/utils/auth/authorization'

/**
 * OwnerOrAdminGuard
 * Protects routes that require either Owner or Admin role.
 * Use this for management features like user management, company settings, etc.
 */
const OwnerOrAdminGuard: React.FC = () => {
  const { isAuthorized, userRole } = useAuthorization()

  // Check if user has Admin or Owner role
  const allowed = isAuthorized({ requireRole: ['Admin', 'Owner'] })

  if (!allowed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <UnauthorizedAccess
          message="This area is restricted to administrators and owners only."
          showReturnHome={true}
        />
      </div>
    )
  }

  return <Outlet />
}

export default OwnerOrAdminGuard

