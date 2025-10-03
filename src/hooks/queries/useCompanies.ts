/**
 * React Query hooks for company data
 */

import { useQuery } from '@tanstack/react-query'
import { companyService, Company } from '@/services/api/company'
import { queryKeys } from '@/lib/query-client'

/**
 * Fetch company by ID
 */
export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.byId(companyId),
    queryFn: () => companyService.getCompanyById(companyId),
    enabled: !!companyId && companyId !== 'default',
    staleTime: 10 * 60 * 1000, // 10 minutes - companies change less frequently
  })
}
