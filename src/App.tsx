import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { AuthProvider } from './hooks/aws-auth'
import AuthenticatedLayout from './pages/AuthenticatedLayout'
import Pricing from './pages/Pricing'
import Migration from './pages/Migration'

Amplify.configure(outputs)

// const queryClient = new QueryClient()

const App = () => (
  <>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth">
              <Route path="signin" element={<SignIn />} />
              <Route path="signup" element={<SignUp />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="verify-email" element={<VerifyEmail />} />
            </Route>
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/migration" element={<Migration />} />

            {/* Authenticated routes */}
            <Route element={<AuthenticatedLayout />}>
              {/* Company dashboard */}
              <Route path="/:companyId">
                <Route index element={<ProfileHome />} />
                <Route path="settings" element={<ProfileSettings />} />

                {/* All documents view */}
                <Route path="documents" element={<Documents />} />

                {/* Direct project routes */}
                <Route path=":projectId">
                  <Route index element={<ProjectDetails />} />
                  {/* Direct document routes */}
                  <Route path=":documentId" element={<Viewer />} />
                  {/* Documents listing for specific project */}
                  <Route path="documents" element={<Documents />} />
                </Route>

                {/* Projects index still needed */}
                <Route path="projects" element={<Projects />} />
              </Route>
            </Route>

            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </>
)

export default App
