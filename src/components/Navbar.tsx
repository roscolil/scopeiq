
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FilePlus, FolderOpen, Home, Menu, User, Folders, LogIn } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
// import { fetchAuthSession } from 'aws-amplify/auth';

// const session = await fetchAuthSession();

// console.log("id token", session.tokens.idToken)
// console.log("access token", session.tokens.accessToken)

export const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isSmallScreen = isMobile || isTablet;
  
  const menuItems = [
    { name: "Home", path: "/", icon: <Home className="w-5 h-5 mr-2" /> },
    { name: "Projects", path: "/projects", icon: <Folders className="w-5 h-5 mr-2" /> },
    { name: "Documents", path: "/documents", icon: <FolderOpen className="w-5 h-5 mr-2" /> },
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Mock authentication status - replace with actual auth state when Supabase is connected
  const isAuthenticated = false;
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-2xl h-14 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="font-semibold text-lg flex items-center gap-2 text-primary">
            <FilePlus className="h-5 w-5" />
            <span>ScopeIQ</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-6">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                      isActive(item.path)
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
                
                {isAuthenticated ? (
                  <Link
                    to="/profile"
                    className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                      isActive("/profile")
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <User className="w-5 h-5 mr-2" />
                    Profile
                  </Link>
                ) : (
                  <Link
                    to="/signin"
                    className={`flex items-center py-2 px-3 text-sm font-medium rounded-md ${
                      isActive("/signin")
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
            <Button variant="ghost" size="icon" className="rounded-full" asChild>
              <Link to="/profile">
                <User className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="hidden md:flex" asChild>
              <Link to="/signin">
                <LogIn className="h-4 w-4 mr-1" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
