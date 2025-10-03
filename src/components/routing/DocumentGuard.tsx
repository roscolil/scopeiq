import { useParams, Outlet } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import NotFound from '@/pages/core/NotFound'
import { documentService, projectService } from '@/services/data/hybrid'
import { createSlug } from '@/utils/ui/navigation'
import { measureGuardPerformance } from '@/utils/performance'
import { usePermissions, useUserContext } from '@/hooks/user-roles'
import { UnauthorizedAccess } from '@/utils/auth/authorization'
import { AuditLogger } from '@/services/audit/audit-log'

// In-memory existence cache (fast, non-persistent)
const documentCache = new Map<string, boolean>()

// TTL for sessionStorage persistence (milliseconds)
const TTL_MS = 10 * 60 * 1000 // 10 minutes

interface PersistedEntry {
  exists: 0 | 1
  t: number // timestamp
}

const sessionKey = (projectId: string, docKey: string) =>
  `doc_exists::${projectId}::${docKey}`

const readPersisted = (projectId: string, docKey: string): boolean | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(sessionKey(projectId, docKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEntry
    if (Date.now() - parsed.t > TTL_MS) return null
    return parsed.exists === 1
  } catch {
    return null
  }
}

const writePersisted = (projectId: string, docKey: string, exists: boolean) => {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedEntry = { exists: exists ? 1 : 0, t: Date.now() }
    sessionStorage.setItem(
      sessionKey(projectId, docKey),
      JSON.stringify(payload),
    )
  } catch {
    /* ignore quota errors */
  }
}

export const DocumentGuard = () => {
  const { companyId, projectId, documentId } = useParams()
  const [state, setState] = useState<
    'checking' | 'ok' | 'invalid' | 'unauthorized'
  >('checking')
  const [fastPath, setFastPath] = useState(false)
  const revalidatedRef = useRef(false)
  const location = useLocation()

  // Check user permissions - documents inherit project access
  const { canAccessProject } = usePermissions()
  const { userContext, loading: contextLoading } = useUserContext()
  const hasDocumentAccess = projectId ? canAccessProject(projectId) : false

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!companyId || !projectId || !documentId) {
        setState('invalid')
        return
      }

      // Wait for user context to load before checking permissions
      if (contextLoading) {
        setState('checking')
        return
      }

      // Check user permissions first (cheap check)
      if (!hasDocumentAccess) {
        // Audit log access denial
        if (userContext?.userId && projectId && documentId) {
          AuditLogger.checkRouteAccess(
            userContext.userId,
            userContext.role,
            `/project/${projectId}/document/${documentId}`,
            false,
            {
              reason: 'Document in unassigned project',
              projectId,
              documentId,
            },
          ).catch(err => console.warn('Audit log failed:', err))
        }
        setState('unauthorized')
        return
      }

      // Audit log successful access (after document validation)
      if (userContext?.userId && projectId && documentId && !cancelled) {
        AuditLogger.checkRouteAccess(
          userContext.userId,
          userContext.role,
          `/project/${projectId}/document/${documentId}`,
          true,
          { projectId, documentId },
        ).catch(err => console.warn('Audit log failed:', err))
      }

      const cacheKey = `${projectId}:${documentId}`

      // 1. In-memory cache
      if (documentCache.has(cacheKey)) {
        setState(documentCache.get(cacheKey)! ? 'ok' : 'invalid')
        return
      }

      // 2. sessionStorage TTL (stale-while-revalidate pattern)
      const persisted = readPersisted(projectId, documentId)
      if (persisted !== null) {
        // Allow immediately (optimistic) then background refresh
        setState(persisted ? 'ok' : 'invalid')
        setFastPath(true)
        if (!revalidatedRef.current) {
          revalidatedRef.current = true
          // Fire background validation (non-blocking)
          ;(async () => {
            try {
              const fresh = await validateNetwork()
              if (!cancelled && fresh !== persisted) {
                setState(fresh ? 'ok' : 'invalid')
              }
            } catch {
              /* ignore */
            }
          })()
        }
        return
      }

      // 3. First full validation (blocking render)
      const ok = await validateNetwork()
      if (!cancelled) setState(ok ? 'ok' : 'invalid')
    }

    const validateNetwork = async (): Promise<boolean> => {
      const cacheKey = `${projectId}:${documentId}`
      return measureGuardPerformance('DocumentGuard', async () => {
        try {
          // Run project resolution and (if doc looks like an internal id) direct fetch in parallel
          const looksLikeInternalId = /^doc_[0-9]+_[a-z0-9]{5,}$/i.test(
            documentId,
          )
          const projectPromise = projectService.resolveProject(projectId!)
          const directPromise = looksLikeInternalId
            ? documentService
                .getDocument(companyId!, projectId!, documentId!)
                .catch(() => null)
            : Promise.resolve(null)

          const [proj, directDoc] = await Promise.all([
            projectPromise,
            directPromise,
          ])
          if (!proj) {
            documentCache.set(cacheKey, false)
            writePersisted(projectId!, documentId!, false)
            return false
          }

          if (directDoc) {
            documentCache.set(cacheKey, true)
            writePersisted(projectId!, documentId!, true)
            return true
          }

          // Slug / fallback path (defer heavy list fetch until needed)
          let exists = false
          try {
            const projectDocs = await documentService.getDocumentsByProject(
              proj.id,
            )
            const target = documentId!.toLowerCase()
            const found = projectDocs.find(d => {
              const basicSlug = d.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
              const navSlug = createSlug(d.name)
              return (
                d.id === documentId ||
                basicSlug === target ||
                navSlug === target
              )
            })
            exists = !!found
          } catch (err) {
            console.debug('DocumentGuard fallback list fetch failed', err)
          }

          documentCache.set(cacheKey, exists)
          writePersisted(projectId!, documentId!, exists)
          return exists
        } catch (e) {
          console.warn('DocumentGuard network validation error', e)
          documentCache.set(cacheKey, false)
          writePersisted(projectId!, documentId!, false)
          return false
        }
      })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    companyId,
    projectId,
    documentId,
    hasDocumentAccess,
    contextLoading,
    userContext,
  ])

  // if (state === 'checking') {
  //   return (
  //     <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 animate-fade-in">
  //       <div className="w-40 h-2 rounded-full bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 bg-[length:200%_100%] animate-shimmer" />
  //       <p className="text-[10px] uppercase tracking-wider text-gray-500">
  //         {fastPath ? 'Revalidating…' : 'Validating document…'}
  //       </p>
  //     </div>
  //   )
  // }
  if (state === 'unauthorized') {
    return (
      <div className="flex h-screen items-center justify-center">
        <UnauthorizedAccess
          message="You don't have access to this document. It may be in a project you're not assigned to."
          showReturnHome={true}
        />
      </div>
    )
  }

  if (state === 'invalid') return <NotFound />
  if (state === 'checking') return null
  return <Outlet />
}

export default DocumentGuard
