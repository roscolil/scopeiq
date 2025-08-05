import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import App from './App'
import './index.css'

// Required for PDF.js
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set PDF.js worker source to jsdelivr CDN (most reliable)
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@' +
  pdfjs.version +
  '/build/pdf.worker.min.js'

Amplify.configure(outputs)

createRoot(document.getElementById('root')!).render(<App />)
