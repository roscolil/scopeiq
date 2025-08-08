// Lazy PDF.js loader - only loads when PDF components are needed
let pdfWorkerInitialized = false

export const initializePDFWorker = async () => {
  if (pdfWorkerInitialized) return

  try {
    // Dynamically import PDF.js only when needed
    const pdfjs = await import('pdfjs-dist')

    // Set worker source
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    pdfWorkerInitialized = true
    console.log('PDF.js worker initialized lazily')
  } catch (error) {
    console.error('Failed to initialize PDF.js worker:', error)
    throw error
  }
}

export const isPDFWorkerReady = () => pdfWorkerInitialized
