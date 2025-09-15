import { useEffect, useState } from 'react'
import {
  FileText,
  File,
  FileImage,
  Loader2,
  Download,
  ExternalLink,
} from 'lucide-react'
import { FileTypeIcon } from '@/components/documents/FileTypeIcon'
import { DocumentViewerSkeleton } from '@/components/shared/skeletons'
import { PDFViewer } from './PDFViewer'
import { Document as DocumentType } from '@/types'
import { documentService } from '@/services/data/hybrid'
// DOCX rendering (client-side) using mammoth - converts .docx to HTML
// We provide a lightweight ambient type declaration separately if TS types are missing.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - types supplied via custom declaration if not present
import * as mammoth from 'mammoth'
import { transformDocxHtml, defaultDocxTransformConfig } from './docxStyles'
// Removed Card/Badge imports (simplified viewer)

// Text File Viewer Component
const TextFileViewer = ({ document }: { document: DocumentType }) => {
  const [textContent, setTextContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTextContent = async () => {
      if (!document?.url) {
        setError('No file URL available')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // If we already have content, use it
        if (document.content) {
          setTextContent(document.content)
          setIsLoading(false)
          return
        }

        // Otherwise, fetch the file content directly
        const response = await fetch(document.url)
        if (!response.ok) {
          throw new Error('Failed to fetch file content')
        }

        const text = await response.text()
        setTextContent(text)
      } catch (err) {
        console.error('Error fetching text file:', err)
        setError('Failed to load text file content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTextContent()
  }, [document])

  if (isLoading) {
    return (
      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm">
        <div className="text-gray-400 italic">Loading text content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm">
        <div className="text-destructive italic">{error}</div>
      </div>
    )
  }

  return (
    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md max-h-[600px] overflow-auto text-sm font-mono">
      {textContent ? (
        <div className="whitespace-pre-wrap">{textContent}</div>
      ) : (
        <div className="text-gray-400 italic">
          This text file appears to be empty.
        </div>
      )}
    </div>
  )
}

// DOCX File Viewer Component
const DocxFileViewer = ({ document }: { document: DocumentType }) => {
  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Reading mode & dynamic font scaling removed (simplified viewer)
  const openInNewTab = () => {
    try {
      const safeTitle = (document.name || 'Document')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const docHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width,initial-scale=1" />\n<title>${safeTitle}</title>\n<style>\n:root { --page-width: 880px; --font-body: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; --font-mono: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; --c-border:#d0d7de; --c-border-soft:#e6eaef; --c-bg:#ffffff; --c-fg:#1b1f24; --c-muted:#57606a; --c-accent:#0d6efd; }\n@media (prefers-color-scheme: dark){ :root { --c-bg:#0f1115; --c-fg:#e6edf3; --c-muted:#8b949e; --c-border:#30363d; --c-border-soft:#21262d; --c-accent:#409bff; } body { background: #0f1115; color: var(--c-fg);} }\nhtml,body { padding:0; margin:0; }\nbody { font-family: var(--font-body); font-size:16px; line-height:1.6; background: var(--c-bg); color: var(--c-fg); -webkit-font-smoothing: antialiased; }\n.container { max-width: var(--page-width); margin: 0 auto; padding: 2.2rem 2.1rem 3rem; }\nheader { margin-bottom: 2.2rem; }\nh1 { font-size: 1.85rem; line-height:1.15; margin:0 0 0.35rem; font-weight:600; letter-spacing:-0.5px; }\n.meta { font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color: var(--c-muted); font-weight:600; }\narticle { font-size:1rem; }\narticle :where(p,ul,ol,table,pre,blockquote){ margin: 0 0 1.05rem; }\narticle :where(h1,h2,h3,h4,h5){ font-weight:600; line-height:1.25; scroll-margin-top: 4rem; }\narticle h2 { font-size:1.45rem; margin:2.2rem 0 0.85rem; padding-top:0.25rem; border-top:1px solid var(--c-border-soft); }\narticle h3 { font-size:1.18rem; margin:1.8rem 0 0.65rem; }\narticle h4 { font-size:1.05rem; margin:1.4rem 0 0.55rem; text-transform:uppercase; letter-spacing:0.5px; }\narticle a { color: var(--c-accent); text-decoration:none; }\narticle a:hover { text-decoration:underline; }\narticle code { font-family: var(--font-mono); background: rgba(110,118,129,0.15); padding:2px 5px; border-radius:4px; font-size:0.85em; }\npre { background: #0d1117; color:#e6edf3; padding:1rem 1.1rem; border-radius:6px; overflow:auto; line-height:1.45; font-size:0.85rem; }\npre code { background: transparent; padding:0; color:inherit; }\nblockquote { border-left:4px solid var(--c-accent); padding:0.55rem 1rem; background: rgba(13,110,253,0.06); color: var(--c-fg); border-radius:4px; }\nhr { border:0; border-top:1px solid var(--c-border-soft); margin:2.2rem 0; }\ntable { border-collapse:collapse; width:100%; font-size:0.92rem; }\nth,td { border:1px solid var(--c-border); text-align:left; padding:6px 10px; vertical-align:top; }\nth { background: rgba(13,110,253,0.08); font-weight:600; }\ntbody tr:nth-child(even){ background: rgba(140,149,159,0.08); }\nimg { max-width:100%; height:auto; }\nfigure { margin:0 0 1.2rem; }\nfigcaption { font-size:0.75rem; color: var(--c-muted); margin-top:0.35rem; text-align:center; }\n.docx-render { all: initial; font-family: var(--font-body); line-height:1.55; color: var(--c-fg); font-size:1rem; }\n.docx-render * { all: revert; }\n.docx-render p:empty { display:none; }\n.docx-render p { margin:0 0 1.05rem; }\n.docx-render table { border-collapse:collapse; }\n.docx-render th,.docx-render td { border:1px solid var(--c-border); padding:6px 8px; }\n.docx-render h1 { font-size:1.85rem; }\n.docx-render h2 { font-size:1.45rem; }\n.docx-render h3 { font-size:1.18rem; }\n.print-hint { position:fixed; bottom:10px; right:14px; font-size:11px; background:rgba(0,0,0,0.55); color:#fff; padding:6px 9px; border-radius:6px; font-family:var(--font-body); letter-spacing:0.5px; }\n@media print { body { background:#fff; color:#000; } .print-hint { display:none; } header { margin-bottom:1.2rem; } .container { padding:0 1rem; } a { text-decoration:underline; } }\n</style>\n</head>\n<body>\n<div class="container">\n<header>\n<h1>${safeTitle}</h1>\n<div class="meta">Exported ${new Date().toLocaleString()}</div>\n</header>\n<article class="docx-export docx-render">${html}</article>\n</div>\n<div class="print-hint">Press Ctrl/Cmd + P to print / save PDF</div>\n</body>\n</html>`
      const blob = new Blob([docHtml], { type: 'text/html' })
      const urlObj = URL.createObjectURL(blob)
      window.open(urlObj, '_blank')
      setTimeout(() => URL.revokeObjectURL(urlObj), 60_000)
    } catch (e) {
      console.warn('Open in new tab failed', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!document?.url) {
        setError('No document URL available')
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const resp = await fetch(document.url)
        if (!resp.ok) throw new Error(`Failed to fetch file (${resp.status})`)
        const arrayBuffer = await resp.arrayBuffer()
        // Convert to HTML via mammoth
        const { value } = await mammoth.convertToHtml(
          { arrayBuffer },
          { styleMap: defaultDocxTransformConfig.styleMap },
        )
        const transformed = defaultDocxTransformConfig.enabled
          ? transformDocxHtml(value || '')
          : value
        if (!cancelled)
          setHtml(
            transformed ||
              '<p><em>No readable content in this document.</em></p>',
          )
      } catch (e) {
        console.warn('DOCX render error', e)
        if (!cancelled)
          setError(
            'Unable to render this .docx file. You can still download it directly below.',
          )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [document])

  const toolbar = (
    <div className="flex items-center justify-between mb-3 text-[11px]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openInNewTab}
          disabled={isLoading || !html}
          className="px-2 py-1 rounded border text-xs font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          aria-label="Open in new tab"
        >
          <ExternalLink className="h-3 w-3" /> Open in New Tab
        </button>
      </div>
    </div>
  )

  if (isLoading)
    return (
      <div className="p-4 text-xs text-gray-500 italic bg-muted/80 rounded-md border">
        Converting .docx to HTML...
      </div>
    )
  if (error)
    return (
      <div className="p-4 text-xs bg-red-50/70 dark:bg-red-950/30 border border-red-300/40 dark:border-red-700/40 rounded-md space-y-2">
        {toolbar}
        <p className="text-red-600 dark:text-red-300 mb-2 font-medium">
          {error}
        </p>
        <a
          href={document.url}
          download={document.name}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
        >
          <Download className="h-3 w-3" /> Download File
        </a>
      </div>
    )
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

// Legacy .doc (binary) unsupported inline; show fallback
const LegacyDocFallback = ({ document }: { document: DocumentType }) => (
  <div className="p-4 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300/40 dark:border-amber-600/40 rounded-md space-y-3">
    <p className="text-amber-700 dark:text-amber-300 font-medium">
      Inline preview for legacy .doc files is not supported.
    </p>
    <p className="text-amber-600/80 dark:text-amber-200/70">
      You can download and open this document locally. Converting it to .docx
      will enable inline viewing here in the future.
    </p>
    <a
      href={document.url}
      download={document.name}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
    >
      <Download className="h-3 w-3" /> Download .doc File
    </a>
  </div>
)

// Utility functions
const formatFileSize = (size: string | number): string => {
  if (typeof size === 'string') return size
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let fileSize = size

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }

  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

interface DocumentViewerProps {
  documentId: string
  projectId: string
  companyId: string
  // Removed viewMode + AI analysis integration for simplified viewer
  document?: DocumentType | null
}

export const DocumentViewer = ({
  documentId,
  projectId,
  companyId,
  document: preResolvedDocument,
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [document, setDocument] = useState<DocumentType | null>(null)
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch document from API
  useEffect(() => {
    // If we already have the document from parent, use it
    if (preResolvedDocument) {
      setDocument(preResolvedDocument)
      setIsLoading(false)

      // Set content based on document type
      let documentContent = ''
      if (preResolvedDocument.type.includes('image')) {
        documentContent =
          '[This is an image file. Preview available in Document view.]'
      } else if (preResolvedDocument.type.includes('pdf')) {
        documentContent =
          preResolvedDocument.content ||
          'This is a PDF document that was uploaded. Advanced AI text analysis is in progress using OCR and semantic processing.\n\nThe full text content and searchable structure will be available once processing is complete.'
      } else if (
        preResolvedDocument.type.includes('text') ||
        preResolvedDocument.type.includes('txt') ||
        preResolvedDocument.type.includes('rtf') ||
        preResolvedDocument.type.includes('plain')
      ) {
        documentContent =
          preResolvedDocument.content ||
          'Advanced text processing and content analysis is in progress...'
      } else {
        documentContent =
          preResolvedDocument.content || 'Document content not available.'
      }
      setContent(documentContent)
      return
    }

    // Otherwise, fetch the document
    if (!documentId) {
      setError('No document ID provided')
      setIsLoading(false)
      return
    }

    const fetchDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch document from API using hybrid service
        const documentData = await documentService.getDocument(
          companyId,
          projectId,
          documentId,
        )

        if (documentData) {
          setDocument(documentData)

          let documentContent = ''
          if (documentData.type.includes('image')) {
            documentContent =
              '[This is an image file. Preview available in Document view.]'
          } else if (documentData.type.includes('pdf')) {
            documentContent =
              documentData.content ||
              'This is a PDF document that was uploaded. Advanced AI text analysis is in progress using OCR and semantic processing.\n\nThe full text content and searchable structure will be available once processing is complete.'
          } else if (
            documentData.type.includes('word') ||
            documentData.type.includes('doc')
          ) {
            documentContent =
              documentData.content ||
              'This is a Word document that was uploaded. Advanced document parsing and content analysis is in progress.\n\nThe formatted text content will be available once processing is complete.'
          } else if (
            documentData.type.includes('excel') ||
            documentData.type.includes('sheet') ||
            documentData.type.includes('xls')
          ) {
            documentContent =
              documentData.content ||
              'This is a spreadsheet that was uploaded. Advanced data analysis and table structure processing is in progress.\n\nThe structured data and content will be available once processing is complete.'
          } else if (
            documentData.type.includes('text') ||
            documentData.type.includes('txt') ||
            documentData.type.includes('rtf') ||
            documentData.type.includes('plain')
          ) {
            documentContent =
              documentData.content ||
              'This is a text document that was uploaded. Advanced content analysis and semantic processing is in progress.'
          } else {
            documentContent =
              documentData.content ||
              'This document has been uploaded and is being processed with advanced AI analysis. Structured content and searchable text will be available shortly.'
          }

          setContent(documentContent)
        } else {
          setError('Document not found')
        }
      } catch (error) {
        console.error('Error fetching document:', error)
        setError('Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, projectId, companyId, preResolvedDocument])

  // getFileIcon replaced with FileTypeIcon

  if (isLoading) {
    return <DocumentViewerSkeleton />
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <p className="text-lg font-medium mb-2 text-red-600">
          Error Loading Document
        </p>
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center p-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">Document Not Found</p>
        <p className="text-gray-400">
          The requested document could not be found.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="p-3 border-b bg-muted/20 flex items-center gap-2">
        <FileTypeIcon
          mimeType={document.type}
          fileName={document.name}
          size={20}
        />
        <h2 className="text-sm font-medium truncate">{document.name}</h2>
      </div>
      <div className="p-4 space-y-4">
        {/* Metadata Panel (reinstated, AI analysis still removed) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-muted/40 rounded-md p-3 border">
          <div>
            <div className="text-gray-500 mb-0.5">File Name</div>
            <div className="font-medium truncate" title={document.name}>
              {document.name}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">File Size</div>
            <div className="font-medium">{formatFileSize(document.size)}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Date</div>
            <div className="font-medium">
              {document.createdAt ? formatDate(document.createdAt) : 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Status</div>
            <div className="font-medium flex items-center gap-1 capitalize">
              {document.status === 'processing' && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              )}
              {document.status || 'unknown'}
            </div>
          </div>
        </div>

        {document.type.includes('image') ? (
          <div className="flex justify-center">
            <img
              src={document.url}
              alt={document.name || 'Document image'}
              className="max-w-full max-h-[80vh] object-contain rounded-md shadow"
            />
          </div>
        ) : document.type.includes('pdf') ? (
          <PDFViewer document={document} />
        ) : document.name?.toLowerCase().endsWith('.docx') ||
          document.type.includes('officedocument.wordprocessingml.document') ||
          document.type.includes(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ) ? (
          <DocxFileViewer document={document} />
        ) : document.name?.toLowerCase().endsWith('.doc') ||
          document.type === 'application/msword' ? (
          <LegacyDocFallback document={document} />
        ) : document.type.includes('text') ||
          document.type.includes('txt') ||
          document.type.includes('rtf') ||
          document.type.includes('plain') ? (
          <TextFileViewer document={document} />
        ) : (
          <div className="whitespace-pre-wrap bg-muted p-4 rounded-md max-h-[70vh] overflow-auto text-sm">
            {document.content ||
              `This document (${document.name || 'Unknown'}) has been uploaded successfully. Content extraction is in progress.`}
          </div>
        )}
      </div>
    </div>
  )
}
