/**
 * Navigation utility functions for route management
 * This file centralizes route paths to make future updates easier
 */

/**
 * Convert a name to a URL-safe slug
 */
export const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Generate route paths based on parameters
 * Now supports both ID-based and name-based routing
 */
export const routes = {
  // Public routes
  home: () => '/',
  auth: {
    signin: () => '/auth/signin',
    signup: () => '/auth/signup',
    forgotPassword: () => '/auth/forgot-password',
    verifyEmail: () => '/auth/verify-email',
  },
  pricing: () => '/pricing',

  // Authenticated routes
  company: {
    home: (companyId: string) => `/${companyId}`,
    settings: (companyId: string) => `/${companyId}/settings`,
    projects: {
      // Still need this for the projects index page
      list: (companyId: string) => `/${companyId}/projects`,
      new: (companyId: string) => `/${companyId}/projects/new`,
    },
    // Direct routes for project and document - now with optional readable names
    project: {
      details: (companyId: string, projectId: string, projectName?: string) => {
        const slug = projectName ? createSlug(projectName) : projectId
        return `/${companyId}/${slug}`
      },
      documents: (
        companyId: string,
        projectId: string,
        projectName?: string,
      ) => {
        const slug = projectName ? createSlug(projectName) : projectId
        return `/${companyId}/${slug}/documents`
      },
      document: (
        companyId: string,
        projectId: string,
        documentId: string,
        projectName?: string,
        documentName?: string,
      ) => {
        const projectSlug = projectName ? createSlug(projectName) : projectId
        const documentSlug = documentName
          ? createSlug(documentName)
          : documentId
        return `/${companyId}/${projectSlug}/${documentSlug}`
      },
    },
  },
}
