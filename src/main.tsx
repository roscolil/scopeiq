import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { QueryClientProvider } from '@tanstack/react-query'
import outputs from '../amplify_outputs.json'
import App from './App'
import './index.css'
import { initializeServiceWorker } from '@/utils/performance/service-worker'
import { queryClient } from '@/lib/query-client'
import '@/utils/mobile-audio-debug'

Amplify.configure(outputs)

// Initialize service worker for performance optimization
initializeServiceWorker()

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
