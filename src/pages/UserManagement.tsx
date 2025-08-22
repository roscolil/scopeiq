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
} from '@/services/user-management'

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const { toast } = useToast()

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'User' as UserRole,
    inviterName: 'Current User', // In real app, get from auth context
    companyName: 'Your Company', // In real app, get from user's company
  })

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)

        // Get company ID (in real app, get from current user context)
        const companyId = 'company-1'

        // Load users and invitations
        const [usersData, invitationsData] = await Promise.all([
          userManagementService.getUsersByCompany(companyId),
          userManagementService.getInvitationsByCompany(companyId),
        ])

        setUsers(usersData)
        setInvitations(invitationsData)
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
  }, [toast])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get company ID (in real app, get from current user context)
      const companyId = 'company-1'

      // Load users and invitations
      const [usersData, invitationsData] = await Promise.all([
        userManagementService.getUsersByCompany(companyId),
        userManagementService.getInvitationsByCompany(companyId),
      ])

      setUsers(usersData)
      setInvitations(invitationsData)
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

    if (!inviteForm.email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }

    try {
      setInviteLoading(true)

      const invitation = await userManagementService.inviteUser({
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
        companyId: 'company-1', // In real app, get from current user context
        invitedBy: 'current-user-id', // In real app, get from auth context
        inviterName: inviteForm.inviterName,
        companyName: inviteForm.companyName,
      })

      if (invitation) {
        toast({
          title: 'Success',
          description: `Invitation sent to ${inviteForm.email}`,
        })

        // Reset form
        setInviteForm({
          ...inviteForm,
          email: '',
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      setInviteForm({ ...inviteForm, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full"
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
