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
// or import { callClaude } from '@/services/anthropic'

interface AIActionsProps {
  documentId: string
  projectId?: string
}

export const AIActions = ({ documentId, projectId }: AIActionsProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    'project',
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const hasTranscriptRef = useRef(false)

  // Add debugging info on component mount
  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
    }
  }, [silenceTimer])

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    // Simulate AI-powered search with AWS Bedrock and Pinecone
    // In a real app, we would use different search parameters based on queryScope
    setTimeout(() => {
      const results =
        queryScope === 'document'
          ? [
              'The results found in paragraph 2 match your query about document processing.',
              'Additional information about AWS services can be found in section 3.2.',
            ]
          : [
              "Results found in document 'Business Proposal.pdf' match your query.",
              "Additional information found in 'Financial Report.docx', section 2.1.",
              "Related content in 'Contract Agreement.pdf', paragraphs 5-7.",
            ]

      setSearchResults(results)
      setIsSearching(false)
    }, 1500)
  }

  // Legacy method - redirecting to the newer handleAskAI method
  const askQuestion = async () => {
    await handleAskAI()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The text has been copied to your clipboard.',
    })
  }

  // Note: We have another cleanup in the component mount effect, so this is redundant
  // but keeping it for robustness

  const toggleListening = () => {
    // Toggle the listening state
    const newListeningState = !isListening
    setIsListening(newListeningState)

    console.log(`Voice input ${newListeningState ? 'started' : 'stopped'}`)

    // Clear any existing silence timer when toggling
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    // Reset the transcript flag when stopping listening
    if (isListening) {
      // Current state before toggle
      hasTranscriptRef.current = false
      toast({
        title: 'Voice input stopped',
        description: 'Voice recording has been stopped.',
      })
    } else {
      // Starting to listen
      toast({
        title: 'Voice input started',
        description:
          'Speak your question clearly... Will auto-submit after 2s of silence.',
      })
    }
  }

  const handleTranscript = (text: string) => {
    // Clear any existing timer when new transcript arrives
    if (silenceTimer) {
      clearTimeout(silenceTimer)
    }

    // Update the question with the transcribed text
    setQuestion(text)

    // Set flag that we have received a transcript
    hasTranscriptRef.current = true

    // Create a new timer for auto-submit after 2 seconds of silence
    const timer = setTimeout(() => {
      if (isListening && text.trim() && hasTranscriptRef.current) {
        console.log('Auto-submitting after silence detected')
        toggleListening() // Stop listening first

        // Add a slight delay before submitting to ensure the listening is fully stopped
        setTimeout(() => {
          if (text.trim()) {
            // Double-check we still have text
            console.log('Executing handleAskAI after silence')
            handleAskAI() // Submit the question
          }
        }, 100)
      }
    }, 2000)

    setSilenceTimer(timer)
  }

  const handleAskAI = async () => {
    if (!question.trim()) return

    // Clear any existing silence timer when submitting
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      setSilenceTimer(null)
    }

    setIsLoading(true)
    setAnswer(null) // Clear previous answer

    try {
      // Get context based on query scope
      const context =
        queryScope === 'document'
          ? `Document ID: ${documentId}`
          : `Project ID: ${projectId}`

      console.log('Submitting question to AI:', question)

      // Call your chosen LLM API
      const response = await callOpenAI(question, context)
      // or: const response = await callClaude(aiQuery, context)

      setAnswer(response)
      // Clear the question field after getting a response
      setQuestion('')
      toast({
        title: 'AI Analysis Complete',
        description: 'Your query has been processed.',
      })
    } catch (error) {
      console.error('AI Query Error:', error)

      // Extract and display the specific error from OpenAI service
      let title = 'AI Query Failed'
      let description =
        'Please try again or contact support if the problem persists.'

      if (error instanceof Error) {
        const errorMessage = error.message

        if (errorMessage.includes('API key is not configured')) {
          title = 'Configuration Error'
          description = 'OpenAI API key is missing from environment variables.'
        } else if (errorMessage.includes('Network error')) {
          title = 'Connection Error'
          description =
            'Unable to connect to OpenAI servers. Check your internet connection.'
        } else if (errorMessage.includes('OpenAI API error: 401')) {
          title = 'Authentication Failed'
          description = 'Invalid OpenAI API key. Please check your credentials.'
        } else if (errorMessage.includes('OpenAI API error: 429')) {
          title = 'Rate Limit Exceeded'
          description =
            'Too many requests to OpenAI. Please wait before trying again.'
        } else if (errorMessage.includes('OpenAI API error: 400')) {
          title = 'Invalid Request'
          description =
            'The query format is invalid. Try rephrasing your question.'
        } else if (errorMessage.includes('OpenAI API error: 500')) {
          title = 'OpenAI Service Error'
          description =
            'OpenAI servers are experiencing issues. Please try again later.'
        } else if (errorMessage.includes('Invalid response structure')) {
          title = 'Response Error'
          description = 'Received unexpected response format from OpenAI.'
        } else if (errorMessage.startsWith('OpenAI API error:')) {
          // Display the full OpenAI error message
          title = 'OpenAI Error'
          description = errorMessage.replace('OpenAI API error: ', '')
        } else {
          // Display the raw error message if it's concise
          description = errorMessage.length < 150 ? errorMessage : description
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
                <FileSearch className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-sm font-medium">Semantic Search</h3>
              </div>

              <div className="flex gap-2 mb-3">
                <Input
                  placeholder={`Search within ${queryScope === 'document' ? 'document' : 'project'}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  size="sm"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-secondary p-3 rounded-md text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="bg-secondary">
                      Results
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(searchResults.join('\n\n'))
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {searchResults.map((result, index) => (
                    <p key={index} className="text-xs">
                      {result}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-sm font-medium">Ask Questions</h3>
              </div>

              <div className="flex gap-2 mb-3">
                <Textarea
                  placeholder={`Ask a question about the ${queryScope === 'document' ? 'document' : 'project'}...`}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  className="resize-none min-h-[60px]"
                />
              </div>

              <div className="flex justify-between gap-2 mb-3">
                <VoiceInput
                  onTranscript={handleTranscript}
                  isListening={isListening}
                  toggleListening={toggleListening}
                />
                <Button
                  onClick={handleAskAI}
                  disabled={isLoading || !question.trim()}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      Ask AI
                    </>
                  )}
                </Button>
              </div>

              {/* Loading indicator now handled by isLoading state */}

              {answer && (
                <div className="bg-secondary p-3 rounded-md text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="bg-secondary">
                      Answer
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(answer)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs">{answer}</p>
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
        showTranscript={isListening || question ? question : undefined}
        isProcessing={isLoading}
        isMobileOnly={true} /* Only show on mobile devices */
      />
    </>
  )
}
