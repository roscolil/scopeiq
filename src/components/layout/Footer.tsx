import React from 'react'
import { Link } from 'react-router-dom'
import { FilePlus, Heart, HardHat } from 'lucide-react'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border py-4 md:py-8 bg-card/50 backdrop-blur-sm">
      <div className="container-2xl">
        <div className="flex flex-col items-center justify-between gap-6 md:gap-0 lg:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-3 order-2 md:order-1">
            <div className="relative">
              <img
                src="/hammer-orange.svg"
                alt="Jack of All Trades"
                className="h-8 w-8"
                draggable={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">Jack of All Trades</span>
              <span className="text-xs text-muted-foreground font-medium">
                © {currentYear}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8 order-1 md:order-2">
            <Link
              to="/our-team"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
            >
              Our Team
            </Link>
            <Link
              to="/work-with-us"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
            >
              Work With Us
            </Link>
            <Link
              to="/terms"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
            >
              Privacy
            </Link>
            <Link
              to="/contact"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
