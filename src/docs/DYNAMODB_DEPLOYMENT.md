# DynamoDB Deployment Guide for ScopeIQ RBAC

## Quick Start

### Option 1: AWS CloudFormation (Recommended)

Deploy using CloudFormation for infrastructure as code:

```bash
# Deploy to dev environment
aws cloudformation create-stack \
  --stack-name scopeiq-dynamodb-dev \
  --template-body file://cloudformation-dynamodb.yml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --region us-east-1

# Deploy to production
aws cloudformation create-stack \
  --stack-name scopeiq-dynamodb-prod \
  --template-body file://cloudformation-dynamodb.yml \
  --parameters ParameterKey=Environment,ParameterValue=prod \
  --region us-east-1
```

### Option 2: Direct AWS CLI

Use the provided script for direct table creation:

```bash
# Create tables in dev environment
./create-dynamodb-tables.sh dev us-east-1

# Create tables in prod environment
./create-dynamodb-tables.sh prod us-east-1
```

### Option 3: Amplify CLI (Existing Setup)

Your current setup uses Amplify which will create these tables automatically:

```bash
# Deploy your existing Amplify backend
npx amplify push
```

## Table Names

Tables will be created with environment prefixes:

- `{env}-scopeiq-Company`
- `{env}-scopeiq-User`
- `{env}-scopeiq-UserProject`
- `{env}-scopeiq-UserInvitation`
- `{env}-scopeiq-InvitationProject`
- `{env}-scopeiq-Project`
- `{env}-scopeiq-Document`

## Configuration

### For AWS CLI/CloudFormation

Update your application configuration:

```typescript
// aws-config.ts
export const dynamoConfig = {
  region: 'us-east-1',
  tables: {
    company: `${process.env.ENVIRONMENT}-scopeiq-Company`,
    user: `${process.env.ENVIRONMENT}-scopeiq-User`,
    userProject: `${process.env.ENVIRONMENT}-scopeiq-UserProject`,
    userInvitation: `${process.env.ENVIRONMENT}-scopeiq-UserInvitation`,
    invitationProject: `${process.env.ENVIRONMENT}-scopeiq-InvitationProject`,
    project: `${process.env.ENVIRONMENT}-scopeiq-Project`,
    document: `${process.env.ENVIRONMENT}-scopeiq-Document`,
  },
}
```

### For Amplify CLI

Tables will use Amplify's naming convention automatically.

## IAM Permissions

Your application will need these DynamoDB permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/*-scopeiq-*",
        "arn:aws:dynamodb:*:*:table/*-scopeiq-*/index/*"
      ]
    }
  ]
}
```

## Verification

After deployment, verify tables exist:

```bash
# List all DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Describe a specific table
aws dynamodb describe-table --table-name dev-scopeiq-User --region us-east-1
```

## Cost Optimization

- All tables use **PAY_PER_REQUEST** billing mode
- No provisioned capacity costs
- You only pay for actual read/write operations
- Point-in-Time Recovery is enabled for critical tables (additional cost)

## Monitoring

Enable CloudWatch monitoring:

```bash
# Enable enhanced monitoring
aws logs create-log-group --log-group-name /aws/dynamodb/scopeiq

# Set up alarms for throttling
aws cloudwatch put-metric-alarm \
  --alarm-name "DynamoDB-UserTable-ReadThrottles" \
  --alarm-description "DynamoDB Read Throttles" \
  --metric-name ReadThrottles \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold
```

## Backup Strategy

- **Point-in-Time Recovery**: Enabled for Company, User, Project, Document tables
- **Retention**: 35 days by default
- **On-Demand Backups**: Consider weekly backups for compliance

```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name dev-scopeiq-User \
  --backup-name user-table-backup-$(date +%Y-%m-%d)
```

## Migration from Existing Schema

If you have existing data, create a migration script:

```typescript
// migration.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(client)

// Migration logic here
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check IAM roles and policies
2. **Table Already Exists**: Use `--region` flag if deploying to different regions
3. **Throttling**: Monitor CloudWatch metrics and consider enabling auto-scaling

### Cleanup

To delete all tables (⚠️ **DESTRUCTIVE OPERATION**):

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name scopeiq-dynamodb-dev

# Or delete tables individually
aws dynamodb delete-table --table-name dev-scopeiq-Company
# ... repeat for all tables
```

## Next Steps

1. ✅ Deploy DynamoDB tables
2. ✅ Configure IAM permissions
3. ✅ Update application configuration
4. ✅ Switch from mock service to real service
5. ✅ Test RBAC functionality
6. ✅ Set up monitoring and backups
