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
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { VoiceInput } from './VoiceInput'
import { VoiceShazamButton } from './VoiceShazamButton'
import { answerQuestionWithBedrock } from '@/utils/aws'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { callOpenAI } from '@/services/openai'
import { novaSonic } from '@/services/nova-sonic'
import { VoiceId } from '@aws-sdk/client-polly'
import { useSemanticSearch } from '@/hooks/useSemanticSearch'
import { semanticSearch } from '@/services/embedding'
import { documentService } from '@/services/hybrid'
import { Document } from '@/types'
import { retryDocumentProcessing } from '@/utils/document-recovery'

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
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)

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

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      if (!novaSonic.isAvailable()) return

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
        console.error('Voice synthesis error:', error)
      } finally {
        // Clear speaking text and voice state when audio finishes
        setCurrentSpeakingText('')
        setIsVoicePlaying(false)
        console.log('🔄 Voice playing set to false')
      }
    },
    [isListening, silenceTimer],
  )

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
    }
  }, [documentId, projectId, companyId, silenceTimer])

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

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return

    if (!projectId) {
      toast({
        title: 'Project Required',
        description: 'Project ID is required for search and AI functionality.',
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

    console.log('Starting query:', { query, projectId, queryScope })
    setIsLoading(true)
    setResults(null)

    try {
      if (isQuestion(query)) {
        // Handle as AI question - first get relevant content via semantic search
        const searchParams: {
          projectId: string
          query: string
          topK: number
          documentId?: string
        } = {
          projectId: projectId,
          query: query,
          topK: 3,
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
              const metadata = searchResponse.metadatas?.[0]?.[i]
              const docName = metadata?.name || `Document ${i + 1}`
              return `Source File: "${docName}"\nContent: ${doc}`
            })
            .join('\n\n')

          context += `\nRelevant Documents:\n${relevantContent}\n\nIMPORTANT: When providing your answer, please reference the specific source file names (e.g., "According to [filename]..." or "As mentioned in [filename]...") to help the user understand where the information comes from.`
        } else {
          if (queryScope === 'document') {
            context += `\nNo content found for this specific document. The document may not have been fully processed or may not contain extractable text content.`
          } else {
            context += `\nNo relevant document content found for this query. The system may not have processed documents for this project yet.`
          }
        }

        const response = await callOpenAI(query, context)

        // Add user message to chat history
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: query,
          timestamp: new Date(),
          query: query,
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
          query: query,
        })

        // Clear the query field after successful AI response
        setQuery('')

        toast({
          title: 'AI Analysis Complete',
          description: `Your question about the ${queryScope === 'document' ? 'document' : projectName ? `project "${projectName}"` : 'project'} has been answered.`,
        })

        // Provide voice feedback with the actual AI answer
        if (response && response.length > 0) {
          setTimeout(() => {
            // Speak the full answer - no truncation
            speakWithStateTracking(response, {
              voice: 'Ruth',
              stopListeningAfter: true,
            }).catch(console.error)
          }, 1000)
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
          query: query,
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
          const aiMessage: ChatMessage = {
            id: `ai-no-results-${Date.now()}`,
            type: 'ai',
            content:
              "I couldn't find any relevant documents for your search. Try rephrasing your query or asking a different question.",
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
          description = 'OpenAI API key is missing from environment variables.'
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
    }
  }, [
    query,
    projectId,
    queryScope,
    documentId,
    document,
    projectName,
    toast,
    setQueryScope,
    setIsLoading,
    setResults,
    setQuery,
    setChatHistory,
    speakWithStateTracking,
  ])

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
          duration: 2000,
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

  const toggleListening = useCallback(() => {
    const newListeningState = !isListening
    setIsListening(newListeningState)

    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    if (isListening) {
      hasTranscriptRef.current = false

      // Stop mobile recognition if it's active
      if (isMobile && mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.stop()
          console.log('📱 Stopped mobile voice recognition')
        } catch (error) {
          console.error('Error stopping mobile recognition:', error)
        }
      }

      toast({
        title: 'Voice input stopped',
        description: 'Voice recording has been stopped.',
      })
    } else {
      // Start mobile recognition if needed
      if (isMobile && mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.start()
          console.log('📱 Started mobile voice recognition')
        } catch (error) {
          console.error('Error starting mobile recognition:', error)
        }
      }

      toast({
        title: 'Voice input started',
        description: `Speak your query... Will auto-submit after ${isMobile ? '1.5s' : '2s'} of silence.`,
      })
    }
  }, [isListening, silenceTimer, isMobile, toast])

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
                `⏰ Auto-submitting query after ${isMobile ? '1.5s' : '3s'} of silence:`,
                currentQuery.slice(0, 100),
              )
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
          isMobile ? 1500 : 3000,
        ) // Shorter timeout on mobile for better responsiveness

        setSilenceTimer(timer)
        console.log(
          '⏰ Started silence timer for:',
          text.slice(0, 50),
          `(${isMobile ? '1.5s' : '3s'} timeout)`,
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
    if (!isMobile) return // Only for mobile

    if (typeof window !== 'undefined' && !mobileRecognitionRef.current) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = true // Enable continuous mode for better silence detection on mobile
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        let mobileTranscript = ''
        let lastSpeechTime = 0

        recognition.onresult = event => {
          if (isVoicePlaying) return // Ignore during playback

          const results = Array.from(event.results) as SpeechRecognitionResult[]
          let completeTranscript = ''
          let hasNewFinalResult = false

          // Process all results to build complete transcript
          for (let i = 0; i < results.length; i++) {
            completeTranscript += results[i][0].transcript
            if (results[i].isFinal) {
              hasNewFinalResult = true
            }
          }

          mobileTranscript = completeTranscript
          lastSpeechTime = Date.now()

          console.log('📱 Mobile voice transcript:', completeTranscript, {
            hasNewFinalResult,
            resultCount: results.length,
          })

          // Update query in real-time
          setQuery(completeTranscript)
          setInterimTranscript(completeTranscript)

          // Clear any existing timer
          if (silenceTimer) {
            clearTimeout(silenceTimer)
          }

          // Auto-submit after silence (shorter timeout for mobile responsiveness)
          if (completeTranscript.trim()) {
            hasTranscriptRef.current = true

            const timer = setTimeout(() => {
              const timeSinceLastSpeech = Date.now() - lastSpeechTime
              console.log('📱 Checking auto-submit:', {
                transcript: mobileTranscript.trim(),
                timeSinceLastSpeech,
                isListening,
                isVoicePlaying,
              })

              if (
                mobileTranscript.trim() &&
                !isVoicePlaying &&
                isListening &&
                timeSinceLastSpeech >= 1200
              ) {
                console.log(
                  '📱 Auto-submitting mobile transcript:',
                  mobileTranscript,
                )
                setQuery(mobileTranscript.trim())

                // Stop listening first
                if (isListening) {
                  setIsListening(false)
                }

                // Submit query after brief delay
                setTimeout(() => {
                  if (!isVoicePlaying) {
                    handleQuery()
                  }
                }, 150)
              }
            }, 1300) // 1.3s silence detection for mobile

            setSilenceTimer(timer)
          }
        }

        recognition.onerror = event => {
          console.error('📱 Mobile voice error:', event.error)

          // If we have transcript, submit it
          if (mobileTranscript.trim()) {
            console.log(
              '📱 Submitting transcript before error cleanup:',
              mobileTranscript,
            )
            setQuery(mobileTranscript.trim())

            setTimeout(() => {
              if (!isVoicePlaying) {
                handleQuery()
              }
            }, 100)
          }

          // Stop listening on error
          if (isListening) {
            setIsListening(false)
          }

          // Clear any pending timer
          if (silenceTimer) {
            clearTimeout(silenceTimer)
            setSilenceTimer(null)
          }
        }

        recognition.onend = () => {
          console.log('📱 Mobile voice recognition ended')

          // If we have transcript and we're still supposed to be listening, submit it
          if (mobileTranscript.trim() && isListening) {
            console.log(
              '📱 Recognition ended with transcript, auto-submitting:',
              mobileTranscript,
            )
            setQuery(mobileTranscript.trim())
            setIsListening(false)

            setTimeout(() => {
              if (!isVoicePlaying) {
                handleQuery()
              }
            }, 100)
          }

          // Clear any pending timer
          if (silenceTimer) {
            clearTimeout(silenceTimer)
            setSilenceTimer(null)
          }
        }

        mobileRecognitionRef.current = recognition
        console.log('📱 Mobile voice recognition initialized')
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
  }, [isMobile, isVoicePlaying, silenceTimer, isListening, handleQuery])

  const handleAskAI = async () => {
    await handleQuery()
  }

  return (
    <>
      <Card className="mb-32 md:mb-0 animate-fade-in">
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
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-2xs">
                    {queryScope === 'document' && documentId
                      ? 'Document scope'
                      : 'Project scope'}
                  </Badge>
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
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-4 bg-gradient-to-r from-muted/40 to-muted/20 p-3 rounded-lg border border-muted/50">
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
                placeholder={`💬 Ask anything about this ${queryScope === 'document' && documentId ? 'document' : projectName ? `project "${projectName}"` : 'project'}... e.g., "What are the main requirements?" or search for "safety protocols"`}
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
              {currentSpeakingText && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    AI is speaking:
                  </div>
                  <div className="text-blue-800 text-sm leading-relaxed">
                    {currentSpeakingText}
                  </div>
                </div>
              )}
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
                {isVoicePlaying && (
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    Speaking...
                  </div>
                )}
                {shouldResumeListening && !isVoicePlaying && (
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                    Resuming...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleQuery}
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
                      <span className="animate-pulse">Analyzing...</span>
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
                    <Badge variant="outline" className="shadow-soft">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Conversation History
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs hover:bg-secondary/80"
                      onClick={() => setChatHistory([])}
                    >
                      Clear History
                    </Button>
                  </div>

                  {/* Scrollable Chat Container */}
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                            <div className="flex justify-end mt-2">
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
          isListening={isListening}
          toggleListening={toggleListening}
          showTranscript={isListening || query ? query : undefined}
          isProcessing={isLoading}
          isMobileOnly={true}
          onHide={() => setHideShazamButton(true)}
        />
      )}

      {/* Show voice button when hidden - small floating button (mobile only) */}
      {hideShazamButton && isMobile && (
        <div className="fixed bottom-4 right-4 z-[99]">
          <Button
            onClick={() => setHideShazamButton(false)}
            className="h-12 w-12 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300"
            title="Show voice button"
          >
            🎤
          </Button>
        </div>
      )}
    </>
  )
}
