// User Activity Service - Track and display user activities
import { userManagementService, User, UserInvitation } from './user-management'

export interface UserActivity {
  id: string
  userId?: string
  userName: string
  userEmail: string
  action:
    | 'login'
    | 'invitation_sent'
    | 'invitation_accepted'
    | 'project_created'
    | 'document_uploaded'
    | 'document_viewed'
    | 'user_invited'
  description: string
  timestamp: string
  metadata?: {
    projectId?: string
    projectName?: string
    documentId?: string
    documentName?: string
    invitationId?: string
    targetEmail?: string
  }
}

class UserActivityService {
  private activities: UserActivity[] = []

  // Generate mock activities for demonstration
  private generateMockActivities(companyId: string): UserActivity[] {
    const now = new Date()
    const activities: UserActivity[] = []

    // Recent login activity
    activities.push({
      id: '1',
      userId: 'current-user',
      userName: 'Current User',
      userEmail: 'user@company.com',
      action: 'login',
      description: 'Logged into the platform',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    })

    // Document uploaded
    activities.push({
      id: '2',
      userId: 'user-2',
      userName: 'Sarah Wilson',
      userEmail: 'sarah@company.com',
      action: 'document_uploaded',
      description: 'Uploaded "Floor Plans v2.pdf"',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      metadata: {
        projectId: 'proj-1',
        projectName: 'Residential Complex',
        documentName: 'Floor Plans v2.pdf',
      },
    })

    // Project created
    activities.push({
      id: '3',
      userId: 'user-3',
      userName: 'Mike Johnson',
      userEmail: 'mike@company.com',
      action: 'project_created',
      description: 'Created new project "Office Renovation"',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      metadata: {
        projectId: 'proj-2',
        projectName: 'Office Renovation',
      },
    })

    // User invitation sent
    activities.push({
      id: '4',
      userId: 'current-user',
      userName: 'Current User',
      userEmail: 'user@company.com',
      action: 'user_invited',
      description: 'Invited new team member',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      metadata: {
        targetEmail: 'newuser@company.com',
      },
    })

    // Document viewed
    activities.push({
      id: '5',
      userId: 'user-4',
      userName: 'Emma Davis',
      userEmail: 'emma@company.com',
      action: 'document_viewed',
      description: 'Viewed "Structural Report.pdf"',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      metadata: {
        projectId: 'proj-1',
        projectName: 'Residential Complex',
        documentName: 'Structural Report.pdf',
      },
    })

    return activities
  }

  // Get recent activities for a company
  async getRecentActivities(
    companyId: string,
    limit: number = 5,
  ): Promise<UserActivity[]> {
    try {
      // For now, use mock data. In a real implementation, this would fetch from a database
      const cachedActivities = localStorage.getItem(`activities_${companyId}`)

      if (cachedActivities) {
        try {
          const parsed = JSON.parse(cachedActivities)
          return parsed.slice(0, limit)
        } catch {
          // Fall through to generate new mock data
        }
      }

      // Generate mock activities based on user management data
      const mockActivities = this.generateMockActivities(companyId)

      // Cache the activities
      localStorage.setItem(
        `activities_${companyId}`,
        JSON.stringify(mockActivities),
      )

      return mockActivities.slice(0, limit)
    } catch (error) {
      console.error('Error fetching user activities:', error)
      return []
    }
  }

  // Add a new activity (for real-time updates)
  async addActivity(
    companyId: string,
    activity: Omit<UserActivity, 'id' | 'timestamp'>,
  ): Promise<void> {
    const newActivity: UserActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }

    try {
      const existing = await this.getRecentActivities(companyId, 50) // Get more for storage
      const updated = [newActivity, ...existing].slice(0, 50) // Keep last 50 activities

      localStorage.setItem(`activities_${companyId}`, JSON.stringify(updated))
    } catch (error) {
      console.error('Error adding activity:', error)
    }
  }

  // Helper to get activity icon based on action type
  getActivityIcon(action: UserActivity['action']): string {
    switch (action) {
      case 'login':
        return '🔐'
      case 'invitation_sent':
      case 'user_invited':
        return '📧'
      case 'invitation_accepted':
        return '✅'
      case 'project_created':
        return '📁'
      case 'document_uploaded':
        return '📤'
      case 'document_viewed':
        return '👁️'
      default:
        return '📝'
    }
  }

  // Helper to get activity color based on action type
  getActivityColor(action: UserActivity['action']): string {
    switch (action) {
      case 'login':
        return 'text-green-600'
      case 'invitation_sent':
      case 'user_invited':
        return 'text-blue-600'
      case 'invitation_accepted':
        return 'text-emerald-600'
      case 'project_created':
        return 'text-purple-600'
      case 'document_uploaded':
        return 'text-orange-600'
      case 'document_viewed':
        return 'text-cyan-600'
      default:
        return 'text-gray-600'
    }
  }

  // Format relative time
  formatRelativeTime(timestamp: string): string {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return time.toLocaleDateString()
  }
}

export const userActivityService = new UserActivityService()
