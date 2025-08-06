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
        {/* Enhanced Stripe-inspired gradient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100/80 to-purple-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/70 via-blue-100/50 to-indigo-100/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/60 via-indigo-100/30 to-purple-200/50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/50 via-transparent to-blue-200/40"></div>

        {/* Floating gradient orbs for subtle animation */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-primary/10 to-accent/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-tr from-accent/10 to-primary/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-gradient-to-r from-blue-200/20 to-purple-200/25 rounded-full blur-2xl"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <FilePlus className="h-6 w-6" />
              <span className="text-xl font-bold">ScopeIQ</span>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-slate-600">{description}</p>
            )}
          </div>
          <div className="relative">
            {/* Glass morphism card background */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 rounded-xl"></div>

            <div className="relative z-10 p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
