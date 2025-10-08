import React from 'react'
import { Link } from 'react-router-dom'
import { FilePlus, Heart } from 'lucide-react'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-white/20 py-8 md:py-12 bg-transparent backdrop-blur-sm">
      <div className="container-2xl">
        <div className="flex flex-col items-center justify-between gap-6 md:gap-0 lg:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-3 order-2 md:order-1">
            <div className="relative">
              <FilePlus className="h-5 w-5 text-emerald-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full opacity-80" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Jack of All Trades
              </span>
              <span className="text-xs text-gray-400 font-medium">
                © {currentYear}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8 order-1 md:order-2">
            <Link
              to="/our-team"
              className="text-sm text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Our Team
            </Link>
            <Link
              to="/work-with-us"
              className="text-sm text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Work With Us
            </Link>
            <Link
              to="/terms"
              className="text-sm text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Privacy
            </Link>
            <Link
              to="/contact"
              className="text-sm text-gray-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
