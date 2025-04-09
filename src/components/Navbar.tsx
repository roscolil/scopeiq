
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FilePlus, FolderOpen, Home, Menu, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Navbar = () => {
  const location = useLocation();
  
  const menuItems = [
    { name: "Home", path: "/", icon: <Home className="w-5 h-5 mr-2" /> },
    { name: "Documents", path: "/documents", icon: <FolderOpen className="w-5 h-5 mr-2" /> },
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mobile-container h-14 flex items-center justify-between">
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
              </nav>
            </SheetContent>
          </Sheet>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">User account</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
