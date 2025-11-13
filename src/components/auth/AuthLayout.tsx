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
      {/* Clean neutral background with subtle accent */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted">
        {/* Subtle floating accents */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link
              to="/"
              className="font-bold text-2xl flex items-center justify-center gap-3 text-foreground hover:text-primary transition-colors"
            >
              <div className="relative">
                <img
                  src="/hammer-orange.svg"
                  alt="Jack of All Trades"
                  className="h-10 w-10"
                  draggable={false}
                />
              </div>
              <span className="text-primary">Jack of All Trades</span>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-foreground">{title}</h2>
            {description && (
              <p className="mt-2 text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="relative">
            {/* Clean card background */}
            <div className="absolute inset-0 bg-card backdrop-blur-sm rounded-xl border border-border shadow-xl"></div>

            <div className="relative z-10 p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
