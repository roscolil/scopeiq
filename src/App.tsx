import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import Documents from './pages/Documents'
import Projects from './pages/Projects'
import ProjectDetails from './pages/ProjectDetails'
import Viewer from './pages/Viewer'
import NotFound from './pages/NotFound'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ProfileSettings from './pages/ProfileSettings'
// import { AuthProvider } from './hooks/use-auth'
import ProfileHome from './pages/ProfileHome'
import { Authenticator } from '@aws-amplify/ui-react'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import '@aws-amplify/ui-react/styles.css'
import VerifyEmail from './pages/VerifyEmail'

Amplify.configure(outputs)

// const queryClient = new QueryClient()

const App = () => (
  <>
    {/* <QueryClientProvider client={queryClient}> */}
    <TooltipProvider>
      {/* <AuthProvider> */}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<NotFound />} />
          <Route
            path="/*"
            element={
              <Authenticator>
                {({ signOut, user }) => (
                  <Routes>
                    <Route path=":companyId" element={<ProfileHome />} />
                    <Route path=":companyId/projects" element={<Projects />} />
                    <Route
                      path=":companyId/projects/:projectId"
                      element={<ProjectDetails />}
                    />
                    <Route
                      path=":companyId/projects/:projectId/documents"
                      element={<Documents />}
                    />
                    <Route
                      path=":companyId/projects/:projectId/:documentId"
                      element={<Viewer />}
                    />
                    <Route
                      path=":companyId/settings"
                      element={<ProfileSettings />}
                    />
                  </Routes>
                )}
              </Authenticator>
            }
          />
        </Routes>
      </BrowserRouter>
      {/* </AuthProvider> */}
    </TooltipProvider>
    {/* </QueryClientProvider> */}
  </>
)

export default App
