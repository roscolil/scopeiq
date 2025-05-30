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
import { signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'
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

export const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser()
        setIsAuthenticated(true)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const getCompanyId = async () => {
      try {
        const attrs = await fetchUserAttributes()
        console.log('attrs :>> ', attrs)
        setCompanyId(attrs['custom:Company'] || attrs.company || null)
      } catch {
        setCompanyId(null)
      }
    }
    getCompanyId()
  }, [])

  const handleSignOut = async () => {
    setShowLogoutModal(false)
    await signOut()
    setIsAuthenticated(false)
    navigate('/signin')
  }

  const menuItems = [
    {
      name: 'Home',
      path: companyId ? `/${companyId}` : '/',
      icon: <Home className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Projects',
      path: companyId ? `/${companyId}/projects` : '/',
      icon: <Folders className="w-5 h-5 mr-2" />,
    },
    {
      name: 'Documents',
      path: companyId ? `/${companyId}/projects/:projectId/documents` : '/',
      icon: <FolderOpen className="w-5 h-5 mr-2" />,
    },
  ]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-2xl h-14 flex items-center justify-between">
        {/* Left side: Logo and menu items */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="font-semibold text-lg flex items-center gap-2 text-primary"
          >
            <FilePlus className="h-5 w-5" />
            <span>ScopeIQ</span>
          </Link>
          {/* Show menu items on desktop if authenticated */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated &&
              menuItems.map(item => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
          </div>
        </div>

        {/* Right side: Sheet menu and user actions */}
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-6">
                {isAuthenticated &&
                  menuItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                        isActive(item.path)
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}

                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                        isActive('/settings')
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="flex items-center py-2 px-3 text-sm font-medium rounded-md"
                      onClick={() => setShowLogoutModal(true)}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link
                    to="/signin"
                    className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                      isActive('/signin')
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {isAuthenticated ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      asChild
                    >
                      <Link to="/settings">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Settings</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Settings</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowLogoutModal(true)}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="sr-only">Sign Out</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Sign Out</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              asChild
            >
              <Link to="/signin">
                <LogIn className="h-4 w-4 mr-1" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to sign out?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
