import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  FilePlus,
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

export const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, signOut: authSignOut } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Extract company ID from user attributes
  const companyId = (user?.['custom:Company'] || user?.company || null) as
    | string
    | null

  const handleSignOut = async () => {
    setShowLogoutModal(false)
    await authSignOut() // Use the auth context sign out method
    navigate('/signin')
  }

  const menuItems = [
    {
      name: 'Home',
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
  ]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-transparent backdrop-blur-md">
      <div className="container-2xl h-16 flex items-center justify-between">
        {/* Left side: Logo and menu items */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="font-bold text-xl flex items-center gap-3 text-slate-800 hover:text-primary transition-colors"
          >
            <div className="relative">
              <FilePlus className="h-6 w-6 text-primary" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full opacity-80" />
            </div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ScopeIQ
            </span>
          </Link>
          {/* Show menu items on desktop if authenticated */}
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated &&
              menuItems.map(item => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-primary bg-white/20 shadow-soft backdrop-blur-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/10'
                  }`}
                >
                  {item.name}
                </Link>
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
                className="md:hidden h-10 w-10"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-md border-white/20"
            >
              <nav className="flex flex-col gap-2 mt-8">
                {isAuthenticated &&
                  menuItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-primary text-white shadow-medium'
                          : 'text-slate-800 hover:text-slate-900 hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}

                {isAuthenticated ? (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Link
                      to={
                        companyId
                          ? `/${companyId.toLowerCase()}/settings`
                          : '/settings'
                      }
                      className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(`/${companyId?.toLowerCase()}/settings`) ||
                        isActive('/settings')
                          ? 'bg-primary/10 text-primary shadow-soft backdrop-blur-sm'
                          : 'text-slate-800 hover:text-slate-900 hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start mt-2 text-slate-800 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setShowLogoutModal(true)}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    className={`flex items-center py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive('/signin')
                        ? 'bg-primary text-white shadow-medium'
                        : 'text-slate-800 hover:text-slate-900 hover:bg-primary/10 hover:text-primary'
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
                      className="h-10 w-10 rounded-full hover:bg-white/20 transition-colors"
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
              className="hidden md:flex font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
              asChild
            >
              <Link to="/signin">
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
          <p className="text-muted-foreground">
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
