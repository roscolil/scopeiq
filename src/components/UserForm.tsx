/**
 * User Form Component
 * Handles creation and editing of users with role-based permissions
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/MultiSelect'
import { Switch } from '@/components/ui/switch'
import { User, UserRole, Project } from '@/types'
import { ROLE_PERMISSIONS } from '@/services/user-management'

const userFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['Admin', 'Owner', 'User'] as const),
  projectIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
  user?: User
  projects: Project[]
  onSubmit: (data: UserFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  isLoading?: boolean
  isInvitation?: boolean
}

export function UserForm({
  user,
  projects,
  onSubmit,
  onCancel,
  submitLabel = 'Save User',
  isLoading = false,
  isInvitation = false,
}: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      role: user?.role || 'User',
      projectIds: user?.projectIds || [],
      isActive: user?.isActive ?? true,
    },
  })

  const selectedRole = form.watch('role')
  const permissions = ROLE_PERMISSIONS[selectedRole]

  const handleSubmit = async (data: UserFormValues) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="user@company.com"
                  disabled={!!user} // Can't change email for existing users
                  {...field}
                />
              </FormControl>
              {!!user && (
                <FormDescription>
                  Email address cannot be changed for existing users.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground">
                        Full company access and user management
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Owner">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Owner</span>
                      <span className="text-xs text-muted-foreground">
                        Project-level control and management
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="User">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">User</span>
                      <span className="text-xs text-muted-foreground">
                        View-only access to assigned projects
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project assignment - hide for Admin role as they have access to all */}
        {selectedRole !== 'Admin' && !isInvitation && (
          <Controller
            control={form.control}
            name="projectIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Projects</FormLabel>
                <MultiSelect
                  onValueChange={field.onChange}
                  placeholder="Select projects"
                  variant="inverted"
                  animation={2}
                  options={projects.map(p => ({
                    label: p.name,
                    value: p.id,
                  }))}
                  value={field.value || []}
                />
                <FormDescription>
                  {selectedRole === 'Owner'
                    ? 'Project Owners can manage selected projects and their documents.'
                    : 'Users can only view documents in selected projects.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Info message for invitations */}
        {isInvitation && selectedRole !== 'Admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Project assignments can be configured after
              the user accepts the invitation and creates their account.
            </p>
          </div>
        )}

        {/* Active status - only show for existing users */}
        {user && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <FormDescription>
                    Inactive users cannot sign in or access any resources.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Role permissions preview */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-medium mb-3">Role Permissions: {selectedRole}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-muted-foreground mb-2">
                Company Level
              </h5>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canManageCompany ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>Manage Company</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canManageUsers ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>Manage Users</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canViewAllProjects ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>View All Projects</span>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-muted-foreground mb-2">
                Project & Documents
              </h5>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canCreateProjects ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>Create Projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canUploadDocuments ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>Upload Documents</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${permissions.canDeleteDocuments ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>Delete Documents</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
