import { useContext } from 'react'
import { AuthContext } from './aws-auth'

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
