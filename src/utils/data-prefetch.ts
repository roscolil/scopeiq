// Data Prefetching Utility for ScopeIQ
// Prefetch API data to reduce loading states

interface PrefetchedData {
  [key: string]: {
    data: unknown
    timestamp: number
    expiry: number
  }
}

// In-memory cache for prefetched data
const prefetchCache: PrefetchedData = {}

// Cache expiry time (5 minutes default)
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000

export interface PrefetchConfig {
  key: string
  fetcher: () => Promise<unknown>
  expiry?: number
  background?: boolean // Whether to fetch in background
}

// Prefetch data function
export const prefetchData = async (config: PrefetchConfig): Promise<void> => {
  const {
    key,
    fetcher,
    expiry = DEFAULT_CACHE_EXPIRY,
    background = false,
  } = config

  // Check if data is already cached and still valid
  if (isDataCached(key)) {
    console.log(`Data already cached for key: ${key}`)
    return
  }

  try {
    console.log(`Prefetching data for key: ${key}`)

    const startTime = Date.now()
    const data = await fetcher()
    const fetchTime = Date.now() - startTime

    // Cache the data
    prefetchCache[key] = {
      data,
      timestamp: Date.now(),
      expiry: expiry,
    }

    console.log(`Successfully prefetched ${key} in ${fetchTime}ms`)
  } catch (error) {
    console.error(`Failed to prefetch data for ${key}:`, error)
  }
}

// Get cached data
export const getCachedData = <T = unknown>(key: string): T | null => {
  const cached = prefetchCache[key]

  if (!cached) {
    return null
  }

  // Check if data has expired
  if (Date.now() - cached.timestamp > cached.expiry) {
    delete prefetchCache[key]
    return null
  }

  return cached.data as T
}

// Check if data is cached and valid
export const isDataCached = (key: string): boolean => {
  return getCachedData(key) !== null
}

// Clear cache for a specific key
export const clearCachedData = (key: string): void => {
  delete prefetchCache[key]
}

// Clear all cached data
export const clearAllCache = (): void => {
  Object.keys(prefetchCache).forEach(key => {
    delete prefetchCache[key]
  })
}

// Prefetch data based on user navigation patterns
export const prefetchUserData = async (companyId: string): Promise<void> => {
  const prefetchConfigs: PrefetchConfig[] = [
    {
      key: `projects-${companyId}`,
      fetcher: async () => {
        const { projectService } = await import('@/services/hybrid')
        return projectService.getProjects()
      },
      background: true,
    },
    {
      key: `all-documents-${companyId}`,
      fetcher: async () => {
        const { documentService } = await import('@/services/hybrid')
        return documentService.getAllDocuments()
      },
      background: true,
    },
  ]

  // Prefetch in parallel
  await Promise.allSettled(prefetchConfigs.map(config => prefetchData(config)))
}

// Prefetch project-specific data
export const prefetchProjectData = async (
  companyId: string,
  projectId: string,
): Promise<void> => {
  const prefetchConfigs: PrefetchConfig[] = [
    {
      key: `project-${projectId}`,
      fetcher: async () => {
        const { projectService } = await import('@/services/hybrid')
        return projectService.getProject(companyId, projectId)
      },
    },
    {
      key: `documents-${projectId}`,
      fetcher: async () => {
        const { documentService } = await import('@/services/hybrid')
        return documentService.getDocumentsByProject(projectId)
      },
    },
  ]

  await Promise.allSettled(prefetchConfigs.map(config => prefetchData(config)))
}

// Prefetch document-specific data
export const prefetchDocumentData = async (
  companyId: string,
  projectId: string,
  documentId: string,
): Promise<void> => {
  const prefetchConfigs: PrefetchConfig[] = [
    {
      key: `document-${documentId}`,
      fetcher: async () => {
        const { documentService } = await import('@/services/hybrid')
        return documentService.getDocument(companyId, projectId, documentId)
      },
    },
  ]

  await Promise.allSettled(prefetchConfigs.map(config => prefetchData(config)))
}

// Hook-like function to get cached data with automatic prefetching
export const usePrefetchedData = <T = unknown>(
  key: string,
  fetcher: () => Promise<T>,
  options: { expiry?: number; prefetch?: boolean } = {},
): { data: T | null; isLoading: boolean } => {
  const { expiry = DEFAULT_CACHE_EXPIRY, prefetch = true } = options

  const cachedData = getCachedData<T>(key)

  if (cachedData) {
    return { data: cachedData, isLoading: false }
  }

  if (prefetch) {
    // Trigger prefetch in background
    prefetchData({
      key,
      fetcher: fetcher as () => Promise<unknown>,
      expiry,
      background: true,
    })
  }

  return { data: null, isLoading: !cachedData }
}
