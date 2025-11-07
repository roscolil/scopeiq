import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/aws-auth'
import { Spinner } from '@/components/shared/Spinner'

/**
 * Mobile-specific authentication redirect component
 * Handles edge cases where mobile browsers might not properly redirect authenticated users
 */
const MobileAuthRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)

    if (!isMobile) return // Only handle mobile cases

    // If we're on a mobile device and user is authenticated but ended up on 404
    if (isAuthenticated && user?.companyId && !isLoading) {
      const validCompanySegment =
        (user.companyId || 'default')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/^-+|-+$/g, '') || 'default'

      console.log('📱 Mobile auth redirect triggered:', {
        currentPath: location.pathname,
        targetPath: `/${validCompanySegment}`,
        userCompanyId: user.companyId,
        isAuthenticated,
        isLoading,
      })

      // Navigate to the correct dashboard path
      navigate(`/${validCompanySegment}`, { replace: true })
    }
  }, [isAuthenticated, isLoading, user, navigate, location.pathname])

  // Show spinner while processing
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
        <p className="ml-4 text-gray-600">Redirecting...</p>
      </div>
    )
  }

  return null
}

export default MobileAuthRedirect
