/**
 * Navigation utility functions for route management
 * This file centralizes route paths to make future updates easier
 */

/**
 * Generate route paths based on parameters
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
    // Direct routes for project and document
    project: {
      details: (companyId: string, projectId: string) =>
        `/${companyId}/${projectId}`,
      documents: (companyId: string, projectId: string) =>
        `/${companyId}/${projectId}/documents`,
      document: (companyId: string, projectId: string, documentId: string) =>
        `/${companyId}/${projectId}/${documentId}`,
    },
  },
}
