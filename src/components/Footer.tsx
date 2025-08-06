import React from 'react'
import { Link } from 'react-router-dom'
import { FilePlus, Heart } from 'lucide-react'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-white/20 py-8 md:py-12 bg-transparent backdrop-blur-sm">
      <div className="container-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <FilePlus className="h-5 w-5 text-primary" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full opacity-80" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ScopeIQ
              </span>
              <span className="text-xs text-slate-600 font-medium">
                © {currentYear}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <Link
              to="/terms"
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors duration-200 font-medium"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors duration-200 font-medium"
            >
              Privacy
            </Link>
            <Link
              to="/contact"
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors duration-200 font-medium"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
