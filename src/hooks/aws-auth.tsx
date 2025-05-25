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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const amplifyUser = await getCurrentUser()
        const attrs = await fetchUserAttributes()
        setUser({
          id: amplifyUser.userId,
          email: attrs.email,
          name: attrs.name,
          ...attrs,
        })
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    await amplifySignIn({ username: email, password })
    const amplifyUser = await getCurrentUser()
    const attrs = await fetchUserAttributes()
    setUser({
      id: amplifyUser.userId,
      email: attrs.email,
      name: attrs.name,
      ...attrs,
    })
    setIsLoading(false)
  }

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    await amplifySignUp({
      username: email,
      password,
      options: { userAttributes: { email, name } },
    })
    setIsLoading(false)
  }

  const signOut = async () => {
    setIsLoading(true)
    await amplifySignOut()
    setUser(null)
    setIsLoading(false)
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
    setUser({ ...user, ...attrs })
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
