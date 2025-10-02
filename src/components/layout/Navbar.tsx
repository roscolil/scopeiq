import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  HardHat,
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
      path: companyId ? `/${encodeURIComponent(companyId.toLowerCase())}` : '/',
      icon: <Home className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Projects',
      path: companyId
        ? `/${encodeURIComponent(companyId.toLowerCase())}/projects`
        : '/',
      icon: <Folders className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Documents',
      path: companyId
        ? `/${encodeURIComponent(companyId.toLowerCase())}/documents`
        : '/',
      icon: <FolderOpen className="w-5 h-5 mr-2" />,
    },
    // Admin routes
    // ...(isAuthorized?.({ requireRole: 'Admin' })
    //   ? [
    //       {
    //         name: 'Admin',
    //         path: '/admin',
    //         icon: <Settings className="w-5 h-5 mr-2" />,
    //       },
    //       {
    //         name: 'Health Console',
    //         path: '/health',
    //         icon: <HardHat className="w-5 h-5 mr-2" />,
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
                ? 'text-gray-900 hover:text-emerald-600'
                : 'text-white hover:text-emerald-400'
            }`}
          >
            <div className="relative">
              <HardHat className="h-6 w-6 text-emerald-400" />
              {/* <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full opacity-80" /> */}
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent text-2xl">
              Jacq of All Trades
            </span>
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
                        ? 'text-emerald-600 bg-emerald-50 shadow-soft backdrop-blur-sm'
                        : 'text-emerald-400 bg-white/20 shadow-soft backdrop-blur-sm'
                      : scrolled
                        ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
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
                    ? 'text-gray-700 hover:text-emerald-600 hover:bg-gray-100 active:bg-gray-200'
                    : 'text-white hover:text-emerald-400 hover:bg-white/10 active:bg-white/20'
                }`}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-black/90 backdrop-blur-md border-white/20"
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
                          ? 'bg-emerald-500 text-white shadow-medium'
                          : 'text-gray-200 hover:text-emerald-300 hover:bg-emerald-500/20'
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
                          ? `/${encodeURIComponent(companyId.toLowerCase())}/settings`
                          : '/settings'
                      }
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(
                          `/${encodeURIComponent(companyId?.toLowerCase() || '')}/settings`,
                        ) || isActive('/settings')
                          ? 'bg-emerald-500/20 text-emerald-300 shadow-soft backdrop-blur-sm'
                          : 'text-gray-200 hover:text-emerald-300 hover:bg-emerald-500/20'
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
                        ? 'bg-emerald-500 text-white shadow-medium'
                        : 'text-gray-200 hover:text-emerald-300 hover:bg-emerald-500/20'
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
                          ? 'hover:bg-gray-100 text-gray-700 hover:text-emerald-600'
                          : 'hover:bg-white/20 text-white hover:text-emerald-400'
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
              className="hidden md:flex font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 shadow-soft"
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
          <p className="text-gray-400">
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
