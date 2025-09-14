import { useParams, Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/aws-auth'
import NotFound from '@/pages/core/NotFound'
import { measureGuardPerformance } from '@/utils/performance'

// CompanyGuard now supports literal (URL-encoded) company names with spaces & punctuation.
// It only blocks obviously unsafe control characters. A derived slug is available if needed.
export const CompanyGuard = () => {
  const { companyId } = useParams()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [state, setState] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [decoded, setDecoded] = useState('')

  // Decode & validate only once per companyId change
  useEffect(() => {
    let cancelled = false
    const start = performance.now()
    const MIN_SKELETON_MS = 90
    const run = async () => {
      if (!companyId) {
        setState('invalid')
        return
      }

      // If auth still loading, wait for user context before validating company mismatch
      if (authLoading) {
        // Defer until auth finishes; effect will re-run due to dependency array
        return
      }

      // If not authenticated we still allow showing the internal NotFound (guarded routes are behind AuthenticatedLayout)
      // But we rely on outer auth layout to redirect if needed; here we just treat lack of user as invalid context.
      if (!isAuthenticated || !user) {
        setState('invalid')
        return
      }
      let localDecoded = companyId
      try {
        localDecoded = decodeURIComponent(localDecoded)
      } catch {
        // malformed encoding => treat as invalid
        setState('invalid')
        return
      }
      setDecoded(localDecoded)

      const invalidSyntax = hasControlChars(localDecoded)
      if (invalidSyntax) {
        setState('invalid')
        return
      }

      // Normalize both route param and user.companyId for comparison
      const normalize = (v: string) =>
        v
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      const paramNormalized = normalize(localDecoded)
      const userNormalized = normalize(user.companyId || '')

      if (
        paramNormalized !== userNormalized &&
        user.companyId !== localDecoded
      ) {
        // Neither normalized nor raw matches; treat as invalid (prevents access to other companies)
        setState('invalid')
        return
      }

      // Potential future async company existence check hook (e.g. via service)
      await measureGuardPerformance('CompanyGuard', async () => {
        // Placeholder: plug real existence check here if desired.
      })
      if (cancelled) return

      const elapsed = performance.now() - start
      if (elapsed < MIN_SKELETON_MS) {
        // Ensure at least a perceptible skeleton display without feeling laggy
        setTimeout(() => {
          if (!cancelled) setState('ok')
        }, MIN_SKELETON_MS - elapsed)
      } else {
        setState('ok')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyId, authLoading, isAuthenticated, user])

  const derivedSlug = useMemo(
    () =>
      decoded
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company',
    [decoded],
  )

  if (state === 'invalid') return <NotFound />
  if (state === 'checking') {
    return (
      <div className="min-h-[35vh] flex flex-col items-center justify-center gap-3 animate-fade-in">
        <div className="w-48 h-3 rounded-full bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 bg-[length:200%_100%] animate-shimmer" />
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          Preparing company space…
        </p>
      </div>
    )
  }

  return (
    <div data-company-slug={derivedSlug} className="contents">
      <Outlet />
    </div>
  )
}

function hasControlChars(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if ((code >= 0 && code <= 31) || code === 127) return true
  }
  return false
}

export default CompanyGuard
