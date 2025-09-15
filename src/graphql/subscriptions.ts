/* tslint:disable */

// this is an auto generated file. This will be overwritten

import * as APITypes from './API'
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType
  __generatedSubscriptionOutput: OutputType
}

export const onCreateCompany = /* GraphQL */ `subscription OnCreateCompany(
  $filter: ModelSubscriptionCompanyFilterInput
  $owner: String
) {
  onCreateCompany(filter: $filter, owner: $owner) {
    createdAt
    description
    id
    name
    owner
    projects {
      nextToken
      __typename
    }
    updatedAt
    users {
      nextToken
      __typename
    }
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateCompanySubscriptionVariables,
  APITypes.OnCreateCompanySubscription
>
export const onCreateDocument = /* GraphQL */ `subscription OnCreateDocument(
  $filter: ModelSubscriptionDocumentFilterInput
  $owner: String
) {
  onCreateDocument(filter: $filter, owner: $owner) {
    content
    createdAt
    id
    mimeType
    name
    owner
    project {
      companyId
      createdAt
      description
      id
      name
      owner
      slug
      updatedAt
      __typename
    }
    projectId
    s3Key
    s3Url
    size
    status
    tags
    thumbnailS3Key
    thumbnailUrl
    type
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateDocumentSubscriptionVariables,
  APITypes.OnCreateDocumentSubscription
>
export const onCreateProject = /* GraphQL */ `subscription OnCreateProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onCreateProject(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    description
    documents {
      nextToken
      __typename
    }
    id
    name
    owner
    slug
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateProjectSubscriptionVariables,
  APITypes.OnCreateProjectSubscription
>
export const onCreateUserCompany =
  /* GraphQL */ `subscription OnCreateUserCompany(
  $filter: ModelSubscriptionUserCompanyFilterInput
  $owner: String
) {
  onCreateUserCompany(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    id
    owner
    role
    updatedAt
    userId
    __typename
  }
}
` as GeneratedSubscription<
    APITypes.OnCreateUserCompanySubscriptionVariables,
    APITypes.OnCreateUserCompanySubscription
  >
export const onDeleteCompany = /* GraphQL */ `subscription OnDeleteCompany(
  $filter: ModelSubscriptionCompanyFilterInput
  $owner: String
) {
  onDeleteCompany(filter: $filter, owner: $owner) {
    createdAt
    description
    id
    name
    owner
    projects {
      nextToken
      __typename
    }
    updatedAt
    users {
      nextToken
      __typename
    }
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteCompanySubscriptionVariables,
  APITypes.OnDeleteCompanySubscription
>
export const onDeleteDocument = /* GraphQL */ `subscription OnDeleteDocument(
  $filter: ModelSubscriptionDocumentFilterInput
  $owner: String
) {
  onDeleteDocument(filter: $filter, owner: $owner) {
    content
    createdAt
    id
    mimeType
    name
    owner
    project {
      companyId
      createdAt
      description
      id
      name
      owner
      slug
      updatedAt
      __typename
    }
    projectId
    s3Key
    s3Url
    size
    status
    tags
    thumbnailS3Key
    thumbnailUrl
    type
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteDocumentSubscriptionVariables,
  APITypes.OnDeleteDocumentSubscription
>
export const onDeleteProject = /* GraphQL */ `subscription OnDeleteProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onDeleteProject(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    description
    documents {
      nextToken
      __typename
    }
    id
    name
    owner
    slug
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteProjectSubscriptionVariables,
  APITypes.OnDeleteProjectSubscription
>
export const onDeleteUserCompany =
  /* GraphQL */ `subscription OnDeleteUserCompany(
  $filter: ModelSubscriptionUserCompanyFilterInput
  $owner: String
) {
  onDeleteUserCompany(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    id
    owner
    role
    updatedAt
    userId
    __typename
  }
}
` as GeneratedSubscription<
    APITypes.OnDeleteUserCompanySubscriptionVariables,
    APITypes.OnDeleteUserCompanySubscription
  >
export const onUpdateCompany = /* GraphQL */ `subscription OnUpdateCompany(
  $filter: ModelSubscriptionCompanyFilterInput
  $owner: String
) {
  onUpdateCompany(filter: $filter, owner: $owner) {
    createdAt
    description
    id
    name
    owner
    projects {
      nextToken
      __typename
    }
    updatedAt
    users {
      nextToken
      __typename
    }
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateCompanySubscriptionVariables,
  APITypes.OnUpdateCompanySubscription
>
export const onUpdateDocument = /* GraphQL */ `subscription OnUpdateDocument(
  $filter: ModelSubscriptionDocumentFilterInput
  $owner: String
) {
  onUpdateDocument(filter: $filter, owner: $owner) {
    content
    createdAt
    id
    mimeType
    name
    owner
    project {
      companyId
      createdAt
      description
      id
      name
      owner
      slug
      updatedAt
      __typename
    }
    projectId
    s3Key
    s3Url
    size
    status
    tags
    thumbnailS3Key
    thumbnailUrl
    type
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateDocumentSubscriptionVariables,
  APITypes.OnUpdateDocumentSubscription
>
export const onUpdateProject = /* GraphQL */ `subscription OnUpdateProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onUpdateProject(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    description
    documents {
      nextToken
      __typename
    }
    id
    name
    owner
    slug
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateProjectSubscriptionVariables,
  APITypes.OnUpdateProjectSubscription
>
export const onUpdateUserCompany =
  /* GraphQL */ `subscription OnUpdateUserCompany(
  $filter: ModelSubscriptionUserCompanyFilterInput
  $owner: String
) {
  onUpdateUserCompany(filter: $filter, owner: $owner) {
    company {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    companyId
    createdAt
    id
    owner
    role
    updatedAt
    userId
    __typename
  }
}
` as GeneratedSubscription<
    APITypes.OnUpdateUserCompanySubscriptionVariables,
    APITypes.OnUpdateUserCompanySubscription
  >
