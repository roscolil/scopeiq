import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { Spinner } from '@/components/Spinner'
import { AuthProvider } from './hooks/aws-auth'
import {
  prefetchForAuthenticatedUser,
  prefetchOnIdle,
  cleanupPrefetchObserver,
} from './utils/route-prefetch'
import {
  DocumentListSkeleton,
  PageHeaderSkeleton,
  ProjectsWithDocumentsSkeleton,
} from './components/skeletons'

// Eagerly load critical components
import Index from './pages/Index'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import AuthenticatedLayout from './pages/AuthenticatedLayout'

// Lazy load secondary pages with prefetching
const Documents = lazy(() => import('./pages/Documents'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const Viewer = lazy(() => import('./pages/Viewer'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Migration = lazy(() => import('./pages/Migration'))

// Enhanced loading fallback components with skeletons
const PageLoadingFallback = ({
  type,
}: {
  type?: 'documents' | 'projects' | 'default'
}) => {
  switch (type) {
    case 'documents':
      return (
        <div className="container mx-auto p-6 space-y-6">
          <PageHeaderSkeleton />
          <DocumentListSkeleton />
        </div>
      )
    case 'projects':
      return (
        <div className="container mx-auto p-6 space-y-6">
          <PageHeaderSkeleton />
          <ProjectsWithDocumentsSkeleton />
        </div>
      )
    default:
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )
  }
}

// Enhanced Suspense wrapper with smart fallbacks
const EnhancedSuspense = ({
  children,
  fallbackType,
}: {
  children: React.ReactNode
  fallbackType?: 'documents' | 'projects' | 'default'
}) => (
  <Suspense fallback={<PageLoadingFallback type={fallbackType} />}>
    {children}
  </Suspense>
)

const App = () => {
  useEffect(() => {
    // Initialize prefetching strategies
    prefetchOnIdle()

    // Cleanup on unmount
    return () => {
      cleanupPrefetchObserver()
    }
  }, [])

  return (
    <>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes - eagerly loaded */}
              <Route path="/" element={<Index />} />
              <Route path="/auth">
                <Route path="signin" element={<SignIn />} />
                <Route path="signup" element={<SignUp />} />
                <Route
                  path="forgot-password"
                  element={
                    <EnhancedSuspense>
                      <ForgotPassword />
                    </EnhancedSuspense>
                  }
                />
                <Route
                  path="verify-email"
                  element={
                    <EnhancedSuspense>
                      <VerifyEmail />
                    </EnhancedSuspense>
                  }
                />
              </Route>
              <Route
                path="/pricing"
                element={
                  <EnhancedSuspense>
                    <Pricing />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/migration"
                element={
                  <EnhancedSuspense>
                    <Migration />
                  </EnhancedSuspense>
                }
              />

              {/* Authenticated routes - lazy loaded with enhanced fallbacks */}
              <Route element={<AuthenticatedLayout />}>
                {/* Company dashboard */}
                <Route path="/:companyId">
                  <Route
                    index
                    element={
                      <EnhancedSuspense fallbackType="projects">
                        <Dashboard />
                      </EnhancedSuspense>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <EnhancedSuspense>
                        <ProfileSettings />
                      </EnhancedSuspense>
                    }
                  />

                  {/* All documents view */}
                  <Route
                    path="documents"
                    element={
                      <EnhancedSuspense fallbackType="documents">
                        <Documents />
                      </EnhancedSuspense>
                    }
                  />

                  {/* Direct project routes */}
                  <Route path=":projectId">
                    <Route
                      index
                      element={
                        <EnhancedSuspense fallbackType="projects">
                          <ProjectDetails />
                        </EnhancedSuspense>
                      }
                    />
                    {/* Direct document routes */}
                    <Route
                      path=":documentId"
                      element={
                        <EnhancedSuspense fallbackType="documents">
                          <Viewer />
                        </EnhancedSuspense>
                      }
                    />
                    {/* Documents listing for specific project */}
                    <Route
                      path="documents"
                      element={
                        <EnhancedSuspense fallbackType="documents">
                          <Documents />
                        </EnhancedSuspense>
                      }
                    />
                  </Route>

                  {/* Projects index still needed */}
                  <Route
                    path="projects"
                    element={
                      <EnhancedSuspense fallbackType="projects">
                        <Projects />
                      </EnhancedSuspense>
                    }
                  />
                </Route>
              </Route>

              {/* Catch-all route for 404 */}
              <Route
                path="*"
                element={
                  <EnhancedSuspense>
                    <NotFound />
                  </EnhancedSuspense>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </>
  )
}

export default App
