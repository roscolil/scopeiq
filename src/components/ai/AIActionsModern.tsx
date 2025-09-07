/**
 * AI Actions Modern Component
 * Combines Python backend integration from AIActionsPython
 * with enhanced UI and features from AIActionsEnhanced
 */

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
  Volume2,
  Server,
  AlertCircle,
  Sparkles,
  Zap,
  Target,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { VoiceShazamButton } from '@/components/voice/VoiceShazamButton'
import { ChatExport } from '@/components/ai/ChatExport'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { novaSonic } from '@/services/api/nova-sonic'
import { VoiceId } from '@aws-sdk/client-polly'
import { documentService } from '@/services/data/hybrid'
import { Document } from '@/types'
import { retryDocumentProcessing } from '@/utils/data/document-recovery'
import { cn } from '@/lib/utils'

// Python backend integration
import { usePythonChat } from '@/hooks/usePythonChat'
import {
  handleEnhancedAIQueryWithPython,
  getBackendConfig,
  type BackendConfig,
} from '@/services/ai/enhanced-ai-workflow-python'
import { isPythonChatAvailable } from '@/services/ai/python-chat-service'

// Enhanced workflow for fallback
import {
  handleEnhancedAIQuery,
  enhancedSemanticSearch,
  indexDocumentForIntelligentSearch,
} from '@/services/ai/enhanced-ai-workflow'

interface AIActionsModernProps {
  documentId: string
  projectId?: string
  projectName?: string
  companyId?: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  query?: string
  metadata?: {
    processingTimeMs?: number
    searchMethod?: string
    confidence?: number
    intelligentSearch?: boolean
    structuredResults?: boolean
    backend?: 'python' | 'existing'
  }
}

export const AIActionsModern = ({
  documentId,
  projectId,
  projectName,
  companyId,
}: AIActionsModernProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    type: 'search' | 'ai'
    searchResults?: Array<{
      content: string
      score: number
      metadata?: Record<string, unknown>
    }>
    aiAnswer?: string
    query?: string
    metadata?: {
      searchMethod?: string
      confidence?: number
      intelligentSearch?: boolean
      structuredResults?: boolean
      backend?: 'python' | 'existing'
    }
  } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    documentId ? 'document' : 'project',
  )
  const [isLoading, setIsLoading] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [hideShazamButton, setHideShazamButton] = useState(false)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [shouldResumeListening, setShouldResumeListening] = useState(false)
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [enhancedSearchActive, setEnhancedSearchActive] = useState(true)
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(true)

  // Python backend state - preserving from AIActionsPython
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null)
  const [currentBackend, setCurrentBackend] = useState<
    'python' | 'existing' | 'unknown'
  >('unknown')
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null)

  const { toast } = useToast()
  const isMobile = useIsMobile()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)
  const [lastResponseText, setLastResponseText] = useState<string>('')

  // Mobile-only voice recognition
  const mobileRecognitionRef = useRef<typeof SpeechRecognition | null>(null)

  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Python chat hook - preserving backend integration
  const pythonChat = usePythonChat({
    projectId: projectId || '',
    documentId: documentId,
    contextType: queryScope,
  })

  // Enhanced auto-scroll chat from AIActionsEnhanced
  const scrollToBottom = () => {
    chatContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    setTimeout(() => {
      if (chatEndRef.current && chatContainerRef.current) {
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

  // Backend health check - preserving from AIActionsPython
  const checkBackendHealth = useCallback(async () => {
    try {
      const isPythonAvailable = await isPythonChatAvailable()
      setBackendHealth(isPythonAvailable)

      if (isPythonAvailable) {
        setCurrentBackend('python')
        console.log('✅ Python backend available')
      } else {
        setCurrentBackend('existing')
        console.log('⚠️ Using existing backend fallback')
      }
    } catch (error) {
      console.error('Backend health check failed:', error)
      setBackendHealth(false)
      setCurrentBackend('existing')
    }
  }, [])

  // Enhanced voice wrapper with state tracking from AIActionsEnhanced
  const speakWithStateTracking = useCallback(
    async (
      prompt: string,
      options: { voice?: VoiceId; stopListeningAfter?: boolean } = {},
    ) => {
      if (!novaSonic.isAvailable()) return

      try {
        const wasListening = isListening
        setShouldResumeListening(wasListening && !options.stopListeningAfter)
        setIsVoicePlaying(true)
        setCurrentSpeakingText(prompt)

        console.log(
          '🗣️ Starting modern voice output, was listening:',
          wasListening,
        )

        if (silenceTimer) {
          console.log('🛑 Clearing silence timer before voice output')
          clearTimeout(silenceTimer)
          setSilenceTimer(null)
        }

        hasTranscriptRef.current = false

        if (isListening) {
          setIsListening(false)
        }

        console.log('🎵 Modern voice synthesis starting...')
        await novaSonic.speakPrompt(prompt, { voice: options.voice })
        console.log('✅ Modern voice output completed successfully')

        if (options.stopListeningAfter) {
          console.log(
            '🎤 Stopping microphone listening after modern verbal response',
          )
          setShouldResumeListening(false)
        }
      } catch (error) {
        console.error('Modern voice synthesis error:', error)
      } finally {
        setCurrentSpeakingText('')
        setIsVoicePlaying(false)
        console.log('🔄 Modern voice playing set to false')
      }
    },
    [isListening, silenceTimer],
  )

  // Document loading - preserving from AIActionsPython
  const loadDocumentInfo = useCallback(async () => {
    if (!projectId || !companyId) return

    console.log('📄 Loading document info:', {
      documentId,
      projectId,
      companyId,
    })

    try {
      setIsLoadingStatus(true)
      const docData = await documentService.getDocument(
        companyId,
        projectId,
        documentId,
      )

      console.log(
        '📄 Document loaded:',
        docData?.name || 'Unknown',
        docData?.status,
      )
      setDocument(docData)
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }, [documentId, projectId, companyId])

  // Initialize backend health check and document loading
  useEffect(() => {
    checkBackendHealth()
  }, [checkBackendHealth])

  useEffect(() => {
    if (documentId && projectId && companyId) {
      loadDocumentInfo()
    }
  }, [documentId, projectId, companyId, loadDocumentInfo])

  // Question detection utility from AIActionsEnhanced
  const isQuestionQuery = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim()
    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
      'whose',
      'can',
      'could',
      'would',
      'should',
      'will',
      'do',
      'does',
      'did',
      'is',
      'are',
      'was',
      'were',
      'has',
      'have',
      'had',
    ]

    const startsWithQuestionWord = questionWords.some(word =>
      lowerText.startsWith(word + ' '),
    )

    const questionMarkers = ['?', 'how to', 'tell me', 'explain']
    const hasQuestionMarker = questionMarkers.some(marker =>
      lowerText.includes(marker),
    )

    return startsWithQuestionWord || hasQuestionMarker
  }

  // Modern query handler combining both approaches
  const handleQuery = useCallback(
    async (queryText?: string) => {
      const queryToUse = queryText || query
      if (!queryToUse.trim()) return

      if (!projectId) {
        toast({
          title: 'Project Required',
          description: 'Project ID is required for AI queries',
          variant: 'destructive',
        })
        return
      }

      // Enhanced document status checking from AIActionsEnhanced
      if (queryScope === 'document') {
        if (!documentId) {
          setQueryScope('project')
          toast({
            title: 'Switched to Project Scope',
            description: projectName
              ? `No specific document selected, searching across "${projectName}".`
              : 'No specific document selected, searching across the entire project.',
          })
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
          setQueryScope('project')
        } else if (document.status === 'failed') {
          toast({
            title: 'Document Processing Failed',
            description: projectName
              ? `This document failed to process. Switching to search across "${projectName}" instead.`
              : 'This document failed to process. Switching to project-wide search instead.',
          })
          setQueryScope('project')
        }
      }

      console.log('Starting modern AI query:', {
        query: queryToUse,
        projectId,
        queryScope,
        backend: currentBackend,
        enhancedSearch: enhancedSearchActive,
      })

      setIsLoading(true)
      setResults(null)

      try {
        let response

        // Try Python backend first if available, fallback to enhanced workflow
        if (currentBackend === 'python' && backendHealth) {
          console.log('🐍 Using Python backend')

          response = await handleEnhancedAIQueryWithPython({
            query: queryToUse,
            projectId: projectId,
            documentId: queryScope === 'document' ? documentId : undefined,
            projectName,
            document: document || undefined,
            queryScope,
            onProgress: stage => {
              console.log('Python AI Progress:', stage)
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

          // Convert Python response to enhanced format
          response = {
            type: 'ai' as const,
            response: response.response,
            metadata: {
              backend: 'python' as const,
              ...response.metadata,
            },
          }
        } else {
          console.log('⚡ Using enhanced workflow backend')

          response = await handleEnhancedAIQuery({
            query: queryToUse,
            projectId: projectId,
            documentId: queryScope === 'document' ? documentId : undefined,
            projectName,
            document: document || undefined,
            queryScope,
            onProgress: stage => {
              console.log('Enhanced AI Progress:', stage)
            },
          })

          // Add backend metadata
          response.metadata = {
            ...response.metadata,
            backend: 'existing' as const,
          }
        }

        // Add user message to chat history
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: queryToUse,
          timestamp: new Date(),
          query: queryToUse,
          metadata: response.metadata,
        }

        if (response.type === 'ai') {
          // AI response
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: response.response,
            timestamp: new Date(),
            metadata: response.metadata,
          }

          setChatHistory(prev => [...prev, userMessage, aiMessage])

          setResults({
            type: 'ai',
            aiAnswer: response.response,
            query: queryToUse,
            metadata: response.metadata,
          })

          // Enhanced voice response - auto-enabled but respects user preference
          if (autoSpeechEnabled && response.response) {
            setLastResponseText(response.response)
            console.log('🗣️ Auto-playing AI response via text-to-speech')
            await speakWithStateTracking(response.response)
          }
        } else {
          // Search response
          const searchMessage: ChatMessage = {
            id: `search-${Date.now()}`,
            type: 'ai',
            content: `Found ${response.results?.length || 0} relevant results.`,
            timestamp: new Date(),
            metadata: response.metadata,
          }

          setChatHistory(prev => [...prev, userMessage, searchMessage])

          setResults({
            type: 'search',
            searchResults: response.results,
            query: queryToUse,
            metadata: response.metadata,
          })
        }

        // Clear the query field after successful response
        setQuery('')

        if (!isMobile) {
          toast({
            title: `${response.type === 'ai' ? 'AI Response' : 'Search Results'} Generated`,
            description: `Using ${response.metadata?.backend || 'enhanced'} backend`,
          })
        }
      } catch (error) {
        console.error('Modern AI query failed:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'AI query failed'

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })

        // Add error message to chat
        const errorMessageObj: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        }
        setChatHistory(prev => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
      }
    },
    [
      query,
      projectId,
      queryScope,
      documentId,
      projectName,
      document,
      currentBackend,
      backendHealth,
      enhancedSearchActive,
      autoSpeechEnabled,
      isMobile,
      toast,
      speakWithStateTracking,
    ],
  )

  // Voice input handling with automatic submission after silence
  const handleVoiceInput = useCallback(
    (transcript: string) => {
      console.log('🎤 Modern voice input complete:', transcript)
      setQuery(transcript)
      // Automatically submit the query after silence detection
      if (transcript.trim()) {
        console.log('🚀 Auto-submitting voice query after silence')
        handleQuery(transcript)
      }
    },
    [handleQuery],
  )

  // Handle interim voice transcript for real-time display
  const handleInterimVoiceTranscript = useCallback((transcript: string) => {
    console.log('🎤 Interim transcript:', transcript)
    setInterimTranscript(transcript)
    // Update the query field in real-time for visual feedback
    setQuery(transcript)
  }, [])

  // Voice listening toggle with proper state management
  const toggleVoiceListening = useCallback(() => {
    console.log('🎤 Toggling voice listening:', !isListening)
    setIsListening(!isListening)

    // Clear interim transcript when starting new session
    if (!isListening) {
      setInterimTranscript('')
      setQuery('')
    }
  }, [isListening])

  // Copy result to clipboard
  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text)
      toast({
        title: 'Copied',
        description: 'Response copied to clipboard',
      })
    },
    [toast],
  )

  // Clear chat history
  const clearChat = useCallback(() => {
    setChatHistory([])
    setResults(null)
    toast({
      title: 'Chat Cleared',
      description: 'Chat history has been cleared',
    })
  }, [toast])

  return (
    <div className="space-y-6">
      {/* Backend Status Indicator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              {currentBackend !== 'unknown' && (
                <Badge
                  variant={
                    currentBackend === 'python' ? 'default' : 'secondary'
                  }
                  className="flex items-center space-x-1"
                >
                  <Server className="h-3 w-3" />
                  <span>
                    {currentBackend === 'python' ? 'Python' : 'Enhanced'}
                  </span>
                </Badge>
              )}
            </div>

            {backendHealth !== null && (
              <div className="flex items-center space-x-2">
                {backendHealth ? (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600"
                  >
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                    Backend Online
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-yellow-600 border-yellow-600"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Fallback Mode
                  </Badge>
                )}
              </div>
            )}
          </div>

          <CardDescription>
            {projectName
              ? `AI-powered analysis for "${projectName}"`
              : 'AI-powered document and project analysis'}
            {document && (
              <span className="block text-sm mt-1">
                Document: {document.name}
                <Badge
                  variant={
                    document.status === 'processed' ? 'default' : 'secondary'
                  }
                  className="ml-2"
                >
                  {document.status}
                </Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Query Input */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      isListening
                        ? 'Listening... speak your question'
                        : 'Ask a question about your documents...'
                    }
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleQuery()
                      }
                    }}
                    className={cn(
                      'min-h-[60px] resize-none transition-colors',
                      isListening && 'border-blue-500 bg-blue-50',
                    )}
                    disabled={isListening}
                  />
                  {interimTranscript && isListening && (
                    <div className="text-xs text-blue-600 mt-1 italic">
                      Speaking: {interimTranscript}
                    </div>
                  )}
                </div>

                {/* Voice Input Controls */}
                <div className="flex flex-col space-y-2">
                  {/* Desktop/Tablet Voice Input */}
                  {!isMobile && (
                    <VoiceInput
                      onTranscript={handleVoiceInput}
                      isListening={isListening}
                      toggleListening={toggleVoiceListening}
                      onInterimTranscript={handleInterimVoiceTranscript}
                      preventLoop={isVoicePlaying}
                      preventAutoRestart={isVoicePlaying}
                      isMobile={isMobile}
                    />
                  )}

                  {/* Mobile Voice Shazam Button */}
                  {isMobile && (
                    <VoiceShazamButton
                      isListening={isListening}
                      toggleListening={toggleVoiceListening}
                      showTranscript={interimTranscript}
                    />
                  )}

                  {/* Desktop Voice Shazam Button (additional option) */}
                  {!isMobile && (
                    <VoiceShazamButton
                      isListening={isListening}
                      toggleListening={toggleVoiceListening}
                      showTranscript={interimTranscript}
                    />
                  )}
                </div>
              </div>

              {/* Query Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Select
                    value={queryScope}
                    onValueChange={(value: 'document' | 'project') =>
                      setQueryScope(value)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">
                        <div className="flex items-center space-x-2">
                          <FileStack className="h-4 w-4" />
                          <span>Document</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="project">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4" />
                          <span>Project</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEnhancedSearchActive(!enhancedSearchActive)
                    }
                    className={
                      enhancedSearchActive ? 'bg-blue-50 border-blue-200' : ''
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Enhanced
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
                    className={
                      autoSpeechEnabled ? 'bg-green-50 border-green-200' : ''
                    }
                    title="Toggle automatic text-to-speech for AI responses"
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Auto TTS
                  </Button>
                </div>

                <Button
                  onClick={() => handleQuery()}
                  disabled={isLoading || !query.trim()}
                  className="min-w-[100px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Analyzing...' : 'Ask AI'}
                </Button>

                {/* Voice Status Indicator */}
                {isListening && (
                  <Badge
                    variant="outline"
                    className="border-blue-500 text-blue-600"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
                    Listening
                  </Badge>
                )}

                {isVoicePlaying && (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600"
                  >
                    <Volume2 className="h-3 w-3 mr-1" />
                    Speaking
                  </Badge>
                )}
              </div>
            </div>

            {/* Results Display */}
            {results && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      {results.type === 'ai' ? (
                        <Brain className="h-4 w-4" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span>
                        {results.type === 'ai'
                          ? 'AI Response'
                          : 'Search Results'}
                      </span>
                      {results.metadata?.backend && (
                        <Badge variant="outline" className="text-xs">
                          {results.metadata.backend}
                        </Badge>
                      )}
                    </CardTitle>

                    <div className="flex items-center space-x-2">
                      {results.aiAnswer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(results.aiAnswer || '')
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}

                      {!isMobile && results.aiAnswer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            speakWithStateTracking(results.aiAnswer || '')
                          }
                          disabled={isVoicePlaying}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {results.type === 'ai' && results.aiAnswer && (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{results.aiAnswer}</p>
                    </div>
                  )}

                  {results.type === 'search' && results.searchResults && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Found {results.searchResults.length} relevant results
                      </p>
                      {/* Add search results display logic here */}
                    </div>
                  )}

                  {results.metadata && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      {results.metadata.confidence && (
                        <span>
                          Confidence:{' '}
                          {Math.round(results.metadata.confidence * 100)}%
                          •{' '}
                        </span>
                      )}
                      {results.metadata.searchMethod && (
                        <span>Method: {results.metadata.searchMethod} • </span>
                      )}
                      <span>Scope: {queryScope}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chat History */}
            {chatHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat History</span>
                    </CardTitle>

                    <div className="flex items-center space-x-2">
                      <ChatExport messages={chatHistory} />
                      <Button variant="ghost" size="sm" onClick={clearChat}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div
                    ref={chatContainerRef}
                    className="space-y-3 max-h-60 overflow-y-auto"
                  >
                    {chatHistory.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            message.type === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                            {message.metadata?.backend && (
                              <span className="ml-2">
                                • {message.metadata.backend}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
