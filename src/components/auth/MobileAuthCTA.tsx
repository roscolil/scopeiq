import { useAuth } from '@/hooks/aws-auth'
import { Button } from '@/components/ui/button'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

/**
 * MobileAuthCTA
 * Displays a fixed bottom call-to-action prompting Sign In / Get Started when user is unauthenticated on small screens.
 * Hidden automatically when:
 *  - Auth is loading
 *  - User is authenticated
 *  - Current route is already within /auth/*
 */
export const MobileAuthCTA = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isAuthRoute = location.pathname.startsWith('/auth')
    if (isLoading) {
      setVisible(false)
      return
    }
    if (isAuthenticated) {
      setVisible(false)
      return
    }
    if (isAuthRoute) {
      setVisible(false)
      return
    }
    // Only show on mobile viewport width (match Tailwind md breakpoint < 768px)
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setVisible(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [isAuthenticated, isLoading, location.pathname])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] pt-2 pointer-events-none">
      <div className="mx-auto max-w-sm rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80 border border-gray-700/60 shadow-lg shadow-black/40 ring-1 ring-black/40 flex flex-col gap-3 p-4 animate-slide-up pointer-events-auto">
        <div className="text-center text-[11px] uppercase tracking-wide text-gray-300 font-medium">
          Unlock full workspace features
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            aria-label="Sign in to your existing account"
            data-track="mobile-auth-cta-signin"
            className="flex-1 text-sm h-12 min-h-12"
            onClick={() =>
              navigate('/auth/signin', { state: { from: location.pathname } })
            }
          >
            Sign In
          </Button>
          <Button
            size="lg"
            aria-label="Create a free account"
            data-track="mobile-auth-cta-signup"
            className="flex-1 text-sm h-12 min-h-12"
            onClick={() =>
              navigate('/auth/signup', { state: { from: location.pathname } })
            }
          >
            Get Started
          </Button>
        </div>
        <div className="text-[10px] text-center text-gray-500 leading-snug">
          Free tier included • No credit card required
        </div>
      </div>
    </div>
  )
}

export default MobileAuthCTA
