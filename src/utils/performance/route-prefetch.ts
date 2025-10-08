// Advanced Route Prefetching Strategy for Jack of All Trades
import { ComponentType, ReactElement } from 'react'

// Define prefetch strategies
export interface PrefetchStrategy {
  component: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
  prefetchOn: 'hover' | 'visible' | 'immediate' | 'idle'
  priority?: 'high' | 'medium' | 'low'
}

// Route prefetch configuration
export const ROUTE_PREFETCH_CONFIG: Record<string, PrefetchStrategy> = {
  '/documents': {
    component: () => import('@/pages/documents/Documents'),
    prefetchOn: 'hover', // Prefetch when user hovers over navigation
    priority: 'high',
  },
  '/projects': {
    component: () => import('@/pages/projects/Projects'),
    prefetchOn: 'hover',
    priority: 'high',
  },
  '/viewer': {
    component: () => import('@/pages/documents/Viewer'),
    prefetchOn: 'immediate', // Prefetch immediately for authenticated users
    priority: 'high',
  },
  '/dashboard': {
    component: () => import('@/pages/dashboard/Dashboard'),
    prefetchOn: 'immediate',
    priority: 'high',
  },
  '/settings': {
    component: () => import('@/pages/dashboard/ProfileSettings'),
    prefetchOn: 'idle',
    priority: 'medium',
  },
  '/project-details': {
    component: () => import('@/pages/projects/ProjectDetails'),
    prefetchOn: 'hover',
    priority: 'high',
  },
}

// Prefetch cache to avoid duplicate requests
const prefetchCache = new Set<string>()

// Prefetch a specific route
export const prefetchRoute = async (routeKey: string): Promise<void> => {
  if (prefetchCache.has(routeKey)) {
    return // Already prefetched
  }

  const config = ROUTE_PREFETCH_CONFIG[routeKey]
  if (!config) {
    return
  }

  try {
    await config.component()
    prefetchCache.add(routeKey)
  } catch (error) {
    // Silent failure for prefetching
  }
}

// Prefetch multiple routes based on priority
export const prefetchRoutes = async (
  routes: string[],
  priority: 'high' | 'medium' | 'low' = 'medium',
): Promise<void> => {
  const filteredRoutes = routes.filter(route => {
    const config = ROUTE_PREFETCH_CONFIG[route]
    return config && (config.priority === priority || !config.priority)
  })

  await Promise.all(filteredRoutes.map(prefetchRoute))
}

// Prefetch based on user context
export const prefetchForAuthenticatedUser = async (): Promise<void> => {
  const immediateRoutes = Object.entries(ROUTE_PREFETCH_CONFIG)
    .filter(([_, config]) => config.prefetchOn === 'immediate')
    .map(([route]) => route)

  await prefetchRoutes(immediateRoutes, 'high')
}

// Prefetch during idle time
export const prefetchOnIdle = (): void => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const idleRoutes = Object.entries(ROUTE_PREFETCH_CONFIG)
        .filter(([_, config]) => config.prefetchOn === 'idle')
        .map(([route]) => route)

      prefetchRoutes(idleRoutes, 'low')
    })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      const idleRoutes = Object.entries(ROUTE_PREFETCH_CONFIG)
        .filter(([_, config]) => config.prefetchOn === 'idle')
        .map(([route]) => route)

      prefetchRoutes(idleRoutes, 'low')
    }, 2000)
  }
}

// Intersection Observer for "visible" prefetching
let intersectionObserver: IntersectionObserver | null = null

export const observeForPrefetch = (
  element: Element,
  routeKey: string,
): void => {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const route = entry.target.getAttribute('data-prefetch-route')
            if (route) {
              prefetchRoute(route)
              intersectionObserver?.unobserve(entry.target)
            }
          }
        })
      },
      { threshold: 0.1 },
    )
  }

  element.setAttribute('data-prefetch-route', routeKey)
  intersectionObserver.observe(element)
}

// Clean up intersection observer
export const cleanupPrefetchObserver = (): void => {
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
}
