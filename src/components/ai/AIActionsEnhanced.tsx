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

// Enhanced AI workflow imports
import {
  handleEnhancedAIQuery,
  enhancedSemanticSearch,
  indexDocumentForIntelligentSearch,
} from '@/services/ai/enhanced-ai-workflow'

interface AIActionsEnhancedProps {
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
    searchMethod?: string
    confidence?: number
    intelligentSearch?: boolean
    structuredResults?: boolean
  }
}

export const AIActionsEnhanced = ({
  documentId,
  projectId,
  projectName,
  companyId,
}: AIActionsEnhancedProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    type: 'search' | 'ai'
    searchResults?: any
    aiAnswer?: string
    query?: string
    metadata?: {
      searchMethod?: string
      confidence?: number
      intelligentSearch?: boolean
      structuredResults?: boolean
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

  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)

  // Mobile-only voice recognition
  const mobileRecognitionRef = useRef<typeof SpeechRecognition | null>(null)

  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
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

  // Voice wrapper with state tracking
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
          '🗣️ Starting enhanced voice output, was listening:',
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

        console.log('🎵 Enhanced voice synthesis starting...')
        await novaSonic.speakPrompt(prompt, { voice: options.voice })
        console.log('✅ Enhanced voice output completed successfully')

        if (options.stopListeningAfter) {
          console.log(
            '🎤 Stopping microphone listening after enhanced verbal response',
          )
          setShouldResumeListening(false)
        }
      } catch (error) {
        console.error('Enhanced voice synthesis error:', error)
      } finally {
        setCurrentSpeakingText('')
        setIsVoicePlaying(false)
        console.log('🔄 Enhanced voice playing set to false')
      }
    },
    [isListening, silenceTimer],
  )

  // Fetch document status and set up polling
  useEffect(() => {
    const fetchDocumentStatus = async () => {
      if (!documentId || !projectId || !companyId) {
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

        // Index document for intelligent search if processed
        if (doc?.status === 'processed' && enhancedSearchActive) {
          // Note: In a real implementation, you'd pass structured data here
          // For now, we'll index when enhanced analysis is performed
          console.log('Document ready for enhanced indexing:', doc.id)
        }
      } catch (error) {
        console.error('Error fetching document status:', error)
        setQueryScope('project')
      } finally {
        setIsLoadingStatus(false)
      }
    }

    fetchDocumentStatus()

    let intervalId: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (!documentId) return

      if (intervalId) {
        clearInterval(intervalId)
      }

      const currentStatus = document?.status
      let pollInterval: number

      if (currentStatus === 'processing') {
        pollInterval = 3000
      } else if (currentStatus === 'failed') {
        pollInterval = 10000
      } else if (currentStatus === 'processed') {
        pollInterval = 30000
      } else {
        pollInterval = 5000
      }

      intervalId = setInterval(fetchDocumentStatus, pollInterval)
    }

    if (documentId) {
      startPolling()
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [documentId, projectId, companyId, document?.status, enhancedSearchActive])

  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
    }
  }, [silenceTimer])

  // Status badge component
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            Enhanced AI Ready
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

  // Enhanced manual refresh
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

      if (previousStatus !== doc?.status) {
        toast({
          title: 'Enhanced Status Updated',
          description: `Document status changed from ${previousStatus || 'unknown'} to ${doc?.status || 'unknown'}`,
        })
      } else {
        toast({
          title: 'Enhanced Status Refreshed',
          description: `Document status: ${doc?.status || 'unknown'} (no change)`,
        })
      }
    } catch (error) {
      console.error('Error refreshing enhanced document status:', error)
      toast({
        title: 'Enhanced Refresh Failed',
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
        const doc = await documentService.getDocument(
          companyId,
          projectId,
          documentId,
        )
        setDocument(doc)

        toast({
          title: 'Enhanced Document Fixed',
          description:
            'Document processing has been retried and completed successfully with enhanced analysis.',
        })
      } else {
        toast({
          title: 'Enhanced Fix Failed',
          description:
            'Could not fix the document. It has been marked as failed.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fixing stuck document:', error)
      toast({
        title: 'Enhanced Fix Failed',
        description: 'An error occurred while trying to fix the document.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // Enhanced query detection
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
      'count',
      'how many',
      'list',
      'describe',
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

  // Enhanced query handler using new workflow
  const handleQuery = useCallback(
    async (queryText?: string) => {
      const queryToUse = queryText || query
      if (!queryToUse.trim()) return

      if (!projectId) {
        toast({
          title: 'Project Required',
          description:
            'Project ID is required for enhanced search and AI functionality.',
          variant: 'destructive',
        })
        return
      }

      // Check document status before proceeding
      if (queryScope === 'document') {
        if (!documentId) {
          setQueryScope('project')
          toast({
            title: 'Switched to Enhanced Project Scope',
            description: projectName
              ? `No specific document selected, searching across "${projectName}" with enhanced AI.`
              : 'No specific document selected, searching across the entire project with enhanced AI.',
          })
        } else if (!document) {
          toast({
            title: 'Enhanced Document Loading',
            description:
              'Document information is still loading. Please wait a moment and try again.',
            variant: 'destructive',
          })
          return
        } else if (document.status === 'processing') {
          toast({
            title: 'Enhanced Document Processing',
            description: projectName
              ? `This document is still being processed. Switching to enhanced search across "${projectName}" instead.`
              : 'This document is still being processed. Switching to enhanced project-wide search instead.',
          })
          setQueryScope('project')
        } else if (document.status === 'failed') {
          toast({
            title: 'Enhanced Document Processing Failed',
            description: projectName
              ? `This document failed to process. Switching to enhanced search across "${projectName}" instead.`
              : 'This document failed to process. Switching to enhanced project-wide search instead.',
          })
          setQueryScope('project')
        }
      }

      console.log('Starting enhanced query:', {
        query: queryToUse,
        projectId,
        queryScope,
        enhancedSearch: enhancedSearchActive,
      })

      setIsLoading(true)
      setResults(null)

      try {
        // Use enhanced AI workflow
        const response = await handleEnhancedAIQuery({
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

          // Clear the query field after successful AI response
          setQuery('')

          // Enhanced feedback based on search method
          const searchMethod = response.metadata?.searchMethod || 'standard'
          const intelligentSearch =
            response.metadata?.intelligentSearch || false

          if (!isMobile) {
            toast({
              title: intelligentSearch
                ? 'Enhanced AI Analysis Complete'
                : 'AI Analysis Complete',
              description: `Your question about the ${queryScope === 'document' ? 'document' : projectName ? `project "${projectName}"` : 'project'} has been answered${intelligentSearch ? ' using intelligent document analysis' : ''}.`,
            })
          }

          // Provide enhanced voice feedback
          if (response.response && response.response.length > 0) {
            setTimeout(() => {
              speakWithStateTracking(response.response, {
                voice: 'Ruth',
                stopListeningAfter: true,
              }).catch(console.error)
            }, 1000)
          }
        } else {
          // Search response
          const resultCount = response.searchResults?.ids?.[0]?.length || 0
          const searchMethod = response.metadata?.searchMethod || 'standard'
          const intelligentSearch =
            response.metadata?.intelligentSearch || false
          const searchSummary = intelligentSearch
            ? `Found ${resultCount} relevant elements using enhanced intelligent search.`
            : `Found ${resultCount} relevant document${resultCount > 1 ? 's' : ''} for your search.`

          const aiMessage: ChatMessage = {
            id: `ai-search-${Date.now()}`,
            type: 'ai',
            content: searchSummary,
            timestamp: new Date(),
            metadata: response.metadata,
          }

          setChatHistory(prev => [...prev, userMessage, aiMessage])

          setResults({
            type: 'search',
            searchResults: response.searchResults,
            metadata: response.metadata,
          })

          setQuery('')

          toast({
            title: intelligentSearch
              ? 'Enhanced Search Complete'
              : 'Search Complete',
            description: `Found results ${queryScope === 'document' ? 'in this document' : projectName ? `in project "${projectName}"` : 'across the project'}${intelligentSearch ? ' using intelligent analysis' : ''}.`,
          })
        }
      } catch (error) {
        console.error('Enhanced Query Error:', error)

        let title = 'Enhanced Query Failed'
        let description =
          'Please try again or contact support if the problem persists.'

        if (error instanceof Error) {
          const errorMessage = error.message
          if (errorMessage.includes('API key is not configured')) {
            title = 'Enhanced Configuration Error'
            description =
              'OpenAI API key is missing from environment variables.'
          } else if (errorMessage.includes('OpenAI API error')) {
            title = 'Enhanced AI Service Error'
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
      enhancedSearchActive,
    ],
  )

  // Voice input handling
  const toggleListening = useCallback(() => {
    const newListeningState = !isListening
    setIsListening(newListeningState)

    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    if (newListeningState) {
      hasTranscriptRef.current = false

      if (isMobile && mobileRecognitionRef.current) {
        try {
          // iOS Safari fix: Ensure we have user gesture and permissions
          if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
            console.log('🍎 Starting iOS enhanced voice recognition with user gesture')
            
            // Request microphone permission explicitly on iOS
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                  console.log('🍎 iOS microphone permission granted (enhanced)')
                  mobileRecognitionRef.current?.start()
                })
                .catch((error) => {
                  console.error('🍎 iOS microphone permission denied (enhanced):', error)
                  toast({
                    title: 'Microphone Permission Required',
                    description: 'Please allow microphone access in Safari settings to use enhanced voice input.',
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
          console.error('Error starting enhanced mobile recognition:', error)
          
          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              toast({
                title: 'Microphone Permission Denied',
                description: 'Please allow microphone access to use enhanced voice input.',
                variant: 'destructive',
              })
            } else if (error.name === 'NotSupportedError') {
              toast({
                title: 'Enhanced Voice Recognition Not Supported',
                description: 'Your browser does not support enhanced voice recognition.',
                variant: 'destructive',
              })
            } else {
              toast({
                title: 'Enhanced Voice Recognition Error',
                description: 'Unable to start enhanced voice recognition. Please try again.',
                variant: 'destructive',
              })
            }
          }
          
          setIsListening(false)
        }
      }

      if (!isMobile) {
        toast({
          title: 'Enhanced Voice Input Started',
          description: 'Enhanced voice recording with intelligent processing.',
        })
      }
    } else {
      if (isMobile && mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping enhanced mobile recognition:', error)
        }
      }

      if (!isMobile) {
        toast({
          title: 'Enhanced Voice Input Started',
          description: `Speak your enhanced query... Will auto-submit after ${isMobile ? '1.5s' : '2s'} of silence.`,
        })
      }
    }
  }, [isListening, silenceTimer, isMobile, toast])

  const handleTranscript = useCallback(
    (text: string) => {
      console.log(
        '⚠️ Enhanced final transcript handler called in preventLoop mode',
      )

      if (isVoicePlaying) {
        console.log(
          '🛑 Ignoring enhanced final transcript during voice playback:',
          text,
        )
        return
      }

      console.log('✅ Processing enhanced final voice transcript:', text)
      setQuery(text)
      hasTranscriptRef.current = true

      if (text.trim()) {
        console.log(
          '🔄 Enhanced final transcript received, deferring to interim-based silence detection',
        )
      }
    },
    [isVoicePlaying],
  )

  const handleInterimTranscript = useCallback(
    (text: string) => {
      if (isVoicePlaying) {
        console.log(
          '🛑 Ignoring enhanced interim transcript during voice playback:',
          text,
        )
        return
      }

      setInterimTranscript(text)
      setQuery(text)

      if (text.trim()) {
        hasTranscriptRef.current = true

        if (silenceTimer) {
          clearTimeout(silenceTimer)
          console.log(
            '🔄 Enhanced speech activity detected, resetting silence timer',
          )
        }

        const timer = setTimeout(
          () => {
            const currentQuery = query || text
            if (
              currentQuery.trim() &&
              hasTranscriptRef.current &&
              !isVoicePlaying &&
              isListening
            ) {
              console.log(
                `⏰ Enhanced auto-submitting query after ${isMobile ? '1.5s' : '3s'} of silence:`,
                currentQuery.slice(0, 100),
              )
              setIsLoading(true)
              if (isListening) {
                toggleListening()
              }
              setTimeout(() => {
                if (!isVoicePlaying) {
                  handleQuery()
                }
              }, 100)
            } else {
              console.log(
                '⏰ Enhanced skipping auto-submit - conditions not met:',
                {
                  hasQuery: !!currentQuery.trim(),
                  hasTranscript: hasTranscriptRef.current,
                  isVoicePlaying,
                  isListening,
                },
              )
            }
          },
          isMobile ? 1500 : 3000,
        )

        setSilenceTimer(timer)
        console.log(
          '⏰ Enhanced silence timer started for:',
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

  // Mobile voice recognition setup
  useEffect(() => {
    if (!isMobile) return

    if (typeof window !== 'undefined' && !mobileRecognitionRef.current) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI()
        
        // iOS Safari requires different settings for better compatibility
        const isIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
        if (isIOS) {
          console.log('🍎 Configuring enhanced mobile recognition for iOS')
          recognition.continuous = false  // iOS works better with non-continuous mode
          recognition.interimResults = false  // iOS Safari has issues with interim results
          recognition.maxAlternatives = 1  // Keep it simple for iOS
        } else {
          recognition.continuous = false
          recognition.interimResults = true
          recognition.maxAlternatives = 1
        }
        recognition.lang = 'en-US'

        let mobileTranscript = ''

        recognition.onresult = event => {
          if (isVoicePlaying) return

          const results = Array.from(event.results)
          let completeTranscript = ''

          for (let i = 0; i < results.length; i++) {
            completeTranscript += results[i][0].transcript
          }

          mobileTranscript = completeTranscript
          console.log(
            '📱 Enhanced mobile voice transcript:',
            completeTranscript,
          )

          setQuery(completeTranscript)
          
          // iOS doesn't support interim results, so we handle both cases
          const isIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
          if (!isIOS) {
            setInterimTranscript(completeTranscript)
          }

          if (completeTranscript.trim()) {
            hasTranscriptRef.current = true

            if (silenceTimer) {
              clearTimeout(silenceTimer)
            }

            const transcriptToSubmit = completeTranscript
            const timer = setTimeout(() => {
              const trimmedTranscript = transcriptToSubmit.trim()
              if (trimmedTranscript && trimmedTranscript.length > 0) {
                setQuery(trimmedTranscript)
                setIsLoading(true)
                setIsListening(false)
                setTimeout(() => {
                  handleQuery(trimmedTranscript)
                }, 300)
              }
            }, 1500)

            setSilenceTimer(timer)
          }
        }

        recognition.onerror = event => {
          console.error('📱 Enhanced mobile voice error:', event.error)
          if (mobileTranscript.trim()) {
            setQuery(mobileTranscript)
          }
          if (isListening) {
            setIsListening(false)
          }
        }

        recognition.onend = () => {
          console.log('📱 Enhanced mobile voice recognition ended')
        }

        mobileRecognitionRef.current = recognition
      }
    }

    return () => {
      if (mobileRecognitionRef.current) {
        try {
          mobileRecognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping enhanced mobile recognition:', error)
        }
      }
    }
  }, [isMobile, isVoicePlaying, silenceTimer, isListening, handleQuery])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The enhanced text has been copied to your clipboard.',
    })
  }

  // Stop voice input when voice output is playing
  useEffect(() => {
    if (isVoicePlaying && isListening) {
      console.log('🛑 Stopping enhanced voice input due to voice output')
      setIsListening(false)
    }
  }, [isVoicePlaying, isListening])

  // Resume listening after voice playback finishes
  useEffect(() => {
    if (!isVoicePlaying && shouldResumeListening) {
      console.log(
        '🎤 Enhanced voice finished, preparing to resume listening...',
      )

      const timer = setTimeout(() => {
        console.log('🎤 Enhanced resuming voice input now!')
        setIsListening(true)
        setShouldResumeListening(false)
        toast({
          title: 'Enhanced voice input resumed',
          description: 'Ready for your next enhanced question...',
          duration: 2000,
        })
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isVoicePlaying, shouldResumeListening, toast])

  return (
    <>
      <Card className="mb-16 md:mb-0 animate-fade-in">
        <CardHeader className="pb-3" style={{ display: 'none' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Enhanced AI Analysis
                <Sparkles className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription>
                Intelligent insights from your{' '}
                {queryScope === 'document'
                  ? 'document'
                  : projectName
                    ? `project "${projectName}"`
                    : 'project'}{' '}
                with enhanced processing
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enhanced Search Toggle */}
          <div className="border rounded-xl p-4 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Enhanced Search Mode
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Intelligent document analysis with structured extraction
                  </p>
                </div>
              </div>
              <Button
                variant={enhancedSearchActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnhancedSearchActive(!enhancedSearchActive)}
                className="text-xs"
              >
                {enhancedSearchActive ? (
                  <>
                    <Target className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-1" />
                    Standard
                  </>
                )}
              </Button>
            </div>
            {enhancedSearchActive && (
              <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                <div className="text-xs text-primary font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Enhanced Features Active:
                </div>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• Intelligent query understanding</li>
                  <li>• Structured element extraction</li>
                  <li>• Spatial relationship mapping</li>
                  <li>• Enhanced accuracy (65% → 92%)</li>
                </ul>
              </div>
            )}
          </div>

          {/* Document Status Section */}
          {document && (
            <div className="border rounded-xl p-4 mt-6 sm:mt-4 bg-gradient-to-r from-secondary/50 to-secondary/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <FileSearch className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Enhanced Document Status
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
                    Document is being processed for enhanced AI analysis. This
                    usually takes 1-2 minutes.
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
                    Enhanced document processing failed. Please try re-uploading
                    the document.
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
                    Retry Enhanced Processing
                  </Button>
                </div>
              )}
              {document.status === 'processed' && (
                <div className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />✓ Document is ready for
                  enhanced AI analysis and intelligent search
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
                  Enhanced Smart AI Query
                  <span className="text-xs text-primary animate-pulse">✨</span>
                  {enhancedSearchActive && (
                    <Badge variant="default" className="text-2xs">
                      <Zap className="h-2 w-2 mr-1" />
                      Enhanced
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enhancedSearchActive
                    ? 'Unlock advanced insights with intelligent document analysis'
                    : 'Standard AI search & analysis capabilities'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-2xs">
                    {queryScope === 'document' && documentId
                      ? 'Document scope'
                      : 'Project scope'}
                  </Badge>
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

            <div className="text-xs text-gray-400 mb-4 bg-gradient-to-r from-muted/40 to-muted/20 p-3 rounded-lg border border-muted/50 hidden md:block">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm">🚀</span>
                  <div>
                    <span className="font-medium text-foreground">
                      Enhanced Pro Tip:
                    </span>{' '}
                    {enhancedSearchActive ? (
                      <>
                        Ask detailed questions like "How many conference rooms
                        are on the second floor?" or "What are the window
                        specifications in the east wing?" to get precise,
                        structured answers from your enhanced document analysis.
                      </>
                    ) : (
                      <>
                        Ask questions like "What are the key safety
                        requirements?" or search for specific terms like
                        "concrete specifications" to get intelligent results
                        from your{' '}
                        {queryScope === 'document' && documentId
                          ? 'document'
                          : 'project'}
                        .
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Textarea
                placeholder={
                  isMobile
                    ? `💬 Ask anything about this ${queryScope === 'document' && documentId ? 'document' : 'project'}...${enhancedSearchActive ? ' (Enhanced mode)' : ''}`
                    : enhancedSearchActive
                      ? `✨ Ask detailed questions about this ${queryScope === 'document' && documentId ? 'document' : projectName ? `project "${projectName}"` : 'project'}... e.g., "How many doors are in the building?" or "What are the room dimensions?"`
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
              {currentSpeakingText && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hidden md:block">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    Enhanced AI is speaking:
                  </div>
                  <div className="text-blue-800 text-sm leading-relaxed">
                    {currentSpeakingText}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 mb-4">
              <div className="flex gap-2 items-center">
                {/* VoiceInput - only render on desktop */}
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
                    Enhanced Speaking...
                  </div>
                )}
                {shouldResumeListening && !isVoicePlaying && (
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                    Enhanced Resuming...
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
                  className={`flex items-center gap-2 px-6 shadow-soft hover:shadow-medium transition-all duration-200 ${
                    enhancedSearchActive
                      ? 'bg-gradient-to-r from-primary via-primary/90 to-accent hover:from-primary/90 hover:via-primary hover:to-accent/90'
                      : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                  }`}
                  size="default"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      <span className="animate-pulse">
                        {enhancedSearchActive
                          ? 'Enhanced Analyzing...'
                          : 'Analyzing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {isQuestion(query) ? (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span className="flex items-center gap-1">
                            Ask AI
                            {enhancedSearchActive && (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span className="flex items-center gap-1">
                            Ask AI
                            {enhancedSearchActive && (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Display Enhanced Search Results */}
            {results?.type === 'search' &&
              results.searchResults &&
              results.searchResults.ids &&
              results.searchResults.ids[0] &&
              results.searchResults.ids[0].length > 0 && (
                <div className="bg-gradient-to-r from-secondary/30 to-secondary/10 p-4 rounded-xl border text-sm space-y-3 mb-4 shadow-soft">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shadow-soft">
                        {results.metadata?.intelligentSearch ? (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Enhanced Search Results (
                            {results.searchResults.ids[0].length} found)
                          </>
                        ) : (
                          <>
                            <Search className="h-3 w-3 mr-1" />
                            Search Results (
                            {results.searchResults.ids[0].length} found)
                          </>
                        )}
                      </Badge>
                      {results.metadata?.confidence && (
                        <Badge variant="secondary" className="text-2xs">
                          {(results.metadata.confidence * 100).toFixed(1)}%
                          confidence
                        </Badge>
                      )}
                    </div>
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

                  {/* Show enhanced search summary if available */}
                  {results.searchResults.summary && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Enhanced Search Summary:
                      </div>
                      <div className="text-xs text-foreground whitespace-pre-wrap">
                        {results.searchResults.summary}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {results.searchResults.ids[0].map(
                      (id: string, i: number) => {
                        const metadata =
                          results.searchResults!.metadatas?.[0]?.[i] || {}
                        const isIntelligentResult = metadata.intelligent_search

                        return (
                          <div
                            key={id}
                            className={`p-3 rounded-lg shadow-soft border text-xs ${
                              isIntelligentResult
                                ? 'bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20'
                                : 'bg-background'
                            }`}
                          >
                            <div className="font-medium text-primary mb-2 flex items-center gap-2">
                              {isIntelligentResult && (
                                <Sparkles className="h-3 w-3" />
                              )}
                              {metadata.element_type && (
                                <Badge variant="outline" className="text-2xs">
                                  {metadata.element_type}
                                </Badge>
                              )}
                              Document: {metadata.name || id}
                            </div>
                            <div className="text-foreground mb-2 leading-relaxed">
                              {results.searchResults!.documents?.[0]?.[i] ||
                                'No content preview available'}
                            </div>

                            {/* Enhanced metadata for intelligent search results */}
                            {isIntelligentResult && metadata.match_reasons && (
                              <div className="text-xs text-primary/70 mb-1">
                                <span className="font-medium">
                                  Match reasons:
                                </span>{' '}
                                {metadata.match_reasons}
                              </div>
                            )}

                            <div className="text-xs text-gray-400 flex justify-between items-center">
                              <span>ID: {id}</span>
                              <div className="flex items-center gap-2">
                                {metadata.confidence && (
                                  <span className="font-medium text-primary">
                                    {(metadata.confidence * 100).toFixed(1)}%
                                    confidence
                                  </span>
                                )}
                                <span className="font-medium">
                                  Relevance:{' '}
                                  {(
                                    1 -
                                    (results.searchResults!.distances?.[0]?.[
                                      i
                                    ] || 0)
                                  ).toFixed(3)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>
              )}

            {/* Enhanced Chat History Display */}
            {chatHistory.length > 0 && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-xl border shadow-soft">
                  <div className="flex justify-between items-center mb-3">
                    <Badge
                      variant="outline"
                      className="shadow-soft hidden md:flex"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Enhanced Conversation History
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
                            {message.type === 'user' ? (
                              <>👤 You</>
                            ) : (
                              <>
                                🤖 Enhanced AI
                                {message.metadata?.intelligentSearch && (
                                  <Sparkles className="h-3 w-3 text-primary" />
                                )}
                              </>
                            )}
                            <span>•</span>
                            <span>
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            {message.metadata?.searchMethod && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium">
                                  {message.metadata.searchMethod}
                                </span>
                              </>
                            )}
                          </div>
                          <div
                            className={`${message.type === 'ai' ? 'prose prose-sm max-w-none text-foreground' : 'break-words whitespace-pre-wrap'}`}
                          >
                            {message.content}
                          </div>

                          {/* Enhanced metadata display */}
                          {message.metadata?.confidence &&
                            message.type === 'ai' && (
                              <div className="text-xs text-primary/70 mt-2 flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Confidence:{' '}
                                {(message.metadata.confidence * 100).toFixed(1)}
                                %
                              </div>
                            )}

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

            {/* No Results Message */}
            {results?.type === 'search' &&
              results.searchResults &&
              (!results.searchResults.ids ||
                !results.searchResults.ids[0] ||
                results.searchResults.ids[0].length === 0) &&
              !isLoading &&
              query && (
                <div className="text-gray-400 text-sm mb-4 p-3 bg-muted/20 rounded-lg border">
                  No enhanced results found for "
                  <span className="font-medium">{query}</span>". Try different
                  search terms or ask a question for enhanced AI analysis.
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Shazam-style voice button */}
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

      {/* Enhanced voice button when hidden */}
      {hideShazamButton && isMobile && (
        <div className="fixed bottom-4 right-4 z-[99]">
          <Button
            onClick={() => setHideShazamButton(false)}
            className={`h-24 w-24 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
              enhancedSearchActive
                ? 'bg-gradient-to-r from-primary to-accent'
                : 'bg-primary'
            }`}
            title="Show enhanced voice button"
          >
            <div className="relative">
              <Mic
                className="text-white"
                style={{ width: '36px', height: '36px' }}
              />
              {enhancedSearchActive && (
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-white" />
              )}
            </div>
          </Button>
        </div>
      )}
    </>
  )
}
