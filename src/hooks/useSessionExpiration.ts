/**
 * Session Expiration Notification Hook
 *
 * Listens for auth:session-expired events and shows a toast notification
 * Redirects user to sign-in page
 *
 * Note: Uses window.location instead of useNavigate() to avoid router context dependency
 */

import { useEffect } from 'react'
import { useToast } from './use-toast'

export function useSessionExpiration() {
  const { toast } = useToast()

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>

      toast({
        title: 'Session Expired',
        description:
          customEvent.detail?.message ||
          'Your session has expired. Please sign in again.',
        variant: 'destructive',
        duration: 6000, // Show for 6 seconds
      })

      // Redirect to sign-in page after a brief delay using window.location
      // (avoids need for router context - can be called from anywhere)
      setTimeout(() => {
        window.location.href = '/auth/signin'
      }, 1500)
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [toast])
}
