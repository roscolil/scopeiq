import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client Configuration
 * Central configuration for all data fetching and caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: how long inactive data stays in cache (30 minutes)
      gcTime: 30 * 60 * 1000,
      // Retry failed requests (useful for network issues)
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for data freshness
      refetchOnWindowFocus: true,
      // Refetch on mount if data is stale (important for navigation back)
      refetchOnMount: 'always',
      // Network mode - online, always, or offlineFirst
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations only once
      retry: 1,
      networkMode: 'online',
    },
  },
})

/**
 * Query Keys Factory
 * Centralized query key management for type safety and consistency
 */
export const queryKeys = {
  // Companies
  companies: {
    all: ['companies'] as const,
    byId: (id: string) => ['companies', id] as const,
  },
  // Projects
  projects: {
    all: ['projects'] as const,
    byCompany: (companyId: string) =>
      ['projects', 'company', companyId] as const,
    byId: (projectId: string) => ['projects', projectId] as const,
  },
  // Documents
  documents: {
    all: ['documents'] as const,
    byCompany: (companyId: string) =>
      ['documents', 'company', companyId] as const,
    byProject: (projectId: string) =>
      ['documents', 'project', projectId] as const,
    byId: (documentId: string) => ['documents', documentId] as const,
  },
  // User activities
  activities: {
    all: ['activities'] as const,
    byCompany: (companyId: string) =>
      ['activities', 'company', companyId] as const,
  },
  // Stats
  stats: {
    dashboard: (companyId: string) =>
      ['stats', 'dashboard', companyId] as const,
  },
} as const
