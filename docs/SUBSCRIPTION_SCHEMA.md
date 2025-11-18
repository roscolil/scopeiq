# Subscription & Billing Database Schema

## Overview

This document outlines the database schema changes required to support subscription billing and payment processing.

## New DynamoDB Tables

### 1. Subscription Table

```json
{
  "TableName": "Subscription",
  "AttributeDefinitions": [
    { "AttributeName": "id", "AttributeType": "S" },
    { "AttributeName": "companyId", "AttributeType": "S" },
    { "AttributeName": "stripeCustomerId", "AttributeType": "S" },
    { "AttributeName": "status", "AttributeType": "S" }
  ],
  "KeySchema": [{ "AttributeName": "id", "KeyType": "HASH" }],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "SubscriptionsByCompany",
      "KeySchema": [{ "AttributeName": "companyId", "KeyType": "HASH" }],
      "Projection": { "ProjectionType": "ALL" }
    },
    {
      "IndexName": "SubscriptionsByStripeCustomer",
      "KeySchema": [{ "AttributeName": "stripeCustomerId", "KeyType": "HASH" }],
      "Projection": { "ProjectionType": "ALL" }
    },
    {
      "IndexName": "SubscriptionsByStatus",
      "KeySchema": [{ "AttributeName": "status", "KeyType": "HASH" }],
      "Projection": { "ProjectionType": "ALL" }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

**Fields:**

- `id` (String, PK): Unique subscription ID
- `companyId` (String, GSI): Reference to Company table
- `stripeCustomerId` (String, GSI): Stripe customer ID
- `stripeSubscriptionId` (String): Stripe subscription ID
- `stripePriceId` (String): Stripe price ID
- `tier` (String): 'starter' | 'professional' | 'enterprise'
- `status` (String, GSI): 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
- `billingCycle` (String): 'monthly' | 'yearly'
- `currentPeriodStart` (String): ISO timestamp
- `currentPeriodEnd` (String): ISO timestamp
- `trialStart` (String): ISO timestamp
- `trialEnd` (String): ISO timestamp
- `cancelAtPeriodEnd` (Boolean): Whether subscription cancels at end
- `canceledAt` (String): ISO timestamp when canceled
- `createdAt` (String): ISO timestamp
- `updatedAt` (String): ISO timestamp

### 2. Payment Table (Transaction History)

```json
{
  "TableName": "Payment",
  "AttributeDefinitions": [
    { "AttributeName": "id", "AttributeType": "S" },
    { "AttributeName": "companyId", "AttributeType": "S" },
    { "AttributeName": "subscriptionId", "AttributeType": "S" },
    { "AttributeName": "createdAt", "AttributeType": "S" }
  ],
  "KeySchema": [{ "AttributeName": "id", "KeyType": "HASH" }],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "PaymentsByCompany",
      "KeySchema": [
        { "AttributeName": "companyId", "KeyType": "HASH" },
        { "AttributeName": "createdAt", "KeyType": "RANGE" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    },
    {
      "IndexName": "PaymentsBySubscription",
      "KeySchema": [
        { "AttributeName": "subscriptionId", "KeyType": "HASH" },
        { "AttributeName": "createdAt", "KeyType": "RANGE" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Fields:**

- `id` (String, PK): Unique payment ID
- `companyId` (String, GSI): Reference to Company table
- `subscriptionId` (String, GSI): Reference to Subscription table
- `stripeInvoiceId` (String): Stripe invoice ID
- `stripePaymentIntentId` (String): Stripe payment intent ID
- `amount` (Number): Amount in cents
- `currency` (String): 'usd', 'aud', etc.
- `status` (String): 'succeeded' | 'pending' | 'failed'
- `description` (String): Payment description
- `invoiceUrl` (String): URL to Stripe hosted invoice
- `receiptUrl` (String): URL to receipt
- `createdAt` (String, GSI): ISO timestamp
- `paidAt` (String): ISO timestamp when paid

### 3. UsageMetrics Table (For Tracking Limits)

```json
{
  "TableName": "UsageMetrics",
  "AttributeDefinitions": [
    { "AttributeName": "id", "AttributeType": "S" },
    { "AttributeName": "companyId", "AttributeType": "S" },
    { "AttributeName": "month", "AttributeType": "S" }
  ],
  "KeySchema": [{ "AttributeName": "id", "KeyType": "HASH" }],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "UsageByCompanyAndMonth",
      "KeySchema": [
        { "AttributeName": "companyId", "KeyType": "HASH" },
        { "AttributeName": "month", "KeyType": "RANGE" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Fields:**

- `id` (String, PK): Unique metrics ID
- `companyId` (String, GSI): Reference to Company table
- `month` (String, GSI): YYYY-MM format
- `projectCount` (Number): Total projects created
- `documentCount` (Number): Total documents uploaded
- `storageUsedBytes` (Number): Total storage used
- `aiQueriesCount` (Number): AI queries made
- `updatedAt` (String): ISO timestamp

## Updates to Existing Tables

### Company Table - Add Subscription Fields

```typescript
{
  // Existing fields...
  subscriptionId?: string;        // Reference to current subscription
  stripeCustomerId?: string;      // Stripe customer ID
  billingEmail?: string;          // Billing contact email
  taxId?: string;                 // Tax ID for invoicing

  // Trial tracking
  trialStartedAt?: string;        // When trial started
  trialEndsAt?: string;           // When trial ends
  hasUsedTrial?: boolean;         // Whether company has used free trial
}
```

## Amplify Data Schema Updates

Add to `amplify/data/resource.ts`:

```typescript
const schema = a.schema({
  // ... existing models

  Subscription: a
    .model({
      companyId: a.id().required(),
      stripeCustomerId: a.string(),
      stripeSubscriptionId: a.string(),
      stripePriceId: a.string(),
      tier: a.enum(['starter', 'professional', 'enterprise']),
      status: a.enum(['active', 'trialing', 'past_due', 'canceled', 'unpaid']),
      billingCycle: a.enum(['monthly', 'yearly']),
      currentPeriodStart: a.datetime(),
      currentPeriodEnd: a.datetime(),
      trialStart: a.datetime(),
      trialEnd: a.datetime(),
      cancelAtPeriodEnd: a.boolean().default(false),
      canceledAt: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),

      // Relations
      company: a.belongsTo('Company', 'companyId'),
      payments: a.hasMany('Payment', 'subscriptionId'),
    })
    .authorization(allow => [
      allow.authenticated('userPools').to(['read']),
      allow.groups(['Admin', 'Owner'], 'userPools').to(['read', 'update']),
    ])
    .secondaryIndexes(index => [
      index('companyId')
        .sortKeys(['createdAt'])
        .queryField('subscriptionsByCompany'),
      index('stripeCustomerId').queryField('subscriptionsByStripeCustomer'),
      index('status').queryField('subscriptionsByStatus'),
    ]),

  Payment: a
    .model({
      companyId: a.id().required(),
      subscriptionId: a.id().required(),
      stripeInvoiceId: a.string(),
      stripePaymentIntentId: a.string(),
      amount: a.integer().required(),
      currency: a.string().default('usd'),
      status: a.enum(['succeeded', 'pending', 'failed']),
      description: a.string(),
      invoiceUrl: a.string(),
      receiptUrl: a.string(),
      createdAt: a.datetime(),
      paidAt: a.datetime(),

      // Relations
      company: a.belongsTo('Company', 'companyId'),
      subscription: a.belongsTo('Subscription', 'subscriptionId'),
    })
    .authorization(allow => [
      allow.authenticated('userPools').to(['read']),
      allow.groups(['Admin', 'Owner'], 'userPools').to(['read']),
    ])
    .secondaryIndexes(index => [
      index('companyId')
        .sortKeys(['createdAt'])
        .queryField('paymentsByCompany'),
      index('subscriptionId')
        .sortKeys(['createdAt'])
        .queryField('paymentsBySubscription'),
    ]),

  UsageMetrics: a
    .model({
      companyId: a.id().required(),
      month: a.string().required(), // YYYY-MM format
      projectCount: a.integer().default(0),
      documentCount: a.integer().default(0),
      storageUsedBytes: a.integer().default(0),
      aiQueriesCount: a.integer().default(0),
      updatedAt: a.datetime(),

      // Relations
      company: a.belongsTo('Company', 'companyId'),
    })
    .authorization(allow => [
      allow.authenticated('userPools').to(['read']),
      allow.groups(['Admin', 'Owner'], 'userPools').to(['read', 'update']),
    ])
    .secondaryIndexes(index => [
      index('companyId')
        .sortKeys(['month'])
        .queryField('usageByCompanyAndMonth'),
    ]),
})
```

## Migration Strategy

1. **Deploy Schema Changes**: Update Amplify data resource and deploy
2. **Backfill Existing Companies**: Create default subscriptions for existing companies
3. **Update Application Code**: Implement subscription checks throughout app
4. **Testing**: Verify all subscription flows work correctly

## Indexes Rationale

- **SubscriptionsByCompany**: Fast lookups of company's subscription
- **SubscriptionsByStripeCustomer**: Webhook processing from Stripe
- **SubscriptionsByStatus**: Admin dashboard queries
- **PaymentsByCompany**: Billing history page
- **PaymentsBySubscription**: Invoice lookup
- **UsageByCompanyAndMonth**: Monthly usage reports
