import { ReactNode, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { DevTools } from '@/components/dev'
import { useIsMobile } from '@/hooks/use-mobile'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile()
  const [devToolsOpen, setDevToolsOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col safe-area-bottom">
      <Navbar onDevToolsClick={() => setDevToolsOpen(!devToolsOpen)} />
      <main
        className={`flex-1 ${isMobile ? 'pt-20 pb-8' : 'pt-24 pb-16'} safe-area-left safe-area-right safe-area-top`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
      <Footer />

      {/* Developer Tools - Only visible in development mode */}
      <DevTools isOpen={devToolsOpen} onOpenChange={setDevToolsOpen} />
    </div>
  )
}
