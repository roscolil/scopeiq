import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useSemanticSearch } from '@/hooks/useSemanticSearch'
import { VoiceInput } from '@/components/VoiceInput'

interface SemanticVoiceSearchProps {
  projectId: string
}

const SemanticVoiceSearch: React.FC<SemanticVoiceSearchProps> = ({
  projectId,
}) => {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const { results, loading, error, search } = useSemanticSearch(projectId)

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (query.trim()) search(query)
  }

  const handleVoiceTranscript = (text: string) => {
    setQuery(text)
    if (text.trim()) search(text)
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <form onSubmit={handleSearch} className="flex gap-2 items-center">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a question or search documents..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          isListening={isListening}
          toggleListening={() => setIsListening(l => !l)}
        />
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {results &&
        results.ids &&
        results.ids[0] &&
        results.ids[0].length > 0 && (
          <div className="space-y-2 mt-4">
            <div className="font-semibold text-gray-700">
              Results ({results.ids[0].length} found):
            </div>
            {results.ids[0].map((id: string, i: number) => (
              <div key={id} className="p-3 bg-white rounded shadow text-sm">
                <div className="font-medium text-blue-600 mb-1">
                  Document: {results.metadatas?.[0]?.[i]?.name || id}
                </div>
                <div className="text-gray-700 mb-2">
                  {results.documents?.[0]?.[i] ||
                    'No content preview available'}
                </div>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>ID: {id}</span>
                  <span>
                    Score: {(1 - (results.distances?.[0]?.[i] || 0)).toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      {results &&
        (!results.ids || !results.ids[0] || results.ids[0].length === 0) &&
        !loading && (
          <div className="text-gray-500 text-sm mt-4">
            No results found. Try a different search query or make sure
            documents are uploaded.
          </div>
        )}
    </div>
  )
}

export default SemanticVoiceSearch
