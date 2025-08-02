/**
 * Environment configuration utility
 * Handles environment variables safely across different contexts
 */

// Get environment variables from Vite (client-side)
const getEnvVar = (key: string): string | undefined => {
  // In Vite, environment variables are prefixed with VITE_
  return import.meta.env[`VITE_${key}`] || import.meta.env[key]
}

// Environment configuration object
export const env = {
  // AWS Configuration - read from environment variables
  AWS_REGION: getEnvVar('AWS_REGION') || 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: getEnvVar('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getEnvVar('AWS_SECRET_ACCESS_KEY'),
  S3_BUCKET_NAME: getEnvVar('S3_BUCKET_NAME'),

  // API Configuration
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  GOOGLE_PLACES_API_KEY: getEnvVar('GOOGLE_PLACES_API_KEY'),

  // App Configuration
  NODE_ENV: getEnvVar('NODE_ENV') || 'development',
  APP_URL: getEnvVar('APP_URL') || 'http://localhost:3000',

  // Validation method
  validate(): boolean {
    const required = [
      'S3_BUCKET_NAME',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ]
    const missing = required.filter(key => !this[key as keyof typeof this])

    if (missing.length > 0) {
      console.warn('Missing required environment variables:', missing)
      return false
    }

    return true
  },

  // Debug info (without exposing secrets)
  getDebugInfo() {
    return {
      AWS_REGION: this.AWS_REGION,
      S3_BUCKET_NAME: this.S3_BUCKET_NAME,
      NODE_ENV: this.NODE_ENV,
      APP_URL: this.APP_URL,
      hasAccessKey: !!this.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!this.AWS_SECRET_ACCESS_KEY,
      hasOpenAI: !!this.OPENAI_API_KEY,
    }
  },
}

// Export individual values for convenience
export const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME,
  OPENAI_API_KEY,
  NODE_ENV,
} = env

export default env
