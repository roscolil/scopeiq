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

interface User {
  id: string
  email: string
  name?: string
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
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
        const userData = {
          id: amplifyUser.userId,
          email: attrs.email,
          name: attrs.name,
          ...attrs,
        }

        setUser(userData)

        // Cache the auth state
        sessionStorage.setItem('authState', JSON.stringify(userData))
        sessionStorage.setItem('authTimestamp', Date.now().toString())
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
        const userData = {
          id: amplifyUser.userId,
          email: attrs.email,
          name: attrs.name,
          ...attrs,
        }

        setUser(userData)

        // Update cache
        sessionStorage.setItem('authState', JSON.stringify(userData))
        sessionStorage.setItem('authTimestamp', Date.now().toString())
      } catch {
        // Silent failure for background refresh
      }
    }

    loadUser()
  }, [isInitialized])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await amplifySignIn({ username: email, password })
      const amplifyUser = await getCurrentUser()
      const attrs = await fetchUserAttributes()
      const userData = {
        id: amplifyUser.userId,
        email: attrs.email,
        name: attrs.name,
        ...attrs,
      }

      setUser(userData)

      // Update cache
      sessionStorage.setItem('authState', JSON.stringify(userData))
      sessionStorage.setItem('authTimestamp', Date.now().toString())
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
    const updatedUser = { ...user, ...attrs }
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
