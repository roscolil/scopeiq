import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MobileAuthRedirect from '@/components/routing/MobileAuthRedirect'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
      isMobile ? '(Mobile device)' : '(Desktop)',
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        userAgent: navigator.userAgent,
      },
    )
  }, [location])

  return (
    <>
      {/* Mobile auth redirect check */}
      <MobileAuthRedirect />

      {/* Dark gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Exelion brand gradient layers */}
        <div className="absolute inset-0 hero-bg"></div>
        <div className="absolute inset-0 hero-glow"></div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-brand-blue-light/15 to-brand-yellow/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-brand-blue-dark/12 to-brand-blue/8 rounded-full blur-3xl"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-gradient-yellow">404</h1>
          <p className="text-xl text-gray-300 mb-8">Oops! Page not found</p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-blue-light hover:from-brand-blue-dark hover:to-brand-blue text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Return to Home
          </a>
        </div>
      </div>
    </>
  )
}

export default NotFound
