// Enhanced Documents page with skeleton loading
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DocumentList } from '@/components/documents/DocumentList'
import { FileUploader } from '@/components/upload/FileUploader'
import {
  DocumentListSkeleton,
  PageHeaderSkeleton,
  ProjectsWithDocumentsSkeleton,
} from '@/components/shared/skeletons'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Filter, ArrowLeft } from '@/components/icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Document } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/utils/navigation'
import { documentService, projectService } from '@/services/data/hybrid'
import {
  getCachedData,
  prefetchProjectData,
  prefetchDocumentData,
} from '@/utils/data-prefetch'

const EnhancedDocuments = () => {
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId?: string
  }>()
  const [documents, setDocuments] = useState<Document[]>([])
  const [projectsWithDocuments, setProjectsWithDocuments] = useState<
    Array<{
      id: string
      name: string
      description?: string
      createdAt: string
      updatedAt?: string
      companyId: string
      documents: Document[]
    }>
  >([])
  const [projectName, setProjectName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [isProjectLoading, setIsProjectLoading] = useState(true)
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true)
  const [resolvedProject, setResolvedProject] = useState<{
    id: string
    name: string
  } | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return

      try {
        // Set company name (using companyId as name for now)
        setCompanyName(companyId)

        if (projectId) {
          // Single project view - try to get cached data first
          const cachedProject = getCachedData(`project-${projectId}`)
          const cachedDocuments = getCachedData(`documents-${projectId}`)

          if (cachedProject) {
            console.log('Using cached project data:', cachedProject)
            const project = cachedProject as { id: string; name: string }
            setProjectName(project.name)
            setResolvedProject(project)
            setIsProjectLoading(false)
          } else {
            setIsProjectLoading(true)
          }

          if (cachedDocuments) {
            console.log('Using cached documents data:', cachedDocuments)
            setDocuments(cachedDocuments as Document[])
            setIsDocumentsLoading(false)
          } else {
            setIsDocumentsLoading(true)
          }

          // If we don't have cached data, load it normally
          if (!cachedProject || !cachedDocuments) {
            if (!cachedProject) {
              console.log(
                'Documents page resolving project slug/ID:',
                projectId,
              )
              const project = await projectService.resolveProject(projectId)
              console.log('Documents page resolved project data:', project)

              if (project) {
                setProjectName(project.name)
                setResolvedProject(project)
                setIsProjectLoading(false)

                // Cache related data for next navigation
                if (companyId) {
                  prefetchProjectData(companyId, project.id).catch(() => {})
                }
              }
            }

            if (!cachedDocuments && resolvedProject) {
              const projectDocuments =
                await documentService.getDocumentsByProject(resolvedProject.id)
              setDocuments(projectDocuments)
              setIsDocumentsLoading(false)
            }
          }
        } else {
          // All projects view - try to get cached data first
          const cachedProjects = getCachedData(`projects-${companyId}`)
          const cachedAllDocs = getCachedData(`all-documents-${companyId}`)

          if (cachedProjects && cachedAllDocs) {
            console.log('Using cached projects and documents data')
            // Process cached data similar to the original logic
            const projects = cachedProjects as Array<{
              id: string
              name: string
              description?: string
              createdAt: string
              updatedAt?: string
              companyId: string
            }>
            const allDocs = cachedAllDocs as Document[]

            const projectsWithDocs = projects.map(project => ({
              ...project,
              documents: allDocs.filter(doc => doc.projectId === project.id),
            }))

            setProjectsWithDocuments(projectsWithDocs)
            setIsProjectLoading(false)
            setIsDocumentsLoading(false)
          } else {
            // Load data normally if not cached
            setIsProjectLoading(true)
            setIsDocumentsLoading(true)

            const [projects, allDocuments] = await Promise.all([
              projectService.getProjects(),
              documentService.getAllDocuments(),
            ])

            const projectsWithDocs = projects.map(project => ({
              ...project,
              documents: allDocuments.filter(
                doc => doc.projectId === project.id,
              ),
            }))

            setProjectsWithDocuments(projectsWithDocs)
            setIsProjectLoading(false)
            setIsDocumentsLoading(false)
          }
        }
      } catch (error) {
        console.error('Error loading documents:', error)
        setIsProjectLoading(false)
        setIsDocumentsLoading(false)
        toast({
          title: 'Error',
          description: 'Failed to load documents. Please try again.',
          variant: 'destructive',
        })
      }
    }

    loadData()
  }, [companyId, projectId, toast, resolvedProject])

  // Cache document data on hover
  const handleDocumentHover = (documentId: string) => {
    if (companyId && resolvedProject) {
      prefetchDocumentData(companyId, resolvedProject.id, documentId).catch(
        () => {},
      )
    }
  }

  // Show skeleton loading while data is being fetched
  if (isProjectLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 space-y-6">
          <PageHeaderSkeleton />
          {projectId ? (
            <DocumentListSkeleton />
          ) : (
            <ProjectsWithDocumentsSkeleton />
          )}
        </div>
      </Layout>
    )
  }

  // Rest of the component logic remains the same...
  // (Include the original Documents component logic here)

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <p>Enhanced Documents Component</p>
          <p>Project: {projectName || 'All Projects'}</p>
          <p>Documents: {documents.length} items</p>

          <div className="grid gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                onMouseEnter={() => handleDocumentHover(doc.id)}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                {doc.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default EnhancedDocuments
