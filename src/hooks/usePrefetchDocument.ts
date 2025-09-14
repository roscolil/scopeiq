import { useCallback } from 'react'
import { documentService, projectService } from '@/services/data/hybrid'
import { createSlug } from '@/utils/ui/navigation'

// Light prefetch cache (existence only) shared with guard’s session storage pattern
const mem = new Map<string, boolean>()
const TTL_MS = 10 * 60 * 1000

interface PersistedEntry {
  exists: 0 | 1
  t: number
}
const sessionKey = (projectId: string, docKey: string) =>
  `doc_exists::${projectId}::${docKey}`

const writePersisted = (projectId: string, docKey: string, exists: boolean) => {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedEntry = { exists: exists ? 1 : 0, t: Date.now() }
    sessionStorage.setItem(
      sessionKey(projectId, docKey),
      JSON.stringify(payload),
    )
  } catch {
    // ignore
  }
}

/**
 * usePrefetchDocument
 * Fire this on hover/focus/viewport intent of a document link to warm caches so the guard is instant.
 */
export const usePrefetchDocument = () => {
  return useCallback(async (projectId: string, documentIdOrSlug: string) => {
    const key = `${projectId}:${documentIdOrSlug}`
    if (mem.has(key)) return
    mem.set(key, true) // prevent duplicate inflight
    try {
      // Attempt project + direct doc fetch in parallel
      const looksLikeInternalId = /^doc_[0-9]+_[a-z0-9]{5,}$/i.test(
        documentIdOrSlug,
      )
      const projectPromise = projectService.resolveProject(projectId)
      const directPromise = looksLikeInternalId
        ? documentService
            .getDocument('ignored', projectId, documentIdOrSlug)
            .catch(() => null)
        : Promise.resolve(null)

      const [proj, direct] = await Promise.all([projectPromise, directPromise])
      if (!proj) return
      if (direct) {
        writePersisted(projectId, documentIdOrSlug, true)
        return
      }
      // Fallback minimal slug scan (avoid full fetch if possible)
      const projectDocs = await documentService.getDocumentsByProject(proj.id)
      const target = documentIdOrSlug.toLowerCase()
      const found = projectDocs.find(d => {
        const basicSlug = d.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const navSlug = createSlug(d.name)
        return (
          d.id === documentIdOrSlug ||
          basicSlug === target ||
          navSlug === target
        )
      })
      writePersisted(projectId, documentIdOrSlug, !!found)
    } catch {
      // swallow
    } finally {
      setTimeout(() => mem.delete(key), TTL_MS) // allow refresh after TTL
    }
  }, [])
}

export default usePrefetchDocument
