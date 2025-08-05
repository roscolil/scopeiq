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
    'project',
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

  // Fetch document status on component mount and set up polling
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

    // Set up polling for status updates (every 30 seconds for processing documents)
    let intervalId: NodeJS.Timeout | null = null

    if (document?.status === 'processing') {
      intervalId = setInterval(fetchDocumentStatus, 30000) // Poll every 30 seconds
    }

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

  // Manual refresh function
  const refreshDocumentStatus = async () => {
    if (!documentId || !projectId || !companyId) return

    setIsLoadingStatus(true)
    try {
      const doc = await documentService.getDocument(
        companyId,
        projectId,
        documentId,
      )
      setDocument(doc)

      toast({
        title: 'Status Updated',
        description: `Document status: ${doc?.status || 'unknown'}`,
      })
    } catch (error) {
      console.error('Error refreshing document status:', error)
      toast({
        title: 'Refresh Failed',
        description: 'Could not update document status.',
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
        })

        // Build context from search results
        let context = `Project ID: ${projectId}\n`
        if (queryScope === 'document') {
          context = `Document ID: ${documentId}\n`
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
          context += `\nNo relevant document content found for this query. The system may not have processed documents for this project yet.`
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
          description: 'Your question has been answered.',
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
      <Card className="mb-32 md:mb-0">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Tools</CardTitle>
          </div>
          <CardDescription>
            Leverage AI to analyze and extract insights from your{' '}
            {queryScope === 'document' ? 'document' : 'project'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Document Status Section */}
            {document && (
              <div className="border rounded-lg p-3 bg-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Document Status</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshDocumentStatus}
                    disabled={isLoadingStatus}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isLoadingStatus ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {document.name}
                  </span>
                  {getStatusBadge(document.status)}
                </div>
                {document.status === 'processing' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Document is being processed for AI search. This may take a
                    few minutes.
                  </div>
                )}
                {document.status === 'failed' && (
                  <div className="text-xs text-red-600 mt-1">
                    Document processing failed. Try re-uploading the document.
                  </div>
                )}
                {document.status === 'processed' && (
                  <div className="text-xs text-green-600 mt-1">
                    Document is ready for AI search and questions.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Query Scope:
              </span>
              <Select
                value={queryScope}
                onValueChange={(value: 'project' | 'document') =>
                  setQueryScope(value)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">
                    <div className="flex items-center">
                      <FileStack className="mr-2 h-4 w-4" />
                      <span>Entire Project</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center">
                      <FileSearch className="mr-2 h-4 w-4" />
                      <span>Current Document</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <BrainCircuit className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-sm font-medium">Smart AI Query</h3>
                <Badge variant="secondary" className="ml-2 text-xs">
                  Search or Ask
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                Enter keywords to search documents, or ask a question for AI
                analysis
              </div>

              <div className="mb-3">
                <Textarea
                  placeholder={`Search documents or ask questions about your ${queryScope === 'document' ? 'document' : 'project'}...`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full resize-none min-h-[60px]"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleQuery()
                    }
                  }}
                />
              </div>

              <div className="flex justify-between gap-2 mb-3">
                <VoiceInput
                  onTranscript={handleTranscript}
                  isListening={isListening}
                  toggleListening={toggleListening}
                />
                <Button
                  onClick={handleQuery}
                  disabled={isLoading || !query.trim()}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                <div className="text-red-600 text-sm mb-3">{searchError}</div>
              )}

              {/* Display Search Results */}
              {results?.type === 'search' &&
                results.searchResults &&
                results.searchResults.ids &&
                results.searchResults.ids[0] &&
                results.searchResults.ids[0].length > 0 && (
                  <div className="bg-secondary p-3 rounded-md text-sm space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="bg-secondary">
                        <Search className="h-3 w-3 mr-1" />
                        Search Results ({
                          results.searchResults.ids[0].length
                        }{' '}
                        found)
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
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
                    <div className="space-y-2">
                      {results.searchResults.ids[0].map(
                        (id: string, i: number) => (
                          <div
                            key={id}
                            className="p-2 bg-white rounded shadow-sm text-xs"
                          >
                            <div className="font-medium text-blue-600 mb-1">
                              Document:{' '}
                              {results.searchResults!.metadatas?.[0]?.[i]
                                ?.name || id}
                            </div>
                            <div className="text-gray-700 mb-1">
                              {results.searchResults!.documents?.[0]?.[i] ||
                                'No content preview available'}
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>ID: {id}</span>
                              <span>
                                Score:{' '}
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
                <div className="bg-secondary p-3 rounded-md text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="bg-secondary">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      AI Answer
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(results.aiAnswer!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs">{results.aiAnswer}</p>
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
                  <div className="text-gray-500 text-sm mb-3">
                    No results found for "{query}". Try different search terms
                    or ask a question.
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shazam-style voice button - only appears on mobile */}
      <VoiceShazamButton
        isListening={isListening}
        toggleListening={toggleListening}
        showTranscript={isListening || query ? query : undefined}
        isProcessing={isLoading}
        isMobileOnly={true} /* Only show on mobile devices */
      />
    </>
  )
}
