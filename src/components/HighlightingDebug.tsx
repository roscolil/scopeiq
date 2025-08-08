import React from 'react'
import { HighlightedText } from './HighlightedText'

// Simple test component to verify highlighting works
export const HighlightingDebug: React.FC = () => {
  const testText =
    'This is a sample text file for testing purposes. The document contains various text content that we can use for testing the highlighting functionality. This text should be highlighted when searching for specific terms.'
  const testTerms = [
    { text: 'text', type: 'search' as const },
    { text: 'testing', type: 'search' as const },
    { text: 'file', type: 'search' as const },
    { text: 'document', type: 'search' as const },
  ]

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="font-bold mb-2">Highlighting Test</h3>
      <p className="mb-2">Original text:</p>
      <div className="bg-gray-100 p-2 rounded mb-4">{testText}</div>

      <p className="mb-2">Highlighted text:</p>
      <div className="bg-gray-100 p-2 rounded">
        <HighlightedText text={testText} highlightTerms={testTerms} />
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Terms being highlighted: {testTerms.map(t => t.text).join(', ')}
      </p>
    </div>
  )
}
