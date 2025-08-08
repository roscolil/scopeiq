import { useState, useEffect } from 'react'
import { useUserManagement } from '../hooks/use-user-management'
// TODO: Switch to real service after sandbox deployment
// import { userManagementService } from '../services/user-management-real'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/hooks/aws-auth'
import { Layout } from '@/components/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { UserForm } from '@/components/UserForm'
import { UserTable } from '@/components/UserTable'
import { UserStats } from '@/components/UserStats'
import { User, UserRole, Project } from '@/types'
import { Plus, UserPlus, Mail } from 'lucide-react'

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const passwordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
    newPassword: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordFormSchema>

// Mock projects data - in real app this would come from a service
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Kitchen Renovation',
    description: 'Modern kitchen upgrade',
    companyId: 'company-1',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Office Building',
    description: 'Commercial office development',
    companyId: 'company-1',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Bathroom Remodel',
    description: 'Luxury bathroom renovation',
    companyId: 'company-1',
    createdAt: '2024-02-15',
  },
]

interface UserFormData {
  email?: string
  name?: string
  role?: UserRole
  projectIds?: string[]
  isActive?: boolean
}

const ProfileSettings = () => {
  const { user, isAuthenticated, updateProfile, signOut } = useAuth()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // User management state
  const companyId = 'company-1' // In real app, get from user context
  const userManagement = useUserManagement(companyId)
  const currentUserRole: UserRole = 'Admin' // In real app, get from user context

  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Check permissions
  const canManageUsers = userManagement.canUserPerformAction(
    currentUserRole,
    'canManageUsers',
  )

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" />
  }

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      setProfileError(null)
      await updateProfile({
        name: data.name,
      })
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (err) {
      setProfileError(
        'An error occurred while updating your profile. Please try again.',
      )
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      setPasswordError(null)
      // In a real app, would call auth.updatePassword
      console.log('Would update password here')

      // Reset form
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      toast({
        title: 'Password updated',
        description: 'Your password has been updated successfully.',
      })
    } catch (err) {
      setPasswordError(
        'An error occurred while updating your password. Please try again.',
      )
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    })
  }

  // User management handlers
  const handleAddUser = async (data: UserFormData) => {
    if (!data.email || !data.name || !data.role) {
      toast({
        title: 'Error',
        description: 'Email, name, and role are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await userManagement.createUser({
        email: data.email,
        name: data.name,
        role: data.role,
        companyId,
        projectIds: data.projectIds || [],
      })
      setAddUserDialogOpen(false)
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = async (data: UserFormData) => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await userManagement.updateUser(selectedUser.id, {
        name: data.name,
        role: data.role,
        projectIds: data.projectIds,
        isActive: data.isActive,
      })
      setEditUserDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await userManagement.deleteUser(selectedUser.id)
      setDeleteUserDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditUserDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteUserDialogOpen(true)
  }

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid gradient background layers with more variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-slate-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/6 to-violet-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
              Profile Settings
            </h1>
            <p className="text-slate-200 mt-2">Manage your account settings</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              {canManageUsers && (
                <>
                  <TabsTrigger value="userManagement">
                    User Management
                  </TabsTrigger>
                  <TabsTrigger value="invitations">Invitations</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="profile">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your account information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{profileError}</AlertDescription>
                      </Alert>
                    )}

                    <Form {...profileForm}>
                      <form
                        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="you@example.com"
                                  disabled
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                You cannot change your email address.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          disabled={profileForm.formState.isSubmitting}
                        >
                          {profileForm.formState.isSubmitting
                            ? 'Saving...'
                            : 'Save changes'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {passwordError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    )}

                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="********"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="********"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="********"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          disabled={passwordForm.formState.isSubmitting}
                        >
                          {passwordForm.formState.isSubmitting
                            ? 'Updating...'
                            : 'Update password'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sign Out</CardTitle>
                    <CardDescription>Sign out of your account</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="destructive" onClick={handleSignOut}>
                      Sign out
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {canManageUsers && (
              <TabsContent value="userManagement">
                <div className="space-y-6">
                  {/* User Stats */}
                  <UserStats stats={userManagement.stats} />

                  {/* Add User Button */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Manage Users
                      </h3>
                      <p className="text-sm text-slate-300">
                        Add, edit, and manage user accounts and permissions.
                      </p>
                    </div>
                    <Button
                      onClick={() => setAddUserDialogOpen(true)}
                      className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>

                  {/* User Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>All Users</CardTitle>
                      <CardDescription>
                        Manage user accounts, roles, and project assignments.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userManagement.loading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-muted-foreground">
                            Loading users...
                          </div>
                        </div>
                      ) : userManagement.error ? (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {userManagement.error}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <UserTable
                          users={userManagement.users}
                          projects={mockProjects}
                          onEditUser={openEditDialog}
                          onDeleteUser={openDeleteDialog}
                          canManageUsers={canManageUsers}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {canManageUsers && (
              <TabsContent value="invitations">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Pending Invitations
                      </h3>
                      <p className="text-sm text-slate-300">
                        Track and manage user invitations.
                      </p>
                    </div>
                    <Button
                      onClick={() => setAddUserDialogOpen(true)}
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Invitation Status</CardTitle>
                      <CardDescription>
                        Monitor invitation delivery and acceptance status.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userManagement.getPendingInvitations().length === 0 ? (
                        <div className="text-center py-8">
                          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h4 className="text-lg font-medium mb-2">
                            No pending invitations
                          </h4>
                          <p className="text-muted-foreground mb-4">
                            All invitations have been accepted or expired.
                          </p>
                          <Button
                            onClick={() => setAddUserDialogOpen(true)}
                            variant="outline"
                          >
                            Send New Invitation
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userManagement
                            .getPendingInvitations()
                            .map(invitation => (
                              <div
                                key={invitation.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {invitation.email}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        Role: {invitation.role} • Projects:{' '}
                                        {invitation.projectIds.length} assigned
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      Expires:{' '}
                                      {new Date(
                                        invitation.expiresAt,
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Sent:{' '}
                                      {new Date(
                                        invitation.createdAt!,
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      userManagement.cancelInvitation(
                                        invitation.id,
                                      )
                                    }
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </Layout>

      {/* Add/Edit User Dialog */}
      <Dialog
        open={addUserDialogOpen || editUserDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setAddUserDialogOpen(false)
            setEditUserDialogOpen(false)
            setSelectedUser(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editUserDialogOpen ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editUserDialogOpen
                ? 'Update user information, role, and project assignments.'
                : 'Create a new user account with role-based permissions and project access.'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={selectedUser || undefined}
            projects={mockProjects}
            onSubmit={editUserDialogOpen ? handleEditUser : handleAddUser}
            onCancel={() => {
              setAddUserDialogOpen(false)
              setEditUserDialogOpen(false)
              setSelectedUser(null)
            }}
            submitLabel={editUserDialogOpen ? 'Update User' : 'Create User'}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteUserDialogOpen}
        onOpenChange={setDeleteUserDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{selectedUser?.name}</span>? This
              action cannot be undone and will remove all access to projects and
              documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserDialogOpen(false)
                setSelectedUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProfileSettings
