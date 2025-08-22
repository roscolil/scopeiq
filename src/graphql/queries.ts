/* tslint:disable */

// this is an auto generated file. This will be overwritten

import * as APITypes from './API'
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType
  __generatedQueryOutput: OutputType
}

export const documentsByProject = /* GraphQL */ `query DocumentsByProject(
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelDocumentFilterInput
  $limit: Int
  $nextToken: String
  $projectId: ID!
  $sortDirection: ModelSortDirection
) {
  documentsByProject(
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    projectId: $projectId
    sortDirection: $sortDirection
  ) {
    items {
      content
      createdAt
      id
      mimeType
      name
      owner
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.DocumentsByProjectQueryVariables,
  APITypes.DocumentsByProjectQuery
>
export const documentsByProjectAndName =
  /* GraphQL */ `query DocumentsByProjectAndName(
  $filter: ModelDocumentFilterInput
  $limit: Int
  $name: ModelStringKeyConditionInput
  $nextToken: String
  $projectId: ID!
  $sortDirection: ModelSortDirection
) {
  documentsByProjectAndName(
    filter: $filter
    limit: $limit
    name: $name
    nextToken: $nextToken
    projectId: $projectId
    sortDirection: $sortDirection
  ) {
    items {
      content
      createdAt
      id
      mimeType
      name
      owner
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.DocumentsByProjectAndNameQueryVariables,
    APITypes.DocumentsByProjectAndNameQuery
  >
export const documentsByStatus = /* GraphQL */ `query DocumentsByStatus(
  $filter: ModelDocumentFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $status: DocumentStatus!
) {
  documentsByStatus(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    status: $status
  ) {
    items {
      content
      createdAt
      id
      mimeType
      name
      owner
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.DocumentsByStatusQueryVariables,
  APITypes.DocumentsByStatusQuery
>
export const getCompany = /* GraphQL */ `query GetCompany($id: ID!) {
  getCompany(id: $id) {
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
` as GeneratedQuery<APITypes.GetCompanyQueryVariables, APITypes.GetCompanyQuery>
export const getDocument = /* GraphQL */ `query GetDocument($id: ID!) {
  getDocument(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetDocumentQueryVariables,
  APITypes.GetDocumentQuery
>
export const getProject = /* GraphQL */ `query GetProject($id: ID!) {
  getProject(id: $id) {
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
` as GeneratedQuery<APITypes.GetProjectQueryVariables, APITypes.GetProjectQuery>
export const getUserCompany = /* GraphQL */ `query GetUserCompany($id: ID!) {
  getUserCompany(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetUserCompanyQueryVariables,
  APITypes.GetUserCompanyQuery
>
export const listCompanies = /* GraphQL */ `query ListCompanies(
  $filter: ModelCompanyFilterInput
  $limit: Int
  $nextToken: String
) {
  listCompanies(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      description
      id
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListCompaniesQueryVariables,
  APITypes.ListCompaniesQuery
>
export const listDocuments = /* GraphQL */ `query ListDocuments(
  $filter: ModelDocumentFilterInput
  $limit: Int
  $nextToken: String
) {
  listDocuments(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      content
      createdAt
      id
      mimeType
      name
      owner
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentsQueryVariables,
  APITypes.ListDocumentsQuery
>
export const listProjects = /* GraphQL */ `query ListProjects(
  $filter: ModelProjectFilterInput
  $limit: Int
  $nextToken: String
) {
  listProjects(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProjectsQueryVariables,
  APITypes.ListProjectsQuery
>
export const listUserCompanies = /* GraphQL */ `query ListUserCompanies(
  $filter: ModelUserCompanyFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserCompanies(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      companyId
      createdAt
      id
      owner
      role
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserCompaniesQueryVariables,
  APITypes.ListUserCompaniesQuery
>
export const projectsByCompany = /* GraphQL */ `query ProjectsByCompany(
  $companyId: ID!
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelProjectFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  projectsByCompany(
    companyId: $companyId
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ProjectsByCompanyQueryVariables,
  APITypes.ProjectsByCompanyQuery
>
export const projectsByCompanyAndName =
  /* GraphQL */ `query ProjectsByCompanyAndName(
  $companyId: ID!
  $filter: ModelProjectFilterInput
  $limit: Int
  $name: ModelStringKeyConditionInput
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  projectsByCompanyAndName(
    companyId: $companyId
    filter: $filter
    limit: $limit
    name: $name
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
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
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ProjectsByCompanyAndNameQueryVariables,
    APITypes.ProjectsByCompanyAndNameQuery
  >
