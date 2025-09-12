import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CompanyGuard from '@/components/routing/CompanyGuard'
import ProjectGuard from '@/components/routing/ProjectGuard'
import DocumentGuard from '@/components/routing/DocumentGuard'
import { Suspense, lazy, useEffect } from 'react'
import { PageLoader } from '@/components/shared/PageLoader'
import { AuthProvider } from './hooks/aws-auth'
import {
  prefetchOnIdle,
  cleanupPrefetchObserver,
} from '@/utils/performance/route-prefetch'

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

// Enhanced loading fallback components with modern design
const PageLoadingFallback = ({
  type,
}: {
  type?: 'documents' | 'projects' | 'profile' | 'default'
}) => {
  return <PageLoader type={type} />
}

// Enhanced Suspense wrapper with smart fallbacks
const EnhancedSuspense = ({
  children,
  fallbackType,
}: {
  children: React.ReactNode
  fallbackType?: 'documents' | 'projects' | 'profile' | 'default'
}) => (
  <Suspense fallback={<PageLoadingFallback type={fallbackType} />}>
    {children}
  </Suspense>
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
                    <EnhancedSuspense fallbackType="default">
                      <ForgotPassword />
                    </EnhancedSuspense>
                  }
                />
                <Route
                  path="verify-email"
                  element={
                    <EnhancedSuspense fallbackType="default">
                      <VerifyEmail />
                    </EnhancedSuspense>
                  }
                />
              </Route>
              <Route
                path="/pricing"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <Pricing />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/migration"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <Migration />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/terms"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <Terms />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/privacy"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <Privacy />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/contact"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <Contact />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/our-team"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <OurTeam />
                  </EnhancedSuspense>
                }
              />
              <Route
                path="/work-with-us"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <WorkWithUs />
                  </EnhancedSuspense>
                }
              />

              <Route
                path="/common-terms"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <CommonTermsManagement />
                  </EnhancedSuspense>
                }
              />

              <Route
                path="/ai-training"
                element={
                  <EnhancedSuspense fallbackType="default">
                    <AITrainingConsole />
                  </EnhancedSuspense>
                }
              />

              {/* Authenticated routes - company scoped */}
              <Route element={<AuthenticatedLayout />}>
                <Route path=":companyId" element={<CompanyGuard />}>
                  <Route index element={<Dashboard />} />
                  <Route
                    path="settings"
                    element={
                      <EnhancedSuspense fallbackType="profile">
                        <ProfileSettings />
                      </EnhancedSuspense>
                    }
                  />
                  <Route
                    path="documents"
                    element={
                      <EnhancedSuspense fallbackType="documents">
                        <Documents />
                      </EnhancedSuspense>
                    }
                  />
                  <Route path=":projectId" element={<ProjectGuard />}>
                    <Route
                      index
                      element={
                        <EnhancedSuspense fallbackType="projects">
                          <ProjectDetails />
                        </EnhancedSuspense>
                      }
                    />
                    <Route path=":documentId" element={<DocumentGuard />}>
                      {/* Direct element inside guard for clarity */}
                      <Route
                        index
                        element={
                          <EnhancedSuspense fallbackType="documents">
                            <Viewer />
                          </EnhancedSuspense>
                        }
                      />
                    </Route>
                    <Route
                      path="documents"
                      element={
                        <EnhancedSuspense fallbackType="documents">
                          <Documents />
                        </EnhancedSuspense>
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <EnhancedSuspense fallbackType="default">
                          <NotFound />
                        </EnhancedSuspense>
                      }
                    />
                  </Route>
                  <Route
                    path="projects"
                    element={
                      <EnhancedSuspense fallbackType="projects">
                        <Projects />
                      </EnhancedSuspense>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <EnhancedSuspense fallbackType="default">
                        <NotFound />
                      </EnhancedSuspense>
                    }
                  />
                </Route>
              </Route>

              {/* Catch-all route for 404 */}
              <Route
                path="*"
                element={
                  <EnhancedSuspense fallbackType="default">
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
