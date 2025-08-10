# DynamoDB Schema for ScopeIQ RBAC System

This document provides the DynamoDB table schemas for the ScopeIQ RBAC (Role-Based Access Control) system.

## Table Schemas

### 1. Company Table

```json
{
  "TableName": "Company",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 2. User Table

```json
{
  "TableName": "User",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "companyId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "role",
      "AttributeType": "S"
    },
    {
      "AttributeName": "email",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "UsersByCompanyAndRole",
      "KeySchema": [
        {
          "AttributeName": "companyId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "role",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "UserByEmail",
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 3. UserProject Table (Junction Table)

```json
{
  "TableName": "UserProject",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "projectId",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "ProjectsByUser",
      "KeySchema": [
        {
          "AttributeName": "userId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "UsersByProject",
      "KeySchema": [
        {
          "AttributeName": "projectId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

### 4. UserInvitation Table

```json
{
  "TableName": "UserInvitation",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "companyId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "status",
      "AttributeType": "S"
    },
    {
      "AttributeName": "email",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "InvitationsByCompanyAndStatus",
      "KeySchema": [
        {
          "AttributeName": "companyId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "status",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "InvitationByEmail",
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

### 5. InvitationProject Table (Junction Table)

```json
{
  "TableName": "InvitationProject",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "invitationId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "projectId",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "ProjectsByInvitation",
      "KeySchema": [
        {
          "AttributeName": "invitationId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "InvitationsByProject",
      "KeySchema": [
        {
          "AttributeName": "projectId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

### 6. Project Table (Enhanced)

```json
{
  "TableName": "Project",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "companyId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "createdAt",
      "AttributeType": "S"
    },
    {
      "AttributeName": "name",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "ProjectsByCompany",
      "KeySchema": [
        {
          "AttributeName": "companyId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "createdAt",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "ProjectsByCompanyAndName",
      "KeySchema": [
        {
          "AttributeName": "companyId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "name",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 7. Document Table (Enhanced)

```json
{
  "TableName": "Document",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "projectId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "createdAt",
      "AttributeType": "S"
    },
    {
      "AttributeName": "name",
      "AttributeType": "S"
    },
    {
      "AttributeName": "status",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "DocumentsByProject",
      "KeySchema": [
        {
          "AttributeName": "projectId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "createdAt",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "DocumentsByProjectAndName",
      "KeySchema": [
        {
          "AttributeName": "projectId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "name",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "DocumentsByStatus",
      "KeySchema": [
        {
          "AttributeName": "status",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

## Table Relationships

```
Company (1) ——————— (*) User
Company (1) ——————— (*) Project
Company (1) ——————— (*) UserInvitation

User (*) ——————— (*) Project (via UserProject)
UserInvitation (*) ——————— (*) Project (via InvitationProject)

Project (1) ——————— (*) Document
User (1) ——————— (*) UserInvitation (as inviter)
```

## Sample Data Structure

### User Record

```json
{
  "id": "user_123",
  "email": "admin@company.com",
  "name": "Admin User",
  "role": "Admin",
  "companyId": "company_456",
  "isActive": true,
  "lastLoginAt": "2024-08-07T10:30:00Z",
  "createdAt": "2024-01-15T08:00:00Z",
  "updatedAt": "2024-08-07T10:30:00Z",
  "owner": "cognito_user_id_123"
}
```

### UserProject Record

```json
{
  "id": "userproject_789",
  "userId": "user_123",
  "projectId": "project_456",
  "createdAt": "2024-02-01T10:00:00Z",
  "owner": "cognito_user_id_123"
}
```

### UserInvitation Record

```json
{
  "id": "invitation_101",
  "email": "newuser@company.com",
  "role": "User",
  "companyId": "company_456",
  "invitedBy": "user_123",
  "expiresAt": "2024-08-14T23:59:59Z",
  "status": "pending",
  "createdAt": "2024-08-07T12:00:00Z",
  "owner": "cognito_user_id_123"
}
```

## Performance Considerations

1. **Query Patterns**: GSIs support efficient queries by company, role, status, and email
2. **Scaling**: PAY_PER_REQUEST billing mode automatically scales with usage
3. **Streams**: Enabled for real-time processing and audit logging
4. **Point-in-Time Recovery**: Enabled for critical tables (Company, User, Project, Document)
5. **Indexes**: Carefully designed to support common access patterns without over-indexing

## Security Notes

1. **Row-Level Security**: Implemented via Cognito User Pool ownership
2. **Attribute-Based Access**: Role-based permissions control field-level access
3. **Cross-Table Relationships**: Foreign key relationships maintained at application level
4. **Audit Trail**: DynamoDB Streams capture all changes for compliance
