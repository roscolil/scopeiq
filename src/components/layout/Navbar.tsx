import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  Home,
  Menu,
  Folders,
  LogIn,
  LogOut,
  Settings,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/aws-auth'
import { useAuthorization } from '@/hooks/auth-utils'
import { PrefetchCompanyLink } from '@/components/shared/PrefetchLinks'

export const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, signOut: authSignOut } = useAuth()
  interface AuthorizationSubset {
    userRole: string
    isAuthorized: (arg: { requireRole?: string | string[] }) => boolean
  }
  const { userRole, isAuthorized } = useAuthorization() as AuthorizationSubset
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll position to adjust navbar colors
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 100) // Change colors after scrolling 100px
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Extract company ID from user object
  const companyId = user?.companyId

  const handleSignOut = async () => {
    setShowLogoutModal(false)
    await authSignOut() // Use the auth context sign out method
    navigate('/auth/signin')
  }

  const menuItems = [
    {
      name: 'Dashboard',
      path: companyId ? `/${companyId.toLowerCase()}` : '/',
      icon: <Home className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Projects',
      path: companyId ? `/${companyId.toLowerCase()}/projects` : '/',
      icon: <Folders className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Documents',
      path: companyId ? `/${companyId.toLowerCase()}/documents` : '/',
      icon: <FolderOpen className="w-5 h-5 mr-2" />,
    },
    // Admin route hidden for now
    // ...(isAuthorized?.({ requireRole: 'Admin' })
    //   ? [
    //       {
    //         name: 'Admin',
    //         path: '/admin',
    //         icon: <Settings className="w-5 h-5 mr-2" />,
    //       },
    //     ]
    //   : []),
  ]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-gray-200 bg-white/95 backdrop-blur-md shadow-sm'
          : 'border-white/20 bg-transparent backdrop-blur-md'
      }`}
    >
      <div className="container-2xl h-16 flex items-center justify-between">
        {/* Left side: Logo and menu items */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className={`font-bold text-xl flex items-center gap-3 transition-colors ${
              scrolled
                ? 'text-gray-900 hover:text-brand-blue'
                : 'text-white hover:text-brand-yellow'
            }`}
          >
            <div className="relative">
              <img
                src={
                  scrolled
                    ? '/images/New Jack Logo clear background black writing -Mar 26- using Logo Creator.png'
                    : '/images/New Jack Logo clear background and no tag line white text -Mar 26- using Logo Creator.png'
                }
                alt="JACK by Exelion"
                className="h-10 w-auto max-w-[120px]"
                draggable={false}
              />
            </div>
          </Link>
          {/* Show menu items on desktop if authenticated */}
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated &&
              menuItems.map(item => (
                <PrefetchCompanyLink
                  key={item.name}
                  companyId={companyId || ''}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? scrolled
                        ? 'text-brand-blue bg-brand-blue/10 shadow-soft backdrop-blur-sm'
                        : 'text-brand-yellow bg-white/20 shadow-soft backdrop-blur-sm'
                      : scrolled
                        ? 'text-gray-700 hover:text-brand-blue hover:bg-gray-100'
                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.name}
                </PrefetchCompanyLink>
              ))}
          </nav>
        </div>

        {/* Right side: Sheet menu and user actions */}
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden h-12 w-12 touch-manipulation transition-colors ${
                  scrolled
                    ? 'text-gray-700 hover:text-brand-blue hover:bg-gray-100 active:bg-gray-200'
                    : 'text-white hover:text-brand-yellow hover:bg-white/10 active:bg-white/20'
                }`}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-brand-navy/95 backdrop-blur-md border-brand-blue/20"
            >
              <nav className="flex flex-col gap-2 mt-8">
                {isAuthenticated &&
                  menuItems.map(item => (
                    <PrefetchCompanyLink
                      key={item.path}
                      companyId={companyId || ''}
                      to={item.path}
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-brand-blue text-white shadow-medium'
                          : 'text-gray-200 hover:text-brand-yellow hover:bg-brand-blue/20'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </PrefetchCompanyLink>
                  ))}

                {isAuthenticated ? (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <Link
                      to={
                        companyId
                          ? `/${companyId.toLowerCase()}/settings`
                          : '/settings'
                      }
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(`/${companyId?.toLowerCase()}/settings`) ||
                        isActive('/settings')
                          ? 'bg-brand-blue/20 text-brand-yellow shadow-soft backdrop-blur-sm'
                          : 'text-gray-200 hover:text-brand-yellow hover:bg-brand-blue/20'
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start mt-2 text-gray-200 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => setShowLogoutModal(true)}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link
                    to="/auth/signin"
                    className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive('/auth/signin')
                        ? 'bg-brand-blue text-white shadow-medium'
                        : 'text-gray-200 hover:text-brand-yellow hover:bg-brand-blue/20'
                    }`}
                  >
                    <LogIn className="w-5 h-5 mr-3" />
                    Sign In
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-full transition-colors ${
                        scrolled
                          ? 'hover:bg-gray-100 text-gray-700 hover:text-brand-blue'
                          : 'hover:bg-white/20 text-white hover:text-brand-yellow'
                      }`}
                      onClick={() => setShowLogoutModal(true)}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="sr-only">Sign Out</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Sign Out</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="hidden md:flex font-medium bg-gradient-to-r from-brand-blue to-brand-blue-light hover:from-brand-blue-dark hover:to-brand-blue text-white border-0 shadow-brand"
              asChild
            >
              <Link to="/auth/signin">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Sign out
            </DialogTitle>
          </DialogHeader>
          <p className="text-foreground/80 text-base">
            Are you sure you want to sign out of your account?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              className="hover:bg-secondary/80"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="bg-destructive hover:bg-destructive/90 shadow-soft"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
