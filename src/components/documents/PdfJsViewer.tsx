import React, { useEffect, useState, useRef, useCallback } from 'react'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import {
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  RotateCw,
  ExternalLink,
} from 'lucide-react'
import '@/lib/pdf'

interface PdfJsViewerProps {
  url: string
  initialScale?: number
  maxScale?: number
  minScale?: number
}

export const PdfJsViewer: React.FC<PdfJsViewerProps> = ({
  url,
  initialScale = 1.1,
  maxScale = 2,
  minScale = 0.6,
}) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(initialScale)
  const [currentPage, setCurrentPage] = useState(1)
  const [rendering, setRendering] = useState(false)
  const [rotation, setRotation] = useState(0) // 0,90,180,270
  // Default thumbnails to visible for quicker navigation
  const [showThumbnails, setShowThumbnails] = useState(true)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})
  const [generatingThumbs, setGeneratingThumbs] = useState(false)
  const [hiDpi, setHiDpi] = useState(true)
  const [fitWidth, setFitWidth] = useState(true)
  const autoScaleRef = useRef<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  // Map of page number to thumbnail button element for auto-scrolling
  const thumbRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const task = getDocument({ url })
        const doc = await task.promise
        if (cancelled) return
        setPdf(doc)
      } catch (e) {
        if (!cancelled) setError('Failed to load PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  const renderPage = useCallback(async () => {
    if (!pdf) return
    const canvas = canvasRef.current
    if (!canvas) return
    setRendering(true)
    try {
      const page = await pdf.getPage(currentPage)
      let effectiveScale = scale
      // If fitWidth enabled, compute scale from container width vs page original width
      if (fitWidth && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32 // padding allowance
        const testViewport = page.getViewport({ scale: 1, rotation })
        const target = containerWidth / testViewport.width
        effectiveScale = target
        autoScaleRef.current = target
      }
      const baseViewport = page.getViewport({ scale: effectiveScale, rotation })
      // Use device pixel ratio consistently between dev tools and real devices
      const dpr = hiDpi ? Math.min(window.devicePixelRatio || 1, 3) : 1
      const viewport = baseViewport
      const context = canvas.getContext('2d')
      if (!context) return
      // Cap huge pixel counts to avoid memory blow-ups (e.g., very large pages at high zoom)
      const maxPixels = 8_000_000 // ~8MP
      let targetWidth = viewport.width * dpr
      let targetHeight = viewport.height * dpr
      if (targetWidth * targetHeight > maxPixels) {
        const scaleDown = Math.sqrt(maxPixels / (targetWidth * targetHeight))
        targetWidth *= scaleDown
        targetHeight *= scaleDown
      }
      canvas.width = Math.floor(targetWidth)
      canvas.height = Math.floor(targetHeight)
      canvas.style.width = viewport.width + 'px'
      canvas.style.height = viewport.height + 'px'
      context.setTransform(
        canvas.width / viewport.width,
        0,
        0,
        canvas.height / viewport.height,
        0,
        0,
      )
      await page.render({ canvasContext: context, viewport, canvas }).promise
    } finally {
      setRendering(false)
    }
  }, [pdf, currentPage, scale, rotation, hiDpi, fitWidth])

  // Re-render when pdf / page / scale / rotation changes
  useEffect(() => {
    renderPage()
  }, [renderPage])

  // Recalculate page on resize (debounced) if fitWidth active
  useEffect(() => {
    if (!fitWidth) return
    const onResize = () => {
      // Force re-render by calling renderPage (scale recomputed inside)
      renderPage()
    }
    let rAF: number | null = null
    const debounced = () => {
      if (rAF) cancelAnimationFrame(rAF)
      rAF = requestAnimationFrame(onResize)
    }
    window.addEventListener('resize', debounced)
    return () => {
      if (rAF) cancelAnimationFrame(rAF)
      window.removeEventListener('resize', debounced)
    }
  }, [fitWidth, renderPage])

  // Ensure current page stays within bounds whenever pdf or currentPage changes
  useEffect(() => {
    if (!pdf) return
    if (currentPage < 1) setCurrentPage(1)
    else if (currentPage > pdf.numPages) setCurrentPage(pdf.numPages)
  }, [pdf, currentPage])

  // Lazy thumbnail generation when toggled on (must appear before any early returns)
  useEffect(() => {
    if (!pdf || !showThumbnails) return
    let cancelled = false
    const generate = async () => {
      setGeneratingThumbs(true)
      try {
        // Prioritize current page thumbnail first for instant visual reference
        if (!thumbnails[currentPage]) {
          try {
            const page = await pdf.getPage(currentPage)
            const viewport = page.getViewport({ scale: 0.2 })
            const offCanvas = document.createElement('canvas')
            offCanvas.width = viewport.width
            offCanvas.height = viewport.height
            const ctx = offCanvas.getContext('2d')
            if (ctx) {
              await page.render({
                canvasContext: ctx,
                viewport,
                canvas: offCanvas,
              }).promise
              const dataUrl = offCanvas.toDataURL('image/png')
              if (!cancelled)
                setThumbnails(prev => ({ ...prev, [currentPage]: dataUrl }))
            }
          } catch {
            /* silent */
          }
        }
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break
          if (thumbnails[pageNum]) continue
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 0.2 })
          const offCanvas = document.createElement('canvas')
          offCanvas.width = viewport.width
          offCanvas.height = viewport.height
          const ctx = offCanvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport, canvas: offCanvas })
            .promise
          const dataUrl = offCanvas.toDataURL('image/png')
          setThumbnails(prev =>
            cancelled ? prev : { ...prev, [pageNum]: dataUrl },
          )
          await new Promise(r => setTimeout(r, 10))
        }
      } finally {
        if (!cancelled) setGeneratingThumbs(false)
      }
    }
    generate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, showThumbnails])

  // Ensure the active thumbnail is scrolled into view when page changes
  useEffect(() => {
    if (!showThumbnails) return
    const el = thumbRefs.current[currentPage]
    if (el) {
      try {
        el.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        })
      } catch {
        /* silent */
      }
    }
  }, [currentPage, showThumbnails])

  // Guard states (after hooks to keep hook order stable)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-sm text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mb-2" /> Loading PDF…
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-red-500 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" /> {error}
      </div>
    )
  }
  if (!pdf) return null

  const goToPage = (p: number) => {
    if (!pdf) return
    const target = Math.min(Math.max(1, p), pdf.numPages)
    setCurrentPage(target)
  }

  return (
    <div
      className="relative bg-neutral-100 dark:bg-slate-800/60 rounded border flex flex-col"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      {/* Control Bar */}
      <div className="flex flex-wrap gap-2 items-center rounded-md justify-between bg-white/90 backdrop-blur px-3 py-2 border-b text-xs shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={pdf.numPages}
              value={currentPage}
              onChange={e => goToPage(parseInt(e.target.value || '1', 10))}
              className="w-14 h-7 border rounded px-1 text-center text-xs bg-white"
              aria-label="Current page"
            />
            <span className="text-gray-500">/ {pdf.numPages}</span>
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pdf.numPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => goToPage(pdf.numPages)}
            disabled={currentPage === pdf.numPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={
              'p-1 rounded hover:bg-gray-100 ' +
              (showThumbnails ? 'bg-gray-100' : '')
            }
            onClick={() => setShowThumbnails(t => !t)}
            aria-label="Toggle thumbnails"
            title="Toggle thumbnails"
          >
            {/* Simple grid icon */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="5" height="5" rx="1" />
              <rect x="12" y="3" width="5" height="5" rx="1" />
              <rect x="3" y="12" width="5" height="5" rx="1" />
              <rect x="12" y="12" width="5" height="5" rx="1" />
            </svg>
          </button>
          {/* Removed text layer toggle */}
          <button
            className={
              'p-1 rounded hover:bg-gray-100 ' + (fitWidth ? 'bg-gray-100' : '')
            }
            onClick={() => setFitWidth(f => !f)}
            aria-label="Toggle fit width"
            title={fitWidth ? 'Disable fit-to-width' : 'Enable fit-to-width'}
          >
            {/* Fit width icon */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7h18" />
              <path d="M3 17h18" />
              <path d="M8 7v10" />
              <path d="M16 7v10" />
            </svg>
          </button>
          <button
            className={
              'p-1 rounded hover:bg-gray-100 ' + (hiDpi ? 'bg-gray-100' : '')
            }
            onClick={() => setHiDpi(h => !h)}
            aria-label="Toggle high quality"
            title={
              hiDpi ? 'Disable high DPI rendering' : 'Enable high DPI rendering'
            }
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9v6" />
              <path d="M11 9v6" />
              <path d="M7 12h4" />
              <path d="M14 9h2.5a2.5 2.5 0 0 1 0 5H14z" />
            </svg>
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => {
              setFitWidth(false)
              setScale(s => Math.max(minScale, +(s - 0.1).toFixed(2)))
            }}
            disabled={scale <= minScale && !fitWidth}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="px-1 text-xs tabular-nums w-12 text-center">
            {(scale * 100).toFixed(0)}%
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            onClick={() => {
              setFitWidth(false)
              setScale(s => Math.min(maxScale, +(s + 0.1).toFixed(2)))
            }}
            disabled={!fitWidth && scale >= maxScale}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => setRotation(r => (r + 270) % 360)}
            aria-label="Rotate counter clockwise"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => setRotation(r => (r + 90) % 360)}
            aria-label="Rotate clockwise"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <div className="text-[10px] text-gray-500 w-10 text-center">
            {rotation}°
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showThumbnails && pdf && (
        <div className="w-full h-[108px] border-b bg-gray-50 flex flex-col shrink-0">
          <div className="w-full overflow-x-auto overflow-y-hidden py-2">
            <div className="flex gap-2 px-3 text-[10px] text-gray-700 min-w-max">
              {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map(p => {
                const selected = p === currentPage
                const thumb = thumbnails[p]
                return (
                  <button
                    key={p}
                    ref={el => (thumbRefs.current[p] = el)}
                    onClick={() => goToPage(p)}
                    className={
                      'relative flex flex-col items-center focus:outline-none group ' +
                      (selected ? 'ring-2 ring-blue-500 rounded' : '')
                    }
                    title={`Page ${p}`}
                  >
                    <div
                      className={
                        'border bg-white flex items-center justify-center overflow-hidden rounded-sm shadow-sm ' +
                        (selected ? 'border-blue-400' : 'border-gray-300')
                      }
                      style={{ width: 50, height: 65 }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`Thumbnail ${p}`}
                          className="object-contain max-w-full max-h-full"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-[8px] text-gray-400">
                          {generatingThumbs ? '…' : '—'}
                        </div>
                      )}
                    </div>
                    <span className="mt-1 text-[9px] text-gray-500 group-hover:text-gray-800">
                      {p}
                    </span>
                  </button>
                )
              })}
              {generatingThumbs && (
                <span className="italic text-gray-400 ml-2 flex items-center">
                  Loading…
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Page area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto px-4 py-4 flex flex-col items-center"
      >
        <div className="relative shadow border rounded bg-white">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
          <div className="absolute bottom-1 right-2 text-[10px] bg-black/50 text-white px-1 rounded">
            {currentPage}
          </div>
        </div>
      </div>
    </div>
  )
}

// (Legacy multi-page component removed in favor of single-page pagination logic.)
