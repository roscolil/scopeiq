import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, FileImage, File, Eye, Brain } from '@/components/icons'
import { Document } from '@/types'

interface DocumentListItemProps {
  document: Document & {
    projectName?: string
    aiAnalysis?: string
  }
  onView: (documentId: string) => void
  onAnalyze?: (documentId: string) => void
  showProject?: boolean
}

// Memoized component to prevent unnecessary re-renders
const DocumentListItem = React.memo(
  ({
    document,
    onView,
    onAnalyze,
    showProject = false,
  }: DocumentListItemProps) => {
    const getFileIcon = (type: string) => {
      if (type.includes('pdf')) return <FileText className="h-4 w-4" />
      if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />
      return <File className="h-4 w-4" />
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'processed':
          return 'bg-green-100 text-green-800'
        case 'processing':
          return 'bg-yellow-100 text-yellow-800'
        case 'failed':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {getFileIcon(document.type)}
              <CardTitle className="text-sm font-medium truncate">
                {document.name}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <Badge
                variant="secondary"
                className={`text-xs ${getStatusColor(document.status)}`}
              >
                {document.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Document details */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Size: {formatFileSize(document.size || 0)}</p>
              <p>Type: {document.type}</p>
              <p>
                Uploaded: {new Date(document.createdAt).toLocaleDateString()}
              </p>
              {showProject && document.projectName && (
                <p>Project: {document.projectName}</p>
              )}
            </div>

            {/* AI Analysis Results */}
            {document.aiAnalysis && (
              <div className="bg-blue-50 p-2 rounded-md">
                <div className="flex items-center space-x-1 mb-1">
                  <Brain className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">
                    AI Analysis
                  </span>
                </div>
                <p className="text-xs text-blue-700 line-clamp-2">
                  {document.aiAnalysis}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(document.id)}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              {onAnalyze && document.status === 'processed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(document.id)}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Analyze
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

DocumentListItem.displayName = 'DocumentListItem'

export { DocumentListItem }
