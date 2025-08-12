/**
 * Seamless Integration Example: Updated AIActions with Voice Integration
 * This shows how to transparently add AWS Polly voice prompts to your existing workflow
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Volume2, VolumeX, Search, Brain, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { callOpenAI } from '@/services/openai'
import { semanticSearch } from '@/services/embedding'
import { aiWorkflowVoice } from '@/services/ai-workflow-voice'
import { VoiceInput } from './VoiceInput'
import { NovaSonicPrompts } from './NovaSonicPrompts'

interface AIActionsIntegratedProps {
  documentId: string
  projectId?: string
  companyId?: string
}

export const AIActionsIntegrated = ({
  documentId,
  projectId,
  companyId,
}: AIActionsIntegratedProps) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    'document',
  )
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [results, setResults] = useState<{
    type: 'search' | 'ai'
    aiAnswer?: string
    searchResults?: Record<string, unknown>
    query?: string
  } | null>(null)
  const { toast } = useToast()

  // Initialize voice service
  useEffect(() => {
    aiWorkflowVoice.configure({
      enabled: voiceEnabled,
      voice: 'Joanna',
      announceStages: true,
      readResults: false, // Let user choose when to read results
      maxResultLength: 200,
    })
  }, [voiceEnabled])

  /**
   * SEAMLESS INTEGRATION: Your existing handleQuery function with voice integration
   * Only 4 lines of voice code added to your existing workflow!
   */
  const handleQuery = async () => {
    if (!query.trim() || !projectId) return

    setIsLoading(true)
    setResults(null)

    try {
      // 🎵 VOICE INTEGRATION: Initialize workflow (1 line)
      const voiceSteps = await aiWorkflowVoice.integrateAIWorkflow({
        query,
        projectId,
        documentId: queryScope === 'document' ? documentId : undefined,
        scope: queryScope,
      })

      if (isQuestion(query)) {
        // 🎵 VOICE INTEGRATION: Announce search phase (1 line)
        await voiceSteps.announceSearching()

        // Your existing OpenAI/Pinecone workflow - UNCHANGED
        const searchParams = {
          projectId,
          query,
          topK: 3,
          ...(queryScope === 'document' && { documentId }),
        }

        const searchResponse = await semanticSearch(searchParams)

        // 🎵 VOICE INTEGRATION: Announce results (1 line)
        const resultCount = searchResponse.documents?.[0]?.length || 0
        if (resultCount > 0) {
          await voiceSteps.announceResults(resultCount)
        } else {
          await voiceSteps.announceNoResults()
        }

        // Build context - your existing code
        let context = ''
        if (searchResponse.documents?.[0]) {
          const relevantDocs = searchResponse.documents[0]
            .filter(doc => doc && doc.trim().length > 0)
            .slice(0, 3)

          if (relevantDocs.length > 0) {
            context = `Based on the following relevant document excerpts:\n\n${relevantDocs
              .map((doc, index) => `Document ${index + 1}:\n${doc}`)
              .join('\n\n')}\n\n`
          }
        }

        // 🎵 VOICE INTEGRATION: Announce AI analysis (1 line)
        await voiceSteps.announceAnalyzing()

        // Your existing OpenAI call - UNCHANGED
        const aiResponse = await callOpenAI(query, context)

        // Complete workflow
        await voiceSteps.announceComplete()

        setResults({
          type: 'ai',
          aiAnswer: aiResponse,
          searchResults: searchResponse,
          query,
        })

        // Optional: Read short answers aloud automatically
        if (aiResponse.length < 150) {
          setTimeout(() => voiceSteps.readAIAnswer(aiResponse), 1000)
        }
      } else {
        // Handle semantic search - your existing workflow with voice
        await voiceSteps.announceSearching()

        const searchResponse = await semanticSearch({
          projectId,
          query,
          topK: 10,
          ...(queryScope === 'document' && { documentId }),
        })

        const resultCount = searchResponse.documents?.[0]?.length || 0
        if (resultCount > 0) {
          await voiceSteps.announceResults(resultCount)
        } else {
          await voiceSteps.announceNoResults()
        }

        await voiceSteps.announceComplete()

        setResults({
          type: 'search',
          searchResults: searchResponse,
          query,
        })
      }
    } catch (error) {
      console.error('Query error:', error)
      const voiceSteps = await aiWorkflowVoice.integrateAIWorkflow({
        query,
        projectId,
        scope: queryScope,
      })
      await voiceSteps.announceError()

      toast({
        title: 'Query Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Voice input handler with feedback
  const handleVoiceTranscript = async (transcript: string) => {
    setQuery(transcript)

    const voiceInput = await aiWorkflowVoice.integrateVoiceInput()
    await voiceInput.announceTranscriptReceived()

    // Auto-submit after confirmation
    setTimeout(() => handleQuery(), 500)
  }

  // Copy function with voice feedback
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    const uiActions = await aiWorkflowVoice.integrateUIActions()
    await uiActions.announceCopied()

    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
    })
  }

  // Utility functions
  const isQuestion = (text: string): boolean => {
    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
    ]
    const lowerText = text.toLowerCase()
    return (
      questionWords.some(word => lowerText.startsWith(word + ' ')) ||
      text.includes('?')
    )
  }

  return (
    <div className="space-y-4">
      {/* Minimal Voice Control - Just a toggle */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium">AI Voice Assistant</span>
          <NovaSonicPrompts
            context="guidance"
            voice="Joanna"
            disabled={!voiceEnabled}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={
            voiceEnabled ? 'border-green-300 bg-green-50' : 'border-gray-300'
          }
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4 text-green-600" />
          ) : (
            <VolumeX className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>

      {/* Your existing query interface - with voice input added */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask a question or search your documents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleQuery()}
          className="flex-1"
        />
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          isListening={isListening}
          toggleListening={() => setIsListening(!isListening)}
        />
        <Button onClick={handleQuery} disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Scope selector */}
      <div className="flex items-center gap-2">
        <Badge
          variant={queryScope === 'document' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setQueryScope('document')}
        >
          This Document
        </Badge>
        <Badge
          variant={queryScope === 'project' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setQueryScope('project')}
        >
          Entire Project
        </Badge>
      </div>

      {/* Results display with voice option */}
      {results && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              {results.type === 'ai' ? (
                <>
                  <Brain className="h-4 w-4 text-green-600" />
                  AI Analysis
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 text-blue-600" />
                  Search Results
                </>
              )}
            </h3>

            {/* Voice controls for results */}
            <div className="flex gap-2">
              {voiceEnabled && results.aiAnswer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const voiceSteps =
                      await aiWorkflowVoice.integrateAIWorkflow({
                        query: '',
                        projectId: projectId!,
                        scope: queryScope,
                      })
                    await voiceSteps.readAIAnswer(results.aiAnswer)
                  }}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(results.aiAnswer || 'Search results')
                }
              >
                Copy
              </Button>
            </div>
          </div>

          {results.aiAnswer && (
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{results.aiAnswer}</p>
            </div>
          )}

          {/* Search results preview */}
          {results.searchResults?.documents?.[0] && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">
                Source Documents:
              </h4>
              {results.searchResults.documents[0]
                .slice(0, 3)
                .map((doc: string, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <p className="line-clamp-2">{doc}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIActionsIntegrated
