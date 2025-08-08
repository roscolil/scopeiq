/**
 * User Table Component
 * Displays users with role-based actions and filtering
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  Mail,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Calendar,
  Filter,
} from 'lucide-react'
import { User, UserRole, Project } from '@/types'

interface UserTableProps {
  users: User[]
  projects: Project[]
  onEditUser: (user: User) => void
  onDeleteUser: (user: User) => void
  onResendInvitation?: (user: User) => void
  canManageUsers: boolean
}

const roleIcons = {
  Admin: ShieldCheck,
  Owner: Shield,
  User: UserIcon,
}

const roleColors = {
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  User: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export function UserTable({
  users,
  projects,
  onEditUser,
  onDeleteUser,
  onResendInvitation,
  canManageUsers,
}: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)

    const matchesProject =
      projectFilter === 'all' ||
      user.role === 'Admin' || // Admins have access to all projects
      user.projectIds.includes(projectFilter)

    return matchesSearch && matchesRole && matchesStatus && matchesProject
  })

  const getProjectNames = (projectIds: string[]) => {
    return projectIds.map(id => {
      const project = projects.find(p => p.id === id)
      return project?.name || id
    })
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return (
        <Badge
          variant="secondary"
          className="hover:!bg-secondary hover:!text-secondary-foreground hover:!shadow-none"
        >
          Inactive
        </Badge>
      )
    }

    if (!user.lastLoginAt) {
      return (
        <Badge
          variant="outline"
          className="hover:!bg-transparent hover:!text-foreground hover:!shadow-none"
        >
          Never signed in
        </Badge>
      )
    }

    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(user.lastLoginAt).getTime()) /
        (1000 * 60 * 60 * 24),
    )

    if (daysSinceLogin === 0) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:!bg-green-100 hover:!text-green-800 hover:!shadow-none">
          Active today
        </Badge>
      )
    } else if (daysSinceLogin <= 7) {
      return (
        <Badge
          variant="outline"
          className="hover:!bg-transparent hover:!text-foreground hover:!shadow-none"
        >
          Active this week
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="secondary"
          className="hover:!bg-secondary hover:!text-secondary-foreground hover:!shadow-none"
        >
          Inactive
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'active' | 'inactive') =>
              setStatusFilter(value)
            }
          >
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={projectFilter}
            onValueChange={(value: string) => setProjectFilter(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Joined</TableHead>
              {canManageUsers && (
                <TableHead className="w-12">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageUsers ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => {
                const RoleIcon = roleIcons[user.role]
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={`${roleColors[user.role]} ${
                          user.role === 'Admin'
                            ? 'hover:!bg-red-100 hover:!text-red-800 dark:hover:!bg-red-900/30 dark:hover:!text-red-300'
                            : user.role === 'Owner'
                              ? 'hover:!bg-blue-100 hover:!text-blue-800 dark:hover:!bg-blue-900/30 dark:hover:!text-blue-300'
                              : 'hover:!bg-green-100 hover:!text-green-800 dark:hover:!bg-green-900/30 dark:hover:!text-green-300'
                        } hover:!shadow-none`}
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {user.role === 'Admin' ? (
                        <Badge variant="outline">All Projects</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {getProjectNames(user.projectIds)
                            .slice(0, 2)
                            .map((name, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {name}
                              </Badge>
                            ))}
                          {user.projectIds.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{user.projectIds.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(user)}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(user.lastLoginAt)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>

                    {canManageUsers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditUser(user)}>
                              Edit User
                            </DropdownMenuItem>
                            {!user.lastLoginAt && onResendInvitation && (
                              <DropdownMenuItem
                                onClick={() => onResendInvitation(user)}
                              >
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onDeleteUser(user)}
                              className="text-destructive"
                            >
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
