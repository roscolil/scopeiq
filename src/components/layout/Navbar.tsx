import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Home,
  Menu,
  Folders,
  LogIn,
  LogOut,
  Settings,
  Crown,
  Zap,
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
import {
  getUserSubscriptionTier,
  getPlanLimits,
} from '@/utils/subscription/plan-limits'

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

  // Get user's subscription tier
  const subscriptionTier = getUserSubscriptionTier(user)
  const planLimits = getPlanLimits(subscriptionTier)

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

  const getTierBadge = () => {
    const tierConfig = {
      starter: {
        label: 'Starter',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: null,
      },
      professional: {
        label: 'Pro',
        color: 'bg-primary/10 text-primary border-primary/30',
        icon: <Zap className="h-3 w-3 mr-1" />,
      },
      enterprise: {
        label: 'Enterprise',
        color:
          'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-300',
        icon: <Crown className="h-3 w-3 mr-1" />,
      },
    }
    const config = tierConfig[subscriptionTier]
    return (
      <Badge
        variant="outline"
        className={`${config.color} text-xs font-medium`}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-border bg-card/95 backdrop-blur-md shadow-sm'
          : 'border-border/50 bg-background/80 backdrop-blur-md'
      }`}
    >
      <div className="container-2xl h-16 flex items-center justify-between">
        {/* Left side: Logo and menu items */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className={`font-bold text-xl flex items-center gap-3 transition-colors ${
              scrolled
                ? 'text-foreground hover:text-primary'
                : 'text-foreground hover:text-primary'
            }`}
          >
            <div className="relative">
              <img
                src="/hammer-orange.svg"
                alt="Jack of All Trades"
                className="h-10 w-10"
                draggable={false}
              />
            </div>
            <span className="text-primary text-2xl">Jack of All Trades</span>
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
                      ? 'text-primary bg-primary/10 shadow-sm'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted'
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
                    ? 'text-foreground hover:text-primary hover:bg-muted active:bg-muted/80'
                    : 'text-foreground hover:text-primary hover:bg-muted active:bg-muted/80'
                }`}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-card border-border"
            >
              {isAuthenticated && (
                <div className="mt-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-xs text-foreground/60 font-medium">
                      Current Plan
                    </span>
                    {getTierBadge()}
                  </div>
                </div>
              )}
              <nav className="flex flex-col gap-2 mt-4">
                {isAuthenticated &&
                  menuItems.map(item => (
                    <PrefetchCompanyLink
                      key={item.path}
                      companyId={companyId || ''}
                      to={item.path}
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/80 hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </PrefetchCompanyLink>
                  ))}

                {isAuthenticated ? (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Link
                      to={
                        // companyId
                        // ? `/${companyId.toLowerCase()}/pricing`
                        '/pricing'
                      }
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(`/${companyId?.toLowerCase()}/pricing`) ||
                        isActive('/pricing')
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-foreground/80 hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Crown className="w-5 h-5 mr-3" />
                      Upgrade Plan
                    </Link>
                    <Link
                      to={
                        companyId
                          ? `/${companyId.toLowerCase()}/settings`
                          : '/settings'
                      }
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(`/${companyId?.toLowerCase()}/settings`) ||
                        isActive('/settings')
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-foreground/80 hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted'
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
              <Link
                to={
                  companyId ? `/${companyId.toLowerCase()}/pricing` : '/pricing'
                }
                className="mr-1"
              >
                {getTierBadge()}
              </Link>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-full transition-colors ${
                        scrolled
                          ? 'hover:bg-muted text-foreground hover:text-destructive'
                          : 'hover:bg-muted text-foreground hover:text-destructive'
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
              className="hidden md:flex font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
