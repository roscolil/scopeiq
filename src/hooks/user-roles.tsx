import { useEffect, useState } from 'react'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import type { UserRole, RolePermissions } from '../types/entities'

// Enhanced user context with permissions
export interface UserContext {
  userId: string
  email: string
  name: string
  role: UserRole
  companyId: string
  projectIds: string[]
  isActive: boolean
  lastLoginAt?: string
  permissions: RolePermissions['permissions']
}

// Define role-based permissions according to security best practices
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions['permissions']> = {
  Admin: {
    // Company level permissions
    canManageCompany: true,
    canManageUsers: true,
    canViewAllProjects: true,
    // Project level permissions
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,
    // Document level permissions
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  Owner: {
    // Company level permissions
    canManageCompany: true,
    canManageUsers: true,
    canViewAllProjects: true,
    // Project level permissions
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,
    // Document level permissions
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
  User: {
    // Company level permissions
    canManageCompany: false,
    canManageUsers: false,
    canViewAllProjects: false,
    // Project level permissions
    canCreateProjects: false,
    canDeleteProjects: false,
    canEditProjects: false,
    // Document level permissions
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canDownloadDocuments: true,
  },
}

/**
 * Returns an array of Cognito group names (roles) for the current user.
 * Returns [] if the user is not authenticated or has no groups.
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken

    if (!idToken) {
      return []
    }

    // Extract groups from JWT token
    const groups = (idToken.payload['cognito:groups'] as string[]) || []
    return groups
  } catch (error) {
    // Silently return empty array for unauthenticated users
    return []
  }
}

/**
 * Returns the user context with role and permissions from JWT custom claims
 */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  try {
    const [user, session] = await Promise.all([
      getCurrentUser(),
      fetchAuthSession(),
    ])

    const idToken = session.tokens?.idToken
    if (!idToken || !user) {
      return null
    }

    // Extract custom claims from JWT token
    const claims = idToken.payload
    const role = (claims['custom:role'] as UserRole) || 'User'
    const companyId = (claims['custom:companyId'] as string) || ''
    const projectIds = JSON.parse(
      (claims['custom:projectIds'] as string) || '[]',
    )
    const isActive = claims['custom:isActive'] === 'true'
    const userId = (claims['custom:userId'] as string) || ''
    const userName = (claims['custom:userName'] as string) || user.username
    const lastLoginAt = claims['custom:lastLoginAt'] as string

    return {
      userId,
      email: user.username, // Cognito uses username as email for email auth
      name: userName,
      role,
      companyId,
      projectIds,
      isActive,
      lastLoginAt,
      permissions: ROLE_PERMISSIONS[role],
    }
  } catch (error) {
    // Only log if it's not an authentication error (expected when not logged in)
    if (
      error instanceof Error &&
      !error.name?.includes('UserUnAuthenticatedException') &&
      !error.message?.includes('authenticated')
    ) {
      console.error('Error getting user context:', error)
    }
    return null
  }
}

/**
 * React hook for user context and permissions
 */
export function useUserContext() {
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadUserContext = async () => {
      try {
        setLoading(true)
        setError(null)

        const context = await getCurrentUserContext()

        if (mounted) {
          setUserContext(context)
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load user context',
          )
          setUserContext(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadUserContext()

    return () => {
      mounted = false
    }
  }, [])

  return {
    userContext,
    loading,
    error,
    refetch: () => getCurrentUserContext().then(setUserContext),
  }
}

/**
 * React hook for checking specific permissions
 */
export function usePermissions() {
  const { userContext } = useUserContext()

  const hasPermission = (
    permission: keyof RolePermissions['permissions'],
  ): boolean => {
    return userContext?.permissions[permission] || false
  }

  const hasRole = (role: UserRole): boolean => {
    return userContext?.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userContext?.role ? roles.includes(userContext.role) : false
  }

  const canAccessProject = (projectId: string): boolean => {
    if (!userContext) return false

    // Admin and Owner can access all projects
    if (userContext.role === 'Admin' || userContext.role === 'Owner') {
      return true
    }

    // Regular users can only access assigned projects
    return userContext.projectIds.includes(projectId)
  }

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccessProject,
    userRole: userContext?.role || 'User',
    permissions: userContext?.permissions || ROLE_PERMISSIONS.User,
  }
}
