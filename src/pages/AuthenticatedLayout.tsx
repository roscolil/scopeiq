// AuthenticatedLayout.tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/aws-auth'
import { Spinner } from '@/components/Spinner'
import { Component, ErrorInfo, ReactNode } from 'react'

// Error boundary to catch auth context errors
class AuthErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onError?: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth error boundary caught an error:', error, errorInfo)

    // If it's an auth context error and we're in development, reload after shorter delay
    if (
      error.message?.includes('useAuth must be used within an AuthProvider') &&
      process.env.NODE_ENV === 'development'
    ) {
      setTimeout(() => {
        window.location.reload()
      }, 500) // Reduced from 2000ms to 500ms
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-gray-600">
              Reconnecting to authentication...
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-2 text-sm text-gray-400">
                Development: Page will reload automatically
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const AuthenticatedLayoutInner = () => {
  const { isAuthenticated, isLoading } = useAuth()

  console.log('🔒 AuthenticatedLayout state:', {
    isAuthenticated,
    isLoading,
  })

  if (isLoading) {
    console.log('⏳ Showing loading spinner')
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('⚠️ User not authenticated, redirecting to sign in')
    return <Navigate to="/auth/signin" replace />
  }

  console.log('✅ User authenticated, rendering content')
  return <Outlet />
}

const AuthenticatedLayout = () => {
  return (
    <AuthErrorBoundary>
      <AuthenticatedLayoutInner />
    </AuthErrorBoundary>
  )
}

export default AuthenticatedLayout
