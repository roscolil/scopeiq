/**
 * React Query hooks for user activity data
 */

import { useQuery } from '@tanstack/react-query'
import {
  userActivityService,
  UserActivity,
} from '@/services/auth/user-activity'
import { queryKeys } from '@/lib/query-client'

/**
 * Fetch user activities for a company
 */
export function useActivities(companyId: string) {
  return useQuery({
    queryKey: queryKeys.activities.byCompany(companyId),
    queryFn: () => userActivityService.getActivitiesByCompany(companyId),
    enabled: !!companyId && companyId !== 'default',
    staleTime: 2 * 60 * 1000, // 2 minutes - activities change more frequently
  })
}
