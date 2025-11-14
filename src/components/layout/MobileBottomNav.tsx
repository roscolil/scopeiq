import { useNavigate, useLocation } from 'react-router-dom'
import { Home, FolderOpen, Library, Sparkles } from 'lucide-react'
import { routes } from '@/utils/ui/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/aws-auth'

interface TabItem {
  id: string
  label: string
  icon: typeof Home
  getPath: (companyId: string) => string
  matchPattern: (pathname: string, companyId: string) => boolean
}

const tabs: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    getPath: companyId => routes.company.home(companyId),
    matchPattern: (pathname, companyId) => pathname === `/${companyId}`,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderOpen,
    getPath: companyId => routes.company.projects.list(companyId),
    matchPattern: (pathname, companyId) =>
      pathname === `/${companyId}/projects` ||
      (pathname.startsWith(`/${companyId}/`) &&
        pathname !== `/${companyId}` &&
        pathname !== `/${companyId}/documents`),
  },
  {
    id: 'library',
    label: 'Library',
    icon: Library,
    getPath: companyId => routes.company.documents.all(companyId),
    matchPattern: (pathname, companyId) =>
      pathname === `/${companyId}/documents`,
  },
  {
    id: 'ai',
    label: 'AI',
    icon: Sparkles,
    getPath: () => '/ai',
    matchPattern: pathname => pathname.startsWith('/ai'),
  },
]

export const MobileBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Don't render if user is not authenticated or doesn't have a company
  if (!user?.companyId) return null

  const companyId = user.companyId

  const isActive = (tab: TabItem) => {
    return tab.matchPattern(location.pathname, companyId)
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
        <div className="grid grid-cols-4 h-16">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = isActive(tab)

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.getPath(companyId))}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-foreground/50 hover:text-foreground/80',
                )}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
