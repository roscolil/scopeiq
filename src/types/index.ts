export interface Document {
  id: string
  name: string
  type: string
  size: string | number
  status: 'processing' | 'processed' | 'failed'
  projectId?: string
  url?: string // S3 URL
  key?: string // S3 key for management
  thumbnailUrl?: string
  content?: string
  createdAt?: string
  updatedAt?: string
}

export type Project = {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
  documents?: Document[]
  address?: string
  companyId?: string
  streetNumber?: string
  streetName?: string
  suburb?: string
  state?: string
  postcode?: string
}
