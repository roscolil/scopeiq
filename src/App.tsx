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
import { PageHeaderSkeleton } from './components/shared/skeletons'

// Eagerly load critical components
import HomePage from '@/pages/dashboard/IndexPage'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import AuthenticatedLayout from './pages/core/AuthenticatedLayout'
import Dashboard from './pages/dashboard/Dashboard' // Load Dashboard eagerly

// Lazy load secondary pages
const Documents = lazy(() => import('./pages/documents/Documents'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const ProjectDetails = lazy(() => import('./pages/projects/ProjectDetails'))
const Viewer = lazy(() => import('./pages/documents/Viewer'))
const NotFound = lazy(() => import('./pages/core/NotFound'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ProfileSettings = lazy(() => import('./pages/dashboard/ProfileSettings'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const Pricing = lazy(() => import('./pages/dashboard/Pricing'))
const Migration = lazy(() => import('./pages/admin/Migration'))
const Terms = lazy(() => import('./pages/legal/Terms'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const Contact = lazy(() => import('./pages/legal/Contact'))
const OurTeam = lazy(() => import('./pages/legal/OurTeam'))
const WorkWithUs = lazy(() => import('./pages/legal/WorkWithUs'))
const CommonTermsManagement = lazy(
  () => import('./pages/admin/CommonTermsManagement'),
)
const AITrainingConsole = lazy(() => import('./pages/admin/AITrainingConsole'))

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
              <Route path="/" element={<HomePage />} />
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
                path="/our-team"
                element={
                  <EnhancedSuspense>
                    <OurTeam />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/work-with-us"
                element={
                  <EnhancedSuspense>
                    <WorkWithUs />
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
