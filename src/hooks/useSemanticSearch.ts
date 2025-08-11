import { useState } from 'react'
import { semanticSearch } from '@/services/embedding'

export function useSemanticSearch(projectId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>({
    ids: [[]],
    documents: [[]],
    metadatas: [[]],
    distances: [[]],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await semanticSearch({ projectId, query })
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Semantic search failed')
      setResults({
        ids: [[]],
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      })
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, search }
}
