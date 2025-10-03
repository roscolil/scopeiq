/**
 * Backward-compatible wrapper for the optimized split Auth Context
 *
 * This file re-exports the new split context implementation for backward compatibility.
 * All existing code will continue to work without changes.
 *
 * For new code, consider using the specific hooks from AuthContext for better performance:
 * - useAuthUser() - only subscribes to user data
 * - useAuthStatus() - only subscribes to loading/auth status
 * - useAuthActions() - stable reference, never re-renders
 */

export {
  AuthProvider,
  useAuth,
  useAuthUser,
  useAuthStatus,
  useAuthActions,
  type User,
} from './auth/AuthContext'
