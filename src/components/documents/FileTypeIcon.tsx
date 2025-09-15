import React from 'react'
import { FileText, Image, File, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileTypeIconProps {
  mimeType?: string
  fileName?: string
  className?: string
  size?: number
}

// Internal helpers
const ext = (name?: string) =>
  (name || '').split('.').pop()?.toLowerCase() || ''

const isWord = (mime?: string, e?: string) =>
  !!(
    mime &&
    (mime.includes('word') ||
      mime.includes('application/msword') ||
      mime.includes('officedocument.wordprocessingml.document'))
  ) || ['doc', 'docx'].includes(e || '')

const isPdf = (mime?: string, e?: string) =>
  (mime && mime.includes('pdf')) || e === 'pdf'

const isImage = (mime?: string, e?: string) =>
  (mime && mime.startsWith('image/')) ||
  ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e || '')

const isText = (mime?: string, e?: string) =>
  !!(
    mime &&
    (mime.includes('text') ||
      mime.includes('plain') ||
      mime.includes('rtf') ||
      mime.includes('markdown'))
  ) || ['txt', 'md', 'rtf', 'log'].includes(e || '')

const isExcel = (mime?: string, e?: string) =>
  !!(
    mime &&
    (mime.includes('sheet') ||
      mime.includes('excel') ||
      mime.includes('spreadsheetml'))
  ) || ['xls', 'xlsx', 'csv'].includes(e || '')

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  mimeType,
  fileName,
  className,
  size = 32,
}) => {
  const e = ext(fileName)
  const common = 'shrink-0'

  if (isPdf(mimeType, e)) {
    return (
      <FileText
        className={cn('text-red-500', className, common)}
        style={{ width: size, height: size }}
      />
    )
  }
  if (isImage(mimeType, e)) {
    return (
      <Image
        className={cn('text-blue-500', className, common)}
        style={{ width: size, height: size }}
      />
    )
  }
  if (isWord(mimeType, e)) {
    return (
      <FileText
        className={cn('text-blue-700', className, common)}
        style={{ width: size, height: size }}
      />
    )
  }
  if (isExcel(mimeType, e)) {
    return (
      <FileSpreadsheet
        className={cn('text-emerald-600', className, common)}
        style={{ width: size, height: size }}
      />
    )
  }
  if (isText(mimeType, e)) {
    return (
      <FileText
        className={cn('text-gray-600', className, common)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <File
      className={cn('text-green-500', className, common)}
      style={{ width: size, height: size }}
    />
  )
}

export default FileTypeIcon
