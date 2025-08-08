import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes,
  resendSignUpCode,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  updateUserAttributes,
} from 'aws-amplify/auth'
import { userService } from '@/services/user'
import { prefetchForAuthenticatedUser } from '@/utils/route-prefetch'
import { prefetchUserData } from '@/utils/data-prefetch'

interface User {
  id: string
  email: string
  name?: string
  role?: 'Admin' | 'Owner' | 'User'
  companyId: string
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>
  resendCode: (email: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      // Skip if already initialized to prevent duplicate calls
      if (isInitialized) return

      try {
        // Check for cached auth state first
        const cachedAuthState = sessionStorage.getItem('authState')
        const cachedTimestamp = sessionStorage.getItem('authTimestamp')

        // If we have recent cached data (less than 5 minutes old), use it
        if (cachedAuthState && cachedTimestamp) {
          const age = Date.now() - parseInt(cachedTimestamp)
          if (age < 5 * 60 * 1000) {
            // 5 minutes
            const cachedUser = JSON.parse(cachedAuthState)
            if (cachedUser) {
              setUser(cachedUser)
              setIsLoading(false)
              setIsInitialized(true)

              // Optionally refresh in background
              refreshUserInBackground()
              return
            }
          }
        }

        // Fresh auth check
        const amplifyUser = await getCurrentUser()
        const attrs = await fetchUserAttributes()

        // Try to get user data from DynamoDB
        try {
          const dbUser = await userService.getCurrentDatabaseUser()
          if (dbUser) {
            const userData: User = {
              id: amplifyUser.userId,
              email: attrs.email || '',
              name: attrs.name || '',
              role: dbUser.role,
              companyId: dbUser.companyId,
              ...attrs,
            }
            setUser(userData)

            // Cache the auth state
            sessionStorage.setItem('authState', JSON.stringify(userData))
            sessionStorage.setItem('authTimestamp', Date.now().toString())

            // Prefetch user data and routes for authenticated users
            Promise.allSettled([
              prefetchForAuthenticatedUser(),
              prefetchUserData(userData.companyId),
            ])
              .then(() => {
                console.log('User data and routes prefetched successfully')
              })
              .catch(error => {
                console.warn('Failed to prefetch user data:', error)
              })
          } else {
            // No DynamoDB user found, create one
            const dbUser = await userService.createOrSyncUser()
            const userData: User = {
              id: amplifyUser.userId,
              email: attrs.email || '',
              name: attrs.name || '',
              role: dbUser.role,
              companyId: dbUser.companyId,
              ...attrs,
            }
            setUser(userData)

            // Cache the auth state
            sessionStorage.setItem('authState', JSON.stringify(userData))
            sessionStorage.setItem('authTimestamp', Date.now().toString())
          }
        } catch (dbError) {
          console.warn('Failed to load DynamoDB user data:', dbError)
          // For backward compatibility, create basic user data
          const userData: User = {
            id: amplifyUser.userId,
            email: attrs.email || '',
            name: attrs.name || '',
            companyId: 'default', // Fallback company ID
            ...attrs,
          }
          setUser(userData)

          // Cache the auth state
          sessionStorage.setItem('authState', JSON.stringify(userData))
          sessionStorage.setItem('authTimestamp', Date.now().toString())
        }
      } catch {
        setUser(null)
        // Clear any stale cache
        sessionStorage.removeItem('authState')
        sessionStorage.removeItem('authTimestamp')
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    const refreshUserInBackground = async () => {
      try {
        const amplifyUser = await getCurrentUser()
        const attrs = await fetchUserAttributes()

        // Try to get user data from DynamoDB
        const dbUser = await userService.getCurrentDatabaseUser()
        if (dbUser) {
          const userData: User = {
            id: amplifyUser.userId,
            email: attrs.email || '',
            name: attrs.name || '',
            role: dbUser.role,
            companyId: dbUser.companyId,
            ...attrs,
          }
          setUser(userData)

          // Update cache
          sessionStorage.setItem('authState', JSON.stringify(userData))
          sessionStorage.setItem('authTimestamp', Date.now().toString())
        }
      } catch {
        // Silent failure for background refresh
      }
    }

    loadUser()
  }, [isInitialized])

  const signIn = async (email: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      console.log('Attempting sign in for:', email)

      // Clear any existing auth state first
      sessionStorage.removeItem('authState')
      sessionStorage.removeItem('authTimestamp')

      // First, try to sign in
      const result = await amplifySignIn({ username: email, password })
      console.log('Sign in result:', result)

      // Check if the sign in was successful
      if (result.isSignedIn) {
        console.log('Sign in successful, loading full user data')

        // Get full user data including DynamoDB sync
        const amplifyUser = await getCurrentUser()
        const attrs = await fetchUserAttributes()

        // Sync with DynamoDB and get role/company info
        const dbUser = await userService.createOrSyncUser()

        const fullUserData: User = {
          id: amplifyUser.userId,
          email: attrs.email || email,
          name: attrs.given_name || attrs.name || email.split('@')[0],
          role: dbUser.role,
          companyId: dbUser.companyId,
          ...attrs,
        }

        setUser(fullUserData)
        sessionStorage.setItem('authState', JSON.stringify(fullUserData))
        sessionStorage.setItem('authTimestamp', Date.now().toString())

        console.log('Full user data loaded with DynamoDB sync:', fullUserData)
        return fullUserData
      } else {
        console.log('Sign in not complete, next step:', result.nextStep)

        // Handle different next steps
        if (
          result.nextStep &&
          result.nextStep.signInStep === 'CONFIRM_SIGN_UP'
        ) {
          throw new Error('UNVERIFIED_EMAIL')
        } else if (result.nextStep) {
          throw new Error(
            `Sign in requires additional steps: ${result.nextStep.signInStep}`,
          )
        } else {
          throw new Error(
            'Sign in requires additional steps. Please check your email for verification.',
          )
        }
      }
    } catch (error: unknown) {
      console.error('Sign in error:', error)
      setUser(null)
      // Clear any stale cache
      sessionStorage.removeItem('authState')
      sessionStorage.removeItem('authTimestamp')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      await amplifySignUp({
        username: email,
        password,
        options: { userAttributes: { email, name } },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await amplifySignOut()
      setUser(null)

      // Clear cache
      sessionStorage.removeItem('authState')
      sessionStorage.removeItem('authTimestamp')
      localStorage.removeItem('hasWelcomed') // Clear welcome flag too
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)
    await resetPassword(email)
    setIsLoading(false)
  }

  const confirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    setIsLoading(true)
    await confirmResetPassword(email, code, newPassword)
    setIsLoading(false)
  }
  const resendCode = async (email: string) => {
    await resendSignUpCode({ username: email })
  }

  const confirmSignUpFn = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code })
  }

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return
    await updateUserAttributes({
      userAttributes: data as Partial<Record<string, string>>,
    })
    const attrs = await fetchUserAttributes()
    const updatedUser: User = {
      ...user,
      ...attrs,
      companyId: user.companyId, // Preserve companyId
    }
    setUser(updatedUser)

    // Update cache
    sessionStorage.setItem('authState', JSON.stringify(updatedUser))
    sessionStorage.setItem('authTimestamp', Date.now().toString())
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        confirmResetPassword,
        resendCode,
        confirmSignUp: confirmSignUpFn,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
