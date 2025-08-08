/**
 * User Stats Component
 * Displays user statistics and role distribution
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
  Clock,
} from 'lucide-react'

interface UserStatsProps {
  stats: {
    totalUsers: number
    activeUsers: number
    adminCount: number
    ownerCount: number
    userCount: number
    pendingInvitations: number
  }
}

export function UserStats({ stats }: UserStatsProps) {
  const roleData = [
    {
      role: 'Admin',
      count: stats.adminCount,
      icon: ShieldCheck,
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      description: 'Full system access',
    },
    {
      role: 'Owner',
      count: stats.ownerCount,
      icon: Shield,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      description: 'Project management',
    },
    {
      role: 'User',
      count: stats.userCount,
      icon: UserIcon,
      color:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      description: 'View-only access',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Users */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.totalUsers}
          </div>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
            Registered users
          </p>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {stats.activeUsers}
          </div>
          <p className="text-xs text-green-600/70 dark:text-green-400/70">
            {stats.totalUsers > 0
              ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
              : 0}
            % of total
          </p>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 dark:from-yellow-950/20 dark:to-yellow-900/10 border-yellow-200/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
          <UserPlus className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {stats.pendingInvitations}
          </div>
          <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70">
            Awaiting acceptance
          </p>
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Role Distribution
          </CardTitle>
          <Shield className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {roleData.map(({ role, count, icon: Icon, color }) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-3 w-3" />
                  <span className="text-xs font-medium">{role}</span>
                </div>
                <Badge className={`${color} text-xs px-2 py-0.5`}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
