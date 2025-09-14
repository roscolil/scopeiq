import { useParams, Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import NotFound from '@/pages/core/NotFound'
import { measureGuardPerformance } from '@/utils/performance'

// CompanyGuard now supports literal (URL-encoded) company names with spaces & punctuation.
// It only blocks obviously unsafe control characters. A derived slug is available if needed.
export const CompanyGuard = () => {
  const { companyId } = useParams()
  const [state, setState] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [decoded, setDecoded] = useState('')

  // Decode & validate only once per companyId change
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!companyId) {
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

      const invalid = hasControlChars(localDecoded)
      if (invalid) {
        setState('invalid')
        return
      }

      // Potential future async company existence check hook (e.g. via service)
      await measureGuardPerformance('CompanyGuard', async () => {
        // Currently we accept any syntactically valid company identifier.
        // Placeholder for future network validation.
      })
      if (!cancelled) setState('ok')
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyId])

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
