import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DocumentList } from '@/components/documents/DocumentList'
import { FileUploader } from '@/components/upload/FileUploader'
import {
  ProjectDetailsSkeleton,
  DocumentListSkeleton,
} from '@/components/shared/skeletons'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ChevronDown,
  Edit,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { AIActions } from '@/components/ai/AIActions'
import useWakeWordPreference, {
  WAKEWORD_CONSENT_KEY,
  WAKEWORD_ENABLED_KEY,
} from '@/hooks/useWakeWordPreference'
import { useWakeWord } from '@/hooks/useWakeWord'
import { usePrefetch } from '@/utils/performance'
import { useDocumentStatusPolling } from '@/hooks/use-document-status-polling'
import { useIsMobile } from '@/hooks/use-mobile'
import { projectService, documentService } from '@/services/data/hybrid'
import type { Project, Document } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { toast } from '@/components/ui/use-toast'
import { routes } from '@/utils/ui/navigation'
import { documentDeletionEvents } from '@/services/utils/document-events'

// React Query - using only for cache invalidation, not for fetching
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

// Component
const ProjectDetails = () => {
  const navigate = useNavigate()
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  // Note: Using queryClient only for cache invalidation
  // Keeping existing manual fetch logic for reliability

  const [project, setProject] = useState<Project | null>(null)
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([])
  const [isProjectLoading, setIsProjectLoading] = useState(true)
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [showAITools, setShowAITools] = useState(true)
  const [recentlyUploadedDocuments, setRecentlyUploadedDocuments] = useState<
    Set<string>
  >(new Set())
  // Ref to flag when wake word triggered (to avoid duplicate activations)
  const wakeTriggerRef = useRef<number>(0)
  // Wake permission persistence key (kept in sync with useWakeWord hook)
  const WAKE_PERM_KEY = 'wakeword.permission.granted'
  const [wakePermissionGranted, setWakePermissionGranted] = useState<boolean>(
    () => {
      try {
        return localStorage.getItem(WAKE_PERM_KEY) === 'true'
      } catch {
        return false
      }
    },
  )

  // Helper to proactively request mic permission on mobile (one-time)
  const primeMicPermission = useCallback(async () => {
    if (typeof navigator === 'undefined') return
    try {
      if (
        !('mediaDevices' in navigator) ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        toast({
          title: 'Microphone not available',
          description: 'Your browser does not support microphone access.',
          variant: 'destructive',
        })
        return
      }
      // Request permission with an explicit user gesture (button tap)
      await navigator.mediaDevices.getUserMedia({ audio: true })
      try {
        localStorage.setItem(WAKE_PERM_KEY, 'true')
      } catch {
        /* noop */
      }
      setWakePermissionGranted(true)
      // Notify any listeners that wake permissions are primed
      try {
        window.dispatchEvent(new Event('wakeword:primed'))
        // Reuse ai:speech:complete signal which the wake listener uses to rearm immediately
        window.dispatchEvent(new Event('ai:speech:complete'))
      } catch {
        /* noop */
      }
      toast({
        title: 'Hands-free enabled',
        description: 'You can now say “Hey Jacq” to start speaking.',
      })
    } catch (err) {
      console.error('Mic permission request failed:', err)
      toast({
        title: 'Microphone permission required',
        description:
          'Please allow microphone access in your browser settings to enable hands-free mode.',
        variant: 'destructive',
      })
    }
  }, [])

  // Simple global query focus helper: we attempt to find the textarea inside AIActions after mount
  const focusQueryInput = () => {
    // The Textarea in AIActions has placeholder containing 'Ask anything'
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder*="Ask anything"]',
    )
    if (el) {
      // Scroll the textarea into view first
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })

      // Focus after a brief delay to ensure scroll completes
      setTimeout(() => {
        el.focus()
        // Optionally place a visual hint
        if (!el.value) {
          el.value = ''
        }
        // Move caret to end
        el.selectionStart = el.selectionEnd = el.value.length
      }, 100)
    }
  }

  const openChatPanelMobile = () => {
    // For now, scroll AIActions into view.
    const aiActions =
      document.querySelector('.AIActions') ||
      document.querySelector('[data-ai-actions]')
    if (aiActions && 'scrollIntoView' in aiActions) {
      ;(aiActions as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
    // Focus query afterwards with reduced delay
    setTimeout(() => focusQueryInput(), 300) // Reduced from 600ms to 300ms
  }

  const handleWakeWord = () => {
    const now = Date.now()
    if (now - wakeTriggerRef.current < 4000) return // throttle
    wakeTriggerRef.current = now
    if (isMobile) {
      // On mobile, scroll to view but DON'T focus textarea (prevents keyboard from showing)
      const aiActions =
        document.querySelector('.AIActions') ||
        document.querySelector('[data-ai-actions]')
      if (aiActions && 'scrollIntoView' in aiActions) {
        ;(aiActions as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    } else {
      focusQueryInput()
    }
    // Dispatch event to start mic with minimal delay so user can speak naturally.
    // On mobile, fire immediately since we're not focusing anything
    const delay = isMobile ? 10 : 60
    setTimeout(() => {
      window.dispatchEvent(new Event('wakeword:activate-mic'))
    }, delay)
  }

  // Centralized preference integration for passive listener
  const { enabled, consent, acceptConsent, setEnabled } =
    useWakeWordPreference()
  const [isDictationActive, setIsDictationActive] = useState(false)

  // Listen for dictation activity events from AIActions to suspend wake listener reliably
  useEffect(() => {
    const onStart = () => {
      setIsDictationActive(true)
    }
    const onStop = () => {
      setIsDictationActive(false)
    }
    window.addEventListener('dictation:start', onStart)
    window.addEventListener('dictation:stop', onStop)
    return () => {
      window.removeEventListener('dictation:start', onStart)
      window.removeEventListener('dictation:stop', onStop)
    }
  }, [])
  useWakeWord({
    enabled: enabled && consent === 'true',
    onWake: handleWakeWord,
    isDictationActive,
    autoStart: true,
    // If previously granted/primed, bypass user-interaction gate so it can auto-start
    requireUserInteraction: !wakePermissionGranted,
    watchdogIntervalMs: 6000,
    debug: true,
  })

  // Enable prefetching for likely navigation paths
  usePrefetch(true)

  // Delayed wake word enable toast (after project fully loaded)
  useEffect(() => {
    console.debug('[wakeword-prompt] effect run', {
      projectId,
      hasProject: !!project,
      isProjectLoading,
    })
    if (!projectId) {
      console.debug('[wakeword-prompt] abort: missing projectId')
      return
    }
    if (isProjectLoading) {
      console.debug('[wakeword-prompt] abort: still loading project')
      return
    }
    if (!project) {
      console.debug('[wakeword-prompt] abort: project object not set yet')
      return
    }
    const PROMPT_KEY = 'wakeword.enable.prompt.shown.v1'
    const timer = setTimeout(() => {
      try {
        const prompted = localStorage.getItem(PROMPT_KEY)
        if (prompted) {
          console.debug(
            '[wakeword-prompt] already prompted (localStorage key present)',
          )
          return
        }
        const consentVal = localStorage.getItem(WAKEWORD_CONSENT_KEY)
        const enabledVal = localStorage.getItem(WAKEWORD_ENABLED_KEY) === 'true'
        const shouldPrompt =
          !consentVal ||
          consentVal === 'declined' ||
          (consentVal === 'true' && !enabledVal)
        console.debug('[wakeword-prompt] state check', {
          consentVal,
          enabledVal,
          shouldPrompt,
        })
        if (!shouldPrompt) {
          console.debug('[wakeword-prompt] abort: conditions not met to prompt')
          return
        }
        const t = toast({
          title: 'Hands-Free Wake Word',
          description: (
            <div className="space-y-2">
              <p className="text-sm">
                Enable the "Hey Jacq" wake phrase for hands-free activation.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      console.debug('[wakeword-prompt] Enable Now clicked')
                      acceptConsent(true) // also enables
                      localStorage.setItem(PROMPT_KEY, 'true')
                    } catch {
                      /* noop */
                    }
                    // On mobile, immediately request mic permission so wake listener can auto-start
                    if (isMobile) {
                      setTimeout(() => {
                        primeMicPermission()
                      }, 50)
                    }
                    t.dismiss()
                  }}
                  className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  Enable Now
                </button>
                <button
                  onClick={() => {
                    console.debug(
                      '[wakeword-prompt] Dismiss clicked, setting prompt key',
                    )
                    localStorage.setItem(PROMPT_KEY, 'true')
                    t.dismiss()
                  }}
                  className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted/50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
        })
        console.debug('[wakeword-prompt] toast shown, marking key')
        localStorage.setItem(PROMPT_KEY, 'true')
      } catch {
        /* noop */
      }
    }, 350) // small delay to avoid appearing before layout settles
    return () => clearTimeout(timer)
  }, [
    projectId,
    project,
    isProjectLoading,
    acceptConsent,
    isMobile,
    primeMicPermission,
  ])

  // Handle document status updates for real-time feedback
  const handleDocumentStatusUpdate = useCallback(
    (updatedDocument: Document) => {
      setProjectDocuments(prev =>
        prev.map(doc =>
          doc.id === updatedDocument.id ? updatedDocument : doc,
        ),
      )

      // Show subtle notification for status changes
      // if (updatedDocument.status === 'processed') {
      //   toast({
      //     title: 'Document Ready',
      //     description: `${updatedDocument.name} is now available for AI search.`,
      //     duration: 3000,
      //   })
      // }
    },
    [],
  )

  // Poll for document status updates
  useDocumentStatusPolling({
    documents: projectDocuments,
    projectId: projectId || '',
    companyId: companyId || '',
    onDocumentUpdate: handleDocumentStatusUpdate,
    enabled:
      projectDocuments?.some(doc => doc.status === 'processing') || false,
  })

  // Cache keys
  const PROJECT_CACHE_KEY = `project_${projectId}`
  const DOCUMENTS_CACHE_KEY = `documents_${projectId}`

  // Caching utilities
  const getCachedProject = useCallback(() => {
    const cached = localStorage.getItem(PROJECT_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const isStale = Date.now() - timestamp > 5 * 60 * 1000 // 5 minutes
      return { data: data as Project, isStale }
    }
    return null
  }, [PROJECT_CACHE_KEY])

  const setCachedProjectData = useCallback(
    (data: Project) => {
      localStorage.setItem(
        PROJECT_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      )
    },
    [PROJECT_CACHE_KEY],
  )

  const getCachedDocuments = useCallback(() => {
    const cached = localStorage.getItem(DOCUMENTS_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Reduce cache validity to 2 minutes for documents to ensure fresher data
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        console.log('📋 Using cached documents data')
        return { data, isStale: false }
      } else {
        console.log('📋 Cached documents data is stale, will refresh')
        return { data, isStale: true }
      }
    }
    console.log('📋 No cached documents data found')
    return null
  }, [DOCUMENTS_CACHE_KEY])

  const setCachedDocumentsData = useCallback(
    (data: Document[]) => {
      localStorage.setItem(
        DOCUMENTS_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      )
    },
    [DOCUMENTS_CACHE_KEY],
  )

  const clearCache = useCallback(() => {
    localStorage.removeItem(PROJECT_CACHE_KEY)
    localStorage.removeItem(DOCUMENTS_CACHE_KEY)
  }, [PROJECT_CACHE_KEY, DOCUMENTS_CACHE_KEY])

  // Listen for document deletion events (emitted from viewer) to prune list immediately
  useEffect(() => {
    const unsubscribe = documentDeletionEvents.subscribe(evt => {
      if (evt.projectId !== project?.id) return
      setProjectDocuments(prev => prev.filter(d => d.id !== evt.documentId))
      try {
        // Invalidate cached documents for this project
        localStorage.removeItem(DOCUMENTS_CACHE_KEY)
      } catch (e) {
        /* ignore */
      }
      // Immediate authoritative refetch for strongest consistency
      if (project?.id) {
        ;(async () => {
          try {
            const docs = await documentService.getDocumentsByProject(project.id)
            const transformed: Document[] = (docs || []).map(doc => ({
              id: doc.id,
              name: doc.name || 'Untitled Document',
              type: doc.type || 'unknown',
              size:
                typeof doc.size === 'number'
                  ? doc.size
                  : parseInt(String(doc.size)) || 0,
              status: doc.status || 'processing',
              url: doc.url,
              thumbnailUrl: doc.thumbnailUrl,
              projectId: doc.projectId,
              content: doc.content,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }))
            setProjectDocuments(transformed)
            setCachedDocumentsData(transformed)
          } catch (e) {
            // silent refetch failure – rely on polling
          }
        })()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [project?.id, DOCUMENTS_CACHE_KEY, setCachedDocumentsData])

  // Load cached data immediately on mount
  useEffect(() => {
    const cachedProject = getCachedProject()
    if (cachedProject && !cachedProject.isStale) {
      setProject(cachedProject.data)
      setIsProjectLoading(false)
    }

    const cachedDocuments = getCachedDocuments()
    if (cachedDocuments && !cachedDocuments.isStale) {
      setProjectDocuments(cachedDocuments.data || [])
      setIsDocumentsLoading(false)
    } else if (cachedDocuments && cachedDocuments.isStale) {
      // Show stale data immediately but mark for refresh
      setProjectDocuments(cachedDocuments.data || [])
      setIsDocumentsLoading(true) // Keep loading state to trigger refresh
    }
  }, [getCachedProject, getCachedDocuments])

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !companyId) return

      // Check if we need to refresh cached data
      const cachedProject = getCachedProject()
      const cachedDocuments = getCachedDocuments()
      const shouldRefreshProject = !cachedProject || cachedProject.isStale
      const shouldRefreshDocuments = !cachedDocuments || cachedDocuments.isStale

      if (!shouldRefreshProject && !shouldRefreshDocuments) {
        return // No need to refresh
      }

      try {
        if (shouldRefreshProject) {
          setIsProjectLoading(true)
        }
        if (shouldRefreshDocuments) {
          setIsDocumentsLoading(true)
        }

        // PARALLEL API CALLS - Fetch project and documents simultaneously
        const [projectData, documents] = await Promise.all([
          projectService.resolveProject(projectId),
          documentService.getDocumentsByProject(projectId),
        ])

        if (projectData) {
          // Transform data to our Project type
          const transformedProject: Project = {
            id: projectData.id,
            name: projectData.name || 'Untitled Project',
            description: projectData.description,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt,
            companyId: companyId || projectData.companyId,
          }

          // Cache and update project data
          setCachedProjectData(transformedProject)
          setProject(transformedProject)
          setIsProjectLoading(false)

          // Transform documents data
          const transformedDocuments: Document[] = (documents || []).map(
            doc => ({
              id: doc.id,
              name: doc.name || 'Untitled Document',
              type: doc.type || 'unknown',
              size:
                typeof doc.size === 'number'
                  ? doc.size
                  : parseInt(String(doc.size)) || 0,
              status: doc.status || 'processing',
              url: doc.url,
              thumbnailUrl: doc.thumbnailUrl,
              projectId: doc.projectId,
              content: doc.content,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }),
          )

          // Cache and update documents data
          setCachedDocumentsData(transformedDocuments)
          setProjectDocuments(transformedDocuments)
          setIsDocumentsLoading(false)
        } else {
          // Set project to null or show error state
          setProject(null)
          setProjectDocuments([])
          setIsProjectLoading(false)
          setIsDocumentsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching project data:', error)
        toast({
          title: 'Error loading project',
          description: 'Failed to load project data. Please try again.',
          variant: 'destructive',
        })
        setIsProjectLoading(false)
        setIsDocumentsLoading(false)
      }
    }

    fetchProjectData()
  }, [
    projectId,
    companyId,
    getCachedProject,
    getCachedDocuments,
    setCachedProjectData,
    setCachedDocumentsData,
  ])

  // Add live document status polling
  useEffect(() => {
    if (!project?.id) return

    const pollDocumentStatuses = async () => {
      try {
        console.log('🔄 POLLING: Starting document status poll...')
        const documents = await documentService.getDocumentsByProject(
          project.id,
        )
        console.log(
          '🔄 POLLING: Retrieved',
          documents?.length || 0,
          'documents from database',
        )

        const transformedDocuments: Document[] = (documents || []).map(doc => ({
          id: doc.id,
          name: doc.name || 'Untitled Document',
          type: doc.type || 'unknown',
          size:
            typeof doc.size === 'number'
              ? doc.size
              : parseInt(String(doc.size)) || 0,
          status: doc.status || 'processing',
          url: doc.url,
          thumbnailUrl: doc.thumbnailUrl,
          projectId: doc.projectId,
          content: doc.content,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }))

        console.log(
          '🔄 POLLING: Transformed documents:',
          transformedDocuments.map(d => ({
            id: d.id,
            name: d.name,
            status: d.status,
          })),
        )

        // Only update if there are actual changes to avoid unnecessary re-renders
        setProjectDocuments(prev => {
          console.log(
            '🔄 POLLING: Current list has',
            prev.length,
            'documents, new list has',
            transformedDocuments.length,
          )

          // Check for status changes
          const hasStatusChanges = prev.some((prevDoc, index) => {
            const newDoc = transformedDocuments.find(d => d.id === prevDoc.id)
            return newDoc && newDoc.status !== prevDoc.status
          })

          // Check for document count changes (additions or deletions)
          const hasCountChanges = prev.length !== transformedDocuments.length

          // Check for completely different document sets (by IDs)
          const prevIds = new Set(prev.map(d => d.id))
          const newIds = new Set(transformedDocuments.map(d => d.id))

          // Don't remove recently uploaded documents that might not be in DB yet
          const recentlyUploadedIds = Array.from(recentlyUploadedDocuments)
          const shouldPreserveRecentUploads = recentlyUploadedIds.some(
            id => prevIds.has(id) && !newIds.has(id),
          )

          if (shouldPreserveRecentUploads) {
            console.log(
              '🔄 POLLING: Preserving recently uploaded documents:',
              recentlyUploadedIds,
            )
            // Merge the database documents with recently uploaded ones that aren't in DB yet
            const mergedDocuments = [...transformedDocuments]
            recentlyUploadedIds.forEach(recentId => {
              if (!newIds.has(recentId)) {
                const recentDoc = prev.find(d => d.id === recentId)
                if (recentDoc) {
                  mergedDocuments.push(recentDoc)
                  console.log(
                    '🔄 POLLING: Preserved recently uploaded document:',
                    recentDoc.name,
                  )
                }
              }
            })
            setCachedDocumentsData(mergedDocuments)
            return mergedDocuments
          }

          const hasDocumentChanges =
            prevIds.size !== newIds.size ||
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id))

          if (hasStatusChanges || hasCountChanges || hasDocumentChanges) {
            console.log(
              '� POLLING: Document changes detected, updating list:',
              {
                hasStatusChanges,
                hasCountChanges,
                hasDocumentChanges,
                prevCount: prev.length,
                newCount: transformedDocuments.length,
                prevIds: [...prevIds],
                newIds: [...newIds],
              },
            )
            // Update cache when document list changes
            setCachedDocumentsData(transformedDocuments)
            return transformedDocuments
          } else {
            console.log('🔄 POLLING: No changes detected, keeping current list')
            return prev
          }
        })
      } catch (error) {
        console.error('Error polling document statuses:', error)
      }
    }

    // Determine polling interval based on document statuses
    const hasProcessingDocs =
      projectDocuments?.some(doc => doc.status === 'processing') || false
    const hasFailedDocs =
      projectDocuments?.some(doc => doc.status === 'failed') || false

    let pollInterval: number
    if (hasProcessingDocs) {
      pollInterval = 5000 // Poll every 5 seconds if any docs are processing
    } else if (hasFailedDocs) {
      pollInterval = 15000 // Poll every 15 seconds if any docs failed
    } else {
      pollInterval = 30000 // Poll every 30 seconds for completed docs
    }

    const intervalId = setInterval(pollDocumentStatuses, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [
    project?.id,
    projectDocuments,
    setCachedDocumentsData,
    recentlyUploadedDocuments,
  ])

  const handleUpdateProject = async (data: {
    address: string
    streetNumber?: string
    streetName?: string
    suburb?: string
    postcode?: string
    name: string
    description: string
    slug?: string
  }) => {
    if (!project) return

    try {
      const updatedProject = await projectService.updateProject(
        companyId!,
        project.id,
        {
          name: data.name,
          description: data.description,
          slug: data.slug,
        },
      )

      if (updatedProject) {
        setProject({
          ...project,
          name: updatedProject.name,
          description: updatedProject.description,
          updatedAt: updatedProject.updatedAt,
        })

        toast({
          title: 'Project updated',
          description: 'Your project has been updated successfully.',
        })
      }

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating project:', error)
      toast({
        title: 'Update failed',
        description:
          'There was an error updating your project. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteProject = async () => {
    if (!project || isDeleteLoading) return

    try {
      setIsDeleteLoading(true)
      // Close dialog so fullscreen overlay is clearly visible
      setIsDeleteDialogOpen(false)
      const start = performance.now()

      await projectService.deleteProject(companyId!, project.id)

      // Invalidate React Query cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byCompany(companyId || ''),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.byId(project.id),
      })

      toast({
        title: 'Project deleted',
        description: 'Your project has been deleted successfully.',
      })

      // Ensure overlay is perceivable even on very fast deletes
      const MIN_VISIBLE_MS = 600
      const elapsed = performance.now() - start
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
      setTimeout(() => {
        navigate(routes.company.projects.list(companyId || ''))
      }, remaining)
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: 'Delete failed',
        description:
          'There was an error deleting your project. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const handleUploadDocument = (uploadedDocument: Document) => {
    console.log(
      '📄 Document upload completed:',
      uploadedDocument.name,
      uploadedDocument.id,
      'Current list size:',
      projectDocuments?.length || 0,
    )

    // Track this document as recently uploaded to prevent polling conflicts
    setRecentlyUploadedDocuments(
      prev => new Set([...prev, uploadedDocument.id]),
    )

    // Remove from recently uploaded after 30 seconds to allow normal polling
    setTimeout(() => {
      setRecentlyUploadedDocuments(prev => {
        const updated = new Set(prev)
        updated.delete(uploadedDocument.id)
        return updated
      })
    }, 30000)

    // Check if this document already exists (by ID) - if so, update it; otherwise add it
    const existingDocumentIndex =
      projectDocuments?.findIndex(doc => doc.id === uploadedDocument.id) ?? -1

    console.log(
      '🔍 Checking if document exists:',
      existingDocumentIndex >= 0 ? 'YES (updating)' : 'NO (adding new)',
      'Index:',
      existingDocumentIndex,
    )

    let updatedDocuments: Document[]
    if (existingDocumentIndex >= 0) {
      // Update existing document (e.g., status change from processing to processed)
      updatedDocuments = [...(projectDocuments || [])]
      updatedDocuments[existingDocumentIndex] = uploadedDocument
      console.log('📄 Updated existing document in list:', {
        oldStatus: projectDocuments?.[existingDocumentIndex]?.status,
        newStatus: uploadedDocument.status,
        listSize: updatedDocuments.length,
      })
    } else {
      // Add new document
      updatedDocuments = [...(projectDocuments || []), uploadedDocument]
      console.log('📄 Added new document to list:', {
        name: uploadedDocument.name,
        id: uploadedDocument.id,
        status: uploadedDocument.status,
        oldListSize: projectDocuments?.length || 0,
        newListSize: updatedDocuments.length,
      })
    }

    console.log(
      '🔄 Setting project documents to:',
      updatedDocuments.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status,
      })),
    )
    setProjectDocuments(updatedDocuments)

    // Clear cache to force fresh data fetch on next load
    // This ensures that after page refresh, we get the latest data from the database
    console.log('🗑️ Clearing cache to ensure fresh data on refresh')
    clearCache()

    // Set cache with fresh data for immediate use
    setCachedDocumentsData(updatedDocuments)

    // Invalidate React Query cache to trigger background refetch
    queryClient.invalidateQueries({
      queryKey: queryKeys.documents.byProject(projectId || ''),
    })

    // For batch uploads we no longer auto-close here; rely on onBatchComplete.
    if (existingDocumentIndex < 0) {
      // Delayed refresh disabled: polling + optimistic update handle state.
      // Rationale: multiple overlapping delayed refreshes caused race conditions
      // where a just-added optimistic document vanished if the DB query lagged.
      // If needed later, implement a debounced single refresh using latest refs.
      console.log('� Skipping delayed DB refresh (using optimistic + polling).')
    }
  }

  const forceRefreshDocuments = async () => {
    if (!project?.id) return

    console.log('🔄 Force refreshing documents from database...')
    setIsDocumentsLoading(true)

    try {
      // Clear cache first
      clearCache()

      // Invalidate React Query cache
      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byProject(projectId || ''),
      })

      // Fetch fresh data from database
      const documents = await documentService.getDocumentsByProject(project.id)
      const transformedDocuments: Document[] = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name || 'Untitled Document',
        type: doc.type || 'unknown',
        size:
          typeof doc.size === 'number'
            ? doc.size
            : parseInt(String(doc.size)) || 0,
        status: doc.status || 'processing',
        url: doc.url,
        thumbnailUrl: doc.thumbnailUrl,
        projectId: doc.projectId,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))

      console.log(
        `📊 Force refresh found ${transformedDocuments.length} documents`,
      )
      setProjectDocuments(transformedDocuments)
      setCachedDocumentsData(transformedDocuments)

      toast({
        title: 'Documents refreshed',
        description: `Found ${transformedDocuments.length} documents in project.`,
      })
    } catch (error) {
      console.error('❌ Error force refreshing documents:', error)
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh documents. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDocumentsLoading(false)
    }

    // toast({
    //   title: 'Document uploaded successfully',
    //   description: `${uploadedDocument.name} has been added to this project.`,
    // })
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Find the document to get its projectId (should be the current project)
      const documentToDelete = projectDocuments?.find(
        doc => doc.id === documentId,
      )

      if (!documentToDelete || !companyId || !project) {
        throw new Error('Document, company, or project information not found')
      }

      await documentService.deleteDocument(companyId, project.id, documentId)

      // Invalidate React Query cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byProject(projectId || ''),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byId(documentId),
      })

      // Attempt authoritative refetch for immediate consistency
      try {
        const docs = await documentService.getDocumentsByProject(project.id)
        const transformed: Document[] = (docs || []).map(doc => ({
          id: doc.id,
          name: doc.name || 'Untitled Document',
          type: doc.type || 'unknown',
          size:
            typeof doc.size === 'number'
              ? doc.size
              : parseInt(String(doc.size)) || 0,
          status: doc.status || 'processing',
          url: doc.url,
          thumbnailUrl: doc.thumbnailUrl,
          projectId: doc.projectId,
          content: doc.content,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }))
        setProjectDocuments(transformed)
        setCachedDocumentsData(transformed)
      } catch (e) {
        // Fallback to optimistic removal if refetch fails
        const updatedDocuments =
          projectDocuments?.filter(doc => doc.id !== documentId) || []
        setProjectDocuments(updatedDocuments)
        setCachedDocumentsData(updatedDocuments)
      }

      toast({
        title: 'Document deleted',
        description: 'The document has been removed from this project.',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          'There was an error deleting the document. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelProcessing = async (documentId: string) => {
    try {
      // For now, we'll just update the status to failed to stop the processing indicators
      // In a real implementation, you'd want to actually cancel the background processing
      const documentToCancel = projectDocuments?.find(
        doc => doc.id === documentId,
      )

      if (!documentToCancel || !companyId || !project) {
        throw new Error('Document, company, or project information not found')
      }

      // Update document status to failed (cancelled)
      await documentService.updateDocument(companyId, project.id, documentId, {
        status: 'failed',
      })

      // Update local state
      setProjectDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId ? { ...doc, status: 'failed' as const } : doc,
        ),
      )

      toast({
        title: 'Processing cancelled',
        description: 'Document processing has been cancelled.',
      })
    } catch (error) {
      toast({
        title: 'Cancel failed',
        description:
          'There was an error cancelling the processing. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isProjectLoading) {
    // Show the complete project layout skeleton
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ProjectDetailsSkeleton />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center">
          <p>Project not found</p>
          <Button
            onClick={() =>
              navigate(routes.company.projects.list(companyId || ''))
            }
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid gradient background layers with more variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-slate-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/6 to-violet-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-4 md:space-y-6">
          {/* Mobile-only: hands-free permission priming banner when enabled but not yet granted */}
          {/* Note: Hidden on iOS since wake word requires continuous recognition which iOS doesn't support */}
          {isMobile &&
            enabled &&
            consent === 'true' &&
            !wakePermissionGranted &&
            !/iPad|iPhone|iPod/.test(navigator.userAgent) && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 p-3 flex items-center justify-between">
                <div className="text-sm">
                  Enable hands-free voice by allowing microphone access.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={primeMicPermission}
                  className="ml-3"
                >
                  Allow Microphone
                </Button>
              </div>
            )}
          {isDeleteLoading && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-white gap-4">
              <div className="flex flex-col items-center gap-3">
                <span className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-lg font-semibold tracking-wide">
                  Deleting project…
                </p>
                <p className="text-xs text-white/60">
                  Removing project and associated documents
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(routes.company.projects.list(companyId || ''))
              }
              className="hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text">
                {project.name}
              </h1>
              <p className="text-slate-200 mt-2 text-sm md:text-base">
                {project.description}
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Created on {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto h-12 text-base"
                  >
                    Actions <ChevronDown className="h-5 w-5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuItem
                    onClick={() => setShowAITools(!showAITools)}
                    className="p-3 text-base"
                  >
                    {showAITools ? 'Hide AI Tools' : 'Show AI Tools'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEditDialogOpen(true)}
                    className="p-3 text-base"
                  >
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive p-3 text-base"
                  >
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAITools(!showAITools)}
                >
                  {showAITools ? 'Hide AI Tools' : 'Show AI Tools'}
                </Button>

                <Dialog
                  open={isEditDialogOpen}
                  onOpenChange={setIsEditDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    <ProjectForm
                      onSubmit={handleUpdateProject}
                      defaultValues={{
                        address: project.address || '',
                        streetNumber: project.streetNumber || '',
                        streetName: project.streetName || '',
                        suburb: project.suburb || '',
                        postcode: project.postcode || '',
                        name: project.name,
                        description: project.description,
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Project</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this project? This
                        action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteProject}
                        disabled={isDeleteLoading}
                      >
                        {isDeleteLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Project'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {showAITools && (
            <div className="mb-2 md:mb-4">
              <AIActions
                documentId=""
                projectId={project.id}
                projectName={project.name}
                companyId={companyId || 'default-company'}
              />
            </div>
          )}

          {/* Passive wake word listener active (no indicator; managed in Settings) */}

          {isMobile && (
            <>
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
                  <ProjectForm
                    onSubmit={handleUpdateProject}
                    defaultValues={{
                      address: project.address || '',
                      streetNumber: project.streetNumber || '',
                      streetName: project.streetName || '',
                      suburb: project.suburb || '',
                      postcode: project.postcode || '',
                      name: project.name,
                      description: project.description,
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this project? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProject}
                      disabled={isDeleteLoading}
                    >
                      {isDeleteLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Project'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Documents
            </h2>

            <div className="flex gap-2">
              {/* <Button
                size="sm"
                variant="outline"
                onClick={forceRefreshDocuments}
                disabled={isDocumentsLoading}
                className="flex items-center"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isDocumentsLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button> */}

              <Dialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document to Project</DialogTitle>
                    <DialogDescription>
                      Upload a document to {project.name}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Pass the required props to FileUploader */}
                  <FileUploader
                    projectId={project.id}
                    companyId={companyId || 'default-company'}
                    onUploadComplete={handleUploadDocument}
                    onBatchComplete={(docs, summary) => {
                      // Close dialog after batch completes
                      setIsUploadDialogOpen(false)
                      if (summary.success > 0) {
                        toast({
                          title: 'File upload complete',
                          description: `${summary.success} succeeded${summary.failed ? `, ${summary.failed} failed` : ''}.`,
                        })
                      } else if (summary.failed) {
                        toast({
                          title: 'Batch failed',
                          description: 'All uploads failed. Please try again.',
                          variant: 'destructive',
                        })
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Progressive loading for documents */}
          {isDocumentsLoading ? (
            <DocumentListSkeleton itemCount={3} />
          ) : projectDocuments.length > 0 ? (
            <DocumentList
              documents={projectDocuments}
              onDelete={handleDeleteDocument}
              onCancelProcessing={handleCancelProcessing}
              onRetryProcessing={async () => {
                // Force refresh of documents after retry by clearing cache
                clearCache()
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }}
              projectId={project.id}
              companyId={companyId || 'default-company'}
              projectName={project.name}
            />
          ) : (
            <div className="text-center p-4 md:p-8 border rounded-lg bg-secondary/20">
              <p className="text-gray-400 mb-4">
                No documents in this project yet
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                Add Document
              </Button>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}
export default ProjectDetails
