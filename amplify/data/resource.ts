import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { sendContactEmail } from '../functions/send-contact-email/resource'
import { sendInvitationEmail } from '../functions/send-invitation-email/resource'
import { pineconeSearch } from '../functions/pinecone-search/resource'

const schema = a.schema({
  // Custom operation for sending contact emails
  sendContactEmail: a
    .mutation()
    .arguments({
      submissionId: a.string().required(),
      name: a.string().required(),
      email: a.string().required(),
      company: a.string(),
      message: a.string().required(),
      submittedAt: a.string().required(),
    })
    .returns(a.json())
    .authorization(allow => [allow.publicApiKey(), allow.guest()])
    .handler(a.handler.function(sendContactEmail)),

  // Custom operation for sending invitation emails
  sendInvitationEmail: a
    .mutation()
    .arguments({
      invitationId: a.string().required(),
      recipientEmail: a.string().required(),
      recipientName: a.string(),
      inviterName: a.string().required(),
      companyName: a.string().required(),
      role: a.string().required(),
      acceptUrl: a.string().required(),
    })
    .returns(a.json())
    .authorization(allow => [allow.groups(['Admin', 'Owner'])])
    .handler(a.handler.function(sendInvitationEmail)),

  // Custom operation for Pinecone search proxy
  pineconeSearch: a
    .query()
    .arguments({
      body: a.string().required(),
    })
    .returns(a.json())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(pineconeSearch)),

  // Company model for multi-tenancy
  Company: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      projects: a.hasMany('Project', 'companyId'),
      users: a.hasMany('User', 'companyId'),
      invitations: a.hasMany('UserInvitation', 'companyId'),
    })
    .authorization(allow => [
      // Admin has full access across all companies
      allow
        .groups(['Admin'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),
      allow.authenticated('userPools').to(['create', 'read']),

      // Company owners can read and update their company
      allow.groups(['Owner'], 'userPools').to(['read', 'update']),

      // Users can only read company information
      allow.groups(['User'], 'userPools').to(['read']),
    ]),

  // Enhanced User model for RBAC
  User: a
    .model({
      email: a.string().required(),
      name: a.string().required(),
      role: a.enum(['Admin', 'Owner', 'User']),
      companyId: a.id().required(),
      isActive: a.boolean().default(true),
      lastLoginAt: a.datetime(),
      invitedAt: a.datetime(),
      acceptedAt: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      company: a.belongsTo('Company', 'companyId'),
      projectAssignments: a.hasMany('UserProject', 'userId'),
      sentInvitations: a.hasMany('UserInvitation', 'invitedBy'),
    })
    .authorization(allow => [
      // Global admin has full access to all users
      allow
        .groups(['Admin'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),

      // Company owners can manage users in their company
      allow
        .groups(['Owner'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),

      // Regular users can only read other users and update their own profile
      allow.groups(['User'], 'userPools').to(['read']),
      allow.owner('userPools').to(['read', 'update']),

      // Allow authenticated users to create their own user record during signup
      allow.authenticated('userPools').to(['create', 'read']),
    ])
    .secondaryIndexes(index => [
      index('companyId').sortKeys(['role']).queryField('usersByCompanyAndRole'),
      index('email').queryField('userByEmail'),
    ]),

  // User-Project assignment for granular access control
  UserProject: a
    .model({
      userId: a.id().required(),
      projectId: a.id().required(),
      createdAt: a.datetime(),
      // Relations
      user: a.belongsTo('User', 'userId'),
      project: a.belongsTo('Project', 'projectId'),
    })
    .authorization(allow => [
      allow.owner('userPools').to(['read']), // Owners can only read, not update ownership
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']),
      allow.groups(['Owner']).to(['create', 'read', 'delete']),
    ])
    .secondaryIndexes(index => [
      index('userId').queryField('projectsByUser'),
      index('projectId').queryField('usersByProject'),
    ]),

  // User invitation system
  UserInvitation: a
    .model({
      email: a.string().required(),
      role: a.enum(['Admin', 'Owner', 'User']),
      companyId: a.id().required(),
      invitedBy: a.id().required(),
      expiresAt: a.datetime().required(),
      status: a.enum(['pending', 'accepted', 'expired', 'cancelled']),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      company: a.belongsTo('Company', 'companyId'),
      inviter: a.belongsTo('User', 'invitedBy'),
      projectAssignments: a.hasMany('InvitationProject', 'invitationId'),
    })
    .authorization(allow => [
      // Admin has full access
      allow.groups(['Admin'], 'userPools').to(['create', 'read', 'update', 'delete']),
      // Owner can manage invitations in their company
      allow.groups(['Owner'], 'userPools').to(['create', 'read', 'update', 'delete']),
      // Users can read (to see pending invitations)
      allow.groups(['User'], 'userPools').to(['read']),
      // Invitation recipient can read their own
      allow.owner('userPools').to(['read']),
    ])
    .secondaryIndexes(index => [
      index('companyId')
        .sortKeys(['status'])
        .queryField('invitationsByCompanyAndStatus'),
      index('email').queryField('invitationByEmail'),
    ]),

  // Invitation-Project assignment
  InvitationProject: a
    .model({
      invitationId: a.id().required(),
      projectId: a.id().required(),
      createdAt: a.datetime(),
      // Relations
      invitation: a.belongsTo('UserInvitation', 'invitationId'),
      project: a.belongsTo('Project', 'projectId'),
    })
    .authorization(allow => [
      // Admin has full access
      allow.groups(['Admin'], 'userPools').to(['create', 'read', 'update', 'delete']),
      // Owner can manage invitation-project assignments
      allow.groups(['Owner'], 'userPools').to(['create', 'read', 'delete']),
      // Users can read their own
      allow.owner('userPools').to(['read']),
    ]),

  // Enhanced Project model
  Project: a
    .model({
      name: a.string().required(),
      description: a.string(),
      companyId: a.id().required(),
      slug: a.string(),
      owner: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      company: a.belongsTo('Company', 'companyId'),
      documents: a.hasMany('Document', 'projectId'),
      userAssignments: a.hasMany('UserProject', 'projectId'),
      invitationAssignments: a.hasMany('InvitationProject', 'projectId'),
    })
    .authorization(allow => [
      // Only Admin and Owner can create, update, delete projects
      allow
        .groups(['Admin', 'Owner'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),
      // Users can only read projects they're assigned to
      allow.groups(['User'], 'userPools').to(['read']),
      // Fallback: authenticated users can read (for initial setup)
      allow.authenticated('userPools').to(['read']),
    ])
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
      size: a.integer().required(),
      status: a.enum(['processed', 'processing', 'failed', 'ready', 'error']),
      // S3 file paths - keeping files in S3
      s3Key: a.string().required(), // Path to actual file in S3
      s3Url: a.string(), // Pre-signed URL (generated)
      thumbnailS3Key: a.string(), // Path to thumbnail in S3
      thumbnailUrl: a.string(), // Pre-signed thumbnail URL
      // Metadata
      projectId: a.id().required(),
      mimeType: a.string(),
      content: a.string(),
      tags: a.string().array(),
      // Taxonomy linkage
      categoryIds: a.string().array(), // multiple categories
      primaryCategoryId: a.string(), // denormalized first category for indexing
      suggestedCategoryIds: a.string().array(), // ML suggested categories (not yet accepted)
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Relations
      project: a.belongsTo('Project', 'projectId'),
    })
    .authorization(allow => [
      // Admin has full access to all documents
      allow
        .groups(['Admin'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),
      // Owner can manage documents in their company projects
      allow
        .groups(['Owner'], 'userPools')
        .to(['create', 'read', 'update', 'delete']),
      // Users can read/update documents in projects they're assigned to
      allow.groups(['User'], 'userPools').to(['read', 'update']),
      // Document owner can manage their own documents
      allow.owner('userPools').to(['read', 'update', 'delete']),
    ])
    .secondaryIndexes(index => [
      index('projectId')
        .sortKeys(['createdAt'])
        .queryField('documentsByProject'),
      index('projectId')
        .sortKeys(['name'])
        .queryField('documentsByProjectAndName'),
      index('status').queryField('documentsByStatus'),
      // Index primaryCategoryId for quick category-based queries
      index('primaryCategoryId')
        .sortKeys(['createdAt'])
        .queryField('documentsByPrimaryCategory'),
    ]),

  // Contact form submissions - Public access only
  ContactSubmission: a
    .model({
      name: a.string().required(),
      company: a.string(),
      email: a.string().required(),
      message: a.string().required(),
      status: a.enum(['new', 'contacted', 'resolved']),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['create']),
      allow.guest().to(['create']),
    ])
    .secondaryIndexes(index => [
      index('status').sortKeys(['createdAt']).queryField('submissionsByStatus'),
      index('email').queryField('submissionsByEmail'),
    ]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
})
