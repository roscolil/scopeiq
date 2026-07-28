import { FilePlus, HardHat } from 'lucide-react'
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
        {/* Exelion brand gradient background layers */}
        <div className="absolute inset-0 hero-bg"></div>
        <div className="absolute inset-0 hero-glow"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-blue-dark/60 via-brand-navy/40 to-brand-blue-dark/70"></div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-brand-blue-light/15 to-brand-yellow/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-tr from-brand-blue/15 to-brand-blue-light/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-gradient-to-r from-brand-blue-dark/12 to-brand-blue/18 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 hero-yellow-orb w-full h-full"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link
              to="/"
              className="font-bold text-2xl flex items-center justify-center gap-3 text-white hover:text-brand-yellow transition-colors"
            >
              <div className="relative">
                <img
                  src="/images/New Jack Logo clear background and no tag line white text -Mar 26- using Logo Creator.png"
                  alt="JACK by Exelion"
                  className="h-20 w-auto max-w-[220px]"
                  draggable={false}
                />
              </div>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-gradient-yellow">
              {title}
            </h2>
            {description && <p className="mt-2 text-gray-300">{description}</p>}
          </div>
          <div className="relative">
            {/* Dark glass morphism card background */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-brand-lg"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent rounded-xl"></div>

            <div className="relative z-10 p-6 sm:p-8 [&_input]:font-medium md:[&_input]:text-base [&_input::placeholder]:font-medium">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
