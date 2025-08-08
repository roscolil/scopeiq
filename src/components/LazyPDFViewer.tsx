import { lazy, Suspense } from 'react'
import { Spinner } from '@/components/Spinner'

// Import the PDFViewer props type
interface PDFViewerProps {
  document: {
    id: string
    name: string
    url?: string | null
    s3Url?: string | null
    type: string
    content?: string | null
  }
}

// Lazy load PDF.js components and styles only when needed
const LazyPDFViewer = lazy(async () => {
  // Load PDF.js styles dynamically
  await import('react-pdf/dist/Page/AnnotationLayer.css')
  await import('react-pdf/dist/Page/TextLayer.css')

  // Initialize PDF worker
  const { initializePDFWorker } = await import('@/utils/pdf-lazy-loader')
  await initializePDFWorker()

  // Import the actual PDF viewer component
  const { PDFViewer } = await import('./PDFViewer')
  return { default: PDFViewer }
})

const PDFLoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center h-64 space-y-4">
    <Spinner />
    <p className="text-sm text-muted-foreground">Loading PDF viewer...</p>
  </div>
)

export const LazyPDFViewerWrapper = (props: PDFViewerProps) => {
  return (
    <Suspense fallback={<PDFLoadingSpinner />}>
      <LazyPDFViewer {...props} />
    </Suspense>
  )
}
