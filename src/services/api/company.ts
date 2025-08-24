/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>() as any

export interface Company {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export const companyService = {
  // Get company by ID
  async getCompanyById(companyId: string): Promise<Company | null> {
    try {
      const { data: company } = await client.models.Company.get({
        id: companyId,
      })

      if (!company) {
        return null
      }

      return {
        id: company.id,
        name: company.name,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      return null
    }
  },

  // Update company details
  async updateCompany(
    companyId: string,
    updates: Partial<Omit<Company, 'id'>>,
  ): Promise<Company | null> {
    try {
      const { data: company } = await client.models.Company.update({
        id: companyId,
        ...updates,
      })

      if (!company) {
        return null
      }

      return {
        id: company.id,
        name: company.name,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      }
    } catch (error) {
      console.error('Error updating company:', error)
      return null
    }
  },
}
