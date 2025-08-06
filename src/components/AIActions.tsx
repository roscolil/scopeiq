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
  BrainCircuit,
  Search,
  FileSearch,
  Copy,
  MessageSquare,
  FileStack,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
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
import { useSemanticSearch } from '@/hooks/useSemanticSearch'
import { semanticSearch } from '@/services/embedding'
import { documentService } from '@/services/hybrid'
import { Document } from '@/types'
import { retryDocumentProcessing } from '@/utils/document-recovery'
// or import { callClaude } from '@/services/anthropic'

interface AIActionsProps {
  documentId: string
  projectId?: string
  companyId?: string
}

export const AIActions = ({
  documentId,
  projectId,
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
  } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    'document', // Default to document scope for individual document page
  )
  const [isLoading, setIsLoading] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
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

  // Fetch document status on component mount and set up live polling
  useEffect(() => {
    const fetchDocumentStatus = async () => {
      if (!documentId || !projectId || !companyId) return

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
      } finally {
        setIsLoadingStatus(false)
      }
    }

    // Initial fetch
    fetchDocumentStatus()

    // Set up adaptive polling with status-dependent intervals
    let intervalId: NodeJS.Timeout | null = null

    const startPolling = () => {
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

    // Start polling immediately
    startPolling()

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
          <Badge variant="secondary" className="bg-amber-500 text-white">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
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

  const handleQuery = async () => {
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
      if (!document) {
        toast({
          title: 'Document Not Found',
          description: 'Unable to find document information.',
          variant: 'destructive',
        })
        return
      }

      if (document.status === 'processing') {
        toast({
          title: 'Document Processing',
          description:
            'This document is still being processed. Please wait a moment and try again.',
          variant: 'destructive',
        })
        return
      }

      if (document.status === 'failed') {
        toast({
          title: 'Document Processing Failed',
          description:
            'This document failed to process and cannot be analyzed. Please try uploading the document again.',
          variant: 'destructive',
        })
        return
      }

      if (document.status !== 'processed') {
        toast({
          title: 'Document Not Ready',
          description:
            'This document is not ready for AI analysis. Please check the document status.',
          variant: 'destructive',
        })
        return
      }
    }

    console.log('Starting query:', { query, projectId, queryScope })
    setIsLoading(true)
    setResults(null)

    try {
      if (isQuestion(query)) {
        // Handle as AI question - first get relevant content via semantic search
        const searchResponse = await semanticSearch({
          projectId: projectId,
          query: query,
          topK: 3,
          ...(queryScope === 'document' && { documentId }), // Add documentId filter for document-specific queries
        })

        // Build context from search results
        let context = `Project ID: ${projectId}\n`
        if (queryScope === 'document') {
          context = `Document ID: ${documentId}\nDocument Name: ${document?.name || 'Unknown'}\n`
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
              return `Document: ${docName}\nContent: ${doc}`
            })
            .join('\n\n')

          context += `\nRelevant Content:\n${relevantContent}`
        } else {
          if (queryScope === 'document') {
            context += `\nNo content found for this specific document. The document may not have been fully processed or may not contain extractable text content.`
          } else {
            context += `\nNo relevant document content found for this query. The system may not have processed documents for this project yet.`
          }
        }

        const response = await callOpenAI(query, context)
        setResults({
          type: 'ai',
          aiAnswer: response,
        })

        // Clear the query field after successful AI response
        setQuery('')

        toast({
          title: 'AI Analysis Complete',
          description: `Your question about the ${queryScope === 'document' ? 'document' : 'project'} has been answered.`,
        })
      } else {
        // Handle as semantic search
        await search(query)
        // Clear the query field after successful search
        setQuery('')
        // The search results will be handled by the useEffect below
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
  }

  // Handle search results from the hook
  useEffect(() => {
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
    }
  }, [searchResults])

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

  const toggleListening = () => {
    const newListeningState = !isListening
    setIsListening(newListeningState)

    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    if (isListening) {
      hasTranscriptRef.current = false
      toast({
        title: 'Voice input stopped',
        description: 'Voice recording has been stopped.',
      })
    } else {
      toast({
        title: 'Voice input started',
        description:
          'Speak your query... Will auto-submit after 2s of silence.',
      })
    }
  }

  const handleTranscript = (text: string) => {
    if (silenceTimer) {
      clearTimeout(silenceTimer)
    }

    setQuery(text)
    hasTranscriptRef.current = true

    const timer = setTimeout(() => {
      if (isListening && text.trim() && hasTranscriptRef.current) {
        toggleListening()
        setTimeout(() => {
          if (text.trim()) {
            handleQuery()
          }
        }, 100)
      }
    }, 2000)

    setSilenceTimer(timer)
  }

  const handleAskAI = async () => {
    await handleQuery()
  }

  return (
    <>
      <Card className="mb-32 md:mb-0 animate-fade-in">
        <CardHeader className="pb-3" style={{ display: 'none' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Analysis</CardTitle>
              <CardDescription>
                Intelligent insights from your{' '}
                {queryScope === 'document' ? 'document' : 'project'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Status Section */}
          {document && (
            <div className="border rounded-xl p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <FileSearch className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Document Status
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate max-w-[200px] font-medium">
                  {document.name}
                </span>
                {getStatusBadge(document.status)}
              </div>
              {document.status === 'processing' && (
                <div className="space-y-3 mt-3">
                  <div className="text-xs text-muted-foreground">
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
              <div className="p-1.5 bg-primary/10 rounded-lg mr-3">
                <BrainCircuit className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Smart AI Query
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-2xs">
                    Search or Ask
                  </Badge>
                  <Badge variant="outline" className="text-2xs">
                    {documentId ? 'Document scope' : 'Project scope'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-4 bg-muted/30 p-3 rounded-lg border">
              <span className="font-medium">💡 Tip:</span> Enter keywords to
              search this {documentId ? 'document' : 'project'}, or ask a
              natural language question for AI analysis.
            </div>

            <div className="mb-4">
              <Textarea
                placeholder={`Search or ask questions about this ${documentId ? 'document' : 'project'}...`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full resize-none min-h-[70px] shadow-soft focus:shadow-medium transition-all duration-200"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleQuery()
                  }
                }}
              />
            </div>

            <div className="flex justify-between gap-3 mb-4">
              <VoiceInput
                onTranscript={handleTranscript}
                isListening={isListening}
                toggleListening={toggleListening}
              />
              <Button
                onClick={handleQuery}
                disabled={
                  isLoading || !query.trim() || document?.status !== 'processed'
                }
                className="flex items-center gap-2 px-6 shadow-soft hover:shadow-medium"
                size="default"
              >
                {isLoading ? (
                  <>
                    <div className="spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isQuestion(query) ? (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        Ask AI
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Search
                      </>
                    )}
                  </>
                )}
              </Button>
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
                          <div className="text-xs text-muted-foreground flex justify-between">
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

            {/* Display AI Answer */}
            {results?.type === 'ai' && results.aiAnswer && (
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
                <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none">
                  {results.aiAnswer}
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
                <div className="text-muted-foreground text-sm mb-4 p-3 bg-muted/20 rounded-lg border">
                  No results found for "
                  <span className="font-medium">{query}</span>". Try different
                  search terms or ask a question for AI analysis.
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Shazam-style voice button - only appears on mobile */}
      <VoiceShazamButton
        isListening={isListening}
        toggleListening={toggleListening}
        showTranscript={isListening || query ? query : undefined}
        isProcessing={isLoading}
        isMobileOnly={true}
      />
    </>
  )
}
