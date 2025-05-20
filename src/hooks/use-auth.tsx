import React, { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// This is a mock implementation. Replace with Supabase auth when connected.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock implementations - replace with actual Supabase calls
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    // Mock auth - in a real app, would call Supabase auth.signIn
    console.log(`Sign in attempt with ${email}`)

    // For demo, simulate successful login
    if (email && password) {
      setUser({
        id: '1',
        email,
        name: 'Demo User',
      })
    }

    setIsLoading(false)
  }

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    // Mock implementation - would call Supabase auth.signUp
    console.log(`Sign up attempt with ${email} and name ${name}`)
    setIsLoading(false)
  }

  const signOut = async () => {
    setIsLoading(true)
    // Mock implementation - would call Supabase auth.signOut
    setUser(null)
    setIsLoading(false)
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)
    // Mock implementation - would call Supabase auth.resetPasswordForEmail
    console.log(`Password reset requested for ${email}`)
    setIsLoading(false)
  }

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true)
    // Mock implementation - would update profile in Supabase
    if (user) {
      setUser({ ...user, ...data })
    }
    setIsLoading(false)
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
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
