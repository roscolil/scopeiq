import { useEffect } from 'react'
import { projectService, documentService } from '@/services/data/hybrid'

/**
 * Performance utilities for preloading and optimizing navigation
 */

// Global type for gtag function
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      parameters: Record<string, string | number>,
    ) => void
  }
}

// Preload cache for likely navigation targets
const preloadCache = new Map<string, Promise<unknown>>()

/**
 * Preload company projects list when user hovers over company navigation
 */
export const preloadCompanyProjects = (companyId: string) => {
  if (!companyId || preloadCache.has(`company-projects:${companyId}`)) return

  const promise = projectService.getProjects().catch(() => null)
  preloadCache.set(`company-projects:${companyId}`, promise)

  // Clean up after 30 seconds
  setTimeout(() => {
    preloadCache.delete(`company-projects:${companyId}`)
  }, 30000)

  return promise
}

/**
 * Preload all documents for a company when user navigates to documents section
 */
export const preloadCompanyDocuments = (companyId: string) => {
  if (!companyId || preloadCache.has(`company-documents:${companyId}`)) return

  const promise = documentService.getAllDocuments().catch(() => null)
  preloadCache.set(`company-documents:${companyId}`, promise)

  setTimeout(() => {
    preloadCache.delete(`company-documents:${companyId}`)
  }, 30000)

  return promise
}

/**
 * Preload project data when user hovers over project links
 */
export const preloadProject = (projectId: string) => {
  if (!projectId || preloadCache.has(`project:${projectId}`)) return

  const promise = projectService.resolveProject(projectId).catch(() => null)
  preloadCache.set(`project:${projectId}`, promise)

  // Clean up after 30 seconds
  setTimeout(() => {
    preloadCache.delete(`project:${projectId}`)
  }, 30000)

  return promise
}

/**
 * Preload project documents when user hovers over project cards
 */
export const preloadProjectDocuments = (projectId: string) => {
  if (!projectId || preloadCache.has(`project-documents:${projectId}`)) return

  const promise = documentService
    .getDocumentsByProject(projectId)
    .catch(() => null)
  preloadCache.set(`project-documents:${projectId}`, promise)

  setTimeout(() => {
    preloadCache.delete(`project-documents:${projectId}`)
  }, 30000)

  return promise
}

/**
 * Preload document validation when user hovers over document links
 */
export const preloadDocument = (
  companyId: string,
  projectId: string,
  documentId: string,
) => {
  const key = `document:${projectId}:${documentId}`
  if (preloadCache.has(key)) return

  const promise = documentService
    .getDocument(companyId, projectId, documentId)
    .catch(() => null)
  preloadCache.set(key, promise)

  setTimeout(() => {
    preloadCache.delete(key)
  }, 30000)

  return promise
}

/**
 * Hook to prefetch data for likely navigation paths
 */
export const usePrefetch = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return

    // Prefetch on mouse movement (user is active)
    let prefetchTimeout: NodeJS.Timeout

    const handleMouseMove = () => {
      clearTimeout(prefetchTimeout)
      prefetchTimeout = setTimeout(() => {
        // Prefetch common routes after user stops moving mouse
        const currentPath = window.location.pathname

        // If on company dashboard, prefetch projects and documents
        const companyMatch = currentPath.match(/^\/([^/]+)$/)
        if (companyMatch) {
          const companyId = companyMatch[1]
          preloadCompanyProjects(companyId)
          preloadCompanyDocuments(companyId)
        }

        // If on projects list, prefetch project details
        const projectsMatch = currentPath.match(/^\/([^/]+)\/projects$/)
        if (projectsMatch) {
          const companyId = projectsMatch[1]
          preloadCompanyProjects(companyId)
        }

        // If on project page, prefetch documents
        const projectMatch = currentPath.match(/^\/([^/]+)\/([^/]+)$/)
        if (projectMatch) {
          const [, companyId, projectSlug] = projectMatch
          preloadProject(projectSlug)
          preloadProjectDocuments(projectSlug)
        }

        // If on documents page, prefetch project data
        const documentsMatch = currentPath.match(/^\/([^/]+)\/documents$/)
        if (documentsMatch) {
          const companyId = documentsMatch[1]
          preloadCompanyDocuments(companyId)
          preloadCompanyProjects(companyId)
        }
      }, 500)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(prefetchTimeout)
    }
  }, [enabled])
}

/**
 * Performance monitoring for guard validation times
 */
export const measureGuardPerformance = <T>(
  guardType: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const start = performance.now()

  return operation().finally(() => {
    const duration = performance.now() - start

    // Log slow guards (>500ms) for optimization
    if (duration > 500) {
      console.warn(`Slow ${guardType} guard: ${duration.toFixed(1)}ms`)
    }

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'guard_performance', {
        guard_type: guardType,
        duration_ms: Math.round(duration),
        custom_parameter: duration > 500 ? 'slow' : 'fast',
      })
    }
  })
}
