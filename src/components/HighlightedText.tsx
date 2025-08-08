import React, { useEffect, useMemo } from 'react'
import {
  highlightText,
  highlightStyles,
  HighlightTerm,
} from '@/utils/text-highlight'

interface HighlightedTextProps {
  text: string
  highlightTerms: HighlightTerm[]
  className?: string
  caseSensitive?: boolean
  wholeWordsOnly?: boolean
  maxMatches?: number
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlightTerms,
  className = '',
  caseSensitive = false,
  wholeWordsOnly = false,
  maxMatches = 50,
}) => {
  // Inject styles on mount
  useEffect(() => {
    const styleId = 'text-highlight-styles'

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = highlightStyles
      document.head.appendChild(style)
    }
  }, [])

  // Memoize the highlighted text to avoid unnecessary re-processing
  const highlightedContent = useMemo(() => {
    if (!text || !highlightTerms.length) return text

    return highlightText(text, highlightTerms, {
      caseSensitive,
      wholeWordsOnly,
      maxMatches,
    })
  }, [text, highlightTerms, caseSensitive, wholeWordsOnly, maxMatches])

  return (
    <div
      className={`highlighted-content ${className}`}
      style={
        {
          // Ensure highlighting styles are applied
          '--highlight-bg': 'rgba(255, 255, 0, 0.7)',
          '--highlight-border': '2px solid rgba(255, 193, 7, 0.9)',
          '--highlight-color': '#8B4513',
        } as React.CSSProperties
      }
    >
      {/* Debug info for HighlightedText */}
      {highlightTerms.length > 0 && (
        <div
          style={{
            background: '#ffcccc',
            border: '1px solid red',
            padding: '4px',
            margin: '4px 0',
            fontSize: '10px',
            borderRadius: '4px',
          }}
        >
          <strong>HighlightedText Debug:</strong>
          <br />
          Terms: {highlightTerms.map(t => `"${t.text}"`).join(', ')}
          <br />
          Text length: {text.length}
          <br />
          Text preview: "{text.substring(0, 50)}..."
          <br />
          Has highlights in HTML:{' '}
          {highlightedContent.includes('highlighted-text')}
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />
    </div>
  )
}

interface HighlightedCodeProps {
  code: string
  highlightTerms: HighlightTerm[]
  language?: string
  className?: string
}

export const HighlightedCode: React.FC<HighlightedCodeProps> = ({
  code,
  highlightTerms,
  language = 'text',
  className = '',
}) => {
  const highlightedContent = useMemo(() => {
    if (!code || !highlightTerms.length) return code

    return highlightText(code, highlightTerms, {
      caseSensitive: true, // Code is usually case-sensitive
      wholeWordsOnly: false,
      maxMatches: 100,
    })
  }, [code, highlightTerms])

  useEffect(() => {
    const styleId = 'text-highlight-styles'

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = highlightStyles
      document.head.appendChild(style)
    }
  }, [])

  return (
    <pre className={`highlighted-code language-${language} ${className}`}>
      <code dangerouslySetInnerHTML={{ __html: highlightedContent }} />
    </pre>
  )
}

export default HighlightedText
