/**
 * React Query hooks for document data
 * Replaces manual state management and caching with automatic query management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/services/data/hybrid'
import { queryKeys } from '@/lib/query-client'
import { Document } from '@/types'

/**
 * Fetch all documents for a company
 * Note: The service internally filters by the current user's company
 */
export function useDocumentsByCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.documents.byCompany(companyId),
    queryFn: () => documentService.getAllDocuments(),
    enabled: !!companyId && companyId !== 'default',
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch all documents for a project
 */
export function useDocumentsByProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.documents.byProject(projectId),
    queryFn: () => documentService.getDocumentsByProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch a single document by ID
 */
export function useDocument(
  companyId: string,
  projectId: string,
  documentId: string,
) {
  return useQuery({
    queryKey: queryKeys.documents.byId(documentId),
    queryFn: () =>
      documentService.getDocument(companyId, projectId, documentId),
    enabled: !!companyId && !!projectId && !!documentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create a new document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
      data,
    }: {
      companyId: string
      projectId: string
      data: Partial<Document>
    }) => documentService.createDocument(companyId, projectId, data),
    onSuccess: (_, variables) => {
      // Invalidate documents lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byProject(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byCompany(variables.companyId),
      })
    },
  })
}

/**
 * Update a document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
      documentId,
      data,
    }: {
      companyId: string
      projectId: string
      documentId: string
      data: Partial<Document>
    }) =>
      documentService.updateDocument(companyId, projectId, documentId, data),
    onSuccess: (_, variables) => {
      // Invalidate specific document, project list, and company list
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byId(variables.documentId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byProject(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byCompany(variables.companyId),
      })
    },
  })
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      projectId,
      documentId,
    }: {
      companyId: string
      projectId: string
      documentId: string
    }) => documentService.deleteDocument(companyId, projectId, documentId),
    onSuccess: (_, variables) => {
      // Invalidate all document queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byProject(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byCompany(variables.companyId),
      })
    },
  })
}

/**
 * Optimistic update helper for document status changes
 * Useful for real-time status updates without waiting for the server
 */
export function useOptimisticDocumentUpdate() {
  const queryClient = useQueryClient()

  return (
    projectId: string,
    documentId: string,
    updates: Partial<Document>,
  ) => {
    queryClient.setQueryData<Document[]>(
      queryKeys.documents.byProject(projectId),
      old => {
        if (!old) return old
        return old.map(doc =>
          doc.id === documentId ? { ...doc, ...updates } : doc,
        )
      },
    )
  }
}
