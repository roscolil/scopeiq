import { useState } from 'react'
import {
  semanticSearch,
  hybridSemanticSearch,
  searchCommonTermsOnly,
} from '@/services/ai/embedding'

export type SearchMode = 'project-only' | 'hybrid' | 'common-only' | 'smart'

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
  const [searchMode, setSearchMode] = useState<SearchMode>('smart')

  const search = async (
    query: string,
    options: {
      mode?: SearchMode
      topK?: number
      documentId?: string
      commonWeight?: number
    } = {},
  ) => {
    const {
      mode = searchMode,
      topK = 10,
      documentId,
      commonWeight = 0.3,
    } = options

    setLoading(true)
    setError(null)

    try {
      let response

      switch (mode) {
        case 'project-only':
          response = await semanticSearch({
            projectId,
            query,
            topK,
            documentId,
          })
          break

        case 'hybrid':
          response = await hybridSemanticSearch({
            projectId,
            query,
            topK,
            documentId,
            commonWeight,
          })
          break

        case 'common-only':
          response = await searchCommonTermsOnly({ query, topK })
          break

        case 'smart':
        default:
          response = await semanticSearch({
            projectId,
            query,
            topK,
            documentId,
          })
          break
      }

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

  const searchProjectOnly = (query: string, options = {}) =>
    search(query, { ...options, mode: 'project-only' })

  const searchHybrid = (query: string, options = {}) =>
    search(query, { ...options, mode: 'hybrid' })

  const searchCommonOnly = (query: string, options = {}) =>
    search(query, { ...options, mode: 'common-only' })

  return {
    results,
    loading,
    error,
    search,
    searchProjectOnly,
    searchHybrid,
    searchCommonOnly,
    searchMode,
    setSearchMode,
  }
}
