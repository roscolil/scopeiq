import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    )
  }, [location.pathname])

  return (
    <>
      {/* Dark gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Base dark gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-gray-900 to-black/95"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-cyan-500/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/8 via-transparent to-rose-500/6"></div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text">
            404
          </h1>
          <p className="text-xl text-gray-300 mb-8">Oops! Page not found</p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Return to Home
          </a>
        </div>
      </div>
    </>
  )
}

export default NotFound
