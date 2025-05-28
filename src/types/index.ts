export interface Document {
  id: string
  name: string
  type: string
  size: string
  date: string
  status: 'processed' | 'processing' | 'failed'
  projectId?: string
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
