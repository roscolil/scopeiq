import { useParams, Outlet } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import NotFound from '@/pages/core/NotFound'
import { projectService } from '@/services/data/hybrid'
import IQPageLoader from '@/components/shared/IQPageLoader'
import { measureGuardPerformance } from '@/utils/performance'

// In-memory cache + TTL persistence for consistent performance
const projectCache = new Map<string, boolean>()
const TTL_MS = 10 * 60 * 1000 // 10 minutes

interface PersistedEntry {
  exists: 0 | 1
  t: number
}

const sessionKey = (projectId: string) => `project_exists::${projectId}`

const readPersisted = (projectId: string): boolean | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(sessionKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEntry
    if (Date.now() - parsed.t > TTL_MS) return null
    return parsed.exists === 1
  } catch {
    return null
  }
}

const writePersisted = (projectId: string, exists: boolean) => {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedEntry = { exists: exists ? 1 : 0, t: Date.now() }
    sessionStorage.setItem(sessionKey(projectId), JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

export const ProjectGuard = () => {
  const { projectId } = useParams()
  const [state, setState] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [fastPath, setFastPath] = useState(false)
  const revalidatedRef = useRef(false)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = projectId || ''
      if (!id) {
        setState('invalid')
        return
      }

      // 1. In-memory cache (fastest)
      if (projectCache.has(id)) {
        setState(projectCache.get(id)! ? 'ok' : 'invalid')
        return
      }

      // 2. sessionStorage TTL (stale-while-revalidate)
      const persisted = readPersisted(id)
      if (persisted !== null) {
        setState(persisted ? 'ok' : 'invalid')
        setFastPath(true)

        // Background revalidation
        if (!revalidatedRef.current) {
          revalidatedRef.current = true
          ;(async () => {
            try {
              const fresh = await validateNetwork(id)
              if (!cancelled && fresh !== persisted) {
                setState(fresh ? 'ok' : 'invalid')
              }
            } catch {
              /* ignore background errors */
            }
          })()
        }
        return
      }

      // 3. Full network validation (blocking)
      const exists = await validateNetwork(id)
      if (!cancelled) setState(exists ? 'ok' : 'invalid')
    }

    const validateNetwork = async (id: string): Promise<boolean> => {
      return measureGuardPerformance('ProjectGuard', async () => {
        try {
          const resolved = await projectService.resolveProject(id)
          const exists = !!resolved

          // Update both caches
          projectCache.set(id, exists)
          writePersisted(id, exists)

          return exists
        } catch (e) {
          console.warn('ProjectGuard validation error', e)

          // Cache negative result briefly to avoid retry storms
          projectCache.set(id, false)
          writePersisted(id, false)

          return false
        }
      })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // if (state === 'checking') {
  //   return (
  //     <IQPageLoader
  //       message={fastPath ? 'Revalidating project' : 'Validating project'}
  //       subMessage={fastPath ? 'Optimistic access granted' : 'Ensuring access'}
  //     />
  //   )
  // }

  if (state === 'invalid') return <NotFound />
  if (state === 'checking') {
    // Avoid flashing loader; keep route blank until resolved (near-instant in fast paths)
    return null
  }
  return <Outlet />
}

export default ProjectGuard
