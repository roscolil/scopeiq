
import React from "react";
import { FilePlus } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export const AuthLayout = ({ children, title, description }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-secondary/20">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <FilePlus className="h-6 w-6" />
            <span className="text-xl font-bold">ScopeIQ</span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-foreground">{title}</h2>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-sm border">
          {children}
        </div>
      </div>
    </div>
  );
};
