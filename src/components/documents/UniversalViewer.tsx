import React, { useEffect, useState } from 'react'
import { PdfJsViewer } from './PdfJsViewer'
import { Loader2, Image as ImageIcon, FileText, Download } from 'lucide-react'

interface UniversalViewerProps {
  document: {
    id: string
    name: string
    type: string
    url?: string | null
    s3Url?: string | null
    content?: string | null
  } | null
}

export const UniversalViewer: React.FC<UniversalViewerProps> = ({
  document,
}) => {
  if (!document) {
    return (
      <div className="p-6 text-sm text-gray-400 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
      </div>
    )
  }

  const mime = (document.type || '').toLowerCase()
  const primaryUrl = document.url || document.s3Url || ''

  // PDF
  if (mime.includes('pdf')) {
    if (!primaryUrl) {
      return (
        <div className="p-4 text-sm text-gray-400">PDF not available yet.</div>
      )
    }
    return <PdfJsViewer url={primaryUrl} />
  }

  // Images
  if (mime.startsWith('image/')) {
    return (
      <div className="flex justify-center p-4 bg-neutral-900/20 rounded">
        <img
          src={primaryUrl}
          alt={document.name}
          className="max-w-full max-h-[75vh] object-contain rounded shadow"
          draggable={false}
        />
      </div>
    )
  }

  // Text / Plain / JSON
  if (mime.startsWith('text') || mime.includes('json')) {
    return <RemoteTextBlock url={primaryUrl} name={document.name} />
  }

  return (
    <div className="p-6 text-sm text-gray-500 space-y-3">
      <div className="flex items-center gap-2 font-medium text-gray-600">
        <FileText className="h-4 w-4" /> No inline preview for this file type.
      </div>
      {primaryUrl && (
        <a
          href={primaryUrl}
          download={document.name}
          className="inline-flex items-center gap-2 text-primary underline text-sm hover:opacity-80"
        >
          <Download className="h-4 w-4" /> Download {document.name}
        </a>
      )}
    </div>
  )
}

const RemoteTextBlock: React.FC<{ url: string; name: string }> = ({
  url,
  name,
}) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Fetch failed')
        const text = await resp.text()
        if (!cancelled) setContent(text)
      } catch (e) {
        if (!cancelled) setError('Failed to load text content')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading)
    return <div className="p-4 text-xs text-gray-400 italic">Loading text…</div>
  if (error) return <div className="p-4 text-xs text-red-500">{error}</div>
  return (
    <pre className="p-4 bg-muted rounded max-h-[70vh] overflow-auto text-xs whitespace-pre-wrap font-mono">
      {content || 'Empty file.'}
    </pre>
  )
}
