/**
 * React Query hooks for project data
 * Replaces manual state management and caching with automatic query management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/data/hybrid'
import { queryKeys } from '@/lib/query-client'
import { Project } from '@/types'

/**
 * Fetch all projects for a company
 * Note: The service internally filters by the current user's company
 */
export function useProjects(companyId: string) {
  return useQuery({
    queryKey: queryKeys.projects.byCompany(companyId),
    queryFn: () => projectService.getProjects(),
    enabled: !!companyId && companyId !== 'default',
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single project by ID
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.byId(projectId),
    queryFn: () => projectService.resolveProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      data,
    }: {
      companyId: string
      data: Partial<Project>
    }) => projectService.createProject(companyId, data),
    onSuccess: (_, variables) => {
      // Invalidate the projects list for this company
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byCompany(variables.companyId),
      })
    },
  })
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
      data,
    }: {
      companyId: string
      projectId: string
      data: Partial<Project>
    }) => projectService.updateProject(companyId, projectId, data),
    onSuccess: (_, variables) => {
      // Invalidate both the specific project and the list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byId(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byCompany(variables.companyId),
      })
    },
  })
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
    }: {
      companyId: string
      projectId: string
    }) => projectService.deleteProject(companyId, projectId),
    onSuccess: (_, variables) => {
      // Invalidate the projects list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byCompany(variables.companyId),
      })
    },
  })
}
