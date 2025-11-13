import { useState, useEffect } from 'react'
import { useUserManagement } from '@/hooks/use-user-management'
import {
  userManagementService,
  type User as ServiceUser,
  type UserInvitation as ServiceUserInvitation,
  type UserRole as ServiceUserRole,
} from '@/services/auth/user-management'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UsageMeterCard } from '@/components/shared'
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
import { Layout } from '@/components/layout/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast, useToast } from '@/hooks/use-toast'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MobileBiometricLogin } from '@/components/auth/MobileBiometricLogin'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  hasBiometricCredentials,
  removeAllBiometricCredentials,
  isPlatformAuthenticatorAvailable,
} from '@/services/auth/biometric-cognito'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { UserForm } from '@/components/admin/UserForm'
import { UserTable } from '@/components/admin/UserTable'
import { UserStats } from '@/components/admin/UserStats'
import { Project } from '@/types'
import {
  Plus,
  UserPlus,
  Mail,
  Mic,
  Activity,
  Folders,
  FileText,
  HardDrive,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import useWakeWordPreference from '@/hooks/useWakeWordPreference'
import { projectService } from '@/services/data/hybrid'
import {
  getUserSubscriptionTier,
  getPlanLimits,
} from '@/utils/subscription/plan-limits'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/utils/ui/navigation'

// Inline component for wake word settings to keep changes localized
const WakeWordSettingsPanel = () => {
  const {
    enabled,
    consent,
    loading,
    setEnabled,
    acceptConsent,
    declineConsent,
  } = useWakeWordPreference()

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading preference...
      </div>
    )
  }

  if (consent === 'pending') {
    return (
      <div className="space-y-4">
        <div className="text-sm leading-relaxed">
          Enable hands-free activation with the phrase
          <span className="px-1.5 py-0.5 mx-1 rounded bg-muted text-xs font-mono">
            Hey Jacq
          </span>
          while this tab is active. Audio is processed locally until you begin
          dictation.
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={() => acceptConsent(true)}>
            Enable Hands-Free
          </Button>
          <Button size="sm" variant="outline" onClick={() => declineConsent()}>
            Not Now
          </Button>
        </div>
      </div>
    )
  }

  if (consent === 'declined') {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          You previously declined hands-free activation.
        </div>
        <Button size="sm" onClick={() => acceptConsent(true)}>
          Enable "Hey Jacq" Wake Word
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border rounded-md px-3 py-2">
        <div className="space-y-0.5">
          <div className="font-medium text-sm">Hands-Free Wake Word</div>
          <div className="text-xs text-muted-foreground">
            Say "Hey Jacq" to focus the AI input and auto-start the mic.
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {enabled ? (
        <div className="text-xs text-emerald-500 flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          Listening will activate automatically when supported.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Disabled — no passive listening is occurring.
        </div>
      )}
    </div>
  )
}

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

// Biometric Security Settings Component
const BiometricSecuritySettings = () => {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [biometricStatus, setBiometricStatus] = useState({
    isSupported: false,
    isPlatformAvailable: false,
    hasCredentials: false,
    loading: true,
  })

  useEffect(() => {
    checkBiometricStatus()

    // Check if setup was just completed
    const setupCompleted = localStorage.getItem('biometric_setup_completed')
    if (setupCompleted === 'true') {
      localStorage.removeItem('biometric_setup_completed')
      // Delay to ensure the setup has been fully processed
      setTimeout(() => {
        checkBiometricStatus()
        toast({
          title: 'Biometric setup complete!',
          description: 'Your biometric authentication is now active.',
        })
      }, 500)
    }

    // Add event listener to refresh status when user returns to the page
    const handleFocus = () => {
      checkBiometricStatus()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkBiometricStatus()
      }
    }

    // Also listen for storage events (when localStorage changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'biometric_credential_ids' ||
        e.key?.startsWith('biometric_creds_')
      ) {
        checkBiometricStatus()
      }
    }

    // Listen for custom biometric setup event
    const handleBiometricSetupComplete = () => {
      setTimeout(() => checkBiometricStatus(), 100)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(
      'biometric-setup-completed',
      handleBiometricSetupComplete,
    )

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(
        'biometric-setup-completed',
        handleBiometricSetupComplete,
      )
    }
  }, [toast])

  const checkBiometricStatus = async () => {
    setBiometricStatus(prev => ({ ...prev, loading: true }))

    try {
      const isSupported =
        typeof window !== 'undefined' && !!window.PublicKeyCredential
      const isPlatformAvailable = isSupported
        ? await isPlatformAuthenticatorAvailable()
        : false
      const hasCredentials = hasBiometricCredentials()

      setBiometricStatus({
        isSupported,
        isPlatformAvailable,
        hasCredentials,
        loading: false,
      })
    } catch (error) {
      console.error('Error checking biometric status:', error)
      setBiometricStatus(prev => ({ ...prev, loading: false }))
    }
  }

  const handleClearCredentials = async () => {
    try {
      const success = removeAllBiometricCredentials()
      if (success) {
        toast({
          title: 'Credentials removed',
          description:
            'Biometric login has been disabled. You can set it up again anytime.',
        })
        checkBiometricStatus()
      } else {
        toast({
          title: 'Failed to clear credentials',
          description: 'There was an error removing biometric credentials.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  }

  if (biometricStatus.loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-pulse">Checking biometric capabilities...</div>
      </div>
    )
  }

  if (!biometricStatus.isSupported || !biometricStatus.isPlatformAvailable) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-2">
          Biometric authentication is not available on this device
        </p>
        <p className="text-sm text-gray-500">
          {!biometricStatus.isSupported
            ? "Your browser doesn't support biometric authentication"
            : 'No biometric hardware detected on this device'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isMobile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-3">
            🔒 Biometric authentication is optimized for mobile devices and uses
            your device's built-in security features.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Current Status</h4>
            <p className="text-sm text-gray-600">
              {biometricStatus.hasCredentials
                ? 'Biometric login is enabled on this device'
                : 'Biometric login is not set up'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {biometricStatus.hasCredentials ? (
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                ✓ Enabled
              </div>
            ) : (
              <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                Not Set Up
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <MobileBiometricLogin
            context="settings"
            onSetupSuccess={() => {
              checkBiometricStatus()
              toast({
                title: 'Biometric login enabled!',
                description:
                  'You can now use biometric authentication to sign in.',
              })
            }}
            onLoginSuccess={() => {
              toast({
                title: 'Biometric test successful!',
                description:
                  'Your biometric authentication is working correctly.',
              })
            }}
          />

          {biometricStatus.hasCredentials && (
            <Button
              variant="outline"
              onClick={handleClearCredentials}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-sm px-3 py-2 min-h-[2.5rem]"
              title="Remove stored login credentials and disable biometric sign-in. You can set it up again anytime."
            >
              <span className="block sm:hidden text-center">
                Disable Biometric Login
              </span>
              <span className="hidden sm:block text-center">
                Disable biometric sign-in and remove saved credentials
              </span>
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Security Information:</p>
          <ul className="space-y-1">
            <li>• Biometric data never leaves your device</li>
            <li>• Credentials are encrypted with device-specific keys</li>
            <li>• Works with Touch ID, Face ID, and fingerprint sensors</li>
            <li>• Can be disabled at any time</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const ProfileSettings = () => {
  const { user, isAuthenticated, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [stats, setStats] = useState({ projectCount: 0, documentCount: 0 })

  // Get subscription tier and limits
  const subscriptionTier = getUserSubscriptionTier(user)
  const planLimits = getPlanLimits(subscriptionTier)
  const companyId = user?.companyId || 'default'

  // Load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setProjectsLoading(true)
        const projectsData = await projectService.getProjects()
        setProjects(projectsData)

        // Calculate stats
        const projectCount = projectsData.length
        const documentCount = projectsData.reduce(
          (sum, p) => sum + (p.documents?.length || 0),
          0,
        )
        setStats({ projectCount, documentCount })
      } catch (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } finally {
        setProjectsLoading(false)
      }
    }

    loadProjects()
  }, [])

  interface UserFormData {
    email?: string
    name?: string
    role?: ServiceUserRole
    projectIds?: string[]
    isActive?: boolean
  }
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // User management state
  const userManagement = useUserManagement(companyId)
  const currentUserRole: ServiceUserRole = 'Admin' // In real app, get from user context

  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null)
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
  // Get current user info for permission checking
  const currentUser = { role: currentUserRole }

  const canManageUsers =
    currentUser &&
    userManagementService.canUserPerformAction(
      currentUser.role as ServiceUserRole,
      'canInviteUsers',
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

  const handleInviteUser = async (data: UserFormData) => {
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
      await userManagement.inviteUser({
        email: data.email || '',
        role: data.role || 'User',
        companyId,
        invitedBy: 'current-user-id', // In real app, get from current user context
        projectIds: data.projectIds || [], // Projects will be assigned after invitation acceptance
        inviterName: 'Current User', // In real app, get from current user context
        companyName: 'Your Company', // In real app, get from user's company
      })
      setInviteUserDialogOpen(false)
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

  const openEditDialog = (user: ServiceUser) => {
    setSelectedUser(user)
    setEditUserDialogOpen(true)
  }

  const openDeleteDialog = (user: ServiceUser) => {
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
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Profile Settings
            </h1>
            <p className="text-slate-400 mt-2 font-medium">
              Manage your account settings
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            {/* Mobile-only scrollable wrapper */}
            <div className="sm:hidden overflow-x-auto scrollbar-hide">
              <TabsList className="w-max min-w-full gap-1 p-2">
                <TabsTrigger
                  value="profile"
                  className="text-xs px-3 py-2.5 min-w-[70px]"
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="text-xs px-3 py-2.5 min-w-[70px]"
                >
                  Security
                </TabsTrigger>
                {/* User Management and Invitations tabs visible but disabled on mobile */}
                {canManageUsers && (
                  <>
                    <TabsTrigger
                      value="userManagement"
                      className="text-xs px-3 py-2.5 min-w-[70px]"
                      disabled
                    >
                      Users
                    </TabsTrigger>
                    <TabsTrigger
                      value="invitations"
                      className="text-xs px-3 py-2.5 min-w-[70px]"
                      disabled
                    >
                      Invites
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            {/* Desktop-only original styling */}
            <div className="hidden sm:block">
              <TabsList className="gap-1">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                {/* Voice tab visible but disabled */}
                <TabsTrigger value="voice" disabled>
                  Voice
                </TabsTrigger>
                {/* User Management and Invitations tabs visible but disabled */}
                {canManageUsers && (
                  <>
                    <TabsTrigger value="userManagement" disabled>
                      User Management
                    </TabsTrigger>
                    <TabsTrigger value="invitations" disabled>
                      Invitations
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            <TabsContent value="profile">
              <div className="grid gap-6">
                {/* Plan Usage Card */}
                <UsageMeterCard
                  title="Plan Usage"
                  meters={[
                    {
                      label: 'Projects',
                      current: stats.projectCount,
                      limit: planLimits.projects,
                      unit: 'projects',
                      icon: <Folders className="h-4 w-4" />,
                    },
                    {
                      label: 'Documents',
                      current: stats.documentCount,
                      limit: planLimits.documentsPerProject,
                      unit: 'documents',
                      icon: <FileText className="h-4 w-4" />,
                    },
                    {
                      label: 'Storage',
                      current: 0.15,
                      limit: planLimits.storage,
                      unit: 'GB',
                      icon: <HardDrive className="h-4 w-4" />,
                    },
                  ]}
                  onUpgrade={() => navigate(routes.company.pricing(companyId))}
                />

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

            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Biometric Authentication</CardTitle>
                    <CardDescription>
                      Manage your biometric login settings for faster and more
                      secure access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <BiometricSecuritySettings />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="voice">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-4 w-4" /> Hands-Free Wake Word
                    </CardTitle>
                    <CardDescription>
                      Enable the "Hey Jacq" wake phrase for hands-free
                      microphone activation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WakeWordSettingsPanel />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" /> How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        Passive listener stays local in your browser; no audio
                        leaves the device until you actively start dictation.
                      </li>
                      <li>
                        Automatically pauses while you are actively dictating or
                        when the tab loses focus.
                      </li>
                      <li>
                        Uses fuzzy matching to tolerate slight mispronunciations
                        of "Hey Jacq".
                      </li>
                      <li>
                        A short cooldown (≈4s) prevents repeated triggers on
                        echoes/background noise.
                      </li>
                      <li>
                        You can disable it anytime—this preference is stored
                        locally per browser.
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground/80 pt-2">
                      Limitations: Browser speech APIs vary by platform;
                      background tabs or locked screens may suspend detection.
                      Mobile devices may aggressively throttle continuous
                      recognition.
                    </p>
                  </CardContent>
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
                          projects={projects}
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
                      onClick={() => setInviteUserDialogOpen(true)}
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
                            onClick={() => setInviteUserDialogOpen(true)}
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
                                        {invitation.projectIds?.length || 0}{' '}
                                        assigned
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
            projects={projects}
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

      {/* Send Invitation Dialog */}
      <Dialog
        open={inviteUserDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setInviteUserDialogOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send User Invitation</DialogTitle>
            <DialogDescription>
              Send an email invitation to a new user. They will receive an email
              with a link to create their account and join your company.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            projects={projects}
            onSubmit={handleInviteUser}
            onCancel={() => {
              setInviteUserDialogOpen(false)
            }}
            submitLabel="Send Invitation"
            isLoading={isSubmitting}
            isInvitation={true}
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
