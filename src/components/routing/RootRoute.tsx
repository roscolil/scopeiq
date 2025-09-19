import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/aws-auth'
import HomePage from '@/pages/dashboard/IndexPage'

/**
 * RootRoute decides what to show at '/'.
 * If the user is authenticated we immediately redirect them to their company dashboard.
 * Otherwise we show the public marketing / landing `HomePage` (IndexPage).
 */
const RootRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth()

  // While loading auth state, just show the landing page (existing UX decision)
  if (isLoading) {
    return <HomePage />
  }

  if (isAuthenticated && user) {
    const companySegment = user.companyId?.toLowerCase?.() || 'default'
    return <Navigate to={`/${encodeURIComponent(companySegment)}`} replace />
  }

  return <HomePage />
}

export default RootRoute
