// Example usage of GraphQL imports
import { createProject, updateProject } from '@/graphql'
import type { Project, CreateProjectInput } from '@/graphql'

// This file demonstrates how to import GraphQL operations and types
// from the new organized location using the @ alias
export { createProject, updateProject }
export type { Project, CreateProjectInput }
