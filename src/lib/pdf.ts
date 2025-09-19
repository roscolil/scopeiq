import { GlobalWorkerOptions } from 'pdfjs-dist'
// Vite import of pdf worker already present in public folder
// We rely on existing /public/pdf.worker.min.mjs included via ?url for pdfjs-dist >=3
// If bundler changes, adjust path accordingly.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerSrc from '/pdf.worker.min.mjs?url'

if (workerSrc) {
  GlobalWorkerOptions.workerSrc = workerSrc
}
