/* tslint:disable */

//  This file was automatically generated and should not be edited.

export type ModelStringKeyConditionInput = {
  beginsWith?: string | null
  between?: Array<string | null> | null
  eq?: string | null
  ge?: string | null
  gt?: string | null
  le?: string | null
  lt?: string | null
}

export type ModelDocumentFilterInput = {
  and?: Array<ModelDocumentFilterInput | null> | null
  content?: ModelStringInput | null
  createdAt?: ModelStringInput | null
  id?: ModelIDInput | null
  mimeType?: ModelStringInput | null
  name?: ModelStringInput | null
  not?: ModelDocumentFilterInput | null
  or?: Array<ModelDocumentFilterInput | null> | null
  owner?: ModelStringInput | null
  projectId?: ModelIDInput | null
  s3Key?: ModelStringInput | null
  s3Url?: ModelStringInput | null
  size?: ModelIntInput | null
  status?: ModelDocumentStatusInput | null
  tags?: ModelStringInput | null
  thumbnailS3Key?: ModelStringInput | null
  thumbnailUrl?: ModelStringInput | null
  type?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type ModelStringInput = {
  attributeExists?: boolean | null
  attributeType?: ModelAttributeTypes | null
  beginsWith?: string | null
  between?: Array<string | null> | null
  contains?: string | null
  eq?: string | null
  ge?: string | null
  gt?: string | null
  le?: string | null
  lt?: string | null
  ne?: string | null
  notContains?: string | null
  size?: ModelSizeInput | null
}

export enum ModelAttributeTypes {
  _null = '_null',
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
}

export type ModelSizeInput = {
  between?: Array<number | null> | null
  eq?: number | null
  ge?: number | null
  gt?: number | null
  le?: number | null
  lt?: number | null
  ne?: number | null
}

export type ModelIDInput = {
  attributeExists?: boolean | null
  attributeType?: ModelAttributeTypes | null
  beginsWith?: string | null
  between?: Array<string | null> | null
  contains?: string | null
  eq?: string | null
  ge?: string | null
  gt?: string | null
  le?: string | null
  lt?: string | null
  ne?: string | null
  notContains?: string | null
  size?: ModelSizeInput | null
}

export type ModelIntInput = {
  attributeExists?: boolean | null
  attributeType?: ModelAttributeTypes | null
  between?: Array<number | null> | null
  eq?: number | null
  ge?: number | null
  gt?: number | null
  le?: number | null
  lt?: number | null
  ne?: number | null
}

export type ModelDocumentStatusInput = {
  eq?: DocumentStatus | null
  ne?: DocumentStatus | null
}

export enum DocumentStatus {
  failed = 'failed',
  processed = 'processed',
  processing = 'processing',
}

export enum ModelSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type ModelDocumentConnection = {
  __typename: 'ModelDocumentConnection'
  items: Array<Document | null>
  nextToken?: string | null
}

export type Document = {
  __typename: 'Document'
  content?: string | null
  createdAt?: string | null
  id: string
  mimeType?: string | null
  name: string
  owner?: string | null
  project?: Project | null
  projectId: string
  s3Key: string
  s3Url?: string | null
  size: number
  status?: DocumentStatus | null
  tags?: Array<string | null> | null
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  type: string
  updatedAt?: string | null
}

export type Project = {
  __typename: 'Project'
  company?: Company | null
  companyId: string
  createdAt?: string | null
  description?: string | null
  documents?: ModelDocumentConnection | null
  id: string
  name: string
  owner?: string | null
  slug?: string | null
  updatedAt?: string | null
}

export type Company = {
  __typename: 'Company'
  createdAt?: string | null
  description?: string | null
  id: string
  name: string
  owner?: string | null
  projects?: ModelProjectConnection | null
  updatedAt?: string | null
  users?: ModelUserCompanyConnection | null
}

export type ModelProjectConnection = {
  __typename: 'ModelProjectConnection'
  items: Array<Project | null>
  nextToken?: string | null
}

export type ModelUserCompanyConnection = {
  __typename: 'ModelUserCompanyConnection'
  items: Array<UserCompany | null>
  nextToken?: string | null
}

export type UserCompany = {
  __typename: 'UserCompany'
  company?: Company | null
  companyId: string
  createdAt: string
  id: string
  owner?: string | null
  role?: UserCompanyRole | null
  updatedAt: string
  userId: string
}

export enum UserCompanyRole {
  admin = 'admin',
  member = 'member',
  viewer = 'viewer',
}

export type ModelCompanyFilterInput = {
  and?: Array<ModelCompanyFilterInput | null> | null
  createdAt?: ModelStringInput | null
  description?: ModelStringInput | null
  id?: ModelIDInput | null
  name?: ModelStringInput | null
  not?: ModelCompanyFilterInput | null
  or?: Array<ModelCompanyFilterInput | null> | null
  owner?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type ModelCompanyConnection = {
  __typename: 'ModelCompanyConnection'
  items: Array<Company | null>
  nextToken?: string | null
}

export type ModelProjectFilterInput = {
  and?: Array<ModelProjectFilterInput | null> | null
  companyId?: ModelIDInput | null
  createdAt?: ModelStringInput | null
  description?: ModelStringInput | null
  id?: ModelIDInput | null
  name?: ModelStringInput | null
  not?: ModelProjectFilterInput | null
  or?: Array<ModelProjectFilterInput | null> | null
  owner?: ModelStringInput | null
  slug?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type ModelUserCompanyFilterInput = {
  and?: Array<ModelUserCompanyFilterInput | null> | null
  companyId?: ModelIDInput | null
  createdAt?: ModelStringInput | null
  id?: ModelIDInput | null
  not?: ModelUserCompanyFilterInput | null
  or?: Array<ModelUserCompanyFilterInput | null> | null
  owner?: ModelStringInput | null
  role?: ModelUserCompanyRoleInput | null
  updatedAt?: ModelStringInput | null
  userId?: ModelStringInput | null
}

export type ModelUserCompanyRoleInput = {
  eq?: UserCompanyRole | null
  ne?: UserCompanyRole | null
}

export type ModelCompanyConditionInput = {
  and?: Array<ModelCompanyConditionInput | null> | null
  createdAt?: ModelStringInput | null
  description?: ModelStringInput | null
  name?: ModelStringInput | null
  not?: ModelCompanyConditionInput | null
  or?: Array<ModelCompanyConditionInput | null> | null
  owner?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type CreateCompanyInput = {
  createdAt?: string | null
  description?: string | null
  id?: string | null
  name: string
  updatedAt?: string | null
}

export type ModelDocumentConditionInput = {
  and?: Array<ModelDocumentConditionInput | null> | null
  content?: ModelStringInput | null
  createdAt?: ModelStringInput | null
  mimeType?: ModelStringInput | null
  name?: ModelStringInput | null
  not?: ModelDocumentConditionInput | null
  or?: Array<ModelDocumentConditionInput | null> | null
  owner?: ModelStringInput | null
  projectId?: ModelIDInput | null
  s3Key?: ModelStringInput | null
  s3Url?: ModelStringInput | null
  size?: ModelIntInput | null
  status?: ModelDocumentStatusInput | null
  tags?: ModelStringInput | null
  thumbnailS3Key?: ModelStringInput | null
  thumbnailUrl?: ModelStringInput | null
  type?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type CreateDocumentInput = {
  content?: string | null
  createdAt?: string | null
  id?: string | null
  mimeType?: string | null
  name: string
  projectId: string
  s3Key: string
  s3Url?: string | null
  size: number
  status?: DocumentStatus | null
  tags?: Array<string | null> | null
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  type: string
  updatedAt?: string | null
}

export type ModelProjectConditionInput = {
  and?: Array<ModelProjectConditionInput | null> | null
  companyId?: ModelIDInput | null
  createdAt?: ModelStringInput | null
  description?: ModelStringInput | null
  name?: ModelStringInput | null
  not?: ModelProjectConditionInput | null
  or?: Array<ModelProjectConditionInput | null> | null
  owner?: ModelStringInput | null
  slug?: ModelStringInput | null
  updatedAt?: ModelStringInput | null
}

export type CreateProjectInput = {
  companyId: string
  createdAt?: string | null
  description?: string | null
  id?: string | null
  name: string
  slug?: string | null
  updatedAt?: string | null
}

export type ModelUserCompanyConditionInput = {
  and?: Array<ModelUserCompanyConditionInput | null> | null
  companyId?: ModelIDInput | null
  createdAt?: ModelStringInput | null
  not?: ModelUserCompanyConditionInput | null
  or?: Array<ModelUserCompanyConditionInput | null> | null
  owner?: ModelStringInput | null
  role?: ModelUserCompanyRoleInput | null
  updatedAt?: ModelStringInput | null
  userId?: ModelStringInput | null
}

export type CreateUserCompanyInput = {
  companyId: string
  id?: string | null
  role?: UserCompanyRole | null
  userId: string
}

export type DeleteCompanyInput = {
  id: string
}

export type DeleteDocumentInput = {
  id: string
}

export type DeleteProjectInput = {
  id: string
}

export type DeleteUserCompanyInput = {
  id: string
}

export type UpdateCompanyInput = {
  createdAt?: string | null
  description?: string | null
  id: string
  name?: string | null
  updatedAt?: string | null
}

export type UpdateDocumentInput = {
  content?: string | null
  createdAt?: string | null
  id: string
  mimeType?: string | null
  name?: string | null
  projectId?: string | null
  s3Key?: string | null
  s3Url?: string | null
  size?: number | null
  status?: DocumentStatus | null
  tags?: Array<string | null> | null
  thumbnailS3Key?: string | null
  thumbnailUrl?: string | null
  type?: string | null
  updatedAt?: string | null
}

export type UpdateProjectInput = {
  companyId?: string | null
  createdAt?: string | null
  description?: string | null
  id: string
  name?: string | null
  slug?: string | null
  updatedAt?: string | null
}

export type UpdateUserCompanyInput = {
  companyId?: string | null
  id: string
  role?: UserCompanyRole | null
  userId?: string | null
}

export type ModelSubscriptionCompanyFilterInput = {
  and?: Array<ModelSubscriptionCompanyFilterInput | null> | null
  createdAt?: ModelSubscriptionStringInput | null
  description?: ModelSubscriptionStringInput | null
  id?: ModelSubscriptionIDInput | null
  name?: ModelSubscriptionStringInput | null
  or?: Array<ModelSubscriptionCompanyFilterInput | null> | null
  owner?: ModelStringInput | null
  updatedAt?: ModelSubscriptionStringInput | null
}

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null
  between?: Array<string | null> | null
  contains?: string | null
  eq?: string | null
  ge?: string | null
  gt?: string | null
  in?: Array<string | null> | null
  le?: string | null
  lt?: string | null
  ne?: string | null
  notContains?: string | null
  notIn?: Array<string | null> | null
}

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null
  between?: Array<string | null> | null
  contains?: string | null
  eq?: string | null
  ge?: string | null
  gt?: string | null
  in?: Array<string | null> | null
  le?: string | null
  lt?: string | null
  ne?: string | null
  notContains?: string | null
  notIn?: Array<string | null> | null
}

export type ModelSubscriptionDocumentFilterInput = {
  and?: Array<ModelSubscriptionDocumentFilterInput | null> | null
  content?: ModelSubscriptionStringInput | null
  createdAt?: ModelSubscriptionStringInput | null
  id?: ModelSubscriptionIDInput | null
  mimeType?: ModelSubscriptionStringInput | null
  name?: ModelSubscriptionStringInput | null
  or?: Array<ModelSubscriptionDocumentFilterInput | null> | null
  owner?: ModelStringInput | null
  projectId?: ModelSubscriptionIDInput | null
  s3Key?: ModelSubscriptionStringInput | null
  s3Url?: ModelSubscriptionStringInput | null
  size?: ModelSubscriptionIntInput | null
  status?: ModelSubscriptionStringInput | null
  tags?: ModelSubscriptionStringInput | null
  thumbnailS3Key?: ModelSubscriptionStringInput | null
  thumbnailUrl?: ModelSubscriptionStringInput | null
  type?: ModelSubscriptionStringInput | null
  updatedAt?: ModelSubscriptionStringInput | null
}

export type ModelSubscriptionIntInput = {
  between?: Array<number | null> | null
  eq?: number | null
  ge?: number | null
  gt?: number | null
  in?: Array<number | null> | null
  le?: number | null
  lt?: number | null
  ne?: number | null
  notIn?: Array<number | null> | null
}

export type ModelSubscriptionProjectFilterInput = {
  and?: Array<ModelSubscriptionProjectFilterInput | null> | null
  companyId?: ModelSubscriptionIDInput | null
  createdAt?: ModelSubscriptionStringInput | null
  description?: ModelSubscriptionStringInput | null
  id?: ModelSubscriptionIDInput | null
  name?: ModelSubscriptionStringInput | null
  or?: Array<ModelSubscriptionProjectFilterInput | null> | null
  owner?: ModelStringInput | null
  slug?: ModelSubscriptionStringInput | null
  updatedAt?: ModelSubscriptionStringInput | null
}

export type ModelSubscriptionUserCompanyFilterInput = {
  and?: Array<ModelSubscriptionUserCompanyFilterInput | null> | null
  companyId?: ModelSubscriptionIDInput | null
  createdAt?: ModelSubscriptionStringInput | null
  id?: ModelSubscriptionIDInput | null
  or?: Array<ModelSubscriptionUserCompanyFilterInput | null> | null
  owner?: ModelStringInput | null
  role?: ModelSubscriptionStringInput | null
  updatedAt?: ModelSubscriptionStringInput | null
  userId?: ModelSubscriptionStringInput | null
}

export type DocumentsByProjectQueryVariables = {
  createdAt?: ModelStringKeyConditionInput | null
  filter?: ModelDocumentFilterInput | null
  limit?: number | null
  nextToken?: string | null
  projectId: string
  sortDirection?: ModelSortDirection | null
}

export type DocumentsByProjectQuery = {
  documentsByProject?: {
    __typename: 'ModelDocumentConnection'
    items: Array<{
      __typename: 'Document'
      content?: string | null
      createdAt?: string | null
      id: string
      mimeType?: string | null
      name: string
      owner?: string | null
      projectId: string
      s3Key: string
      s3Url?: string | null
      size: number
      status?: DocumentStatus | null
      tags?: Array<string | null> | null
      thumbnailS3Key?: string | null
      thumbnailUrl?: string | null
      type: string
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type DocumentsByProjectAndNameQueryVariables = {
  filter?: ModelDocumentFilterInput | null
  limit?: number | null
  name?: ModelStringKeyConditionInput | null
  nextToken?: string | null
  projectId: string
  sortDirection?: ModelSortDirection | null
}

export type DocumentsByProjectAndNameQuery = {
  documentsByProjectAndName?: {
    __typename: 'ModelDocumentConnection'
    items: Array<{
      __typename: 'Document'
      content?: string | null
      createdAt?: string | null
      id: string
      mimeType?: string | null
      name: string
      owner?: string | null
      projectId: string
      s3Key: string
      s3Url?: string | null
      size: number
      status?: DocumentStatus | null
      tags?: Array<string | null> | null
      thumbnailS3Key?: string | null
      thumbnailUrl?: string | null
      type: string
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type DocumentsByStatusQueryVariables = {
  filter?: ModelDocumentFilterInput | null
  limit?: number | null
  nextToken?: string | null
  sortDirection?: ModelSortDirection | null
  status: DocumentStatus
}

export type DocumentsByStatusQuery = {
  documentsByStatus?: {
    __typename: 'ModelDocumentConnection'
    items: Array<{
      __typename: 'Document'
      content?: string | null
      createdAt?: string | null
      id: string
      mimeType?: string | null
      name: string
      owner?: string | null
      projectId: string
      s3Key: string
      s3Url?: string | null
      size: number
      status?: DocumentStatus | null
      tags?: Array<string | null> | null
      thumbnailS3Key?: string | null
      thumbnailUrl?: string | null
      type: string
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type GetCompanyQueryVariables = {
  id: string
}

export type GetCompanyQuery = {
  getCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type GetDocumentQueryVariables = {
  id: string
}

export type GetDocumentQuery = {
  getDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type GetProjectQueryVariables = {
  id: string
}

export type GetProjectQuery = {
  getProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type GetUserCompanyQueryVariables = {
  id: string
}

export type GetUserCompanyQuery = {
  getUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type ListCompaniesQueryVariables = {
  filter?: ModelCompanyFilterInput | null
  limit?: number | null
  nextToken?: string | null
}

export type ListCompaniesQuery = {
  listCompanies?: {
    __typename: 'ModelCompanyConnection'
    items: Array<{
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type ListDocumentsQueryVariables = {
  filter?: ModelDocumentFilterInput | null
  limit?: number | null
  nextToken?: string | null
}

export type ListDocumentsQuery = {
  listDocuments?: {
    __typename: 'ModelDocumentConnection'
    items: Array<{
      __typename: 'Document'
      content?: string | null
      createdAt?: string | null
      id: string
      mimeType?: string | null
      name: string
      owner?: string | null
      projectId: string
      s3Key: string
      s3Url?: string | null
      size: number
      status?: DocumentStatus | null
      tags?: Array<string | null> | null
      thumbnailS3Key?: string | null
      thumbnailUrl?: string | null
      type: string
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type ListProjectsQueryVariables = {
  filter?: ModelProjectFilterInput | null
  limit?: number | null
  nextToken?: string | null
}

export type ListProjectsQuery = {
  listProjects?: {
    __typename: 'ModelProjectConnection'
    items: Array<{
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type ListUserCompaniesQueryVariables = {
  filter?: ModelUserCompanyFilterInput | null
  limit?: number | null
  nextToken?: string | null
}

export type ListUserCompaniesQuery = {
  listUserCompanies?: {
    __typename: 'ModelUserCompanyConnection'
    items: Array<{
      __typename: 'UserCompany'
      companyId: string
      createdAt: string
      id: string
      owner?: string | null
      role?: UserCompanyRole | null
      updatedAt: string
      userId: string
    } | null>
    nextToken?: string | null
  } | null
}

export type ProjectsByCompanyQueryVariables = {
  companyId: string
  createdAt?: ModelStringKeyConditionInput | null
  filter?: ModelProjectFilterInput | null
  limit?: number | null
  nextToken?: string | null
  sortDirection?: ModelSortDirection | null
}

export type ProjectsByCompanyQuery = {
  projectsByCompany?: {
    __typename: 'ModelProjectConnection'
    items: Array<{
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type ProjectsByCompanyAndNameQueryVariables = {
  companyId: string
  filter?: ModelProjectFilterInput | null
  limit?: number | null
  name?: ModelStringKeyConditionInput | null
  nextToken?: string | null
  sortDirection?: ModelSortDirection | null
}

export type ProjectsByCompanyAndNameQuery = {
  projectsByCompanyAndName?: {
    __typename: 'ModelProjectConnection'
    items: Array<{
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null>
    nextToken?: string | null
  } | null
}

export type CreateCompanyMutationVariables = {
  condition?: ModelCompanyConditionInput | null
  input: CreateCompanyInput
}

export type CreateCompanyMutation = {
  createCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type CreateDocumentMutationVariables = {
  condition?: ModelDocumentConditionInput | null
  input: CreateDocumentInput
}

export type CreateDocumentMutation = {
  createDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type CreateProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null
  input: CreateProjectInput
}

export type CreateProjectMutation = {
  createProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type CreateUserCompanyMutationVariables = {
  condition?: ModelUserCompanyConditionInput | null
  input: CreateUserCompanyInput
}

export type CreateUserCompanyMutation = {
  createUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type DeleteCompanyMutationVariables = {
  condition?: ModelCompanyConditionInput | null
  input: DeleteCompanyInput
}

export type DeleteCompanyMutation = {
  deleteCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type DeleteDocumentMutationVariables = {
  condition?: ModelDocumentConditionInput | null
  input: DeleteDocumentInput
}

export type DeleteDocumentMutation = {
  deleteDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type DeleteProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null
  input: DeleteProjectInput
}

export type DeleteProjectMutation = {
  deleteProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type DeleteUserCompanyMutationVariables = {
  condition?: ModelUserCompanyConditionInput | null
  input: DeleteUserCompanyInput
}

export type DeleteUserCompanyMutation = {
  deleteUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type UpdateCompanyMutationVariables = {
  condition?: ModelCompanyConditionInput | null
  input: UpdateCompanyInput
}

export type UpdateCompanyMutation = {
  updateCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type UpdateDocumentMutationVariables = {
  condition?: ModelDocumentConditionInput | null
  input: UpdateDocumentInput
}

export type UpdateDocumentMutation = {
  updateDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type UpdateProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null
  input: UpdateProjectInput
}

export type UpdateProjectMutation = {
  updateProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type UpdateUserCompanyMutationVariables = {
  condition?: ModelUserCompanyConditionInput | null
  input: UpdateUserCompanyInput
}

export type UpdateUserCompanyMutation = {
  updateUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type OnCreateCompanySubscriptionVariables = {
  filter?: ModelSubscriptionCompanyFilterInput | null
  owner?: string | null
}

export type OnCreateCompanySubscription = {
  onCreateCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type OnCreateDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFilterInput | null
  owner?: string | null
}

export type OnCreateDocumentSubscription = {
  onCreateDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type OnCreateProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null
  owner?: string | null
}

export type OnCreateProjectSubscription = {
  onCreateProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type OnCreateUserCompanySubscriptionVariables = {
  filter?: ModelSubscriptionUserCompanyFilterInput | null
  owner?: string | null
}

export type OnCreateUserCompanySubscription = {
  onCreateUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type OnDeleteCompanySubscriptionVariables = {
  filter?: ModelSubscriptionCompanyFilterInput | null
  owner?: string | null
}

export type OnDeleteCompanySubscription = {
  onDeleteCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type OnDeleteDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFilterInput | null
  owner?: string | null
}

export type OnDeleteDocumentSubscription = {
  onDeleteDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type OnDeleteProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null
  owner?: string | null
}

export type OnDeleteProjectSubscription = {
  onDeleteProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type OnDeleteUserCompanySubscriptionVariables = {
  filter?: ModelSubscriptionUserCompanyFilterInput | null
  owner?: string | null
}

export type OnDeleteUserCompanySubscription = {
  onDeleteUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}

export type OnUpdateCompanySubscriptionVariables = {
  filter?: ModelSubscriptionCompanyFilterInput | null
  owner?: string | null
}

export type OnUpdateCompanySubscription = {
  onUpdateCompany?: {
    __typename: 'Company'
    createdAt?: string | null
    description?: string | null
    id: string
    name: string
    owner?: string | null
    projects?: {
      __typename: 'ModelProjectConnection'
      nextToken?: string | null
    } | null
    updatedAt?: string | null
    users?: {
      __typename: 'ModelUserCompanyConnection'
      nextToken?: string | null
    } | null
  } | null
}

export type OnUpdateDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFilterInput | null
  owner?: string | null
}

export type OnUpdateDocumentSubscription = {
  onUpdateDocument?: {
    __typename: 'Document'
    content?: string | null
    createdAt?: string | null
    id: string
    mimeType?: string | null
    name: string
    owner?: string | null
    project?: {
      __typename: 'Project'
      companyId: string
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      slug?: string | null
      updatedAt?: string | null
    } | null
    projectId: string
    s3Key: string
    s3Url?: string | null
    size: number
    status?: DocumentStatus | null
    tags?: Array<string | null> | null
    thumbnailS3Key?: string | null
    thumbnailUrl?: string | null
    type: string
    updatedAt?: string | null
  } | null
}

export type OnUpdateProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null
  owner?: string | null
}

export type OnUpdateProjectSubscription = {
  onUpdateProject?: {
    __typename: 'Project'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt?: string | null
    description?: string | null
    documents?: {
      __typename: 'ModelDocumentConnection'
      nextToken?: string | null
    } | null
    id: string
    name: string
    owner?: string | null
    slug?: string | null
    updatedAt?: string | null
  } | null
}

export type OnUpdateUserCompanySubscriptionVariables = {
  filter?: ModelSubscriptionUserCompanyFilterInput | null
  owner?: string | null
}

export type OnUpdateUserCompanySubscription = {
  onUpdateUserCompany?: {
    __typename: 'UserCompany'
    company?: {
      __typename: 'Company'
      createdAt?: string | null
      description?: string | null
      id: string
      name: string
      owner?: string | null
      updatedAt?: string | null
    } | null
    companyId: string
    createdAt: string
    id: string
    owner?: string | null
    role?: UserCompanyRole | null
    updatedAt: string
    userId: string
  } | null
}
