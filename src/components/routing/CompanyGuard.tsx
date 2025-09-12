import { useParams, Outlet } from 'react-router-dom'
import { useMemo } from 'react'

// CompanyGuard now supports literal (URL-encoded) company names with spaces & punctuation.
// It only blocks obviously unsafe control characters. A derived slug is available if needed.
export const CompanyGuard = () => {
  const { companyId } = useParams()

  // Always define decoded & derivedSlug via stable hooks ordering
  let decoded = companyId || ''
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Fallback silently if malformed encoding
  }
  const derivedSlug = useMemo(
    () =>
      decoded
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company',
    [decoded],
  )

  if (!companyId) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-xs text-gray-400">
        Missing company context
      </div>
    )
  }
  // Reject if control characters present (use hex escapes split to avoid lint issue)
  let hasControl = false
  for (let i = 0; i < decoded.length; i++) {
    const code = decoded.charCodeAt(i)
    if ((code >= 0 && code <= 31) || code === 127) {
      hasControl = true
      break
    }
  }
  if (hasControl) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-xs text-red-400">
        Invalid company identifier (control chars)
      </div>
    )
  }

  return (
    <div data-company-slug={derivedSlug} className="contents">
      <Outlet />
    </div>
  )
}

export default CompanyGuard
