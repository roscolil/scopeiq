/**
 * Hooks Index
 * Centralized exports for all custom hooks
 */

// Existing hooks
export * from './use-mobile'
export * from './use-toast'
export * from './useSemanticSearch'

// Python backend hooks
export * from './usePythonChat'
export * from './usePythonDocumentUpload'

// Re-export types
export type { ChatMessage as PythonChatMessage } from './usePythonChat'

export type {
  UploadProgress,
  UsePythonDocumentUploadOptions,
} from './usePythonDocumentUpload'
