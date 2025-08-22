import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { Spinner } from '@/components/shared/Spinner'
import { AuthProvider } from './hooks/aws-auth'
import {
  prefetchOnIdle,
  cleanupPrefetchObserver,
} from '@/utils/performance/route-prefetch'
import { PageHeaderSkeleton } from './components/skeletons'

// Eagerly load critical components
import Index from './pages/Index'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import AuthenticatedLayout from './pages/AuthenticatedLayout'
import Dashboard from './pages/Dashboard' // Load Dashboard eagerly

// Lazy load secondary pages
const Documents = lazy(() => import('./pages/Documents'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const Viewer = lazy(() => import('./pages/Viewer'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Migration = lazy(() => import('./pages/Migration'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Contact = lazy(() => import('./pages/Contact'))
const CommonTermsManagement = lazy(
  () => import('./pages/CommonTermsManagement'),
)
const AITrainingConsole = lazy(() => import('./pages/AITrainingConsole'))

// Enhanced loading fallback components with skeletons
// const PageLoadingFallback = ({
//   type,
// }: {
//   type?: 'documents' | 'projects' | 'default'
// }) => {
//   switch (type) {
//     case 'documents':
//       return (
//         <div className="container mx-auto p-6 space-y-6">
//           <PageHeaderSkeleton />
//           {/* <DocumentListSkeleton /> */}
//         </div>
//       )
//     case 'projects':
//       return (
//         <div className="container mx-auto p-6 space-y-6">
//           <PageHeaderSkeleton />
//           {/* <ProjectsWithDocumentsSkeleton /> */}
//         </div>
//       )
//     default:
//       return (
//         <div className="flex justify-center items-center h-64">
//           <Spinner />
//         </div>
//       )
//   }
// }

// Enhanced Suspense wrapper with smart fallbacks
const EnhancedSuspense = ({
  children,
  // fallbackType,
}: {
  children: React.ReactNode
  fallbackType?: 'documents' | 'projects' | 'default'
}) => (
  // <Suspense fallback={<PageLoadingFallback type={fallbackType} />}>
  <Suspense>{children}</Suspense>
)

const App = () => {
  useEffect(() => {
    prefetchOnIdle()

    // Add development-specific hot reload handling
    if (process.env.NODE_ENV === 'development') {
      // Handle React Fast Refresh issues
      const handleBeforeUnload = () => {
        // Clear any auth context issues during hot reload
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        cleanupPrefetchObserver()
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }

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
              <Route
                path="/terms"
                element={
                  <EnhancedSuspense>
                    <Terms />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/privacy"
                element={
                  <EnhancedSuspense>
                    <Privacy />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/contact"
                element={
                  <EnhancedSuspense>
                    <Contact />
                  </EnhancedSuspense>
                }
              />

              <Route
                path="/common-terms"
                element={
                  <EnhancedSuspense>
                    <CommonTermsManagement />
                  </EnhancedSuspense>
                }
              />

              <Route
                path="/ai-training"
                element={
                  <EnhancedSuspense>
                    <AITrainingConsole />
                  </EnhancedSuspense>
                }
              />

              {/* Authenticated routes - lazy loaded with enhanced fallbacks */}
              <Route element={<AuthenticatedLayout />}>
                {/* Company dashboard */}
                <Route path="/:companyId">
                  <Route
                    index
                    element={<Dashboard />} // No Suspense needed for eagerly loaded component
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
