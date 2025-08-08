// AuthenticatedLayout.tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/aws-auth'
import { Spinner } from '@/components/Spinner'

const AuthenticatedLayout = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />
  }

  return <Outlet />
}

export default AuthenticatedLayout
