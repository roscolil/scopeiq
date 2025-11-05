/**
 * Python Backend Configuration
 * Centralized configuration for Python AI backend integration
 */

export interface PythonBackendConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableFallback: boolean
}

/**
 * Get Python backend configuration from environment variables
 */
export function getPythonBackendConfig(): PythonBackendConfig {
  return {
    baseURL:
      import.meta.env.VITE_PYTHON_AI_BACKEND_URL || 'http://localhost:8000',
    timeout: parseInt(import.meta.env.VITE_PYTHON_AI_TIMEOUT || '30000'),
    retryAttempts: parseInt(
      import.meta.env.VITE_PYTHON_AI_RETRY_ATTEMPTS || '3',
    ),
    retryDelay: parseInt(import.meta.env.VITE_PYTHON_AI_RETRY_DELAY || '1000'),
    enableFallback: import.meta.env.VITE_ENABLE_AI_BACKEND_FALLBACK !== 'false',
  }
}

/**
 * Validate Python backend configuration
 */
export function validatePythonBackendConfig(config: PythonBackendConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.baseURL) {
    errors.push('Python backend URL is required')
  } else {
    try {
      new URL(config.baseURL)
    } catch {
      errors.push('Python backend URL is invalid')
    }
  }

  if (config.timeout <= 0) {
    errors.push('Timeout must be positive')
  }

  if (config.retryAttempts < 0) {
    errors.push('Retry attempts cannot be negative')
  }

  if (config.retryDelay < 0) {
    errors.push('Retry delay cannot be negative')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Default configuration for development
 */
export const DEFAULT_PYTHON_BACKEND_CONFIG: PythonBackendConfig = {
  baseURL: 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableFallback: true,
}

/**
 * Configuration for production
 */
export const PRODUCTION_PYTHON_BACKEND_CONFIG: PythonBackendConfig = {
  baseURL:
    import.meta.env.VITE_PYTHON_AI_BACKEND_URL ||
    'https://ai-backend.scopeiq.com',
  timeout: parseInt(import.meta.env.VITE_PYTHON_AI_TIMEOUT || '60000'),
  retryAttempts: parseInt(import.meta.env.VITE_PYTHON_AI_RETRY_ATTEMPTS || '5'),
  retryDelay: parseInt(import.meta.env.VITE_PYTHON_AI_RETRY_DELAY || '2000'),
  enableFallback: import.meta.env.VITE_ENABLE_AI_BACKEND_FALLBACK !== 'false',
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): PythonBackendConfig {
  const env = import.meta.env.MODE

  switch (env) {
    case 'production':
      return PRODUCTION_PYTHON_BACKEND_CONFIG
    case 'development':
    default:
      return getPythonBackendConfig()
  }
}
