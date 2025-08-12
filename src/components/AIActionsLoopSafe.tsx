/**
 * Loop-Safe AI Actions Component
 * Prevents voice prompt/reply loops while maintaining full functionality
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Volume2,
  VolumeX,
  Search,
  Brain,
  Loader2,
  Play,
  Pause,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { callOpenAI } from '@/services/openai'
import { semanticSearch } from '@/services/embedding'
import { loopSafeAiWorkflowVoice } from '@/services/ai-workflow-voice-safe'
import { VoiceInputFixed } from './VoiceInputFixed'
import { NovaSonicPrompts } from './NovaSonicPrompts'

interface AIActionsLoopSafeProps {
  documentId: string
  projectId?: string
  companyId?: string
}

export const AIActionsLoopSafe = ({
  documentId,
  projectId,
  companyId,
}: AIActionsLoopSafeProps) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [queryScope, setQueryScope] = useState<'document' | 'project'>(
    'document',
  )
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [results, setResults] = useState<{
    type: 'search' | 'ai'
    aiAnswer?: string
    searchResults?: Record<string, unknown>
    query?: string
  } | null>(null)

  const { toast } = useToast()
  const voiceInputRef = useRef<{ stopListening: () => void } | null>(null)

  // Initialize voice service with loop prevention
  useEffect(() => {
    loopSafeAiWorkflowVoice.configure({
      enabled: voiceEnabled,
      voice: 'Joanna',
      announceStages: true,
      readResults: false, // User-controlled
      maxResultLength: 150,
      preventLoops: true,
    })

    // Listen for voice state changes
    const unsubscribe = loopSafeAiWorkflowVoice.addVoiceStateListener(() => {
      setIsVoicePlaying(loopSafeAiWorkflowVoice.isPlayingVoice())
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [voiceEnabled])

  // Stop voice input when voice output is playing
  useEffect(() => {
    if (isVoicePlaying && isListening) {
      console.log('🛑 Stopping voice input due to voice output')
      setIsListening(false)
    }
  }, [isVoicePlaying, isListening])

  /**
   * LOOP-SAFE QUERY HANDLER
   * Prevents voice loops while maintaining full AI functionality
   */
  const handleQuery = async () => {
    if (!query.trim() || !projectId) return

    // Stop any voice input before processing
    if (isListening) {
      setIsListening(false)
    }

    // Clear any pending voice announcements
    loopSafeAiWorkflowVoice.clearVoiceQueue()

    setIsLoading(true)
    setResults(null)

    try {
      // Initialize voice workflow with loop prevention
      const voiceSteps = await loopSafeAiWorkflowVoice.integrateAIWorkflow({
        query,
        projectId,
        documentId: queryScope === 'document' ? documentId : undefined,
        scope: queryScope,
      })

      if (isQuestion(query)) {
        // AI Question Flow
        await voiceSteps.announceSearching()

        const searchParams = {
          projectId,
          query,
          topK: 3,
          ...(queryScope === 'document' && { documentId }),
        }

        const searchResponse = await semanticSearch(searchParams)

        // Announce search results
        const resultCount = searchResponse.documents?.[0]?.length || 0
        if (resultCount > 0) {
          await voiceSteps.announceResults(resultCount)
        } else {
          await voiceSteps.announceNoResults()
        }

        // Build context for OpenAI
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

        await voiceSteps.announceAnalyzing()

        // Call OpenAI
        const aiResponse = await callOpenAI(query, context)

        await voiceSteps.announceComplete()

        setResults({
          type: 'ai',
          aiAnswer: aiResponse,
          searchResults: searchResponse,
          query,
        })
      } else {
        // Semantic Search Flow
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

      const voiceSteps = await loopSafeAiWorkflowVoice.integrateAIWorkflow({
        query,
        projectId: projectId!,
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

  // LOOP-SAFE voice input handler
  const handleVoiceTranscript = async (transcript: string) => {
    if (isVoicePlaying) {
      console.log('🛑 Ignoring transcript during voice playback:', transcript)
      return
    }

    console.log('✅ Processing voice transcript:', transcript)
    setQuery(transcript)

    const voiceInput = await loopSafeAiWorkflowVoice.integrateVoiceInput()
    await voiceInput.announceTranscriptReceived()

    // Small delay before auto-submitting to allow announcement to finish
    setTimeout(() => {
      if (!isVoicePlaying) {
        // Double-check before submitting
        handleQuery()
      }
    }, 1000)
  }

  // Safe voice toggle that clears queue
  const toggleVoiceEnabled = () => {
    const newState = !voiceEnabled
    setVoiceEnabled(newState)

    if (!newState) {
      // Stop any ongoing voice and clear queue
      loopSafeAiWorkflowVoice.clearVoiceQueue()
      setIsVoicePlaying(false)
    }
  }

  // Safe listening toggle
  const toggleListening = () => {
    if (isVoicePlaying) {
      console.log('🛑 Cannot start listening while voice is playing')
      toast({
        title: 'Voice Busy',
        description: 'Please wait for voice announcement to finish',
        variant: 'default',
      })
      return
    }

    setIsListening(!isListening)
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

  // Read result aloud (user-controlled)
  const readResultAloud = async () => {
    if (!results?.aiAnswer) return

    const voiceSteps = await loopSafeAiWorkflowVoice.integrateAIWorkflow({
      query: '',
      projectId: projectId!,
      scope: queryScope,
    })
    await voiceSteps.readAIAnswer(results.aiAnswer)
  }

  return (
    <div className="space-y-4">
      {/* Voice Control Panel with Status */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isVoicePlaying ? (
              <Play className="h-4 w-4 text-blue-600 animate-pulse" />
            ) : (
              <Volume2 className="h-4 w-4 text-purple-600" />
            )}
            <span className="text-sm font-medium">
              AI Voice Assistant
              {isVoicePlaying && (
                <span className="text-blue-600 ml-1">(Speaking...)</span>
              )}
            </span>
          </div>

          {voiceEnabled && !isVoicePlaying && (
            <NovaSonicPrompts
              context="guidance"
              voice="Joanna"
              disabled={!voiceEnabled || isVoicePlaying}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Voice status indicator */}
          {isVoicePlaying && (
            <Badge variant="secondary" className="animate-pulse">
              Speaking
            </Badge>
          )}

          {/* Voice toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleVoiceEnabled}
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
      </div>

      {/* Query Interface with Loop-Safe Voice Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask a question or search your documents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !isLoading && handleQuery()}
          className="flex-1"
          disabled={isLoading || isVoicePlaying}
        />

        {/* Loop-Safe Voice Input */}
        <VoiceInputFixed
          onTranscript={handleVoiceTranscript}
          isListening={isListening}
          toggleListening={toggleListening}
          preventLoop={true}
        />

        <Button
          onClick={handleQuery}
          disabled={isLoading || !query.trim() || isVoicePlaying}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Scope selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Search scope:</span>
        <Badge
          variant={queryScope === 'document' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => !isLoading && setQueryScope('document')}
        >
          This Document
        </Badge>
        <Badge
          variant={queryScope === 'project' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => !isLoading && setQueryScope('project')}
        >
          Entire Project
        </Badge>
      </div>

      {/* Results display with voice controls */}
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
                  onClick={readResultAloud}
                  disabled={isVoicePlaying}
                  title="Read answer aloud"
                >
                  {isVoicePlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {results.aiAnswer && (
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{results.aiAnswer}</p>
            </div>
          )}

          {/* Search results preview */}
          {results.searchResults && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">
                Source Documents:
              </h4>
              <div className="text-sm text-gray-500">
                Search results from your knowledge base
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          Voice: {voiceEnabled ? 'ON' : 'OFF'} | Listening:{' '}
          {isListening ? 'YES' : 'NO'} | Playing:{' '}
          {isVoicePlaying ? 'YES' : 'NO'} | Loading: {isLoading ? 'YES' : 'NO'}
        </div>
      )}
    </div>
  )
}

export default AIActionsLoopSafe
