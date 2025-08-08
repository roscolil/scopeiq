#!/bin/bash

# AWS CLI Commands to Create DynamoDB Tables for ScopeIQ RBAC System
# Make sure you have AWS CLI configured with appropriate permissions

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "Creating DynamoDB tables for ScopeIQ RBAC system..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"

# 1. Create Company Table
echo "Creating Company table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-Company" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=Company

# 2. Create User Table
echo "Creating User table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-User" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=companyId,AttributeType=S \
    AttributeName=role,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "UsersByCompanyAndRole",
        "KeySchema": [
          {"AttributeName": "companyId", "KeyType": "HASH"},
          {"AttributeName": "role", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "UserByEmail",
        "KeySchema": [
          {"AttributeName": "email", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=User

# 3. Create UserProject Table
echo "Creating UserProject table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-UserProject" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=projectId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ProjectsByUser",
        "KeySchema": [
          {"AttributeName": "userId", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "UsersByProject",
        "KeySchema": [
          {"AttributeName": "projectId", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=UserProject

# 4. Create UserInvitation Table
echo "Creating UserInvitation table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-UserInvitation" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=companyId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "InvitationsByCompanyAndStatus",
        "KeySchema": [
          {"AttributeName": "companyId", "KeyType": "HASH"},
          {"AttributeName": "status", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "InvitationByEmail",
        "KeySchema": [
          {"AttributeName": "email", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=UserInvitation

# 5. Create InvitationProject Table
echo "Creating InvitationProject table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-InvitationProject" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=invitationId,AttributeType=S \
    AttributeName=projectId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ProjectsByInvitation",
        "KeySchema": [
          {"AttributeName": "invitationId", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "InvitationsByProject",
        "KeySchema": [
          {"AttributeName": "projectId", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=InvitationProject

# 6. Create Project Table
echo "Creating Project table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-Project" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=companyId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=name,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ProjectsByCompany",
        "KeySchema": [
          {"AttributeName": "companyId", "KeyType": "HASH"},
          {"AttributeName": "createdAt", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "ProjectsByCompanyAndName",
        "KeySchema": [
          {"AttributeName": "companyId", "KeyType": "HASH"},
          {"AttributeName": "name", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=Project

# 7. Create Document Table
echo "Creating Document table..."
aws dynamodb create-table \
  --table-name "${ENVIRONMENT}-scopeiq-Document" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=projectId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=name,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "DocumentsByProject",
        "KeySchema": [
          {"AttributeName": "projectId", "KeyType": "HASH"},
          {"AttributeName": "createdAt", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "DocumentsByProjectAndName",
        "KeySchema": [
          {"AttributeName": "projectId", "KeyType": "HASH"},
          {"AttributeName": "name", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "DocumentsByStatus",
        "KeySchema": [
          {"AttributeName": "status", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region $REGION \
  --tags \
    Key=Environment,Value=$ENVIRONMENT \
    Key=Application,Value=ScopeIQ \
    Key=TableType,Value=Document

echo "Waiting for tables to become active..."

# Wait for all tables to become active
TABLES=(
  "${ENVIRONMENT}-scopeiq-Company"
  "${ENVIRONMENT}-scopeiq-User"
  "${ENVIRONMENT}-scopeiq-UserProject"
  "${ENVIRONMENT}-scopeiq-UserInvitation"
  "${ENVIRONMENT}-scopeiq-InvitationProject"
  "${ENVIRONMENT}-scopeiq-Project"
  "${ENVIRONMENT}-scopeiq-Document"
)

for table in "${TABLES[@]}"; do
  echo "Waiting for $table to become active..."
  aws dynamodb wait table-exists --table-name "$table" --region $REGION
  echo "$table is now active"
done

# Enable Point-in-Time Recovery for critical tables
echo "Enabling Point-in-Time Recovery for critical tables..."
CRITICAL_TABLES=(
  "${ENVIRONMENT}-scopeiq-Company"
  "${ENVIRONMENT}-scopeiq-User"
  "${ENVIRONMENT}-scopeiq-Project"
  "${ENVIRONMENT}-scopeiq-Document"
)

for table in "${CRITICAL_TABLES[@]}"; do
  echo "Enabling Point-in-Time Recovery for $table..."
  aws dynamodb update-continuous-backups \
    --table-name "$table" \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
    --region $REGION
done

echo "✅ All DynamoDB tables created successfully!"
echo ""
echo "📋 Created tables:"
for table in "${TABLES[@]}"; do
  echo "  - $table"
done

echo ""
echo "🔧 Next steps:"
echo "1. Update your Amplify configuration to use these table names"
echo "2. Configure IAM permissions for your application"
echo "3. Test the RBAC system with your application"
echo ""
echo "💡 Tip: You can list all tables with:"
echo "aws dynamodb list-tables --region $REGION"
