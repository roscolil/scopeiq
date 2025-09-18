import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  Search,
  FileSearch,
  Copy,
  MessageSquare,
  FileStack,
  RefreshCw,
  Loader2,
  Mic,
  Volume2,
  Square,
  RotateCcw,
  AudioLines,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { VoiceShazamButton } from '@/components/voice/VoiceShazamButton'
import { ChatExport } from '@/components/ai/ChatExport'
import { answerQuestionWithBedrock } from '@/utils/aws/aws'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { callOpenAI } from '@/services/ai/openai'
import { novaSonic } from '@/services/api/nova-sonic'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { VoiceId } from '@aws-sdk/client-polly'
import { useSemanticSearch } from '@/hooks/useSemanticSearch'
import { semanticSearch } from '@/services/ai/embedding'
import { documentService } from '@/services/data/hybrid'
import { Document } from '@/types'
import { retryDocumentProcessing } from '@/utils/data/document-recovery'
import useWakeWordPreference, {
  WAKEWORD_PREF_EVENT,
} from '@/hooks/useWakeWordPreference'

// Python backend imports
import { usePythonChat } from '@/hooks/usePythonChat'
import {
  handleEnhancedAIQueryWithPython,
  getBackendConfig,
  type BackendConfig,
} from '@/services/ai/enhanced-ai-workflow-python'
import { isPythonChatAvailable } from '@/services/ai/python-chat-service'

interface AIActionsProps {
  documentId: string
  projectId?: string
  projectName?: string
  companyId?: string
}

export const AIActions = ({
  documentId,
  projectId,
  projectName,
  companyId,
}: AIActionsProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    type: 'search' | 'ai'
    searchResults?: {
      ids: string[][]
      distances?: number[][]
      metadatas?: Array<
        Array<{ name?: string } & Record<string, string | number | boolean>>
      >
      documents?: string[][]
    }
    aiAnswer?: string
    query?: string
  } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    documentId ? 'document' : 'project', // Default to project scope if no documentId
  )
  const [isLoading, setIsLoading] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [hideShazamButton, setHideShazamButton] = useState(false)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [shouldResumeListening, setShouldResumeListening] = useState(false)
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [lastProcessedTranscript, setLastProcessedTranscript] =
    useState<string>('')
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('')
  // Local UI speech replay state (separate from isVoicePlaying to support replay after completion)
  const [canReplay, setCanReplay] = useState(false)
  // Rate limiting for mobile devices
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0)
  // Android-specific transcript tracking for better duplicate prevention
  const [androidTranscriptHistory, setAndroidTranscriptHistory] = useState<
    string[]
  >([])
  // Enhanced AI progress tracking with minimum display duration
  const [enhancedAIProgress, setEnhancedAIProgress] = useState<string>('')
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Map verbose progress messages to brief user-friendly ones
  const formatProgressMessage = (stage: string): string => {
    const progressMap: Record<string, string> = {
      'Using Python backend...': 'Initializing...',
      'Using existing backend...': 'Connecting...',
      'Falling back to existing backend...': 'Reconnecting...',
      'Preparing chat request...': 'Preparing...',
      'Sending request to Python backend...': 'Sending...',
      'Processing response...': 'Processing...',
      'Analyzing query...': 'Analyzing...',
      'Getting enhanced context...': 'Loading context...',
      'Generating response...': 'Generating...',
      'Searching documents...': 'Searching...',
    }
    const mapped = progressMap[stage] || stage
    console.log(`🔄 Progress stage: "${stage}" → "${mapped}"`)
    return mapped
  }
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)

  // Broadcast dictation activity so wake word listener can suspend to avoid dual recognizers
  useEffect(() => {
    const evtName = isListening ? 'dictation:start' : 'dictation:stop'
    window.dispatchEvent(new Event(evtName))
    // Debug
    console.log('[dictation-activity] dispatched', evtName)
  }, [isListening])

  // Python backend state - enhancing existing functionality
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null)
  const [currentBackend, setCurrentBackend] = useState<
    'python' | 'existing' | 'unknown'
  >('unknown')
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null)

  // Mobile-only voice recognition (when VoiceInput is not available)
  const mobileRecognitionRef = useRef<typeof SpeechRecognition | null>(null)

  // Chat history state
  interface ChatMessage {
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
    query?: string // Store original query for user messages
  }
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to keep chat in viewport (not all the way to bottom)
  const scrollToBottom = () => {
    // Scroll to the chat container to keep it visible, with some offset from top
    chatContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start', // This positions the chat container at the top of the viewport
    })

    // Small delay then scroll to show the latest message without going all the way to bottom
    setTimeout(() => {
      if (chatEndRef.current && chatContainerRef.current) {
        const containerRect = chatContainerRef.current.getBoundingClientRect()
        const endRect = chatEndRef.current.getBoundingClientRect()

        // Only scroll within the chat container if needed
        const chatContainer = chatContainerRef.current
        if (chatContainer.scrollHeight > chatContainer.clientHeight) {
          chatContainer.scrollTop =
            chatContainer.scrollHeight - chatContainer.clientHeight
        }
      }
    }, 300)
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  // Use semantic search hook for real search functionality
  const {
    results: searchResults,
    loading: isSearching,
    error: searchError,
    search,
  } = useSemanticSearch(projectId || '')

  // Loop-safe voice wrapper
  const speakWithStateTracking = useCallback(
    async (
      prompt: string,
      options: { voice?: VoiceId; stopListeningAfter?: boolean } = {},
    ) => {
      console.log('🎵 speakWithStateTracking called with:', {
        promptLength: prompt.length,
        isVoicePlaying,
        novaSonicAvailable: novaSonic.isAvailable(),
      })

      // --- Autoplay / Audio Unlock Gating ---------------------------------
      // Browsers may block programmatic audio (TTS) before a user gesture.
      // We maintain a simple unlock flag & queue one pending utterance.
      // --------------------------------------------------------------------
      // Refs declared outside callback (hoisted below)
      if (!audioUnlockedRef.current) {
        console.log('🔒 Audio locked (no user gesture yet). Queuing speech.')
        // Keep only the most recent pending request
        pendingSpeechRef.current = { prompt, options }
        if (!audioUnlockToastShownRef.current) {
          audioUnlockToastShownRef.current = true
          toast({
            title: 'Enable Audio Playback',
            description:
              'Tap or press any key once to allow AI voice responses.',
            duration: 4000,
          })
        }
        return
      }

      if (!novaSonic.isAvailable()) {
        console.log('❌ Nova Sonic not available')
        return
      }

      // Prevent overlapping voice responses
      if (isVoicePlaying) {
        console.log('🔄 Skipping voice response - already playing audio')
        return
      }

      try {
        // Remember if we were listening before voice output
        const wasListening = isListening
        setShouldResumeListening(wasListening && !options.stopListeningAfter)
        setIsVoicePlaying(true)

        // Show the text that's being spoken
        setCurrentSpeakingText(prompt)

        console.log('🗣️ Starting voice output, was listening:', wasListening)

        // IMPORTANT: Clear any pending auto-submit timers
        if (silenceTimer) {
          console.log('🛑 Clearing silence timer before voice output')
          clearTimeout(silenceTimer)
          setSilenceTimer(null)
        }

        // Reset transcript processing flag
        hasTranscriptRef.current = false

        // Stop voice input while speaking
        if (isListening) {
          setIsListening(false)
        }

        // Wait for voice to complete
        console.log('🎵 Waiting for voice synthesis to complete...')
        await novaSonic.speakPrompt(prompt, { voice: options.voice })

        console.log('✅ Voice output completed successfully')

        // If stopListeningAfter is true, don't resume listening
        if (options.stopListeningAfter) {
          console.log('🎤 Stopping microphone listening after verbal response')
          setShouldResumeListening(false)
        }
      } catch (error) {
        console.error('❌ Voice synthesis error:', error)
        // Handle autoplay block gracefully & requeue
        if (
          error instanceof DOMException &&
          (error.name === 'NotAllowedError' ||
            /notallowed/i.test(error.message))
        ) {
          console.log('🔐 Detected autoplay block, marking audio as locked')
          audioUnlockedRef.current = false
          pendingSpeechRef.current = { prompt, options }
          if (!audioUnlockToastShownRef.current) {
            audioUnlockToastShownRef.current = true
            toast({
              title: 'Tap to Enable Sound',
              description:
                'Your browser blocked audio. Tap the page once to hear AI responses.',
              duration: 5000,
            })
          }
        }
        // Reset voice playing state on error
        setIsVoicePlaying(false)
        setCurrentSpeakingText('')
      } finally {
        // Clear speaking text and voice state when audio finishes
        setCurrentSpeakingText('')
        setIsVoicePlaying(false)
        console.log('🔄 Voice playing set to false')
        try {
          window.dispatchEvent(new CustomEvent('ai:speech:complete'))
        } catch {
          /* noop */
        }
      }
    },
    [isListening, silenceTimer, isVoicePlaying, toast],
  )

  // --- Audio Unlock Management --------------------------------------------
  // Tracks whether the user has interacted (pointer/keyboard) enabling audio.
  // ------------------------------------------------------------------------
  const audioUnlockedRef = useRef<boolean>(false)
  const pendingSpeechRef = useRef<{
    prompt: string
    options: { voice?: VoiceId; stopListeningAfter?: boolean }
  } | null>(null)
  const audioUnlockToastShownRef = useRef(false)

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true
        console.log('🔓 Audio unlocked via user interaction')
        // Flush queued speech if present & not already playing
        if (pendingSpeechRef.current && !isVoicePlaying) {
          const { prompt, options } = pendingSpeechRef.current
          ;(async () => {
            // small delay to ensure gesture registration fully propagated
            await new Promise(res => setTimeout(res, 50))
            console.log('▶️ Playing previously queued speech after unlock')
            pendingSpeechRef.current = null
            speakWithStateTracking(prompt, options).catch(console.error)
          })()
        }
      }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [isVoicePlaying, speakWithStateTracking])

  // Fetch document status on component mount and set up live polling
  useEffect(() => {
    const fetchDocumentStatus = async () => {
      // Only fetch document status if we have all required IDs
      if (!documentId || !projectId || !companyId) {
        // If no documentId, we're in project scope mode
        if (!documentId) {
          setQueryScope('project')
        }
        return
      }

      setIsLoadingStatus(true)
      try {
        const doc = await documentService.getDocument(
          companyId,
          projectId,
          documentId,
        )
        setDocument(doc)
      } catch (error) {
        console.error('Error fetching document status:', error)
        // If we can't fetch the document, fall back to project scope
        setQueryScope('project')
      } finally {
        setIsLoadingStatus(false)
      }
    }

    // Initial fetch
    fetchDocumentStatus()

    // Set up adaptive polling with status-dependent intervals (only if we have a documentId)
    let intervalId: NodeJS.Timeout | null = null

    const startPolling = () => {
      // Only start polling if we have a documentId
      if (!documentId) return

      // Clear any existing interval
      if (intervalId) {
        clearInterval(intervalId)
      }

      // Determine polling frequency based on current document status
      const currentStatus = document?.status
      let pollInterval: number

      if (currentStatus === 'processing') {
        pollInterval = 3000 // Poll every 3 seconds for processing documents
      } else if (currentStatus === 'failed') {
        pollInterval = 10000 // Poll every 10 seconds for failed documents
      } else if (currentStatus === 'processed') {
        pollInterval = 30000 // Poll every 30 seconds for completed documents
      } else {
        pollInterval = 5000 // Default 5 seconds for other states
      }

      intervalId = setInterval(fetchDocumentStatus, pollInterval)
    }

    // Start polling immediately (only if we have a document)
    if (documentId) {
      startPolling()
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [documentId, projectId, companyId, document?.status])

  // Add debugging info on component mount
  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [documentId, projectId, companyId, silenceTimer])

  // Python backend health checking and configuration
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        const config = await getBackendConfig()
        setBackendConfig(config)

        // Check Python backend availability
        if (isPythonChatAvailable()) {
          setCurrentBackend('python')
          setBackendHealth(true)
        } else {
          setCurrentBackend('existing')
          setBackendHealth(false)
        }
      } catch (error) {
        console.warn('Failed to initialize Python backend:', error)
        setCurrentBackend('existing')
        setBackendHealth(false)
      }
    }

    initializeBackend()
  }, [])

  // Get status badge component similar to DocumentList
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            AI Ready
          </Badge>
        )
      case 'processing':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500 text-white flex items-center gap-1"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Enhanced manual refresh function with better feedback
  const refreshDocumentStatus = async () => {
    if (!documentId || !projectId || !companyId) return

    setIsLoadingStatus(true)
    try {
      const doc = await documentService.getDocument(
        companyId,
        projectId,
        documentId,
      )
      const previousStatus = document?.status
      setDocument(doc)

      // Provide more detailed feedback based on status change
      if (previousStatus !== doc?.status) {
        toast({
          title: 'Status Updated',
          description: `Document status changed from ${previousStatus || 'unknown'} to ${doc?.status || 'unknown'}`,
        })
      } else {
        toast({
          title: 'Status Refreshed',
          description: `Document status: ${doc?.status || 'unknown'} (no change)`,
        })
      }
    } catch (error) {
      console.error('Error refreshing document status:', error)
      toast({
        title: 'Refresh Failed',
        description: 'Could not update document status. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // Fix stuck processing documents
  const fixStuckDocument = async () => {
    if (!documentId || !projectId || !companyId) return

    setIsLoadingStatus(true)
    try {
      const success = await retryDocumentProcessing(
        companyId,
        projectId,
        documentId,
      )

      if (success) {
        // Refresh the document status
        const doc = await documentService.getDocument(
          companyId,
          projectId,
          documentId,
        )
        setDocument(doc)

        toast({
          title: 'Document Fixed',
          description:
            'Document processing has been retried and completed successfully.',
        })
      } else {
        toast({
          title: 'Fix Failed',
          description:
            'Could not fix the document. It has been marked as failed.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fixing stuck document:', error)
      toast({
        title: 'Fix Failed',
        description: 'An error occurred while trying to fix the document.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // Smart query detection - determines if it's a search or AI question
  const isQuestion = (text: string): boolean => {
    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
      'can',
      'does',
      'is',
      'are',
      'will',
      'should',
      'could',
      'would',
    ]
    const questionMarkers = [
      '?',
      'explain',
      'tell me',
      'show me',
      'help me',
      'find out',
    ]

    const lowerText = text.toLowerCase()
    const startsWithQuestionWord = questionWords.some(word =>
      lowerText.startsWith(word + ' '),
    )
    const hasQuestionMarker = questionMarkers.some(marker =>
      lowerText.includes(marker),
    )

    return startsWithQuestionWord || hasQuestionMarker
  }

  const handleQuery = useCallback(
    async (queryText?: string) => {
      const queryToUse = queryText || query
      if (!queryToUse.trim()) return

      // Rate limiting - prevent submissions faster than 2 seconds apart on mobile
      const now = Date.now()
      if (isMobile && now - lastSubmissionTime < 2000) {
        console.log('🔄 Rate limiting: Submission too fast, skipping')
        toast({
          title: 'Please wait',
          description: 'Please wait a moment before asking another question.',
          duration: 1500,
        })
        return
      }
      setLastSubmissionTime(now)

      if (!projectId) {
        toast({
          title: 'Project Required',
          description:
            'Project ID is required for search and AI functionality.',
          variant: 'destructive',
        })
        return
      }

      // Check document status before proceeding
      if (queryScope === 'document') {
        // If no documentId but scope is document, switch to project
        if (!documentId) {
          setQueryScope('project')
          toast({
            title: 'Switched to Project Scope',
            description: projectName
              ? `No specific document selected, searching across "${projectName}".`
              : 'No specific document selected, searching across the entire project.',
          })
          // Continue with project-wide search
        } else if (!document) {
          toast({
            title: 'Document Loading',
            description:
              'Document information is still loading. Please wait a moment and try again.',
            variant: 'destructive',
          })
          return
        } else if (document.status === 'processing') {
          toast({
            title: 'Document Processing',
            description: projectName
              ? `This document is still being processed. Switching to search across "${projectName}" instead.`
              : 'This document is still being processed. Switching to project-wide search instead.',
          })
          // Switch to project scope instead of blocking
          setQueryScope('project')
        } else if (document.status === 'failed') {
          toast({
            title: 'Document Processing Failed',
            description: projectName
              ? `This document failed to process. Switching to search across "${projectName}" instead.`
              : 'This document failed to process. Switching to project-wide search instead.',
          })
          // Switch to project scope
          setQueryScope('project')
        }
      }

      console.log('Starting query:', {
        query: queryToUse,
        projectId,
        queryScope,
      })
      setIsLoading(true)
      setResults(null)
      setLastSpokenResponse('') // Clear previous spoken response for new queries
      setIsVoicePlaying(false) // Reset voice playing state for new queries
      setEnhancedAIProgress('') // Clear previous progress state

      try {
        if (isQuestion(queryToUse)) {
          // Handle as AI question - first get relevant content via semantic search
          const searchParams: {
            projectId: string
            query: string
            topK: number
            documentId?: string
          } = {
            projectId: projectId,
            query: queryToUse,
            topK: 50, // Increased to capture more chunks - construction docs have many small chunks
          }

          // Only add documentId filter for document-specific queries if we have a valid document
          if (
            queryScope === 'document' &&
            documentId &&
            document?.status === 'processed'
          ) {
            searchParams.documentId = documentId
          }

          const searchResponse = await semanticSearch(searchParams)

          // Build context from search results
          let context = ``
          if (queryScope === 'document' && documentId && document) {
            context = `Document ID: ${documentId}\nDocument Name: ${document.name || 'Unknown'}\n`
          } else {
            context = `Project ID: ${projectId}\nSearching across entire project.\n`
          }

          // Add relevant document content as context
          if (
            searchResponse &&
            searchResponse.documents &&
            searchResponse.documents[0] &&
            searchResponse.documents[0].length > 0
          ) {
            const relevantContent = searchResponse.documents[0]
              .slice(0, 3) // Use top 3 results
              .map((doc, i) => {
                return `Content: ${doc}`
              })
              .join('\n\n')

            context += `\nRelevant Documents:\n${relevantContent}\n\nIMPORTANT: When providing your answer, base it on the content provided above.`
          } else {
            if (queryScope === 'document') {
              context += `\nNo content found for this specific document. The document may not have been fully processed or may not contain extractable text content.`
            } else {
              context += `\nNo relevant document content found for this query. The system may not have processed documents for this project yet.`
            }
          }

          // Try Python backend first, fallback to existing OpenAI
          let response: string
          try {
            if (currentBackend === 'python' && backendHealth) {
              const pythonResponse = await handleEnhancedAIQueryWithPython({
                query: queryToUse,
                projectId: projectId,
                documentId: queryScope === 'document' ? documentId : undefined,
                projectName,
                document: document || undefined,
                queryScope,
                onProgress: stage => {
                  console.log('Enhanced AI Progress:', stage)
                  const formattedStage = formatProgressMessage(stage)

                  // Clear any existing timer
                  if (progressTimerRef.current) {
                    clearTimeout(progressTimerRef.current)
                  }

                  // Set the new progress immediately
                  setEnhancedAIProgress(formattedStage)

                  // Set a minimum display duration for visibility
                  progressTimerRef.current = setTimeout(() => {
                    // Only clear if this is still the current stage
                    setEnhancedAIProgress(prev =>
                      prev === formattedStage ? prev : prev,
                    )
                  }, 800) // Keep each stage visible for at least 800ms
                },
                options: {
                  usePythonBackend: true,
                  fallbackToExisting: true,
                  onBackendSwitch: backend => {
                    setCurrentBackend(backend)
                    console.log(`Switched to ${backend} backend`)
                  },
                },
              })
              response = pythonResponse.response
            } else {
              response = await callOpenAI(queryToUse, context)
            }
          } catch (error) {
            console.warn('Primary backend failed, falling back:', error)
            // Fallback to existing system
            response = await callOpenAI(queryToUse, context)
          }

          // Add user message to chat history
          const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            type: 'user',
            content: queryToUse,
            timestamp: new Date(),
            query: queryToUse,
          }

          // Add AI response to chat history
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: response,
            timestamp: new Date(),
          }

          setChatHistory(prev => [...prev, userMessage, aiMessage])

          setResults({
            type: 'ai',
            aiAnswer: response,
            query: queryToUse,
          })

          // Prepare replay availability
          setCanReplay(false)

          // Clear the query field after successful AI response
          setQuery('')

          // Only show toast on desktop, not mobile
          if (!isMobile) {
            toast({
              title: 'AI Analysis Complete',
              description: `Your question about the ${queryScope === 'document' ? 'document' : projectName ? `project "${projectName}"` : 'project'} has been answered.`,
            })
          }

          // Always try to speak AI response (queued if audio locked). Deduplicate only if identical text already queued & playing.
          if (response && response.length > 0) {
            const shouldSpeak =
              response !== lastSpokenResponse || !isVoicePlaying
            if (shouldSpeak) {
              console.log(
                '🗣️ Speaking AI response (always-on):',
                response.slice(0, 80),
              )
              setLastSpokenResponse(response)
              setTimeout(() => {
                speakWithStateTracking(response, {
                  voice: 'Ruth',
                  stopListeningAfter: true,
                }).catch(console.error)
                setTimeout(() => setCanReplay(true), 1500)
              }, 400) // slightly shorter delay now that we always speak
            }
          }
        } else {
          // Handle as semantic search with proper document scoping
          const searchParams: {
            projectId: string
            query: string
            topK: number
            documentId?: string
          } = {
            projectId: projectId,
            query: queryToUse,
            topK: 10, // More results for search than AI context
          }

          // Only add documentId filter for document-specific queries if we have a valid document
          if (
            queryScope === 'document' &&
            documentId &&
            document?.status === 'processed'
          ) {
            searchParams.documentId = documentId
          }

          const searchResponse = await semanticSearch(searchParams)

          // Check if we got results
          if (
            searchResponse &&
            searchResponse.ids &&
            searchResponse.ids[0] &&
            searchResponse.ids[0].length > 0
          ) {
            // Add user search query to chat history
            const userMessage: ChatMessage = {
              id: `user-search-${Date.now()}`,
              type: 'user',
              content: query,
              timestamp: new Date(),
              query: query,
            }

            // Add search results summary to chat history
            const resultCount = searchResponse.ids[0].length
            const searchSummary = `Found ${resultCount} relevant document${resultCount > 1 ? 's' : ''} for your search.`
            const aiMessage: ChatMessage = {
              id: `ai-search-${Date.now()}`,
              type: 'ai',
              content: searchSummary,
              timestamp: new Date(),
            }

            setChatHistory(prev => [...prev, userMessage, aiMessage])

            setResults({
              type: 'search',
              searchResults: searchResponse as typeof searchResults,
            })

            // Always speak the summary (will queue if locked)
            speakWithStateTracking(searchSummary, {
              voice: 'Ruth',
              stopListeningAfter: true,
            }).catch(console.error)

            // Clear the query field after successful search
            setQuery('')
          } else {
            // Add user search query to chat history even when no results
            const userMessage: ChatMessage = {
              id: `user-no-results-${Date.now()}`,
              type: 'user',
              content: query,
              timestamp: new Date(),
              query: query,
            }

            // Add no results message to chat history
            const noResultsMsg =
              "I couldn't find any relevant documents for your search. Try rephrasing your query or asking a different question."
            const aiMessage: ChatMessage = {
              id: `ai-no-results-${Date.now()}`,
              type: 'ai',
              content: noResultsMsg,
              timestamp: new Date(),
            }

            setChatHistory(prev => [...prev, userMessage, aiMessage])

            // No results found for search query
            toast({
              title: 'No Results Found',
              description:
                'Try rephrasing your search or asking a different question.',
              variant: 'destructive',
            })

            // Speak the no results message
            speakWithStateTracking(noResultsMsg, {
              voice: 'Ruth',
              stopListeningAfter: true,
            }).catch(console.error)

            // Clear the query field
            setQuery('')
          }

          toast({
            title: 'Search Complete',
            description: `Found results ${queryScope === 'document' ? 'in this document' : projectName ? `in project "${projectName}"` : 'across the project'}.`,
          })
        }
      } catch (error) {
        console.error('Query Error:', error)

        let title = 'Query Failed'
        let description =
          'Please try again or contact support if the problem persists.'

        if (error instanceof Error) {
          const errorMessage = error.message
          if (errorMessage.includes('API key is not configured')) {
            title = 'Configuration Error'
            description =
              'OpenAI API key is missing from environment variables.'
          } else if (errorMessage.includes('OpenAI API error')) {
            title = 'AI Service Error'
            description = errorMessage.replace('OpenAI API error: ', '')
          }
        }

        toast({
          title,
          description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
        setEnhancedAIProgress('') // Clear progress when query completes
      }
    },
    [
      query,
      projectId,
      queryScope,
      documentId,
      document,
      projectName,
      isMobile,
      toast,
      speakWithStateTracking,
      setChatHistory,
      setResults,
      setQuery,
      setIsLoading,
      currentBackend,
      backendHealth,
      isVoicePlaying,
      lastSpokenResponse,
      setLastSpokenResponse,
      lastSubmissionTime,
    ],
  )

  // Handle search results from the hook - DISABLED to prevent conflicts
  // We handle search results directly in handleQuery() instead
  /*
  useEffect(() => {
    // Only process search results if we actually submitted a query
    if (!hasSubmittedQuery) return

    if (
      searchResults &&
      searchResults.ids &&
      searchResults.ids[0] &&
      searchResults.ids[0].length > 0
    ) {
      setResults({
        type: 'search',
        searchResults: searchResults,
      })
      // Reset the flag after successful results
      setHasSubmittedQuery(false)
    } else if (
      searchResults &&
      searchResults.ids &&
      searchResults.ids[0] &&
      searchResults.ids[0].length === 0 &&
      query.trim()
    ) {
      // No results found - show toast only (no voice)
      toast({
        title: 'No Results Found',
        description: 'Try rephrasing your question or asking about something else.',
        variant: 'destructive',
      })
      // Reset the flag after showing no results
      setHasSubmittedQuery(false)
    }
  }, [searchResults, query, speakWithStateTracking, toast, hasSubmittedQuery])
  */

  // Stop voice input when voice output is playing
  useEffect(() => {
    if (isVoicePlaying && isListening) {
      console.log('🛑 Stopping voice input due to voice output')
      setIsListening(false)
    }
  }, [isVoicePlaying, isListening])

  // Resume listening after voice playback finishes
  useEffect(() => {
    if (!isVoicePlaying && shouldResumeListening) {
      console.log('🎤 Voice finished, preparing to resume listening...')

      // Give a moment for everything to settle
      const timer = setTimeout(() => {
        console.log('🎤 Resuming voice input now!')
        setIsListening(true)
        setShouldResumeListening(false)
        toast({
          title: 'Voice input resumed',
          description: 'Ready for your next question...',
          duration: 1500,
        })
      }, 1500) // Slightly longer delay for more reliability

      return () => clearTimeout(timer)
    }
  }, [isVoicePlaying, shouldResumeListening, toast])

  const handleSearch = () => {
    handleQuery()
  }

  // Legacy method - redirecting to the newer handleQuery method
  const askQuestion = async () => {
    await handleQuery()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The text has been copied to your clipboard.',
    })
  }

  // Stop current speech playback if any
  const cancelSpeech = useCallback(() => {
    if (isVoicePlaying) {
      const stopped = novaSonic.stopCurrentPlayback?.()
      if (stopped) {
        // Immediately reflect stopped state & enable replay
        setIsVoicePlaying(false)
        setCurrentSpeakingText('')
        if (lastSpokenResponse) {
          setCanReplay(true)
        }
        toast({
          title: 'Playback Stopped',
          description: 'AI speech playback has been stopped.',
        })
      }
    }
  }, [isVoicePlaying, toast, lastSpokenResponse])

  // Replay last spoken response (only if not currently speaking and we have content)
  const handleReplay = useCallback(() => {
    if (!isVoicePlaying && lastSpokenResponse) {
      setCanReplay(false)
      speakWithStateTracking(lastSpokenResponse, {
        voice: 'Ruth',
        stopListeningAfter: true,
      })
        .then(() => {
          // Re-enable replay after short cooldown
          setTimeout(() => setCanReplay(true), 1000)
        })
        .catch(error => console.error('Replay error:', error))
    }
  }, [isVoicePlaying, lastSpokenResponse, speakWithStateTracking])

  // iOS-specific function to play response with user interaction
  const playResponseWithUserGesture = useCallback(
    async (text: string) => {
      if (!text) return

      try {
        console.log('🍎 iOS user-initiated speech playback')
        await speakWithStateTracking(text, {
          voice: 'Ruth',
          stopListeningAfter: false,
        })
      } catch (error) {
        console.error('Error playing response:', error)
        toast({
          title: 'Playback Error',
          description: 'Unable to play the response. Please try again.',
          variant: 'destructive',
        })
      }
    },
    [speakWithStateTracking, toast],
  )

  const toggleListening = useCallback(() => {
    const newListeningState = !isListening
    setIsListening(newListeningState)

    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    if (newListeningState) {
      hasTranscriptRef.current = false

      // Start mobile recognition when listening begins
      if (isMobile && mobileRecognitionRef.current) {
        try {
          // iOS Safari fix: Ensure we have user gesture and permissions
          if (
            navigator.userAgent.includes('iPhone') ||
            navigator.userAgent.includes('iPad')
          ) {
            console.log('🍎 Starting iOS voice recognition with user gesture')

            // Request microphone permission explicitly on iOS
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then(async () => {
                  console.log('🍎 iOS microphone permission granted')

                  // Audio is ready for automatic speech responses
                  console.log('🍎 Audio ready for automatic responses')

                  mobileRecognitionRef.current?.start()
                })
                .catch(error => {
                  console.error('🍎 iOS microphone permission denied:', error)
                  toast({
                    title: 'Microphone Permission Required',
                    description:
                      'Please allow microphone access in Safari settings to use voice input.',
                    variant: 'destructive',
                  })
                  setIsListening(false)
                })
            } else {
              // Fallback for older iOS versions
              mobileRecognitionRef.current.start()
            }
          } else {
            // Non-iOS devices
            mobileRecognitionRef.current.start()
          }
        } catch (error) {
          console.error('Error starting mobile recognition:', error)

          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              toast({
                title: 'Microphone Permission Denied',
                description:
                  'Please allow microphone access to use voice input.',
                variant: 'destructive',
              })
            } else if (error.name === 'NotSupportedError') {
              toast({
                title: 'Voice Recognition Not Supported',
                description: 'Your browser does not support voice recognition.',
                variant: 'destructive',
              })
            } else {
              toast({
                title: 'Voice Recognition Error',
                description:
                  'Unable to start voice recognition. Please try again.',
                variant: 'destructive',
              })
            }
          }

          setIsListening(false)
        }
      }

      // Only show toast on desktop, not mobile
      if (!isMobile) {
        toast({
          title: 'Voice input started',
          description: 'Speak your question now...',
        })
      }
    } else {
      // Stop mobile recognition when listening ends
      if (isMobile && mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping mobile recognition:', error)
        }
      }

      // No toast when stopping - user will see results or feedback from query processing
    }
  }, [isListening, silenceTimer, isMobile, toast])

  // Programmatic activation via custom event (e.g., wake word)
  useEffect(() => {
    const handler = () => {
      // Only start if not already listening and not currently playing voice
      if (!isListening && !isVoicePlaying) {
        // Provide subtle hint only on desktop
        if (!isMobile) {
          toast({
            title: 'Listening…',
            description: 'Wake word activated. Speak your question.',
          })
        }
        toggleListening()
      }
    }
    window.addEventListener('wakeword:activate-mic', handler)
    return () => window.removeEventListener('wakeword:activate-mic', handler)
  }, [isListening, isVoicePlaying, isMobile, toast, toggleListening])

  const handleTranscript = useCallback(
    (text: string) => {
      // In preventLoop mode, this should rarely be called since we avoid final transcript submission
      console.log(
        '⚠️ Final transcript handler called in preventLoop mode - this may indicate an issue',
      )

      // Prevent processing if voice is currently playing (loop prevention)
      if (isVoicePlaying) {
        console.log('🛑 Ignoring final transcript during voice playback:', text)
        return
      }

      console.log('✅ Processing final voice transcript:', text)
      setQuery(text)
      hasTranscriptRef.current = true

      // In preventLoop mode, don't immediately submit - rely on interim transcript silence detection
      if (text.trim()) {
        console.log(
          '🔄 Final transcript received, but deferring to interim-based silence detection',
        )
        // Don't submit immediately, let the interim transcript silence detection handle it
      }
    },
    [isVoicePlaying],
  )

  // Handle interim transcript updates (real-time display)
  const handleInterimTranscript = useCallback(
    (text: string) => {
      // Prevent processing if voice is currently playing (loop prevention)
      if (isVoicePlaying) {
        console.log(
          '🛑 Ignoring interim transcript during voice playback:',
          text,
        )
        return
      }

      setInterimTranscript(text)
      // Update query field in real-time but don't set submission flag
      setQuery(text)

      // Only start silence detection if we have some text
      if (text.trim()) {
        hasTranscriptRef.current = true

        // Clear existing timer every time we get speech activity
        if (silenceTimer) {
          clearTimeout(silenceTimer)
          console.log('🔄 Speech activity detected, resetting silence timer')
        }

        // Start new silence timer with longer duration for natural speech
        const timer = setTimeout(
          () => {
            // Double-check we should auto-submit after extended silence
            const currentQuery = query || text
            if (
              currentQuery.trim() &&
              hasTranscriptRef.current &&
              !isVoicePlaying &&
              isListening
            ) {
              console.log(
                `⏰ Auto-submitting query after ${isMobile ? '1.5s' : '2s'} of silence:`,
                currentQuery.slice(0, 100),
              )
              // Set loading state immediately to prevent button flash
              setIsLoading(true)
              // Stop listening before submitting
              if (isListening) {
                toggleListening()
              }
              setTimeout(() => {
                if (!isVoicePlaying) {
                  handleQuery()
                }
              }, 100)
            } else {
              console.log('⏰ Skipping auto-submit - conditions not met:', {
                hasQuery: !!currentQuery.trim(),
                hasTranscript: hasTranscriptRef.current,
                isVoicePlaying,
                isListening,
              })
            }
          },
          isMobile ? 1500 : 1500,
        ) // Shorter timeout on mobile for better responsiveness

        setSilenceTimer(timer)
        console.log(
          '⏰ Started silence timer for:',
          text.slice(0, 50),
          `(${isMobile ? '1.5s' : '2s'} timeout)`,
        )
      }
    },
    [
      isVoicePlaying,
      silenceTimer,
      query,
      isListening,
      isMobile,
      toggleListening,
      handleQuery,
    ],
  )

  // Mobile voice recognition setup (when VoiceInput component is not rendered)
  useEffect(() => {
    // DISABLED: Using VoiceShazamButtonSelfContained instead
    return

    if (!isMobile) return // Only for mobile

    if (typeof window !== 'undefined' && !mobileRecognitionRef.current) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI()

        // iOS Safari specific optimizations
        const isIOS =
          navigator.userAgent.includes('iPhone') ||
          navigator.userAgent.includes('iPad')

        if (isIOS) {
          console.log('🍎 Configuring voice recognition for iOS Safari')
          recognition.continuous = false // iOS works better with non-continuous mode
          recognition.interimResults = false // Disable interim results on iOS for stability
        } else {
          recognition.continuous = false // Disable continuous on mobile to prevent loops
          recognition.interimResults = true
        }

        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        let mobileTranscript = ''

        recognition.onresult = event => {
          if (isVoicePlaying) return // Ignore during playback

          const results = Array.from(event.results)
          let completeTranscript = ''

          for (let i = 0; i < results.length; i++) {
            completeTranscript += results[i][0].transcript
          }

          mobileTranscript = completeTranscript
          console.log('📱 Mobile voice transcript:', completeTranscript)

          // Update query in real-time
          setQuery(completeTranscript)
          setInterimTranscript(completeTranscript)

          // Auto-submit after mobile-optimized delay
          if (completeTranscript.trim()) {
            hasTranscriptRef.current = true

            if (silenceTimer) {
              clearTimeout(silenceTimer)
            }

            // Capture the transcript in the closure
            const transcriptToSubmit = completeTranscript
            const timer = setTimeout(() => {
              const trimmedTranscript = transcriptToSubmit.trim()
              if (trimmedTranscript && trimmedTranscript.length > 0) {
                setQuery(trimmedTranscript)
                // Set loading state immediately to prevent button flash
                setIsLoading(true)
                setIsListening(false) // Stop listening
                // Trigger the query with the transcript parameter
                setTimeout(() => {
                  handleQuery(trimmedTranscript)
                }, 300)
              }
            }, 1500) // 1.5s for mobile

            setSilenceTimer(timer)
          }
        }

        recognition.onerror = event => {
          console.error('📱 Mobile voice error:', event.error)

          // iOS-specific error handling
          const isIOS =
            navigator.userAgent.includes('iPhone') ||
            navigator.userAgent.includes('iPad')

          if (event.error === 'not-allowed') {
            if (isIOS) {
              toast({
                title: 'Microphone Access Required',
                description:
                  'Go to Safari Settings → Privacy & Security → Microphone → Allow this website',
                variant: 'destructive',
              })
            } else {
              toast({
                title: 'Microphone Permission Denied',
                description:
                  'Please allow microphone access to use voice input.',
                variant: 'destructive',
              })
            }
          } else if (event.error === 'no-speech') {
            // Don't show error for no-speech, just submit what we have
            if (mobileTranscript.trim()) {
              setQuery(mobileTranscript)
            }
          } else if (event.error === 'audio-capture') {
            toast({
              title: 'Audio Capture Error',
              description: isIOS
                ? 'Please check microphone permissions in Safari settings.'
                : 'Unable to access microphone.',
              variant: 'destructive',
            })
          } else {
            console.log('📱 Other recognition error:', event.error)
          }

          if (mobileTranscript.trim()) {
            setQuery(mobileTranscript)
          }
          if (isListening) {
            setIsListening(false)
          }
        }

        recognition.onend = () => {
          console.log('📱 Mobile voice recognition ended')
          // Don't auto-restart on mobile to prevent loops
        }

        mobileRecognitionRef.current = recognition
      }
    }

    return () => {
      if (mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping mobile recognition:', error)
        }
      }
    }
  }, [
    isMobile,
    isVoicePlaying,
    silenceTimer,
    isListening,
    handleQuery,
    projectId,
    documentId,
    queryScope,
    toast,
    handleTranscript,
  ])

  // const handleAskAI = async () => {
  //   await handleQuery()
  // }

  // Subtle passive wake word indicator (reads preference; listening state managed in ProjectDetails)
  const { enabled: wakeEnabled, consent: wakeConsent } = useWakeWordPreference()
  const [wakeListeningState, setWakeListeningState] = useState<
    'active' | 'off'
  >('off')
  useEffect(() => {
    const update = () => {
      // We can't easily read internal state of the hook here without prop drilling; treat enabled+consent as active proxy
      setWakeListeningState(
        wakeEnabled && wakeConsent === 'true' ? 'active' : 'off',
      )
    }
    update()
    window.addEventListener(WAKEWORD_PREF_EVENT, update)
    return () => window.removeEventListener(WAKEWORD_PREF_EVENT, update)
  }, [wakeEnabled, wakeConsent])

  return (
    <>
      <Card className="mb-16 md:mb-0 animate-fade-in">
        <CardHeader className="pb-3" style={{ display: 'none' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Analysis</CardTitle>
              <CardDescription>
                Intelligent insights from your{' '}
                {queryScope === 'document'
                  ? 'document'
                  : projectName
                    ? `project "${projectName}"`
                    : 'project'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Status Section */}
          {document && (
            <div className="border rounded-xl p-4 mt-6 sm:mt-4 bg-gradient-to-r from-secondary/50 to-secondary/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <FileSearch className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Document Status
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 truncate max-w-[200px] font-medium">
                  {document.name}
                </span>
                {getStatusBadge(document.status)}
              </div>
              {document.status === 'processing' && (
                <div className="space-y-3 mt-3">
                  <div className="text-xs text-gray-400">
                    Document is being processed for AI analysis. This usually
                    takes 1-2 minutes.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fixStuckDocument}
                    disabled={isLoadingStatus}
                    className="text-xs h-8 shadow-soft"
                  >
                    {isLoadingStatus ? (
                      <div className="spinner mr-2" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-2" />
                    )}
                    Fix Stuck Processing
                  </Button>
                </div>
              )}
              {document.status === 'failed' && (
                <div className="space-y-3 mt-3">
                  <div className="text-xs text-destructive">
                    Document processing failed. Please try re-uploading the
                    document.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fixStuckDocument}
                    disabled={isLoadingStatus}
                    className="text-xs h-8 shadow-soft"
                  >
                    {isLoadingStatus ? (
                      <div className="spinner mr-2" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-2" />
                    )}
                    Retry Processing
                  </Button>
                </div>
              )}
              {document.status === 'processed' && (
                <div className="text-xs text-emerald-600 mt-2 font-medium">
                  ✓ Document is ready for AI analysis and search
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center mb-3 mt-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-sm rounded-lg"></div>
                <div className="relative p-1.5 bg-primary/10 rounded-lg mr-3">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Smart AI Query
                  <span className="text-xs text-primary animate-pulse">✨</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unlock insights with intelligent search & AI analysis
                </p>
                {/* <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-2xs">
                    {queryScope === 'document' && documentId
                      ? 'Document scope'
                      : 'Project scope'}
                  </Badge>
                  {/* Wake word status (non-interactive) */}
                  {wakeConsent === 'true' && (
                    <div
                      className={`hidden md:flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] tracking-wide ${wakeListeningState === 'active' ? 'border-emerald-500/40 text-emerald-500' : 'border-muted text-muted-foreground'}`}
                      title={
                        wakeListeningState === 'active'
                          ? 'Hands-free wake phrase enabled'
                          : 'Hands-free disabled (toggle in Settings > Voice)'
                      }
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${wakeListeningState === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}
                      />
                      Hey Jacq
                    </div>
                  )}
                  {/* Show scope selector when we have both options */}
                  {documentId && document && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-2xs h-5 px-2"
                      onClick={() =>
                        setQueryScope(
                          queryScope === 'document' ? 'project' : 'document',
                        )
                      }
                    >
                      Switch to{' '}
                      {queryScope === 'document' ? 'Project' : 'Document'}
                    </Button>
                  )}
                </div> */}
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-4 bg-gradient-to-r from-muted/40 to-muted/20 p-3 rounded-lg border border-muted/50 hidden md:block">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm">🚀</span>
                  <div>
                    <span className="font-medium text-foreground">
                      Pro Tip:
                    </span>{' '}
                    Ask questions like "What are the key safety requirements?"
                    or search for specific terms like "concrete specifications"
                    to get instant, intelligent results from your{' '}
                    {queryScope === 'document' && documentId
                      ? 'document'
                      : 'project'}
                    .
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Textarea
                placeholder={
                  isMobile
                    ? `💬 Ask anything about this ${queryScope === 'document' && documentId ? 'document' : 'project'}...`
                    : `💬 Ask anything about this ${queryScope === 'document' && documentId ? 'document' : projectName ? `project "${projectName}"` : 'project'}... e.g., "What are the main requirements?" or search for "safety protocols"`
                }
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full resize-none min-h-[70px] shadow-soft focus:shadow-medium transition-all duration-200 placeholder:text-muted-foreground/70"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleQuery()
                  }
                }}
              />

              {/* Show text being spoken */}
              {/* {currentSpeakingText && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hidden md:block">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    AI is speaking:
                  </div>
                  <div className="text-blue-800 text-sm leading-relaxed">
                    {currentSpeakingText}
                  </div>
                </div>
              )} */}
            </div>

            <div className="flex justify-between gap-3 mb-4">
              <div className="flex gap-2 items-center">
                {/* VoiceInput - only render on desktop to prevent dual systems on mobile */}
                {!isMobile && (
                  <VoiceInput
                    onTranscript={handleTranscript}
                    isListening={isListening}
                    toggleListening={toggleListening}
                    preventLoop={true}
                    disabled={isVoicePlaying}
                    onInterimTranscript={handleInterimTranscript}
                    preventAutoRestart={isVoicePlaying}
                    isMobile={isMobile}
                  />
                )}

                {/* Voice status indicator */}
                {/* Unified Speech Control Button */}
                <TooltipProvider>
                  {(() => {
                    const canShowReplay =
                      !isVoicePlaying && lastSpokenResponse && canReplay
                    const state: 'playing' | 'replay' | 'idle' = isVoicePlaying
                      ? 'playing'
                      : canShowReplay
                        ? 'replay'
                        : 'idle'

                    const tooltipLabel =
                      state === 'playing'
                        ? 'Stop playback'
                        : state === 'replay'
                          ? 'Replay response'
                          : 'Waiting for response'

                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tooltipLabel}
                            disabled={state === 'idle'}
                            onClick={() => {
                              if (state === 'playing') {
                                cancelSpeech()
                              } else if (state === 'replay') {
                                handleReplay()
                              }
                            }}
                            className={`relative h-10 w-10 rounded-full transition-all shadow-soft focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none group
                              ${state === 'playing' ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:shadow-medium' : ''}
                              ${state === 'replay' ? 'bg-gradient-to-br from-secondary/70 to-secondary/40 hover:from-secondary/80 hover:to-secondary/50 text-foreground' : ''}
                              ${state === 'idle' ? 'opacity-0 pointer-events-none' : ''}`}
                          >
                            {state === 'playing' && (
                              <>
                                <div className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-pulse" />
                                <Square className="h-4 w-4 relative z-10" />
                              </>
                            )}
                            {state === 'idle' && (
                              <RotateCcw className="h-4 w-4 opacity-50" />
                            )}
                            {state === 'replay' && (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            {/* {state === 'idle' && (
                              <Volume2 className="h-4 w-4" />
                            )} */}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {tooltipLabel}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })()}
                </TooltipProvider>
                {shouldResumeListening && !isVoicePlaying && (
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                    Resuming...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleQuery()}
                  disabled={
                    isLoading ||
                    !query.trim() ||
                    (queryScope === 'document' &&
                      documentId &&
                      document?.status === 'processing')
                  }
                  className="flex items-center gap-2 px-6 shadow-soft hover:shadow-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200"
                  size="default"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      <span className="animate-pulse">
                        {enhancedAIProgress || 'Analyzing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {isQuestion(query) ? (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Ask AI ✨</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Ask AI</span>
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {searchError && (
              <div className="text-destructive text-sm mb-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                {searchError}
              </div>
            )}

            {/* Display Search Results */}
            {results?.type === 'search' &&
              results.searchResults &&
              results.searchResults.ids &&
              results.searchResults.ids[0] &&
              results.searchResults.ids[0].length > 0 && (
                <div className="bg-gradient-to-r from-secondary/30 to-secondary/10 p-4 rounded-xl border text-sm space-y-3 mb-4 shadow-soft">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="shadow-soft">
                      <Search className="h-3 w-3 mr-1" />
                      Search Results ({results.searchResults.ids[0].length}{' '}
                      found)
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-secondary/80"
                      onClick={() => {
                        const resultsText = results
                          .searchResults!.ids[0].map(
                            (id: string, i: number) =>
                              `Document: ${results.searchResults!.metadatas?.[0]?.[i]?.name || id}\n${results.searchResults!.documents?.[0]?.[i] || 'No content preview available'}`,
                          )
                          .join('\n\n')
                        copyToClipboard(resultsText)
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {results.searchResults.ids[0].map(
                      (id: string, i: number) => (
                        <div
                          key={id}
                          className="p-3 bg-background rounded-lg shadow-soft border text-xs"
                        >
                          <div className="font-medium text-primary mb-2">
                            Document:{' '}
                            {results.searchResults!.metadatas?.[0]?.[i]?.name ||
                              id}
                          </div>
                          <div className="text-foreground mb-2 leading-relaxed">
                            {results.searchResults!.documents?.[0]?.[i] ||
                              'No content preview available'}
                          </div>
                          <div className="text-xs text-gray-400 flex justify-between">
                            <span>ID: {id}</span>
                            <span className="font-medium">
                              Relevance:{' '}
                              {(
                                1 -
                                (results.searchResults!.distances?.[0]?.[i] ||
                                  0)
                              ).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Chat History Display */}
            {chatHistory.length > 0 && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-xl border shadow-soft">
                  <div className="flex justify-between items-center mb-3">
                    <Badge
                      variant="outline"
                      className="shadow-soft hidden md:flex"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Conversation History
                    </Badge>
                    <div className="flex items-center gap-2">
                      <ChatExport messages={chatHistory} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 md:h-7 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-all duration-200"
                        onClick={() => setChatHistory([])}
                      >
                        Clear History
                      </Button>
                    </div>
                  </div>

                  {/* Scrollable Chat Container */}
                  <div
                    ref={chatContainerRef}
                    className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  >
                    {chatHistory.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed break-words whitespace-pre-wrap ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground ml-2 rounded-br-sm'
                              : 'bg-background border shadow-sm mr-2 rounded-bl-sm'
                          }`}
                        >
                          <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                            {message.type === 'user' ? <>👤 You</> : <>🤖 AI</>}
                            <span>•</span>
                            <span>
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div
                            className={`${message.type === 'ai' ? 'prose prose-sm max-w-none text-foreground' : 'break-words whitespace-pre-wrap'}`}
                          >
                            {message.content}
                          </div>
                          {message.type === 'ai' && (
                            <div className="flex justify-end mt-2 gap-1">
                              {/* iOS-specific Play Response button */}
                              {isIOS && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-secondary/80 opacity-60 hover:opacity-100"
                                  onClick={() =>
                                    playResponseWithUserGesture(message.content)
                                  }
                                  title="Play Response (iOS)"
                                >
                                  <Volume2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-secondary/80 opacity-60 hover:opacity-100"
                                onClick={() => copyToClipboard(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              </div>
            )}

            {/* Display AI Answer (Legacy - will be replaced by chat history) */}
            {results?.type === 'ai' &&
              results.aiAnswer &&
              !chatHistory.length && (
                <div className="space-y-3">
                  {/* Display the question for context */}
                  {results.query && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Your Question:
                      </h4>
                      <p className="text-blue-800 text-sm">{results.query}</p>
                    </div>
                  )}

                  {/* AI Response with scrolling */}
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-xl border text-sm shadow-soft">
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="outline" className="shadow-soft">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        AI Analysis
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-secondary/80"
                        onClick={() => copyToClipboard(results.aiAnswer!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none max-h-96 overflow-y-auto">
                      {results.aiAnswer}
                    </div>
                  </div>
                </div>
              )}

            {/* No Results Message */}
            {results?.type === 'search' &&
              results.searchResults &&
              (!results.searchResults.ids ||
                !results.searchResults.ids[0] ||
                results.searchResults.ids[0].length === 0) &&
              !isLoading &&
              query && (
                <div className="text-gray-400 text-sm mb-4 p-3 bg-muted/20 rounded-lg border">
                  No results found for "
                  <span className="font-medium">{query}</span>". Try different
                  search terms or ask a question for AI analysis.
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Shazam-style voice button - primary voice input on mobile */}
      {!hideShazamButton && isMobile && (
        <VoiceShazamButton
          selfContained={true}
          showTranscript={query || undefined}
          isProcessing={isLoading}
          isMobileOnly={true}
          onHide={() => setHideShazamButton(true)}
          onTranscript={text => {
            console.log('🎯 Received transcript in AIActions:', text)

            const trimmedText = text.trim()
            const isAndroid = /Android/i.test(navigator.userAgent)

            // Android-specific enhanced duplicate prevention
            if (isAndroid) {
              // Check against recent Android transcripts (last 5)
              const recentDuplicates = androidTranscriptHistory.slice(-5)
              const isDuplicateInHistory = recentDuplicates.some(
                historyText =>
                  historyText === trimmedText ||
                  (historyText.length > 5 &&
                    trimmedText.length > 5 &&
                    (historyText.includes(trimmedText.slice(0, -2)) ||
                      trimmedText.includes(historyText.slice(0, -2)))),
              )

              if (isDuplicateInHistory) {
                console.log(
                  '🤖 Android: Transcript found in recent history, skipping:',
                  { current: trimmedText, history: recentDuplicates },
                )
                return
              }

              // Add to Android history (keep last 10 entries)
              setAndroidTranscriptHistory(prev =>
                [...prev, trimmedText].slice(-10),
              )
            }

            // Enhanced duplicate prevention for all platforms
            const isExactDuplicate = trimmedText === lastProcessedTranscript
            const isSimilarDuplicate =
              lastProcessedTranscript &&
              trimmedText.length > 5 &&
              (lastProcessedTranscript.includes(trimmedText.slice(0, -2)) ||
                trimmedText.includes(lastProcessedTranscript.slice(0, -2)))

            if (isExactDuplicate || isSimilarDuplicate) {
              console.log(
                '🔄 Duplicate/similar transcript detected, skipping:',
                { current: trimmedText, last: lastProcessedTranscript },
              )
              return
            }

            // Prevent processing if already loading
            if (isLoading) {
              console.log(
                '🔄 Already processing query, skipping transcript:',
                trimmedText,
              )
              return
            }

            setLastProcessedTranscript(trimmedText)
            setQuery(trimmedText)
            // Set loading immediately to show processing state
            setIsLoading(true)
            // Auto-submit the transcript (no additional delay since VoiceShazamButton already waited for silence)
            handleQuery(trimmedText)
          }}
        />
      )}

      {/* Show voice button when hidden - larger floating button in bottom-left (mobile only) */}
      {hideShazamButton && isMobile && (
        <div className="fixed bottom-4 right-4 z-[99]">
          <Button
            onClick={() => setHideShazamButton(false)}
            className="h-24 w-24 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            title="Show voice button"
          >
            <Mic
              className="text-white"
              style={{ width: '36px', height: '36px' }}
            />
          </Button>
        </div>
      )}
    </>
  )
}
