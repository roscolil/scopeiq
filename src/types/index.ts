export interface Document {
  id: string
  name: string
  type: string
  size: string
  date: string
  status: 'processed' | 'processing' | 'failed'
  projectId?: string
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  documentIds: string[]
}
