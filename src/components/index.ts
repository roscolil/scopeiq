// Organized component exports - Feature-based organization
// Each feature folder contains related components for better maintainability

// Document components
export * from './documents'

// AI components
export * from './ai'

// Voice components
export * from './voice'

// Upload components
export * from './upload'

// Project components
export * from './projects'

// Auth components
export * from './auth'

// Admin components
export * from './admin'

// Shared components
export * from './shared'

// Keep legacy exports for backwards compatibility
// Layout components (avoid naming conflicts)
export { Layout } from './layout/Layout'
export { Navbar } from './layout/Navbar'
export { Footer } from './layout/Footer'
export { AddToHomeScreen } from './layout/AddToHomeScreen'
