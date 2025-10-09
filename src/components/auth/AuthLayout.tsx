import { FilePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  description?: string
}

export const AuthLayout = ({
  children,
  title,
  description,
}: AuthLayoutProps) => {
  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid blue gradient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/95 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-blue-950/80 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-950/60 via-indigo-950/80 to-blue-950/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/15 to-indigo-400/25"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-blue-600/20"></div>

        {/* Floating gradient orbs for dramatic animation */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-blue-500/15 to-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-tr from-blue-500/15 to-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-gradient-to-r from-indigo-500/12 to-blue-500/18 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-indigo-500/15 rounded-full blur-xl opacity-70"></div>
        <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-gradient-to-bl from-indigo-500/10 to-blue-500/15 rounded-full blur-xl opacity-60"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link
              to="/"
              className="font-bold text-2xl flex items-center justify-center gap-3 text-white hover:text-emerald-400 transition-colors"
            >
              <div className="relative">
                <img
                  src="/hammer-green.svg"
                  alt="Jack of All Trades"
                  className="h-10 w-10"
                  draggable={false}
                />
                {/* <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full opacity-80" /> */}
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Jack of All Trades
              </span>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
              {title}
            </h2>
            {description && <p className="mt-2 text-gray-400">{description}</p>}
          </div>
          <div className="relative">
            {/* Dark glass morphism card background */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent rounded-xl"></div>

            <div className="relative z-10 p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
