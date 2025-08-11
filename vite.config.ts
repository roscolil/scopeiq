import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  plugins: [react(), mode === 'development' && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-toast',
      '@radix-ui/react-dialog',
      'lucide-react',
    ],
    exclude: [
      'pdfjs-dist', // Lazy load PDF.js
      'react-pdf', // Lazy load react-pdf
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI library chunk
          'ui-vendor': [
            '@radix-ui/react-toast',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            'lucide-react',
          ],
          // AWS and external services
          'aws-vendor': [
            'aws-amplify',
            '@aws-amplify/ui-react',
            '@aws-sdk/client-s3',
          ],
          // PDF processing (separate chunk for lazy loading)
          'pdf-vendor': ['pdfjs-dist', 'react-pdf'],
          // AI and ML services
          'ai-vendor': ['@pinecone-database/pinecone'],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Enable source maps for better debugging
    sourcemap: mode === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
}))
