/**
 * Navigation utility functions for route management
 * This file centralizes route paths to make future updates easier
 */

/**
 * Convert a name to a URL-safe slug
 */
export const createSlug = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length

  return slug
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
    home: (companyId: string) =>
      `/${encodeURIComponent(companyId.toLowerCase())}`,
    settings: (companyId: string) =>
      `/${encodeURIComponent(companyId.toLowerCase())}/settings`,
    projects: {
      // Still need this for the projects index page
      list: (companyId: string) =>
        `/${encodeURIComponent(companyId.toLowerCase())}/projects`,
      new: (companyId: string) =>
        `/${encodeURIComponent(companyId.toLowerCase())}/projects/new`,
    },
    documents: {
      // All documents view
      all: (companyId: string) =>
        `/${encodeURIComponent(companyId.toLowerCase())}/documents`,
    },
    // Direct routes for project and document - now with optional readable names
    project: {
      details: (companyId: string, projectId: string, projectName?: string) => {
        if (
          !projectName ||
          projectName.trim() === '' ||
          projectName === 'Untitled Project'
        ) {
          return `/${encodeURIComponent(companyId.toLowerCase())}/${projectId}`
        }

        const slug = createSlug(projectName)
        const route = `/${encodeURIComponent(companyId.toLowerCase())}/${slug}`
        return route
      },
      documents: (
        companyId: string,
        projectId: string,
        projectName?: string,
      ) => {
        const slug = projectName ? createSlug(projectName) : projectId
        return `/${encodeURIComponent(companyId.toLowerCase())}/${slug}/documents`
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
        return `/${encodeURIComponent(companyId.toLowerCase())}/${projectSlug}/${documentSlug}`
      },
    },
  },
}
