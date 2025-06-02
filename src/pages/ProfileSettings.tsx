import { useState } from 'react'
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
import { MultiSelect } from '@/components/MultiSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

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

const companyProjects = [
  { id: '1', name: 'Kitchen Renovation' },
  { id: '2', name: 'Office Building' },
  { id: '3', name: 'Bathroom Remodel' },
]

const manageUserFormSchema = z.object({
  companyName: z.string().min(2, { message: 'Company name is required' }),
  contactName: z.string().min(2, { message: 'Contact name is required' }),
  contactNumber: z.string().min(6, { message: 'Contact number is required' }),
  projects: z
    .array(z.string())
    .min(1, { message: 'Select at least one project' }),
})

type ManageUserFormValues = z.infer<typeof manageUserFormSchema>

// Add this type for user table rows
type ManagedUser = {
  companyName: string
  contactName: string
  contactNumber: string
  projects: string[]
}

const initialUsers: ManagedUser[] = [
  {
    companyName: 'Corp 1',
    contactName: 'Alice Johnson',
    contactNumber: '555-1234',
    projects: ['1', '2'],
  },
  {
    companyName: 'Corp 2',
    contactName: 'Bob Smith',
    contactNumber: '555-5678',
    projects: ['2'],
  },
  {
    companyName: 'Corp 3',
    contactName: 'Carol Lee',
    contactNumber: '555-8765',
    projects: ['1', '3'],
  },
  {
    companyName: 'Corp 4',
    contactName: 'David Kim',
    contactNumber: '555-4321',
    projects: ['3'],
  },
  {
    companyName: 'Corp 5',
    contactName: 'Eva Brown',
    contactNumber: '555-2468',
    projects: ['1', '2', '3'],
  },
]

const ProfileSettings = () => {
  const { user, isAuthenticated, updateProfile, signOut } = useAuth()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingUserData, setPendingUserData] =
    useState<ManageUserFormValues | null>(null)
  const [userList, setUserList] = useState<ManagedUser[]>(initialUsers)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDeleteIdx, setUserToDeleteIdx] = useState<number | null>(null)

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

  const manageUserForm = useForm<ManageUserFormValues>({
    resolver: zodResolver(manageUserFormSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      contactNumber: '',
      projects: [],
    },
  })

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" />
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

  // Show dialog instead of submitting immediately
  const handleManageUserSubmit = (data: ManageUserFormValues) => {
    setPendingUserData(data)
    setShowConfirmDialog(true)
  }

  // Called when user confirms in dialog
  const confirmAddUser = () => {
    if (pendingUserData) {
      toast({
        title: 'User added',
        description: `User ${pendingUserData.contactName} added and assigned to selected projects.`,
      })
      // Add user to managed users table
      setUserList(prev => [...prev, pendingUserData as ManagedUser])
      manageUserForm.reset({
        companyName: '',
        contactName: '',
        contactNumber: '',
        projects: [],
      })
      setPendingUserData(null)
      setShowConfirmDialog(false)
    }
  }

  // Called when user cancels in dialog
  const cancelAddUser = () => {
    setPendingUserData(null)
    setShowConfirmDialog(false)
  }

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    })
  }

  const handleDeleteUserClick = (idx: number) => {
    setUserToDeleteIdx(idx)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteUser = () => {
    if (userToDeleteIdx !== null) {
      setUserList(prev => prev.filter((_, i) => i !== userToDeleteIdx))
      setUserToDeleteIdx(null)
      setDeleteDialogOpen(false)
      toast({
        title: 'User deleted',
        description: 'The user has been removed.',
      })
    }
  }

  const cancelDeleteUser = () => {
    setUserToDeleteIdx(null)
    setDeleteDialogOpen(false)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="addUsers">Add Users</TabsTrigger>
            <TabsTrigger value="manageUsers">Manage Users</TabsTrigger>
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

          <TabsContent value="addUsers">
            <Card>
              <CardHeader>
                <CardTitle>Add Users</CardTitle>
                <CardDescription>
                  Add users and assign them to projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...manageUserForm}>
                  <form
                    onSubmit={manageUserForm.handleSubmit(
                      handleManageUserSubmit,
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={manageUserForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manageUserForm.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manageUserForm.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={manageUserForm.control}
                      name="projects"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Projects</FormLabel>
                          <MultiSelect
                            onValueChange={field.onChange}
                            placeholder="Select projects"
                            variant="inverted"
                            animation={2}
                            options={companyProjects.map(p => ({
                              label: p.name,
                              value: p.id,
                            }))}
                            value={field.value}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Add User
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Confirm Dialog */}
            <Dialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Add User</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to add{' '}
                    <span className="font-semibold">
                      {pendingUserData?.contactName}
                    </span>{' '}
                    to company{' '}
                    <span className="font-semibold">
                      {pendingUserData?.companyName}
                    </span>{' '}
                    and assign to selected projects?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={cancelAddUser}>
                    Cancel
                  </Button>
                  <Button onClick={confirmAddUser}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="manageUsers">
            <Card>
              <CardHeader>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>
                  List of all users added and their assigned projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userList.length === 0 ? (
                  <div className="text-muted-foreground">
                    No users added yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-y-2">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left font-semibold text-xs text-muted-foreground rounded-tl-lg">
                            Company
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-xs text-muted-foreground">
                            Contact Name
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-xs text-muted-foreground">
                            Contact Number
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-xs text-muted-foreground">
                            Projects
                          </th>
                          <th className="px-4 py-2 text-center font-semibold text-xs text-muted-foreground rounded-tr-lg">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList.map((user, idx) => (
                          <tr
                            key={idx}
                            className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg transition hover:shadow-md"
                          >
                            <td className="px-4 py-3 rounded-l-lg border border-zinc-100 dark:border-zinc-800">
                              <span className="font-medium">
                                {user.companyName}
                              </span>
                            </td>
                            <td className="px-4 py-3 border border-zinc-100 dark:border-zinc-800">
                              {user.contactName}
                            </td>
                            <td className="px-4 py-3 border border-zinc-100 dark:border-zinc-800">
                              {user.contactNumber}
                            </td>
                            <td className="px-4 py-3 border border-zinc-100 dark:border-zinc-800">
                              <div className="flex flex-wrap gap-1">
                                {user.projects.map(pid => {
                                  const project = companyProjects.find(
                                    p => p.id === pid,
                                  )
                                  return (
                                    <span
                                      key={pid}
                                      className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium"
                                    >
                                      {project?.name || pid}
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 rounded-r-lg border border-zinc-100 dark:border-zinc-800 text-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="transition hover:scale-105"
                                onClick={() => handleDeleteUserClick(idx)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Delete Confirm Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Delete User</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this user? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={cancelDeleteUser}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDeleteUser}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default ProfileSettings
