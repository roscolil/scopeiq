import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { AIActions } from './AIActions'

interface DocumentViewerProps {
  documentId: string
}

export const DocumentViewer = ({ documentId }: DocumentViewerProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [document, setDocument] = useState({
    id: documentId,
    name: 'Sample Document.pdf',
    content:
      'This is a sample document content that would be extracted from the PDF using AWS Textract. In a real application, this would contain the actual text content from the document that was processed through AWS services.\n\nThe content would be much longer and would be formatted properly. It might include paragraphs, bullet points, and other formatting from the original document.\n\nWhen a user uploads a document, it would be stored in S3, processed by Textract, and then the extracted text would be displayed here. The text would also be processed and stored in a vector database like Pinecone for semantic search capabilities.',
    thumbnailUrl: null,
    projectId: 'project-1', // Mock project ID for the current document
  })

  // In a real app, we'd fetch the document from AWS S3 and Textract
  useEffect(() => {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [documentId])

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
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
              {document.content.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <AIActions documentId={documentId} projectId={document.projectId} />
    </div>
  )
}
