import { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { useIsMobile } from '@/hooks/use-mobile'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${isMobile ? 'pt-4 pb-8' : 'pt-8 pb-16'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
