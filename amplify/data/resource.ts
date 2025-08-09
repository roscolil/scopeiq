import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { sendContactEmail } from '../functions/send-contact-email/resource'
import { sendInvitationEmail } from '../functions/send-invitation-email/resource'

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
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(sendInvitationEmail)),

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
    .authorization(allow => [allow.owner()]),

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
      allow.owner(),
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']),
      allow.groups(['Owner']).to(['read', 'update']),
      allow.groups(['User']).to(['read']),
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
      allow.owner(),
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
      allow.owner(),
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']),
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
      allow.owner(),
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']),
    ]),

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
      userAssignments: a.hasMany('UserProject', 'projectId'),
      invitationAssignments: a.hasMany('InvitationProject', 'projectId'),
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
      status: a.enum(['processed', 'processing', 'failed', 'ready', 'error']),
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
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read', 'update']), // Allow authenticated users to read and update
    ])
    .secondaryIndexes(index => [
      index('projectId')
        .sortKeys(['createdAt'])
        .queryField('documentsByProject'),
      index('projectId')
        .sortKeys(['name'])
        .queryField('documentsByProjectAndName'),
      index('status').queryField('documentsByStatus'),
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
      allow.publicApiKey().to(['create']), // Only allow public creation
      allow.guest().to(['create']), // Allow guest users to create
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
