/* tslint:disable */

// this is an auto generated file. This will be overwritten

import * as APITypes from './API'
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType
  __generatedMutationOutput: OutputType
}

export const createCompany = /* GraphQL */ `mutation CreateCompany(
  $condition: ModelCompanyConditionInput
  $input: CreateCompanyInput!
) {
  createCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateCompanyMutationVariables,
  APITypes.CreateCompanyMutation
>
export const createDocument = /* GraphQL */ `mutation CreateDocument(
  $condition: ModelDocumentConditionInput
  $input: CreateDocumentInput!
) {
  createDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateDocumentMutationVariables,
  APITypes.CreateDocumentMutation
>
export const createProject = /* GraphQL */ `mutation CreateProject(
  $condition: ModelProjectConditionInput
  $input: CreateProjectInput!
) {
  createProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProjectMutationVariables,
  APITypes.CreateProjectMutation
>
export const createUserCompany = /* GraphQL */ `mutation CreateUserCompany(
  $condition: ModelUserCompanyConditionInput
  $input: CreateUserCompanyInput!
) {
  createUserCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateUserCompanyMutationVariables,
  APITypes.CreateUserCompanyMutation
>
export const deleteCompany = /* GraphQL */ `mutation DeleteCompany(
  $condition: ModelCompanyConditionInput
  $input: DeleteCompanyInput!
) {
  deleteCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteCompanyMutationVariables,
  APITypes.DeleteCompanyMutation
>
export const deleteDocument = /* GraphQL */ `mutation DeleteDocument(
  $condition: ModelDocumentConditionInput
  $input: DeleteDocumentInput!
) {
  deleteDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteDocumentMutationVariables,
  APITypes.DeleteDocumentMutation
>
export const deleteProject = /* GraphQL */ `mutation DeleteProject(
  $condition: ModelProjectConditionInput
  $input: DeleteProjectInput!
) {
  deleteProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProjectMutationVariables,
  APITypes.DeleteProjectMutation
>
export const deleteUserCompany = /* GraphQL */ `mutation DeleteUserCompany(
  $condition: ModelUserCompanyConditionInput
  $input: DeleteUserCompanyInput!
) {
  deleteUserCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteUserCompanyMutationVariables,
  APITypes.DeleteUserCompanyMutation
>
export const updateCompany = /* GraphQL */ `mutation UpdateCompany(
  $condition: ModelCompanyConditionInput
  $input: UpdateCompanyInput!
) {
  updateCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateCompanyMutationVariables,
  APITypes.UpdateCompanyMutation
>
export const updateDocument = /* GraphQL */ `mutation UpdateDocument(
  $condition: ModelDocumentConditionInput
  $input: UpdateDocumentInput!
) {
  updateDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateDocumentMutationVariables,
  APITypes.UpdateDocumentMutation
>
export const updateProject = /* GraphQL */ `mutation UpdateProject(
  $condition: ModelProjectConditionInput
  $input: UpdateProjectInput!
) {
  updateProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProjectMutationVariables,
  APITypes.UpdateProjectMutation
>
export const updateUserCompany = /* GraphQL */ `mutation UpdateUserCompany(
  $condition: ModelUserCompanyConditionInput
  $input: UpdateUserCompanyInput!
) {
  updateUserCompany(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateUserCompanyMutationVariables,
  APITypes.UpdateUserCompanyMutation
>
