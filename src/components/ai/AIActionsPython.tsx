/**
 * AI Actions Component with Python Backend Integration
 * Enhanced version that can use Python backend for AI services
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
  Copy,
  MessageSquare,
  FileStack,
  RefreshCw,
  Loader2,
  Volume2,
  Server,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { VoiceInput } from '@/components/voice/VoiceInput'
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

// Python backend imports
import { usePythonChat } from '@/hooks/usePythonChat'
import {
  handleEnhancedAIQueryWithPython,
  getBackendConfig,
  type BackendConfig,
} from '@/services/ai/enhanced-ai-workflow-python'
import { isPythonChatAvailable } from '@/services/ai/python-chat-service'

interface AIActionsPythonProps {
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
  }
}

export const AIActionsPython = ({
  documentId,
  projectId,
  projectName,
  companyId,
}: AIActionsPythonProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    aiAnswer: string
    query?: string
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

  // Python backend state
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

  // Python chat hook
  const pythonChat = usePythonChat({
    projectId: projectId || '',
    documentId: documentId,
    contextType: queryScope,
  })

  // Auto-scroll chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkBackendHealth = useCallback(async () => {
    try {
      const isPythonAvailable = await isPythonChatAvailable()
      setBackendHealth(isPythonAvailable)

      if (isPythonAvailable) {
        setCurrentBackend('python')
      } else {
        setCurrentBackend('existing')
      }
    } catch (error) {
      console.error('Backend health check failed:', error)
      setBackendHealth(false)
      setCurrentBackend('existing')
    }
  }, [])

  const loadDocumentInfo = useCallback(async () => {
    if (!projectId || !companyId) return

    setIsLoadingStatus(true)
    try {
      const doc = await documentService.getDocument(
        companyId,
        projectId,
        documentId,
      )
      setDocument(doc)
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }, [projectId, companyId, documentId])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  // Initialize backend configuration
  useEffect(() => {
    const config = getBackendConfig()
    setBackendConfig(config)

    // Check backend health
    checkBackendHealth()
  }, [checkBackendHealth])

  // Load document information
  useEffect(() => {
    if (documentId && projectId && companyId) {
      loadDocumentInfo()
    }
  }, [documentId, projectId, companyId, loadDocumentInfo])

  const handleQuery = useCallback(
    async (queryText?: string) => {
      const queryToUse = queryText || query
      if (!queryToUse.trim()) return

      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required for AI queries',
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      setResults(null)

      try {
        // Use enhanced AI workflow with Python backend
        const response = await handleEnhancedAIQueryWithPython({
          query: queryToUse,
          projectId: projectId,
          documentId: queryScope === 'document' ? documentId : undefined,
          projectName,
          document: document || undefined,
          queryScope,
          onProgress: stage => {
            console.log('Enhanced AI Progress:', stage)
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

        // Add user message to chat history
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: queryToUse,
          timestamp: new Date(),
          query: queryToUse,
        }

        // AI response
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response.response || '',
          timestamp: new Date(),
        }

        setChatHistory(prev => [...prev, userMessage, aiMessage])

        setResults({
          aiAnswer: response.response,
          query: queryToUse,
        })

        // Clear the query field after successful AI response
        setQuery('')

        if (!isMobile) {
          toast({
            title: 'AI Response Generated',
            description: 'AI response generated successfully',
          })
        }
      } catch (error) {
        console.error('AI query failed:', error)
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
      documentId,
      projectName,
      document,
      queryScope,
      isMobile,
      toast,
    ],
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Response copied to clipboard',
    })
  }

  const speakResponse = async (text: string) => {
    if (isVoicePlaying) return

    setIsVoicePlaying(true)
    setCurrentSpeakingText(text)

    try {
      await novaSonic.speak(text, { voice: VoiceId.Joanna })
    } catch (error) {
      console.error('Speech synthesis failed:', error)
      toast({
        title: 'Speech Error',
        description: 'Failed to generate speech',
        variant: 'destructive',
      })
    } finally {
      setIsVoicePlaying(false)
      setCurrentSpeakingText('')
    }
  }

  const getBackendStatusBadge = () => {
    if (currentBackend === 'python') {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          <Server className="w-3 h-3 mr-1" />
          Python Backend
        </Badge>
      )
    } else if (currentBackend === 'existing') {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 border-blue-200"
        >
          <Server className="w-3 h-3 mr-1" />
          Existing Backend
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 border-gray-200"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Unknown Backend
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Backend Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Assistant
              {getBackendStatusBadge()}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={checkBackendHealth}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Backend
            </Button>
          </div>
          <CardDescription>
            Enhanced AI with Python backend integration for advanced document
            analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Ask a question about your documents
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask about doors, windows, measurements, or any construction details..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleQuery()
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleQuery()}
                disabled={isLoading || !query.trim()}
                className="px-4"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Query Scope Selection */}
          <div className="flex items-center gap-2">
            <Select
              value={queryScope}
              onValueChange={(value: 'document' | 'project') =>
                setQueryScope(value)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">
                  <FileStack className="w-4 h-4 mr-2" />
                  This Document
                </SelectItem>
                <SelectItem value="project">
                  <FileStack className="w-4 h-4 mr-2" />
                  Entire Project
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voice Input */}
          {!hideShazamButton && (
            <div className="flex items-center gap-2">
              <VoiceInput
                onTranscript={transcript => {
                  setQuery(transcript)
                  handleQuery(transcript)
                }}
                isListening={isListening}
                toggleListening={() => setIsListening(!isListening)}
                disabled={isLoading}
                preventLoop={true}
                preventAutoRestart={isVoicePlaying}
                isMobile={isMobile}
              />
              <span className="text-sm text-muted-foreground">
                Click to speak your question
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Response
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {results.aiAnswer && (
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{results.aiAnswer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(results.aiAnswer || '')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakResponse(results.aiAnswer || '')}
                    disabled={isVoicePlaying}
                  >
                    {isVoicePlaying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4 mr-2" />
                    )}
                    Speak
                  </Button>
                </div>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversation History
              </CardTitle>
              <ChatExport messages={chatHistory} />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-4 max-h-96 overflow-y-auto"
              ref={chatContainerRef}
            >
              {chatHistory.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    {message.metadata?.processingTimeMs && (
                      <div className="mt-2 flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {message.metadata.processingTimeMs}ms
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
