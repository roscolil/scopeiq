/**
 * Enhanced AI Actions with Seamless AWS Polly Voice Integration
 * Provides transparent voice guidance during OpenAI/Pinecone workflows
 */

import { useState, useRef, useEffect } from 'react'
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
  VolumeX,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { VoiceInput } from './VoiceInput'
import { VoiceShazamButton } from './VoiceShazamButton'
import { NovaSonicPrompts } from './NovaSonicPrompts'
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
import { useSemanticSearch } from '@/hooks/useSemanticSearch'
import { semanticSearch } from '@/services/embedding'
import { documentService } from '@/services/hybrid'
import { Document } from '@/types'
import { VoiceId } from '@aws-sdk/client-polly'

interface EnhancedAIActionsProps {
  documentId: string
  projectId?: string
  companyId?: string
  enableVoicePrompts?: boolean // New prop to control voice integration
}

export const EnhancedAIActions = ({
  documentId,
  projectId,
  companyId,
  enableVoicePrompts = true,
}: EnhancedAIActionsProps) => {
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
    documentId ? 'document' : 'project',
  )
  const [isLoading, setIsLoading] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [hideShazamButton, setHideShazamButton] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoicePrompts)
  const [isProcessingStage, setIsProcessingStage] = useState<
    'idle' | 'searching' | 'analyzing' | 'complete'
  >('idle')

  const { toast } = useToast()
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)

  // Use semantic search hook for real search functionality
  const {
    results: searchResults,
    loading: isSearching,
    error: searchError,
    search,
  } = useSemanticSearch(projectId || '')

  /**
   * Enhanced Voice Integration Functions
   * These functions provide seamless voice feedback during AI workflows
   */

  const speakIfEnabled = async (
    text: string,
    options?: { voice?: VoiceId; priority?: 'low' | 'high' },
  ) => {
    if (!voiceEnabled || !enableVoicePrompts) return

    try {
      await novaSonic.speak(text, {
        voice: options?.voice || 'Joanna',
        engine: 'neural',
      })
    } catch (error) {
      console.warn('Voice synthesis failed:', error)
      // Fail silently to not disrupt the main workflow
    }
  }

  const announceWorkflowStage = async (stage: string, details?: string) => {
    if (!voiceEnabled) return

    const stageAnnouncements: Record<string, string> = {
      searching: 'Searching your documents with AI-powered semantic analysis.',
      analyzing:
        'Analyzing the results with GPT-4 to provide you with the best answer.',
      processing: 'Processing your query through the knowledge base.',
      complete: 'Analysis complete. Your results are ready.',
      found_results: `Found ${details} relevant documents.`,
      no_results: 'No relevant documents found for your query.',
      error:
        'I encountered an issue processing your request. Please try again.',
    }

    const announcement = stageAnnouncements[stage] || stage
    await speakIfEnabled(announcement, { priority: 'low' })
  }

  /**
   * Enhanced Query Handler with Voice Integration
   * Seamlessly integrates voice feedback into the existing OpenAI/Pinecone workflow
   */
  const handleEnhancedQuery = async () => {
    if (!query.trim()) return

    if (!projectId) {
      await speakIfEnabled(
        'Project ID is required for search and AI functionality.',
      )
      toast({
        title: 'Project Required',
        description: 'Project ID is required for search and AI functionality.',
        variant: 'destructive',
      })
      return
    }

    // Voice announcement for query start
    await speakIfEnabled(
      'Processing your query. Let me search through your documents.',
    )

    // Check document status before proceeding
    if (queryScope === 'document') {
      if (!documentId) {
        setQueryScope('project')
        await speakIfEnabled(
          'Switching to project-wide search to find the most relevant information.',
        )
        toast({
          title: 'Switched to Project Scope',
          description:
            'No specific document selected, searching across the entire project.',
        })
      } else if (!document) {
        await speakIfEnabled('Document is still loading. Please wait a moment.')
        toast({
          title: 'Document Loading',
          description:
            'Document information is still loading. Please wait a moment and try again.',
          variant: 'destructive',
        })
        return
      } else if (document.status === 'processing') {
        await speakIfEnabled(
          'Document is still processing. Switching to project-wide search.',
        )
        setQueryScope('project')
        toast({
          title: 'Document Processing',
          description:
            'This document is still being processed. Switching to project-wide search instead.',
        })
      } else if (document.status === 'failed') {
        await speakIfEnabled(
          'Document processing failed. Switching to project-wide search.',
        )
        setQueryScope('project')
        toast({
          title: 'Document Processing Failed',
          description:
            'This document failed to process. Switching to project-wide search instead.',
        })
      }
    }

    console.log('Starting enhanced query:', { query, projectId, queryScope })
    setIsLoading(true)
    setResults(null)
    setIsProcessingStage('searching')

    try {
      // Voice announcement for search phase
      await announceWorkflowStage('searching')

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

        setIsProcessingStage('searching')
        const searchResponse = await semanticSearch(searchParams)

        // Voice feedback on search results
        if (searchResponse.documents?.[0]?.length > 0) {
          const resultCount = searchResponse.documents[0].length
          await announceWorkflowStage('found_results', resultCount.toString())
        } else {
          await announceWorkflowStage('no_results')
        }

        // Build context from search results
        let context = ``
        if (searchResponse.documents?.[0]) {
          const relevantDocs = searchResponse.documents[0]
            .filter(doc => doc && doc.trim().length > 0)
            .slice(0, 3) // Limit to top 3 for context

          if (relevantDocs.length > 0) {
            context = `Based on the following relevant document excerpts:\n\n${relevantDocs
              .map((doc, index) => `Document ${index + 1}:\n${doc}`)
              .join('\n\n')}\n\n`
          }
        }

        // Voice announcement for AI analysis phase
        setIsProcessingStage('analyzing')
        await announceWorkflowStage('analyzing')

        // Call OpenAI with context
        const aiResponse = await callOpenAI(query, context)

        // Voice announcement for completion
        setIsProcessingStage('complete')
        await announceWorkflowStage('complete')

        // Optionally read the answer aloud (for shorter responses)
        if (aiResponse.length < 200) {
          setTimeout(async () => {
            await speakIfEnabled(`Here's what I found: ${aiResponse}`)
          }, 1000) // Delay to let the completion announcement finish
        }

        setResults({
          type: 'ai',
          aiAnswer: aiResponse,
          searchResults: searchResponse,
          query: query,
        })
      } else {
        // Handle as semantic search
        setIsProcessingStage('searching')
        await announceWorkflowStage('searching')

        const searchParams: {
          projectId: string
          query: string
          topK: number
          documentId?: string
        } = {
          projectId: projectId,
          query: query,
          topK: 10,
        }

        if (
          queryScope === 'document' &&
          documentId &&
          document?.status === 'processed'
        ) {
          searchParams.documentId = documentId
        }

        const searchResponse = await semanticSearch(searchParams)

        // Voice feedback on search results
        if (searchResponse.documents?.[0]?.length > 0) {
          const resultCount = searchResponse.documents[0].length
          await announceWorkflowStage('found_results', resultCount.toString())
        } else {
          await announceWorkflowStage('no_results')
        }

        setIsProcessingStage('complete')
        await announceWorkflowStage('complete')

        setResults({
          type: 'search',
          searchResults: searchResponse,
          query: query,
        })
      }
    } catch (error) {
      console.error('Query error:', error)
      await announceWorkflowStage('error')

      toast({
        title: 'Query Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsProcessingStage('idle')
    }
  }

  /**
   * Voice-Enhanced Utility Functions
   */

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
      'could',
      'would',
      'should',
      'is',
      'are',
      'was',
      'were',
      'do',
      'does',
      'did',
      'will',
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

  const handleVoiceTranscript = async (transcript: string) => {
    setQuery(transcript)
    await speakIfEnabled('I heard your question. Let me search for an answer.')
    // Auto-submit voice queries after a brief confirmation
    setTimeout(() => {
      handleEnhancedQuery()
    }, 500)
  }

  // Copy function with voice feedback
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    await speakIfEnabled('Content copied to clipboard.')
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
    })
  }

  // Rest of the original component logic...
  // [Include all the existing useEffect hooks and other functions from the original component]

  return (
    <div className="space-y-6">
      {/* Voice Control Panel */}
      {enableVoicePrompts && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Voice Assistant</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={
                  voiceEnabled
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-1" />
                    Disabled
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Get voice guidance during your AI-powered document analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <NovaSonicPrompts
                context="guidance"
                voice="Joanna"
                disabled={!voiceEnabled}
              />
              <NovaSonicPrompts
                context="welcome"
                voice="Joanna"
                disabled={!voiceEnabled}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Query Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle>AI-Powered Document Analysis</CardTitle>
            </div>
            {isProcessingStage !== 'idle' && (
              <Badge variant="secondary" className="animate-pulse">
                {isProcessingStage}
              </Badge>
            )}
          </div>
          <CardDescription>
            Ask questions or search through your construction documents using
            OpenAI and Pinecone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input with Voice Integration */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question or search your documents..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleEnhancedQuery()}
              className="flex-1"
            />
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              onListening={setIsListening}
              disabled={isLoading}
            />
            <Button
              onClick={handleEnhancedQuery}
              disabled={isLoading || !query.trim()}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Scope Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search scope:</span>
            <Select
              value={queryScope}
              onValueChange={(value: 'document' | 'project') =>
                setQueryScope(value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">This document</SelectItem>
                <SelectItem value="project">Entire project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Processing Stage Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {isProcessingStage === 'searching' &&
                  'Searching documents with Pinecone...'}
                {isProcessingStage === 'analyzing' &&
                  'Analyzing with OpenAI GPT-4...'}
                {isProcessingStage === 'complete' && 'Finalizing results...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.type === 'ai' ? (
                <>
                  <Brain className="h-5 w-5 text-green-600" />
                  AI Analysis Result
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 text-blue-600" />
                  Search Results
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(results.aiAnswer || 'Search results')
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.type === 'ai' && results.aiAnswer && (
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{results.aiAnswer}</p>
                </div>

                {enableVoicePrompts && voiceEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakIfEnabled(results.aiAnswer!)}
                    className="flex items-center gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Read Answer Aloud
                  </Button>
                )}
              </div>
            )}

            {/* Display search results when available */}
            {results.searchResults?.documents?.[0] && (
              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm text-gray-600">
                  Relevant Document Excerpts:
                </h4>
                {results.searchResults.documents[0].map((doc, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                    <p className="line-clamp-3">{doc}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedAIActions
