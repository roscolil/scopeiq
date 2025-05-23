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
  address: string
  streetNumber: string
  streetName: string
  suburb: string
  postcode: string
  id: string
  name: string
  description: string
  documentIds: string[]
  createdAt: string
  companyId: string
}
