/**
 * Environment configuration utility
 * Handles environment variables safely across different contexts
 */

/**
 * Environment configuration utility
 * Handles environment variables safely across different contexts
 */

/**
 * Environment configuration utility
 * Handles environment variables safely across different contexts
 */

// Temporary hardcoded values from your .env file to fix immediate issue
// TODO: Fix proper environment variable loading
export const env = {
  // AWS Configuration - using values from your .env file
  AWS_REGION: 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: 'process.env.VITE_AWS_ACCESS_KEY_ID || ""',
  AWS_SECRET_ACCESS_KEY: 'process.env.VITE_AWS_SECRET_ACCESS_KEY || ""',
  S3_BUCKET_NAME: 'scopeiq-fileupload', // This will be overridden by Amplify bucket

  // API Configuration
  OPENAI_API_KEY:
    'process.env.VITE_OPENAI_API_KEY || ""',

  // App Configuration
  NODE_ENV: 'development',
  APP_URL: 'http://localhost:3000',

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
