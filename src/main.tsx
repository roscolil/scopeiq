import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import App from './App'
import './index.css'
import { initializeServiceWorker } from './utils/service-worker'

Amplify.configure(outputs)

// Initialize service worker for performance optimization
initializeServiceWorker()

createRoot(document.getElementById('root')!).render(<App />)
