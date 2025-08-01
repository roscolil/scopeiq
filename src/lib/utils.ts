import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a file size in bytes to a human-readable format
 */
export function formatFileSize(bytes: number | string): string {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes

  if (isNaN(size)) return 'Unknown size'
  if (size === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(size) / Math.log(k))

  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  if (!filename) return ''
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Check if a file type is natively supported for viewing in the browser
 */
export function isFileTypeSupported(type: string): boolean {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    // PDFs
    'application/pdf',
    // Text files
    'text/plain',
    // HTML
    'text/html',
  ]

  return supportedTypes.some(supportedType => type.includes(supportedType))
}

/**
 * Format a date string to a more readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch (error) {
    return dateString
  }
}
