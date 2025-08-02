import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  // Company model for multi-tenancy
  Company: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      projects: a.hasMany('Project', 'companyId'),
      users: a.hasMany('UserCompany', 'companyId'),
    })
    .authorization(allow => [allow.owner()]),

  // User-Company relationship for multi-tenant access
  UserCompany: a
    .model({
      userId: a.string().required(),
      companyId: a.id().required(),
      role: a.enum(['admin', 'member', 'viewer']),
      // Relations
      company: a.belongsTo('Company', 'companyId'),
    })
    .authorization(allow => [allow.owner()]),

  // Enhanced Project model
  Project: a
    .model({
      name: a.string().required(),
      description: a.string(),
      companyId: a.id().required(),
      slug: a.string(), // For friendly URLs
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      company: a.belongsTo('Company', 'companyId'),
      documents: a.hasMany('Document', 'projectId'),
    })
    .authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('companyId')
        .sortKeys(['createdAt'])
        .queryField('projectsByCompany'),
      index('companyId')
        .sortKeys(['name'])
        .queryField('projectsByCompanyAndName'),
    ]),

  // Enhanced Document model
  Document: a
    .model({
      name: a.string().required(),
      type: a.string().required(),
      size: a.integer().required(), // Changed to integer
      status: a.enum(['processed', 'processing', 'failed']),
      // S3 file paths - keeping files in S3
      s3Key: a.string().required(), // Path to actual file in S3
      s3Url: a.string(), // Pre-signed URL (generated)
      thumbnailS3Key: a.string(), // Path to thumbnail in S3
      thumbnailUrl: a.string(), // Pre-signed thumbnail URL
      // Metadata
      projectId: a.id().required(),
      mimeType: a.string(),
      content: a.string(), // Processed text content
      tags: a.string().array(), // For search/categorization
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      project: a.belongsTo('Project', 'projectId'),
    })
    .authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('projectId')
        .sortKeys(['createdAt'])
        .queryField('documentsByProject'),
      index('projectId')
        .sortKeys(['name'])
        .queryField('documentsByProjectAndName'),
      index('status').queryField('documentsByStatus'),
    ]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
