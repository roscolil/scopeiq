import React from 'react'
import { Navbar } from './Navbar'
import { useIsMobile } from '@/hooks/use-mobile'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${isMobile ? 'py-4' : 'py-8'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
