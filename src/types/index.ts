export interface Document {
  id: string
  name: string
  type: string
  size: string | number
  date: string
  status: 'processing' | 'processed' | 'failed'
  projectId: string
  url?: string // S3 URL
  key?: string // S3 key for management
}

export type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  documentIds: string[]
  address: string
  companyId: string
  streetNumber: string
  streetName: string
  suburb: string
  state: string
  postcode: string
}
