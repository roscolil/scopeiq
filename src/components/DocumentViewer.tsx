import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, File, FileImage } from 'lucide-react'
import { AIActions } from './AIActions'
import { Document } from '@/types'

interface DocumentViewerProps {
  documentId: string
  projectId: string
  companyId: string
}

export const DocumentViewer = ({
  documentId,
  projectId,
  companyId,
}: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState<string>('')

  // Fetch document from localStorage
  useEffect(() => {
    setIsLoading(true)

    // Check for uploaded documents
    const storedDocuments = localStorage.getItem('uploadedDocuments')

    if (storedDocuments) {
      try {
        const uploadedDocs = JSON.parse(storedDocuments) as Document[]
        const foundDoc = uploadedDocs.find(doc => doc.id === documentId)

        if (foundDoc) {
          setDocument(foundDoc)

          let documentContent = ''
          if (foundDoc.type.includes('image')) {
            documentContent =
              '[This is an image file. Preview available below.]'
          } else if (foundDoc.type.includes('pdf')) {
            documentContent =
              'This is a PDF document that was uploaded. Content extraction is in progress.\n\nThe full text will be available once processing is complete.\n\nYou can use the AI actions below to analyze this document.'
          } else if (foundDoc.type.includes('word')) {
            documentContent =
              'This is a Word document that was uploaded. Content extraction is in progress.\n\nThe full text will be available once processing is complete.\n\nYou can use the AI actions below to analyze this document.'
          } else {
            documentContent =
              'Document content is being processed. It will be available shortly.\n\nYou can use the AI actions below to analyze this document in the meantime.'
          }

          setContent(documentContent)
        }
      } catch (error) {
        console.error('Error parsing stored documents:', error)
      }
    }

    // Simulate processing delay
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [documentId])

  const getFileIcon = () => {
    if (!document) return <File className="h-5 w-5 text-primary" />

    if (document.type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    } else if (document.type.includes('image')) {
      return <FileImage className="h-5 w-5 text-blue-500" />
    } else {
      return <File className="h-5 w-5 text-green-500" />
    }
  }

  if (!document) {
    return (
      <div className="flex justify-center items-center p-10">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <h2 className="text-lg font-medium">{document.name}</h2>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {document.type.includes('image') && document.url ? (
                <div className="flex justify-center">
                  <img
                    src={document.url}
                    alt={document.name}
                    className="max-w-full h-auto"
                  />
                </div>
              ) : (
                content
                  .split('\n\n')
                  .map((paragraph, index) => <p key={index}>{paragraph}</p>)
              )}
            </div>
          )}
        </div>
      </div>

      <AIActions documentId={documentId} projectId={projectId} />
    </div>
  )
}
