import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  Project: a
    .model({
      name: a.string().required(),
      description: a.string(),
      documents: a.hasMany('Document', 'projectId'),
    })
    .authorization(allow => [allow.owner()]),

  Document: a
    .model({
      name: a.string().required(),
      type: a.string().required(),
      size: a.string().required(),
      status: a.enum(['processed', 'processing', 'failed']),
      url: a.string(),
      thumbnailUrl: a.string(),
      projectId: a.id(),
      project: a.belongsTo('Project', 'projectId'),
      content: a.string(),
    })
    .authorization(allow => [allow.owner()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
