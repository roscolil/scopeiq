import React from 'react'
import { Link } from 'react-router-dom'
import { FilePlus } from 'lucide-react'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-6 md:py-8 bg-background">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FilePlus className="h-4 w-4" />
          <span className="font-semibold">ScopeIQ</span>
          <span className="text-xs">© {currentYear}</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/contact"
            className="hover:text-foreground transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}
