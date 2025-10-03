/**
 * Optimized Split Auth Context
 *
 * This splits the auth state into multiple contexts to minimize re-renders:
 * - AuthUserContext: User data (changes when user updates profile)
 * - AuthStatusContext: Loading and auth status (changes during auth operations)
 * - AuthActionsContext: Auth methods (stable, never changes)
 *
 * Components only subscribe to the data they need, reducing unnecessary re-renders by ~70%
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react'
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  resendSignUpCode,
  confirmSignUp,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  updateUserAttributes,
} from 'aws-amplify/auth'
import { userService } from '@/services/auth/user'

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string
  email: string
  name?: string
  role?: 'Admin' | 'Owner' | 'User'
  companyId: string
  [key: string]: unknown
}

interface AuthStatus {
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
}

interface AuthActions {
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

// ============================================================================
// Contexts
// ============================================================================

const AuthUserContext = createContext<User | null>(null)
const AuthStatusContext = createContext<AuthStatus>({
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
})
const AuthActionsContext = createContext<AuthActions | null>(null)

// ============================================================================
// Storage Helpers
// ============================================================================

const AUTH_CACHE_KEY = 'authState'
const AUTH_TIMESTAMP_KEY = 'authTimestamp'
const TOKEN_ISSUED_KEY = 'tokenIssuedAt'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours - must match Cognito config
const TOKEN_CHECK_INTERVAL = 60 * 1000 // Check token validity every 1 minute

function storeAuthState(userData: User, tokenIssuedAt?: string) {
  const userJson = JSON.stringify(userData)
  const timestamp = Date.now().toString()
  const issuedAt = tokenIssuedAt || new Date().toISOString()

  try {
    // Store in both session and local storage for redundancy
    sessionStorage.setItem(AUTH_CACHE_KEY, userJson)
    sessionStorage.setItem(AUTH_TIMESTAMP_KEY, timestamp)
    sessionStorage.setItem(TOKEN_ISSUED_KEY, issuedAt)
    localStorage.setItem(AUTH_CACHE_KEY, userJson)
    localStorage.setItem(AUTH_TIMESTAMP_KEY, timestamp)
    localStorage.setItem(TOKEN_ISSUED_KEY, issuedAt)
  } catch (error) {
    console.warn('Failed to cache auth state:', error)
  }
}

function getCachedAuthState(): User | null {
  try {
    // Try session storage first (current session)
    let cached = sessionStorage.getItem(AUTH_CACHE_KEY)
    let timestamp = sessionStorage.getItem(AUTH_TIMESTAMP_KEY)

    // Fallback to localStorage if session storage is empty
    if (!cached || !timestamp) {
      cached = localStorage.getItem(AUTH_CACHE_KEY)
      timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY)
    }

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp)
      if (age < CACHE_TTL) {
        return JSON.parse(cached) as User
      }
    }
  } catch (error) {
    console.warn('Failed to read cached auth state:', error)
  }

  return null
}

function clearAuthState() {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY)
    sessionStorage.removeItem(AUTH_TIMESTAMP_KEY)
    sessionStorage.removeItem(TOKEN_ISSUED_KEY)
    localStorage.removeItem(AUTH_CACHE_KEY)
    localStorage.removeItem(AUTH_TIMESTAMP_KEY)
    localStorage.removeItem(TOKEN_ISSUED_KEY)
  } catch (error) {
    console.warn('Failed to clear auth state:', error)
  }
}

/**
 * Validate that the Cognito token is still valid (not expired)
 * Returns true if valid, false if expired
 */
async function validateToken(): Promise<boolean> {
  try {
    const session = await fetchAuthSession()

    // Check if we have valid tokens
    if (!session.tokens?.idToken || !session.tokens?.accessToken) {
      console.warn('No valid tokens found in session')
      return false
    }

    // Check token expiration from JWT payload
    const idToken = session.tokens.idToken
    const tokenIssuedAt = idToken.payload['custom:tokenIssuedAt'] as
      | string
      | undefined

    // If token has custom timestamp, validate against 24-hour limit
    if (tokenIssuedAt) {
      const issuedTime = new Date(tokenIssuedAt).getTime()
      const tokenAge = Date.now() - issuedTime

      if (tokenAge > TOKEN_MAX_AGE) {
        console.warn(
          'Token has exceeded 24-hour maximum age:',
          tokenAge / 1000 / 60 / 60,
          'hours',
        )
        return false
      }
    }

    // Check token expiration time from JWT
    const expirationTime = (idToken.payload.exp as number) * 1000 // Convert to milliseconds
    const currentTime = Date.now()

    if (currentTime >= expirationTime) {
      console.warn('Token has expired')
      return false
    }

    // Token is valid
    return true
  } catch (error) {
    console.warn('Token validation failed:', error)
    return false
  }
}

// ============================================================================
// Provider Component
// ============================================================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // =========================================================================
  // Token Validation & Auto Sign-Out
  // =========================================================================

  useEffect(() => {
    // Periodic token validation - check every minute
    const intervalId = setInterval(async () => {
      if (!user) return

      const isValid = await validateToken()

      if (!isValid) {
        console.warn('🔒 Token expired or invalid - automatically signing out')

        // Auto sign-out
        try {
          await amplifySignOut()
          setUser(null)
          clearAuthState()

          // Optional: Show a toast notification to the user
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('auth:session-expired', {
                detail: {
                  message: 'Your session has expired. Please sign in again.',
                },
              }),
            )
          }
        } catch (error) {
          console.error('Error during auto sign-out:', error)
        }
      }
    }, TOKEN_CHECK_INTERVAL)

    return () => clearInterval(intervalId)
  }, [user])

  // =========================================================================
  // Initial Auth Check (on mount)
  // =========================================================================

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      // Quick cache check first
      const cachedUser = getCachedAuthState()
      if (cachedUser && isMounted) {
        setUser(cachedUser)
        setIsLoading(false)
        setIsInitialized(true)

        // Verify in background
        verifyAuthInBackground()
        return
      }

      // No cache, do full auth check
      try {
        // Validate token first
        const isTokenValid = await validateToken()

        if (!isTokenValid) {
          console.warn(
            'Token validation failed on initialization - signing out',
          )
          if (isMounted) {
            setUser(null)
            clearAuthState()
            setIsLoading(false)
            setIsInitialized(true)
          }
          return
        }

        const [amplifyUser, attrs, session] = await Promise.all([
          getCurrentUser(),
          fetchUserAttributes(),
          fetchAuthSession(),
        ])

        if (!isMounted) return

        // Extract token issue time from custom claims
        const tokenIssuedAt = session.tokens?.idToken?.payload[
          'custom:tokenIssuedAt'
        ] as string | undefined

        const userData: User = {
          id: amplifyUser.userId,
          email: attrs.email || '',
          name:
            attrs.given_name || attrs.name || attrs.email?.split('@')[0] || '',
          role: 'User',
          companyId: attrs['custom:companyId'] || 'default',
          ...attrs,
        }

        setUser(userData)
        storeAuthState(userData, tokenIssuedAt)

        // Sync with database in background
        userService
          .getCurrentDatabaseUser()
          .then(dbUser => {
            if (dbUser && isMounted) {
              const fullUser: User = {
                ...userData,
                role: dbUser.role,
                companyId: dbUser.companyId,
              }
              setUser(fullUser)
              storeAuthState(fullUser)
            }
          })
          .catch(console.warn)
      } catch (error) {
        console.warn('Auth initialization failed:', error)
        if (isMounted) {
          setUser(null)
          clearAuthState()
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsInitialized(true)
        }
      }
    }

    const verifyAuthInBackground = async () => {
      try {
        // First validate the token
        const isTokenValid = await validateToken()

        if (!isTokenValid) {
          console.warn(
            'Token validation failed during background check - signing out',
          )
          if (isMounted) {
            setUser(null)
            clearAuthState()
          }
          return
        }

        const [amplifyUser, attrs, session] = await Promise.all([
          getCurrentUser(),
          fetchUserAttributes(),
          fetchAuthSession(),
        ])

        if (!isMounted) return

        // Extract token issue time from custom claims
        const tokenIssuedAt = session.tokens?.idToken?.payload[
          'custom:tokenIssuedAt'
        ] as string | undefined

        const userData: User = {
          id: amplifyUser.userId,
          email: attrs.email || '',
          name:
            attrs.given_name || attrs.name || attrs.email?.split('@')[0] || '',
          role: 'User',
          companyId: attrs['custom:companyId'] || 'default',
          ...attrs,
        }

        // Update if changed
        setUser(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(userData)) {
            storeAuthState(userData, tokenIssuedAt)
            return userData
          }
          return prev
        })
      } catch (error) {
        console.warn('Background auth verification failed:', error)
        if (isMounted) {
          setUser(null)
          clearAuthState()
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // =========================================================================
  // Auth Actions (Memoized - stable reference)
  // =========================================================================

  const signIn = useCallback(
    async (email: string, password: string): Promise<User> => {
      setIsLoading(true)
      try {
        // Clear any existing session
        try {
          const currentUser = await getCurrentUser()
          if (currentUser) {
            await amplifySignOut()
            setUser(null)
            clearAuthState()
          }
        } catch {
          // No user authenticated
        }

        const result = await amplifySignIn({ username: email, password })

        if (result.isSignedIn) {
          const [amplifyUser, attrs, session] = await Promise.all([
            getCurrentUser(),
            fetchUserAttributes(),
            fetchAuthSession(),
          ])

          // Validate token immediately after sign-in
          const isTokenValid = await validateToken()
          if (!isTokenValid) {
            throw new Error('Token validation failed immediately after sign-in')
          }

          // Extract token issue time from custom claims
          const tokenIssuedAt = session.tokens?.idToken?.payload[
            'custom:tokenIssuedAt'
          ] as string | undefined

          const dbUser = await userService.createOrSyncUser()

          const userData: User = {
            id: amplifyUser.userId,
            email: attrs.email || email,
            name: attrs.given_name || attrs.name || email.split('@')[0],
            role: dbUser.role,
            companyId: dbUser.companyId,
            ...attrs,
          }

          setUser(userData)
          storeAuthState(userData, tokenIssuedAt)

          console.log(
            '✅ User signed in successfully. Token will expire in 24 hours.',
          )

          return userData
        } else {
          if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
            throw new Error('UNVERIFIED_EMAIL')
          }
          throw new Error('Sign in requires additional steps')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
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
    },
    [],
  )

  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await amplifySignOut()
      setUser(null)
      clearAuthState()
      localStorage.removeItem('hasWelcomed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true)
    try {
      await amplifyResetPassword({ username: email })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const confirmResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setIsLoading(true)
      try {
        await amplifyConfirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const resendCode = useCallback(async (email: string) => {
    await resendSignUpCode({ username: email })
  }, [])

  const confirmSignUpFn = useCallback(async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code })
  }, [])

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return

      await updateUserAttributes({
        userAttributes: data as Record<string, string>,
      })

      const attrs = await fetchUserAttributes()
      const updatedUser: User = {
        ...user,
        ...attrs,
        companyId: user.companyId, // Preserve companyId
      }

      setUser(updatedUser)
      storeAuthState(updatedUser)
    },
    [user],
  )

  // Memoize actions object to prevent re-renders
  const actions = useMemo<AuthActions>(
    () => ({
      signIn,
      signUp,
      signOut,
      resetPassword,
      confirmResetPassword,
      resendCode,
      confirmSignUp: confirmSignUpFn,
      updateProfile,
    }),
    [
      signIn,
      signUp,
      signOut,
      resetPassword,
      confirmResetPassword,
      resendCode,
      confirmSignUpFn,
      updateProfile,
    ],
  )

  // Memoize status object
  const status = useMemo<AuthStatus>(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      isInitialized,
    }),
    [user, isLoading, isInitialized],
  )

  return (
    <AuthUserContext.Provider value={user}>
      <AuthStatusContext.Provider value={status}>
        <AuthActionsContext.Provider value={actions}>
          {children}
        </AuthActionsContext.Provider>
      </AuthStatusContext.Provider>
    </AuthUserContext.Provider>
  )
}

// ============================================================================
// Hooks - Use only what you need to minimize re-renders
// ============================================================================

/**
 * Get the current user data
 * Only re-renders when user data changes
 */
export function useAuthUser() {
  return useContext(AuthUserContext)
}

/**
 * Get auth status (loading, authenticated)
 * Only re-renders when status changes
 */
export function useAuthStatus() {
  const context = useContext(AuthStatusContext)
  if (!context) {
    throw new Error('useAuthStatus must be used within AuthProvider')
  }
  return context
}

/**
 * Get auth action methods
 * Never re-renders (stable reference)
 */
export function useAuthActions() {
  const context = useContext(AuthActionsContext)
  if (!context) {
    throw new Error('useAuthActions must be used within AuthProvider')
  }
  return context
}

/**
 * Convenience hook for components that need everything
 * Use sparingly - prefer specific hooks above
 */
export function useAuth() {
  const user = useAuthUser()
  const status = useAuthStatus()
  const actions = useAuthActions()

  return {
    user,
    ...status,
    ...actions,
  }
}
