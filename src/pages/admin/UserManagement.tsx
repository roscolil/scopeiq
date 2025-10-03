import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/shared/Spinner'
import { useToast } from '@/hooks/use-toast'
import {
  userManagementService,
  type UserRole,
  type User,
  type UserInvitation,
} from '@/services/auth/user-management'
import { useUserContext, usePermissions } from '@/hooks/user-roles'
import { PageLoader } from '@/components/shared/PageLoader'
import { UnauthorizedAccess } from '@/utils/auth/authorization'
import { projectService } from '@/services/data/hybrid'
import type { Project } from '@/types'
import { MultiSelect } from '@/components/shared/MultiSelect'

export default function UserManagement() {
  // Get current user context
  const { userContext, loading: contextLoading } = useUserContext()
  const { hasPermission } = usePermissions()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Check if user has permission to manage users
  const canManageUsers = hasPermission('canManageUsers')

  // Invite form state - now using real context values
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'User' as UserRole,
    projectIds: [] as string[], // Projects to assign for User role
  })

  // Early return if loading context
  if (contextLoading) {
    return <PageLoader type="default" />
  }

  // Check if user context is available
  if (!userContext) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <UnauthorizedAccess
            message="Unable to load user information. Please sign in again."
            showReturnHome={true}
          />
        </div>
      </Layout>
    )
  }

  // Check permission to manage users
  if (!canManageUsers) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <UnauthorizedAccess
            message="You don't have permission to manage users."
            showReturnHome={true}
          />
        </div>
      </Layout>
    )
  }

  // Load initial data
  useEffect(() => {
    if (!userContext?.companyId) return

    const loadInitialData = async () => {
      try {
        setLoading(true)

        // Load users, invitations, and projects for the current user's company
        const [usersData, invitationsData, projectsData] = await Promise.all([
          userManagementService.getUsersByCompany(userContext.companyId),
          userManagementService.getInvitationsByCompany(userContext.companyId),
          projectService.getProjects(userContext.companyId),
        ])

        setUsers(usersData)
        setInvitations(invitationsData)
        setProjects(projectsData)
      } catch (error) {
        console.error('Error loading user data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load user data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [userContext, toast])

  const loadData = async () => {
    if (!userContext?.companyId) return

    try {
      setLoading(true)

      // Load users, invitations, and projects for the current user's company
      const [usersData, invitationsData, projectsData] = await Promise.all([
        userManagementService.getUsersByCompany(userContext.companyId),
        userManagementService.getInvitationsByCompany(userContext.companyId),
        projectService.getProjects(userContext.companyId),
      ])

      setUsers(usersData)
      setInvitations(invitationsData)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userContext?.companyId || !userContext?.userId) return

    // Validation
    if (!inviteForm.email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }

    // Require project selection for User role
    if (
      inviteForm.role === 'User' &&
      (!inviteForm.projectIds || inviteForm.projectIds.length === 0)
    ) {
      toast({
        title: 'Error',
        description: 'Users must be assigned to at least one project',
        variant: 'destructive',
      })
      return
    }

    try {
      setInviteLoading(true)

      const invitation = await userManagementService.inviteUser({
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
        companyId: userContext.companyId,
        invitedBy: userContext.userId,
        inviterName: userContext.name,
        companyName: userContext.companyId, // TODO: Get actual company name
        projectIds: inviteForm.projectIds,
      })

      if (invitation) {
        toast({
          title: 'Success',
          description: `Invitation sent to ${inviteForm.email}`,
        })

        // Reset form
        setInviteForm({
          email: '',
          role: 'User' as UserRole,
          projectIds: [],
        })

        // Reload data
        await loadData()
      } else {
        throw new Error('Failed to create invitation')
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const success = await userManagementService.cancelInvitation(invitationId)

      if (success) {
        toast({
          title: 'Success',
          description: 'Invitation cancelled',
        })
        await loadData()
      } else {
        throw new Error('Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      })
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'destructive'
      case 'Owner':
        return 'default'
      case 'User':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'accepted':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'cancelled':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members and send invitations
          </p>
        </div>

        {/* Invite User Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invite New User</CardTitle>
            <CardDescription>
              Send an invitation to add a new team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteForm.email}
                      onChange={e =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: UserRole) =>
                        setInviteForm({
                          ...inviteForm,
                          role: value,
                          projectIds: [],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">
                          <div className="flex flex-col items-start">
                            <span>User</span>
                            <span className="text-xs text-muted-foreground">
                              Limited access to assigned projects
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Owner">
                          <div className="flex flex-col items-start">
                            <span>Owner</span>
                            <span className="text-xs text-muted-foreground">
                              Full company access
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Admin">
                          <div className="flex flex-col items-start">
                            <span>Admin</span>
                            <span className="text-xs text-muted-foreground">
                              Company administrator
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Project selection - required for User role */}
                {inviteForm.role === 'User' && (
                  <div className="space-y-2">
                    <Label htmlFor="projects">
                      Assign to Projects{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <MultiSelect
                      onValueChange={value =>
                        setInviteForm({ ...inviteForm, projectIds: value })
                      }
                      placeholder="Select at least one project"
                      variant="inverted"
                      animation={2}
                      options={projects.map(p => ({
                        label: p.name,
                        value: p.id,
                      }))}
                      value={inviteForm.projectIds}
                    />
                    <p className="text-xs text-muted-foreground">
                      Users can only access assigned projects. At least one
                      project is required.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      inviteLoading ||
                      (inviteForm.role === 'User' &&
                        inviteForm.projectIds.length === 0)
                    }
                  >
                    {inviteLoading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Current Users */}
        <Card>
          <CardHeader>
            <CardTitle>Current Users ({users.length})</CardTitle>
            <CardDescription>Active team members</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-muted-foreground">No users found</p>
            ) : (
              <div className="space-y-4">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      {user.lastLoginAt && (
                        <p className="text-xs text-muted-foreground">
                          Last login:{' '}
                          {new Date(user.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
            <CardDescription>Outstanding team invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-muted-foreground">No pending invitations</p>
            ) : (
              <div className="space-y-4">
                {invitations.map(invitation => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invitation.email}</span>
                        <Badge variant={getRoleColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <Badge variant={getStatusColor(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Invited:{' '}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires:{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
