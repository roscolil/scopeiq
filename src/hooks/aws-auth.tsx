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
import { userService } from '@/services/auth/user'
import { prefetchForAuthenticatedUser } from '@/utils/performance/route-prefetch'
import { prefetchUserData } from '@/utils/data/data-prefetch'

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
  const [isLoading, setIsLoading] = useState(true) // Start with true to prevent premature redirect
  const [isInitialized, setIsInitialized] = useState(false)

  // Helper function to store auth state persistently
  const storeAuthState = (userData: User) => {
    const userJson = JSON.stringify(userData)
    const timestamp = Date.now().toString()

    // Store in both session storage (current session) and localStorage (persistent)
    sessionStorage.setItem('authState', userJson)
    sessionStorage.setItem('authTimestamp', timestamp)
    localStorage.setItem('authState', userJson)
    localStorage.setItem('authTimestamp', timestamp)
  }

  // Helper function to clear auth state
  const clearAuthState = () => {
    sessionStorage.removeItem('authState')
    sessionStorage.removeItem('authTimestamp')
    localStorage.removeItem('authState')
    localStorage.removeItem('authTimestamp')
  }

  // Quick initial auth check to reduce perceived loading time
  useEffect(() => {
    const quickAuthCheck = async () => {
      const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)

      // Quick cache check first (sessionStorage)
      const cachedAuthState = sessionStorage.getItem('authState')
      const cachedTimestamp = sessionStorage.getItem('authTimestamp')

      if (isMobile) {
        console.log('📱 Mobile auth check:', {
          hasCachedAuth: !!cachedAuthState,
          cachedTimestamp,
          userAgent: navigator.userAgent,
        })
      }

      if (cachedAuthState && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp)

        if (age < 24 * 60 * 60 * 1000) {
          // 24 hours
          try {
            const cachedUser = JSON.parse(cachedAuthState)
            if (cachedUser) {
              setUser(cachedUser)
              setIsLoading(false)
              setIsInitialized(true)
              return // Skip further checks
            }
          } catch {
            // Invalid sessionStorage cache
          }
        }
      }

      // Fallback to localStorage if sessionStorage is empty/expired
      const backupAuthState = localStorage.getItem('authState')
      const backupTimestamp = localStorage.getItem('authTimestamp')

      if (backupAuthState && backupTimestamp) {
        const age = Date.now() - parseInt(backupTimestamp)

        if (age < 24 * 60 * 60 * 1000) {
          // 24 hours
          try {
            const backupUser = JSON.parse(backupAuthState)
            if (backupUser) {
              setUser(backupUser)
              // Restore to sessionStorage too
              sessionStorage.setItem('authState', backupAuthState)
              sessionStorage.setItem('authTimestamp', backupTimestamp)
              setIsLoading(false)
              setIsInitialized(true)
              return // Skip further checks
            }
          } catch {
            // Invalid localStorage backup cache
          }
        }
      }

      // If no valid cache, do a network auth check
      setIsLoading(true)

      try {
        // Use a more generous timeout for the initial check
        const quickTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Quick auth timeout')), 5000) // 5 second timeout
        })

        const quickPromise = Promise.all([
          getCurrentUser(),
          fetchUserAttributes(),
        ])
        const result = await Promise.race([quickPromise, quickTimeout])

        const [amplifyUser, attrs] = result as Awaited<typeof quickPromise>

        // Create minimal user data immediately
        const quickUser: User = {
          id: amplifyUser.userId,
          email: attrs.email || '',
          name:
            attrs.given_name || attrs.name || attrs.email?.split('@')[0] || '',
          role: 'User', // Default role
          companyId: 'default', // Will be updated
          ...attrs,
        }

        setUser(quickUser)
        setIsLoading(false)
        setIsInitialized(true)

        // Store auth state persistently
        storeAuthState(quickUser)

        // Sync with DynamoDB in background without affecting UI
        userService
          .getCurrentDatabaseUser()
          .then(dbUser => {
            if (dbUser) {
              const fullUser: User = {
                ...quickUser,
                role: dbUser.role,
                companyId: dbUser.companyId,
              }
              setUser(fullUser)

              // Update cache with full user data
              storeAuthState(fullUser)
            }
          })
          .catch(console.warn)
      } catch (error) {
        console.warn('Auth check failed on refresh:', error)
        // Don't immediately sign out on refresh - could be a network issue
        setIsLoading(false)
        setIsInitialized(true)

        // Only set user to null if we don't have any cached data at all
        if (!cachedAuthState && !backupAuthState) {
          setUser(null)
        } else {
          // Try to use cached data even if it's slightly expired
          const fallbackData = cachedAuthState || backupAuthState
          if (fallbackData) {
            try {
              const fallbackUser = JSON.parse(fallbackData)
              setUser(fallbackUser)
            } catch {
              console.warn('Could not parse fallback data')
              setUser(null)
            }
          }
        }
      }
    }

    quickAuthCheck()
  }, [])

  // Add safety guard for development hot reloads
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Reset state on hot reload to prevent stale context issues
      const handleBeforeUnload = () => {
        setIsInitialized(false)
        setIsLoading(true)
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      return () =>
        window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      // Check if user is already authenticated
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          await amplifySignOut()
          // Clear any existing state
          setUser(null)
          sessionStorage.removeItem('authState')
          sessionStorage.removeItem('authTimestamp')
        }
      } catch {
        // No user authenticated, continue with sign in
      }

      // Clear any existing auth state first
      sessionStorage.removeItem('authState')
      sessionStorage.removeItem('authTimestamp')

      // Now try to sign in
      const result = await amplifySignIn({ username: email, password })

      // Check if the sign in was successful
      if (result.isSignedIn) {
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
        storeAuthState(fullUserData)

        return fullUserData
      } else {
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

      // Clear all auth state
      clearAuthState()
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

    // Update cache with helper function
    storeAuthState(updatedUser)
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
    // Better error message for development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'useAuth hook called outside of AuthProvider context. Make sure your component is wrapped with AuthProvider.',
      )
      console.trace('Call stack:')
    }
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
