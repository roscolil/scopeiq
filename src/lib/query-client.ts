import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client Configuration
 * Central configuration for all data fetching and caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      // Default: 2 minutes (most data updates reasonably frequently)
      staleTime: 2 * 60 * 1000,
      // Garbage-collection time: how long inactive data stays in cache
      // Default: 10 minutes to limit memory footprint
      gcTime: 10 * 60 * 1000,
      // Retry failed requests (useful for network issues)
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for data freshness
      refetchOnWindowFocus: true,
      // Refetch on mount if data is stale (important for navigation back)
      refetchOnMount: 'always', // ensures quick GC after navigation
      // Network mode - online, always, or offlineFirst
      networkMode: 'online',
      // Reduce memory churn by avoiding refetch on reconnect for large pages
      refetchOnReconnect: false,
      // Do not keep previous data for very large lists by default
      // Individual queries can override with keepPreviousData: true
      keepPreviousData: false,
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
