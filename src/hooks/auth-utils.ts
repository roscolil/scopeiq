import React from 'react'
import { usePermissions, type UserContext } from '../hooks/user-roles'
import type { UserRole, RolePermissions } from '../types/entities'

/**
 * Hook for programmatic authorization checks
 */
export function useAuthorization() {
  const permissions = usePermissions()

  const isAuthorized = (config: {
    requireRole?: UserRole | UserRole[]
    requirePermission?:
      | keyof RolePermissions['permissions']
      | Array<keyof RolePermissions['permissions']>
    requireProject?: string
    requireAnyPermission?: boolean
  }): boolean => {
    // Check role requirements
    if (config.requireRole) {
      const roles = Array.isArray(config.requireRole)
        ? config.requireRole
        : [config.requireRole]
      if (!permissions.hasAnyRole(roles)) {
        return false
      }
    }

    // Check permission requirements
    if (config.requirePermission) {
      const perms = Array.isArray(config.requirePermission)
        ? config.requirePermission
        : [config.requirePermission]

      const hasRequiredPermissions = config.requireAnyPermission
        ? perms.some(permission => permissions.hasPermission(permission))
        : perms.every(permission => permissions.hasPermission(permission))

      if (!hasRequiredPermissions) {
        return false
      }
    }

    // Check project access requirements
    if (
      config.requireProject &&
      !permissions.canAccessProject(config.requireProject)
    ) {
      return false
    }

    return true
  }

  return {
    ...permissions,
    isAuthorized,
  }
}

/**
 * Utility functions for common authorization patterns
 */
export const AuthUtils = {
  // Check if user can manage the company
  canManageCompany: (userContext: UserContext | null): boolean => {
    return userContext?.permissions.canManageCompany || false
  },

  // Check if user can manage users
  canManageUsers: (userContext: UserContext | null): boolean => {
    return userContext?.permissions.canManageUsers || false
  },

  // Check if user can manage a specific project
  canManageProject: (
    userContext: UserContext | null,
    projectId?: string,
  ): boolean => {
    if (!userContext) return false

    // Check general project management permission
    if (!userContext.permissions.canEditProjects) return false

    // If specific project ID provided, check access
    if (projectId) {
      return (
        userContext.role === 'Admin' ||
        userContext.role === 'Owner' ||
        userContext.projectIds.includes(projectId)
      )
    }

    return true
  },

  // Check if user can delete documents
  canDeleteDocument: (
    userContext: UserContext | null,
    projectId?: string,
  ): boolean => {
    if (!userContext || !userContext.permissions.canDeleteDocuments)
      return false

    // If specific project provided, check access
    if (projectId) {
      return (
        userContext.role === 'Admin' ||
        userContext.role === 'Owner' ||
        userContext.projectIds.includes(projectId)
      )
    }

    return true
  },

  // Check if user is company admin or higher
  isCompanyAdmin: (userContext: UserContext | null): boolean => {
    return userContext?.role === 'Admin' || userContext?.role === 'Owner'
  },

  // Check if user is global admin
  isGlobalAdmin: (userContext: UserContext | null): boolean => {
    return userContext?.role === 'Admin'
  },

  // Get user's accessible project IDs
  getAccessibleProjects: (userContext: UserContext | null): string[] => {
    if (!userContext) return []

    // Admin and Owner can access all projects (this would need to be fetched from API)
    if (userContext.role === 'Admin' || userContext.role === 'Owner') {
      // In practice, you'd fetch all projects for the company
      return userContext.projectIds // For now, return assigned projects
    }

    return userContext.projectIds
  },
}
