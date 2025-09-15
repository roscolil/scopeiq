import React, { useEffect, useState } from 'react'
import { PdfJsViewer } from './PdfJsViewer'
import {
  Loader2,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
} from 'lucide-react'
import { transformDocxHtml, defaultDocxTransformConfig } from './docxStyles'

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

  // DOCX Support (dynamic)
  if (
    primaryUrl &&
    (document.name?.toLowerCase().endsWith('.docx') ||
      mime.includes('officedocument.wordprocessingml.document') ||
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    return <DocxInlineViewer url={primaryUrl} fileName={document.name} />
  }

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

// Lightweight DOCX inline viewer (shared approach with DocumentViewerNew but simplified)
const DocxInlineViewer: React.FC<{ url: string; fileName?: string | null }> = ({
  url,
  fileName,
}) => {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  // Removed reading mode & font scaling (simplified per request)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`)
        const arrayBuffer = await resp.arrayBuffer()
        // Dynamic import to avoid increasing initial bundle size
        const mammothMod = await import('mammoth')
        const { value } = await mammothMod.convertToHtml(
          { arrayBuffer },
          { styleMap: defaultDocxTransformConfig.styleMap },
        )
        const transformed = defaultDocxTransformConfig.enabled
          ? transformDocxHtml(value || '')
          : value
        if (!cancelled) {
          setHtml(
            transformed ||
              '<p><em>No readable content in this document.</em></p>',
          )
        }
      } catch (e) {
        console.warn('DOCX inline viewer error', e)
        if (!cancelled)
          setError(
            'Unable to render this .docx inline. You can download it instead.',
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [url])

  const openInNewTab = () => {
    try {
      const safeTitle = (fileName || 'Document')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { --page-width: 880px; --font-body: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; --font-mono: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; --c-border:#d0d7de; --c-border-soft:#e6eaef; --c-bg:#ffffff; --c-fg:#1b1f24; --c-muted:#57606a; --c-accent:#0d6efd; }
    @media (prefers-color-scheme: dark){ :root { --c-bg:#0f1115; --c-fg:#e6edf3; --c-muted:#8b949e; --c-border:#30363d; --c-border-soft:#21262d; --c-accent:#409bff; } body { background: #0f1115; color: var(--c-fg);} }
    html,body { padding:0; margin:0; }
    body { font-family: var(--font-body); font-size:16px; line-height:1.6; background: var(--c-bg); color: var(--c-fg); -webkit-font-smoothing: antialiased; }
    .container { max-width: var(--page-width); margin: 0 auto; padding: 2.2rem 2.1rem 3rem; }
    header { margin-bottom: 2.2rem; }
    h1 { font-size: 1.85rem; line-height:1.15; margin:0 0 0.35rem; font-weight:600; letter-spacing:-0.5px; }
    .meta { font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color: var(--c-muted); font-weight:600; }
    article { font-size:1rem; }
    article :where(p,ul,ol,table,pre,blockquote){ margin: 0 0 1.05rem; }
    article :where(h1,h2,h3,h4,h5){ font-weight:600; line-height:1.25; scroll-margin-top: 4rem; }
    article h2 { font-size:1.45rem; margin:2.2rem 0 0.85rem; padding-top:0.25rem; border-top:1px solid var(--c-border-soft); }
    article h3 { font-size:1.18rem; margin:1.8rem 0 0.65rem; }
    article h4 { font-size:1.05rem; margin:1.4rem 0 0.55rem; text-transform:uppercase; letter-spacing:0.5px; }
    article a { color: var(--c-accent); text-decoration:none; }
    article a:hover { text-decoration:underline; }
    article code { font-family: var(--font-mono); background: rgba(110,118,129,0.15); padding:2px 5px; border-radius:4px; font-size:0.85em; }
    pre { background: #0d1117; color:#e6edf3; padding:1rem 1.1rem; border-radius:6px; overflow:auto; line-height:1.45; font-size:0.85rem; }
    pre code { background: transparent; padding:0; color:inherit; }
    blockquote { border-left:4px solid var(--c-accent); padding:0.55rem 1rem; background: rgba(13,110,253,0.06); color: var(--c-fg); border-radius:4px; }
    hr { border:0; border-top:1px solid var(--c-border-soft); margin:2.2rem 0; }
    table { border-collapse:collapse; width:100%; font-size:0.92rem; }
    th,td { border:1px solid var(--c-border); text-align:left; padding:6px 10px; vertical-align:top; }
    th { background: rgba(13,110,253,0.08); font-weight:600; }
    tbody tr:nth-child(even){ background: rgba(140,149,159,0.08); }
    img { max-width:100%; height:auto; }
    figure { margin:0 0 1.2rem; }
    figcaption { font-size:0.75rem; color: var(--c-muted); margin-top:0.35rem; text-align:center; }
    .docx-render { all: initial; font-family: var(--font-body); line-height:1.55; color: var(--c-fg); font-size:1rem; }
    .docx-render * { all: revert; }
    /* Normalize spacing created by Word */
    .docx-render p:empty { display:none; }
    .docx-render p { margin:0 0 1.05rem; }
    .docx-render table { border-collapse:collapse; }
    .docx-render th,.docx-render td { border:1px solid var(--c-border); padding:6px 8px; }
    .docx-render h1 { font-size:1.85rem; }
    .docx-render h2 { font-size:1.45rem; }
    .docx-render h3 { font-size:1.18rem; }
    .print-hint { position:fixed; bottom:10px; right:14px; font-size:11px; background:rgba(0,0,0,0.55); color:#fff; padding:6px 9px; border-radius:6px; font-family:var(--font-body); letter-spacing:0.5px; }
    @media print { body { background:#fff; color:#000; } .print-hint { display:none; } header { margin-bottom:1.2rem; } .container { padding:0 1rem; } a { text-decoration:underline; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${safeTitle}</h1>
      <div class="meta">Exported ${new Date().toLocaleString()}</div>
    </header>
    <article class="docx-export docx-render">${html}</article>
  </div>
  <div class="print-hint">Press Ctrl/Cmd + P to print / save PDF</div>
</body>
</html>`
      const blob = new Blob([docHtml], { type: 'text/html' })
      const urlObj = URL.createObjectURL(blob)
      window.open(urlObj, '_blank')
      setTimeout(() => URL.revokeObjectURL(urlObj), 60_000)
    } catch (e) {
      console.warn('Open in new tab failed', e)
    }
  }

  const toolbar = (
    <div className="flex items-center justify-between mb-3 text-[11px]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openInNewTab}
          className="px-2 py-1 rounded border text-xs font-medium bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          aria-label="Open in new tab"
        >
          <ExternalLink className="h-3 w-3" /> Open in New Tab
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-4 text-xs text-gray-200 italic bg-muted/40 rounded-md border">
        Converting .docx to HTML...
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-4 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300/40 dark:border-amber-700/40 rounded-md space-y-2">
        {toolbar}
        <div className="text-amber-700 dark:text-amber-300 font-medium">
          {error}
        </div>
        <a
          href={url}
          download={fileName || 'document.docx'}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
        >
          <Download className="h-3 w-3" /> Download File
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {toolbar}
      <div
        className="docx-render max-w-none bg-white text-black rounded-md border overflow-auto shadow-sm p-4 max-h-[70vh]"
        style={{ color: '#000', fontSize: '14px', lineHeight: 1.55 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
