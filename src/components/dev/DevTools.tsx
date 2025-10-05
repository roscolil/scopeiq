/**
 * Developer Tools Component
 *
 * Provides utilities for testing and development, including role switching.
 *
 * SECURITY: This component only works in development mode and is completely
 * disabled in production builds.
 */

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Shield,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUserContext } from '@/hooks/user-roles'
import type { UserRole } from '@/types/entities'
import { storageManager } from '@/utils/storage'

const DEV_ROLE_OVERRIDE_KEY = 'dev:roleOverride'
const DEV_PROJECTS_OVERRIDE_KEY = 'dev:projectsOverride'

// Only show in development mode
const isDevelopment = import.meta.env.DEV

interface DevToolsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const DevTools: React.FC<DevToolsProps> = ({ isOpen, onOpenChange }) => {
  const [overrideRole, setOverrideRole] = useState<UserRole | null>(null)
  const [overrideProjects, setOverrideProjects] = useState<string>('')
  const [storageStats, setStorageStats] = useState(storageManager.getStats())
  const { userContext } = useUserContext()

  // Load overrides from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem(
      DEV_ROLE_OVERRIDE_KEY,
    ) as UserRole | null
    const savedProjects = localStorage.getItem(DEV_PROJECTS_OVERRIDE_KEY) || ''

    if (savedRole) {
      setOverrideRole(savedRole)
    }
    if (savedProjects) {
      setOverrideProjects(savedProjects)
    }
  }, [])

  const handleRoleChange = (role: string) => {
    console.log('[DevTools] Role change requested:', role)

    if (!role || role === 'none') {
      // Clear override
      localStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
      setOverrideRole(null)
    } else {
      setOverrideRole(role as UserRole)
      localStorage.setItem(DEV_ROLE_OVERRIDE_KEY, role)
    }

    console.log('[DevTools] localStorage set, reloading page...')

    // Force reload to apply changes
    setTimeout(() => {
      window.location.reload()
    }, 100) // Small delay to ensure localStorage is written
  }

  const handleProjectsChange = (projects: string) => {
    setOverrideProjects(projects)
    if (projects) {
      localStorage.setItem(DEV_PROJECTS_OVERRIDE_KEY, projects)
    } else {
      localStorage.removeItem(DEV_PROJECTS_OVERRIDE_KEY)
    }

    // Force reload to apply changes
    window.location.reload()
  }

  const handleClearOverrides = () => {
    localStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
    localStorage.removeItem(DEV_PROJECTS_OVERRIDE_KEY)
    setOverrideRole(null)
    setOverrideProjects('')

    // Force reload to restore actual role
    window.location.reload()
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return <ShieldCheck className="h-4 w-4 text-red-500" />
      case 'Owner':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'User':
        return <UserIcon className="h-4 w-4 text-green-500" />
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const activeRole = overrideRole || userContext?.role
  const activeProjects =
    overrideProjects || userContext?.projectIds?.join(', ') || 'All'

  // Don't render in production
  if (!isDevelopment) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Dev Tools Panel - Drops from top navbar */}
      {isOpen && (
        <div className="fixed top-16 right-4 z-[9999] w-[420px] max-h-[calc(100vh-80px)] overflow-hidden animate-in slide-in-from-top-4 duration-200">
          <Card className="shadow-2xl border-2 border-orange-500 bg-white">
            <CardHeader className="bg-orange-50 border-b rounded-md border-orange-200 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-base text-orange-900">
                    Dev Tools
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('[DevTools] Closing panel')
                    onOpenChange(false)
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-xs text-orange-700 mt-1">
                ⚠️ Development mode only
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-3 pb-3 max-h-[calc(80vh-80px)] overflow-y-auto">
              {/* Current Status */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Status
                </h4>

                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600">Real:</span>
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(userContext?.role || 'User')}
                      <span className="font-medium text-xs">
                        {userContext?.role || 'Loading...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1.5 bg-orange-50 rounded border border-orange-200">
                    <span className="text-xs text-gray-700 font-medium">
                      Active:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(activeRole || 'User')}
                      <span className="font-semibold text-xs">
                        {activeRole || 'Unknown'}
                      </span>
                      {overrideRole && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4 bg-orange-100 text-orange-700 border-orange-300"
                        >
                          Override
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Debug info */}
                <details className="text-xs pt-1">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700 text-[10px]">
                    🔍 Debug Info
                  </summary>
                  <div className="mt-1 p-1.5 bg-gray-100 rounded font-mono text-[10px] space-y-0.5">
                    <div>
                      localStorage:{' '}
                      {localStorage.getItem('dev:roleOverride') || 'none'}
                    </div>
                    <div>
                      projects:{' '}
                      {localStorage.getItem('dev:projectsOverride') || 'none'}
                    </div>
                  </div>
                </details>
              </div>

              {/* Role Override */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Switch Role
                </label>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    size="sm"
                    variant={overrideRole === 'Admin' ? 'default' : 'outline'}
                    onClick={() => handleRoleChange('Admin')}
                    className={`flex flex-col items-center justify-center h-14 p-2 transition-all ${
                      overrideRole === 'Admin'
                        ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                        : 'hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 mb-1 flex-shrink-0" />
                    <span className="text-[10px] font-medium">Admin</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={overrideRole === 'Owner' ? 'default' : 'outline'}
                    onClick={() => handleRoleChange('Owner')}
                    className={`flex flex-col items-center justify-center h-14 p-2 transition-all ${
                      overrideRole === 'Owner'
                        ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                        : 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    <Shield className="h-4 w-4 mb-1 flex-shrink-0" />
                    <span className="text-[10px] font-medium">Owner</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={overrideRole === 'User' ? 'default' : 'outline'}
                    onClick={() => handleRoleChange('User')}
                    className={`flex flex-col items-center justify-center h-14 p-2 transition-all ${
                      overrideRole === 'User'
                        ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                        : 'hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                    }`}
                  >
                    <UserIcon className="h-4 w-4 mb-1 flex-shrink-0" />
                    <span className="text-[10px] font-medium">User</span>
                  </Button>
                </div>

                <p className="text-[10px] text-gray-500 text-center">
                  💡 Click a role • Page reloads automatically
                </p>
              </div>

              {/* Project Override (for User role testing) */}
              {(overrideRole === 'User' ||
                (!overrideRole && activeRole === 'User')) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Project IDs
                  </label>
                  <input
                    type="text"
                    value={overrideProjects}
                    onChange={e => setOverrideProjects(e.target.value)}
                    onBlur={() => handleProjectsChange(overrideProjects)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleProjectsChange(overrideProjects)
                      }
                    }}
                    placeholder="proj-123, proj-456"
                    className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-gray-500">
                    Comma-separated • Press Enter to apply
                  </p>
                </div>
              )}

              {/* Storage Stats */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Storage Usage
                </label>

                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600">Used:</span>
                    <span className="text-xs font-mono font-medium">
                      {storageStats.totalSizeMB}/{storageStats.maxSizeMB} MB (
                      {storageStats.usagePercent}%)
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        parseFloat(storageStats.usagePercent) > 80
                          ? 'bg-red-500'
                          : parseFloat(storageStats.usagePercent) > 50
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${storageStats.usagePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600">Items:</span>
                    <span className="text-xs font-mono font-medium">
                      {storageStats.itemCount}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    onClick={() => {
                      storageManager.cleanOldCaches()
                      setStorageStats(storageManager.getStats())
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Clean Caches
                  </Button>
                  <Button
                    onClick={() => {
                      setStorageStats(storageManager.getStats())
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                {overrideRole && (
                  <Button
                    onClick={handleClearOverrides}
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                  >
                    Clear Overrides
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

/**
 * Hook to check for dev role overrides
 * Used by useUserContext to apply overrides
 */
export function useDevRoleOverride() {
  if (!isDevelopment) {
    return { roleOverride: null, projectsOverride: null }
  }

  const roleOverride = localStorage.getItem(
    DEV_ROLE_OVERRIDE_KEY,
  ) as UserRole | null
  const projectsOverride = localStorage.getItem(DEV_PROJECTS_OVERRIDE_KEY)

  return {
    roleOverride,
    projectsOverride: projectsOverride
      ? projectsOverride.split(',').map(s => s.trim())
      : null,
  }
}
