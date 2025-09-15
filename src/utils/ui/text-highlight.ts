/**
 * Text highlighting utilities for search and AI query results
 */

export interface HighlightTerm {
  text: string
  type: 'search' | 'ai' | 'exact'
  priority?: number
}

/**
 * Extract keywords from a query string for highlighting
 */
export function extractHighlightTerms(
  query: string,
  type: 'search' | 'ai' = 'search',
): HighlightTerm[] {
  // Remove common stop words
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'what',
    'when',
    'where',
    'who',
    'will',
    'with',
    'how',
    'why',
    'can',
    'could',
    'should',
    'would',
    'tell',
    'me',
    'about',
    'this',
  ])

  // Clean and split the query
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))

  // Create highlight terms
  const terms: HighlightTerm[] = words.map(word => ({
    text: word,
    type,
    priority: word.length > 4 ? 2 : 1, // Longer words get higher priority
  }))

  // Add exact phrases (quoted text)
  const exactMatches = query.match(/"([^"]+)"/g)
  if (exactMatches) {
    exactMatches.forEach(match => {
      const cleanMatch = match.replace(/"/g, '').trim()
      if (cleanMatch.length > 0) {
        terms.push({
          text: cleanMatch,
          type: 'exact',
          priority: 3,
        })
      }
    })
  }

  return terms
}

/**
 * Highlight text based on search terms
 */
export function highlightText(
  text: string,
  highlightTerms: HighlightTerm[],
  options: {
    caseSensitive?: boolean
    wholeWordsOnly?: boolean
    maxMatches?: number
  } = {},
): string {
  if (!text || !highlightTerms.length) return text

  const {
    caseSensitive = false,
    wholeWordsOnly = false,
    maxMatches = 50,
  } = options

  // Sort terms by priority (highest first) and length (longest first)
  const sortedTerms = [...highlightTerms].sort((a, b) => {
    const priorityDiff = (b.priority || 1) - (a.priority || 1)
    if (priorityDiff !== 0) return priorityDiff
    return b.text.length - a.text.length
  })

  let highlightedText = text
  let matchCount = 0

  for (const term of sortedTerms) {
    if (matchCount >= maxMatches) break

    const flags = caseSensitive ? 'g' : 'gi'
    const pattern = wholeWordsOnly
      ? new RegExp(`\\b${escapeRegExp(term.text)}\\b`, flags)
      : new RegExp(escapeRegExp(term.text), flags)

    const className = getHighlightClassName(term.type, term.priority)

    highlightedText = highlightedText.replace(pattern, match => {
      matchCount++
      const inlineStyle = getInlineHighlightStyle(term.type)
      return `<span class="${className}" data-highlight-term="${term.text}" data-highlight-type="${term.type}" style="${inlineStyle}">${match}</span>`
    })
  }

  return highlightedText
}

/**
 * Get CSS class name for highlight type
 */
function getHighlightClassName(type: string, priority: number = 1): string {
  const baseClass = 'highlighted-text'

  switch (type) {
    case 'exact':
      return `${baseClass} highlight-exact highlight-priority-${priority}`
    case 'ai':
      return `${baseClass} highlight-ai highlight-priority-${priority}`
    case 'search':
    default:
      return `${baseClass} highlight-search highlight-priority-${priority}`
  }
}

/**
 * Get inline styles for highlight type (fallback for when CSS doesn't load)
 */
function getInlineHighlightStyle(type: string): string {
  const baseStyle =
    'padding: 8px 12px !important; border-radius: 10px !important; font-weight: 900 !important; display: inline-block !important; margin: 2px 4px !important; position: relative !important; z-index: 9999 !important; text-decoration: none !important; line-height: 1.5 !important;'

  switch (type) {
    case 'exact':
      return `${baseStyle} background: linear-gradient(45deg, #ff6b6b, #ff8e53) !important; color: white !important; border: 3px solid #ff4757 !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;`
    case 'ai':
      return `${baseStyle} background: linear-gradient(45deg, #a8e6cf, #88d8c0) !important; color: #2c3e50 !important; border: 3px solid #00b894 !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.2) !important;`
    case 'search':
    default:
      return `${baseStyle} background: linear-gradient(45deg, #ffff00, #ffd700) !important; color: #8B4513 !important; border: 4px solid #ff6348 !important; box-shadow: 0 4px 8px rgba(255, 193, 7, 0.8) !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important; animation: pulse 2s infinite !important;`
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Find text snippets around matches for preview
 */
export function extractHighlightedSnippets(
  text: string,
  highlightTerms: HighlightTerm[],
  options: {
    snippetLength?: number
    maxSnippets?: number
    caseSensitive?: boolean
  } = {},
): Array<{
  snippet: string
  startIndex: number
  highlightedSnippet: string
}> {
  const {
    snippetLength = 200,
    maxSnippets = 3,
    caseSensitive = false,
  } = options

  if (!text || !highlightTerms.length) return []

  const snippets: Array<{
    snippet: string
    startIndex: number
    highlightedSnippet: string
  }> = []

  // Find all matches
  const matches: Array<{ start: number; end: number; term: string }> = []

  for (const term of highlightTerms) {
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(escapeRegExp(term.text), flags)
    let match

    while (
      (match = regex.exec(text)) !== null &&
      matches.length < maxSnippets * 3
    ) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        term: term.text,
      })
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)

  // Create snippets around matches
  const usedRanges: Array<{ start: number; end: number }> = []

  for (const match of matches) {
    if (snippets.length >= maxSnippets) break

    const snippetStart = Math.max(
      0,
      match.start - Math.floor(snippetLength / 2),
    )
    const snippetEnd = Math.min(
      text.length,
      match.end + Math.floor(snippetLength / 2),
    )

    // Check if this range overlaps with already used ranges
    const overlaps = usedRanges.some(
      range =>
        (snippetStart >= range.start && snippetStart <= range.end) ||
        (snippetEnd >= range.start && snippetEnd <= range.end) ||
        (snippetStart <= range.start && snippetEnd >= range.end),
    )

    if (!overlaps) {
      const snippet = text.slice(snippetStart, snippetEnd)
      const highlightedSnippet = highlightText(snippet, highlightTerms)

      snippets.push({
        snippet: snippet.trim(),
        startIndex: snippetStart,
        highlightedSnippet: highlightedSnippet.trim(),
      })

      usedRanges.push({ start: snippetStart, end: snippetEnd })
    }
  }

  return snippets
}

/**
 * CSS styles for highlighting - to be injected into the page
 */
export const highlightStyles = `
  .highlighted-content .highlighted-text,
  .highlighted-text {
    padding: 4px 8px !important;
    border-radius: 6px !important;
    font-weight: 700 !important;
    transition: all 0.2s ease !important;
    display: inline-block !important;
    margin: 0 2px !important;
    position: relative !important;
    z-index: 1 !important;
  }

  .highlighted-content .highlight-search,
  .highlight-search {
    background-color: rgba(255, 255, 0, 0.7) !important;
    color: #8B4513 !important;
    border: 2px solid rgba(255, 193, 7, 0.9) !important;
    font-weight: 700 !important;
    box-shadow: 0 2px 4px rgba(255, 193, 7, 0.4) !important;
  }

  .highlight-ai {
    background-color: #ddd6fe;
    color: #5b21b6;
    border: 1px solid #8b5cf6;
  }

  .highlight-exact {
    background-color: #fed7d7;
    color: #c53030;
    border: 1px solid #f56565;
    font-weight: 600;
  }

  .highlight-priority-3 {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .highlight-priority-2 {
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
  }

  .highlighted-text:hover {
    transform: scale(1.02);
    z-index: 10;
    position: relative;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .highlight-search {
      background-color: #451a03;
      color: #fef08a;
      border-color: #a16207;
    }

    .highlight-ai {
      background-color: #312e81;
      color: #ddd6fe;
      border-color: #6366f1;
    }

    .highlight-exact {
      background-color: #7f1d1d;
      color: #fed7d7;
      border-color: #dc2626;
    }
  }
  
  /* Pulse animation for search highlights */
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`
