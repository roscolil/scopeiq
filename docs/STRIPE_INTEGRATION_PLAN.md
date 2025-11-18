# Stripe Billing & Payments Integration Plan

## Overview

This document outlines the complete implementation plan for integrating Stripe billing and subscription management into Jack of All Trades (ScopeIQ). The integration will enable automated subscription billing, trial management, plan upgrades/downgrades, and a complete payment flow.

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Stripe Account & Product Setup](#phase-1-stripe-account--product-setup)
4. [Phase 2: Backend Infrastructure](#phase-2-backend-infrastructure)
5. [Phase 3: Frontend Integration](#phase-3-frontend-integration)
6. [Phase 4: Sales Funnel Implementation](#phase-4-sales-funnel-implementation)
7. [Phase 5: Subscription Management](#phase-5-subscription-management)
8. [Phase 6: Testing & Deployment](#phase-6-testing--deployment)
9. [Security Considerations](#security-considerations)
10. [Monitoring & Analytics](#monitoring--analytics)

---

## Prerequisites & Setup

### Required Stripe Products

- **Stripe Account** (Business account for production)
- **Stripe Test Mode** for development
- **Stripe CLI** for local webhook testing
- **Stripe Elements** for payment forms
- **Stripe Billing** for subscription management
- **Stripe Customer Portal** for self-service

### Required NPM Packages

```json
{
  "dependencies": {
    "stripe": "^14.0.0",
    "@stripe/stripe-js": "^2.4.0",
    "@stripe/react-stripe-js": "^2.4.0"
  }
}
```

### Environment Variables

```env
# Stripe Keys (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Keys (Production)
VITE_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_...
STRIPE_SECRET_KEY_PROD=sk_live_...
STRIPE_WEBHOOK_SECRET_PROD=whsec_...

# Stripe Product IDs (will be created in Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_...
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Pricing Page │  │ Checkout     │  │ Billing Dashboard    │  │
│  │              │  │ Flow         │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Stripe Elements / Checkout                     │
│              (Embedded or Hosted Payment Forms)                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Lambda Functions                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Create       │  │ Webhook      │  │ Subscription         │  │
│  │ Checkout     │  │ Handler      │  │ Manager              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Stripe API                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Customers    │  │ Subscriptions│  │ Invoices/Payments    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DynamoDB                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Subscription │  │ Payment      │  │ UsageMetrics         │  │
│  │ Table        │  │ Table        │  │ Table                │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Stripe Account & Product Setup

### 1.1 Create Stripe Products

**In Stripe Dashboard:**

1. Navigate to **Products** → **Add Product**
2. Create products for each tier:

#### Starter Plan

- **Name:** Jack of All Trades - Starter
- **Description:** Perfect for small teams getting started
- **Pricing:**
  - Monthly: $29 USD (Recurring)
  - Yearly: $278.40 USD (Recurring, 20% discount = $29 × 12 × 0.8)
- **Features Metadata:**
  ```json
  {
    "projects": "5",
    "documents_per_project": "100",
    "storage_gb": "1",
    "ai_features": "basic",
    "support": "email"
  }
  ```

#### Professional Plan

- **Name:** Jack of All Trades - Professional
- **Description:** Best for growing construction companies
- **Pricing:**
  - Monthly: $79 USD (Recurring)
  - Yearly: $758.40 USD (Recurring, 20% discount)
- **Features Metadata:**
  ```json
  {
    "projects": "25",
    "documents_per_project": "-1",
    "storage_gb": "10",
    "ai_features": "advanced",
    "support": "priority"
  }
  ```

#### Enterprise Plan

- **Name:** Jack of All Trades - Enterprise
- **Description:** Custom pricing for large organizations
- **Note:** Handle via sales team, not automated billing

### 1.2 Configure Stripe Settings

**Billing Settings:**

- Enable **Customer Portal**: Customers can manage subscriptions
- Enable **Invoices**: Automatic invoice generation
- Configure **Email Notifications**: Payment success, failures, receipts
- Set **Payment Methods**: Cards, ACH (US), BACS (UK), SEPA (EU)

**Tax Settings:**

- Enable **Stripe Tax** for automatic tax calculation
- Configure tax behavior based on business location

**Trial Period:**

- Set default trial period: 14 days
- Configure trial end behavior: Require payment method upfront

### 1.3 Create Stripe Webhook Endpoints

**Development:**

```bash
stripe listen --forward-to http://localhost:8080/api/webhooks/stripe
```

**Production:**

- Endpoint URL: `https://api.scopeiq.com/webhooks/stripe`
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `checkout.session.completed`

---

## Phase 2: Backend Infrastructure

### 2.1 Create Lambda Functions

#### `create-checkout-session` Lambda

**File:** `amplify/functions/create-checkout-session/handler.ts`

```typescript
import Stripe from 'stripe'
import { APIGatewayProxyHandler } from 'aws-lambda'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const { priceId, companyId, email, returnUrl } = JSON.parse(
      event.body || '{}',
    )

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    let customer
    if (customers.data.length > 0) {
      customer = customers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          companyId: companyId,
        },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          companyId: companyId,
        },
      },
      metadata: {
        companyId: companyId,
      },
    })

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' }),
    }
  }
}
```

#### `stripe-webhook-handler` Lambda

**File:** `amplify/functions/stripe-webhook-handler/handler.ts`

```typescript
import Stripe from 'stripe'
import { APIGatewayProxyHandler } from 'aws-lambda'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../data/resource'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const client = generateClient<Schema>({
  authMode: 'iam',
})

export const handler: APIGatewayProxyHandler = async event => {
  const sig = event.headers['stripe-signature']

  if (!sig) {
    return { statusCode: 400, body: 'No signature' }
  }

  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return { statusCode: 400, body: 'Invalid signature' }
  }

  console.log('Processing webhook event:', stripeEvent.type)

  try {
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(
          stripeEvent.data.object as Stripe.Subscription,
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          stripeEvent.data.object as Stripe.Subscription,
        )
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(stripeEvent.data.object as Stripe.Subscription)
        break

      default:
        console.log('Unhandled event type:', stripeEvent.type)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata.companyId

  if (!companyId) {
    console.error('No companyId in subscription metadata')
    return
  }

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id
  const tier = getPriceIdToTier(priceId)
  const billingCycle =
    subscription.items.data[0].price.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly'

  // Update or create subscription in DynamoDB
  const existingSubscriptions = await client.models.Subscription.list({
    filter: { companyId: { eq: companyId } },
  })

  if (existingSubscriptions.data.length > 0) {
    // Update existing
    await client.models.Subscription.update({
      id: existingSubscriptions.data[0].id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: tier,
      status: subscription.status,
      billingCycle: billingCycle,
      currentPeriodStart: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    })
  } else {
    // Create new
    await client.models.Subscription.create({
      companyId: companyId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: tier,
      status: subscription.status,
      billingCycle: billingCycle,
      currentPeriodStart: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  // Update Company table with subscription info
  await client.models.Company.update({
    id: companyId,
    stripeCustomerId: subscription.customer as string,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  // Mark subscription as canceled in DynamoDB
  const existingSubscriptions = await client.models.Subscription.list({
    filter: { companyId: { eq: companyId } },
  })

  if (existingSubscriptions.data.length > 0) {
    await client.models.Subscription.update({
      id: existingSubscriptions.data[0].id,
      status: 'canceled',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const companyId = invoice.subscription_details?.metadata?.companyId

  if (!companyId) return

  // Record payment in DynamoDB
  await client.models.Payment.create({
    companyId: companyId,
    subscriptionId: invoice.subscription as string,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    description: invoice.description || 'Subscription payment',
    invoiceUrl: invoice.hosted_invoice_url || '',
    receiptUrl: invoice.invoice_pdf || '',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  })

  // TODO: Send payment confirmation email
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const companyId = invoice.subscription_details?.metadata?.companyId

  if (!companyId) return

  // Record failed payment
  await client.models.Payment.create({
    companyId: companyId,
    subscriptionId: invoice.subscription as string,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    description: `Payment failed: ${invoice.description || 'Subscription payment'}`,
    createdAt: new Date().toISOString(),
  })

  // TODO: Send payment failed email
  // TODO: Implement dunning logic (retry attempts)
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  // TODO: Send trial ending notification email (3 days before trial ends)
  console.log(`Trial ending soon for company: ${companyId}`)
}

function getPriceIdToTier(
  priceId: string,
): 'starter' | 'professional' | 'enterprise' {
  // Map Stripe price IDs to tiers
  const priceMap: Record<string, 'starter' | 'professional' | 'enterprise'> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'starter',
    [process.env.STRIPE_PRICE_STARTER_YEARLY!]: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY!]: 'professional',
    [process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY!]: 'professional',
  }

  return priceMap[priceId] || 'starter'
}
```

#### `manage-subscription` Lambda

**File:** `amplify/functions/manage-subscription/handler.ts`

```typescript
import Stripe from 'stripe'
import { APIGatewayProxyHandler } from 'aws-lambda'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const { action, subscriptionId, priceId, companyId } = JSON.parse(
      event.body || '{}',
    )

    switch (action) {
      case 'cancel':
        return await cancelSubscription(subscriptionId)

      case 'reactivate':
        return await reactivateSubscription(subscriptionId)

      case 'upgrade':
      case 'downgrade':
        return await changeSubscriptionPlan(subscriptionId, priceId)

      case 'create-portal-session':
        return await createPortalSession(companyId)

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' }),
        }
    }
  } catch (error) {
    console.error('Error managing subscription:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage subscription' }),
    }
  }
}

async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      cancelAt: subscription.cancel_at,
    }),
  }
}

async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }
}

async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const updatedSubscription = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    },
  )

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      subscription: updatedSubscription,
    }),
  }
}

async function createPortalSession(companyId: string) {
  // Get Stripe customer ID from DynamoDB
  // Then create portal session

  const session = await stripe.billingPortal.sessions.create({
    customer: 'cus_xxx', // Get from DB
    return_url: `${process.env.APP_URL}/${companyId}/settings`,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  }
}
```

### 2.2 Update Amplify Backend Configuration

**File:** `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { createCheckoutSession } from './functions/create-checkout-session/resource'
import { stripeWebhookHandler } from './functions/stripe-webhook-handler/resource'
import { manageSubscription } from './functions/manage-subscription/resource'

export const backend = defineBackend({
  auth,
  data,
  storage,
  createCheckoutSession,
  stripeWebhookHandler,
  manageSubscription,
})
```

---

## Phase 3: Frontend Integration

### 3.1 Install Stripe Dependencies

```bash
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
```

### 3.2 Create Stripe Service

**File:** `src/services/subscription/stripe-service.ts`

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

export interface CheckoutSessionParams {
  priceId: string
  companyId: string
  email: string
  returnUrl: string
}

export const createCheckoutSession = async (params: CheckoutSessionParams) => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}

export const createCustomerPortalSession = async (companyId: string) => {
  const response = await fetch('/api/manage-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create-portal-session',
      companyId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create portal session')
  }

  return response.json()
}

export const cancelSubscription = async (subscriptionId: string) => {
  const response = await fetch('/api/manage-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'cancel',
      subscriptionId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to cancel subscription')
  }

  return response.json()
}

export const upgradeSubscription = async (
  subscriptionId: string,
  priceId: string,
) => {
  const response = await fetch('/api/manage-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'upgrade',
      subscriptionId,
      priceId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to upgrade subscription')
  }

  return response.json()
}
```

### 3.3 Create Subscription Service

**File:** `src/services/subscription/subscription-service.ts`

```typescript
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'

const client = generateClient<Schema>()

export interface Subscription {
  id: string
  companyId: string
  tier: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  billingCycle: 'monthly' | 'yearly'
  currentPeriodEnd: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
}

export const subscriptionService = {
  async getCompanySubscription(
    companyId: string,
  ): Promise<Subscription | null> {
    const { data, errors } = await client.models.Subscription.list({
      filter: { companyId: { eq: companyId } },
    })

    if (errors || !data || data.length === 0) {
      return null
    }

    return data[0] as unknown as Subscription
  },

  async isTrialing(companyId: string): Promise<boolean> {
    const subscription = await this.getCompanySubscription(companyId)
    return subscription?.status === 'trialing'
  },

  async isActive(companyId: string): Promise<boolean> {
    const subscription = await this.getCompanySubscription(companyId)
    return (
      subscription?.status === 'active' || subscription?.status === 'trialing'
    )
  },

  async getTrialDaysRemaining(companyId: string): Promise<number> {
    const subscription = await this.getCompanySubscription(companyId)

    if (!subscription?.trialEnd) {
      return 0
    }

    const trialEnd = new Date(subscription.trialEnd)
    const now = new Date()
    const daysRemaining = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    return Math.max(0, daysRemaining)
  },

  async getPaymentHistory(companyId: string) {
    const { data, errors } = await client.models.Payment.list({
      filter: { companyId: { eq: companyId } },
    })

    if (errors) {
      throw new Error('Failed to fetch payment history')
    }

    return data || []
  },
}
```

### 3.4 Update Pricing Page with Checkout

**File:** `src/pages/dashboard/Pricing.tsx` (updates)

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/aws-auth'
import {
  createCheckoutSession,
  getStripe,
} from '@/services/subscription/stripe-service'
import { toast } from '@/hooks/use-toast'

// ... existing code ...

const Pricing = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  )

  const priceIds = {
    starter: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY,
    },
    professional: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      yearly: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_YEARLY,
    },
  }

  const handleGetStarted = async (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href = 'mailto:sales@scopeiq.com'
      return
    }

    if (!user) {
      // Redirect to signup with plan parameter
      navigate(`/auth/signup?plan=${planName.toLowerCase()}`)
      return
    }

    // User is authenticated, start checkout
    setIsLoading(true)

    try {
      const planKey = planName.toLowerCase() as 'starter' | 'professional'
      const priceId = priceIds[planKey][billingCycle]

      const { sessionId } = await createCheckoutSession({
        priceId,
        companyId: user.companyId,
        email: user.email,
        returnUrl: `${window.location.origin}/${user.companyId}/dashboard`,
      })

      const stripe = await getStripe()

      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Checkout failed',
        description: 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ... rest of component
}
```

### 3.5 Create Billing Dashboard Page

**File:** `src/pages/dashboard/BillingSettings.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/aws-auth';
import { subscriptionService } from '@/services/subscription/subscription-service';
import { createCustomerPortalSession } from '@/services/subscription/stripe-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/shared/Badge';
import { CreditCard, Calendar, Receipt, Settings } from 'lucide-react';
import { format } from 'date-fns';

export const BillingSettings = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [user]);

  const loadBillingData = async () => {
    if (!user?.companyId) return;

    try {
      const [sub, history] = await Promise.all([
        subscriptionService.getCompanySubscription(user.companyId),
        subscriptionService.getPaymentHistory(user.companyId),
      ]);

      setSubscription(sub);
      setPayments(history);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await createCustomerPortalSession(user!.companyId);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold capitalize">
                  {subscription?.tier || 'Free'}
                </h3>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {subscription?.status || 'inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription?.billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
              </p>
            </div>
            <Button onClick={handleManageBilling} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
          </div>

          {subscription?.status === 'trialing' && subscription.trialEnd && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <Calendar className="w-4 h-4 inline mr-2" />
                Your free trial ends on {format(new Date(subscription.trialEnd), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                Your subscription will cancel on {format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment history yet</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === 'succeeded' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {payment.status === 'succeeded' ? (
                        <CreditCard className="w-5 h-5 text-green-600" />
                      ) : (
                        <Receipt className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </p>
                    {payment.invoiceUrl && (
                      <a
                        href={payment.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View Invoice
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;
```

---

## Phase 4: Sales Funnel Implementation

### 4.1 Sales Funnel Flow

```
Homepage → Pricing Page → Sign Up (with plan) → Email Verification →
Trial Start → Onboarding → Dashboard → Usage → Trial Ending Reminder →
Upgrade Prompt → Checkout → Active Subscription
```

### 4.2 Update Sign Up Flow

**File:** `src/pages/auth/SignUp.tsx` (add plan parameter handling)

```typescript
import { useSearchParams } from 'react-router-dom'

const SignUp = () => {
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan') // Get plan from URL

  // Pre-select plan if provided
  useEffect(() => {
    if (selectedPlan) {
      // Show plan selection prominently
      // Store in form state or localStorage for post-signup flow
      localStorage.setItem('selectedPlan', selectedPlan)
    }
  }, [selectedPlan])

  // ... rest of signup logic
}
```

### 4.3 Post-Signup Checkout Flow

**File:** `src/pages/dashboard/Dashboard.tsx` (add post-signup redirect)

```typescript
useEffect(() => {
  const selectedPlan = localStorage.getItem('selectedPlan')

  if (selectedPlan && user) {
    // Check if user hasn't already started a subscription
    subscriptionService.getCompanySubscription(user.companyId).then(sub => {
      if (!sub) {
        // Redirect to checkout
        navigate(`/pricing?autostart=${selectedPlan}`)
        localStorage.removeItem('selectedPlan')
      }
    })
  }
}, [user])
```

### 4.4 Trial Reminder System

Create email notifications for:

- **Day 11 of trial**: "3 days left in your trial"
- **Day 13 of trial**: "Last day of your trial"
- **Trial ended**: "Your trial has ended - Subscribe to continue"

**Lambda Function:** `amplify/functions/send-trial-reminder/handler.ts`

```typescript
// Triggered by EventBridge (CloudWatch Events) daily
// Check all subscriptions with trials ending in 3 days, 1 day, or just ended
// Send appropriate emails via SES
```

---

## Phase 5: Subscription Management

### 5.1 Update Plan Limits Service

**File:** `src/utils/subscription/plan-limits.ts` (update to use real data)

```typescript
import { subscriptionService } from '@/services/subscription/subscription-service'

export async function getUserSubscriptionTier(
  companyId: string,
): Promise<SubscriptionTier> {
  try {
    const subscription =
      await subscriptionService.getCompanySubscription(companyId)

    if (!subscription || subscription.status === 'canceled') {
      return 'starter' // Free tier
    }

    return subscription.tier as SubscriptionTier
  } catch (error) {
    console.error('Failed to get subscription tier:', error)
    return 'starter'
  }
}
```

### 5.2 Enforce Limits Throughout App

Add subscription checks to:

- **Project Creation** (`src/pages/projects/Projects.tsx`)
- **Document Upload** (`src/pages/documents/Documents.tsx`)
- **AI Features** (`src/components/ai/AIActions.tsx`)

### 5.3 Update Usage Tracking

Create Lambda function to track usage daily:

**File:** `amplify/functions/track-usage/handler.ts`

```typescript
// Triggered daily by EventBridge
// For each company:
//   - Count projects
//   - Count documents
//   - Calculate storage used
//   - Count AI queries
// Update UsageMetrics table
```

---

## Phase 6: Testing & Deployment

### 6.1 Testing Checklist

**Stripe Test Mode:**

- [ ] Test card: `4242 4242 4242 4242` (successful payment)
- [ ] Test card: `4000 0000 0000 0341` (declined payment)
- [ ] Test card: `4000 0025 0000 3155` (requires authentication)

**Test Scenarios:**

- [ ] Sign up with plan selection
- [ ] Start free trial
- [ ] Trial expiration handling
- [ ] Payment method update
- [ ] Plan upgrade (proration)
- [ ] Plan downgrade
- [ ] Subscription cancellation
- [ ] Subscription reactivation
- [ ] Failed payment handling
- [ ] Webhook processing
- [ ] Customer portal access
- [ ] Invoice generation
- [ ] Receipt emails

### 6.2 Production Deployment Steps

1. **Stripe Setup:**
   - Switch from test to live mode
   - Create production products/prices
   - Configure production webhooks
   - Set up Stripe Tax

2. **AWS Deployment:**
   - Deploy Lambda functions
   - Set production environment variables
   - Configure API Gateway endpoints
   - Set up CloudWatch monitoring

3. **Frontend Deployment:**
   - Update environment variables for production
   - Deploy to production hosting
   - Test all payment flows

4. **Go-Live Checklist:**
   - [ ] All webhooks verified
   - [ ] Email templates tested
   - [ ] Payment flows work end-to-end
   - [ ] Trial reminders configured
   - [ ] Customer portal accessible
   - [ ] Analytics tracking enabled

---

## Security Considerations

### 6.1 PCI Compliance

- **Never handle raw card data** - Use Stripe Elements/Checkout
- All payment forms hosted by Stripe or use Stripe.js
- No card numbers stored in your database

### 6.2 Webhook Security

- Verify webhook signatures using Stripe webhook secret
- Use HTTPS endpoints only
- Implement idempotency for webhook handlers
- Log all webhook events for debugging

### 6.3 Environment Variables

- Store all secrets in AWS Secrets Manager
- Never commit API keys to Git
- Use different keys for test and production
- Rotate keys periodically

---

## Monitoring & Analytics

### 7.1 Metrics to Track

**Business Metrics:**

- Trial start rate
- Trial-to-paid conversion rate
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Churn rate
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)

**Technical Metrics:**

- Checkout completion rate
- Payment success rate
- Webhook processing latency
- Failed payment retry success

### 7.2 Stripe Dashboard

Monitor in Stripe Dashboard:

- Failed payments
- Subscription metrics
- Revenue charts
- Customer lifetime value

### 7.3 Application Analytics

Track events:

- `pricing_page_viewed`
- `plan_selected`
- `checkout_started`
- `checkout_completed`
- `trial_started`
- `subscription_activated`
- `subscription_canceled`
- `plan_upgraded`
- `plan_downgraded`

---

## Next Steps

1. **Phase 1-2 (Week 1-2)**: Set up Stripe account, create products, build Lambda functions
2. **Phase 3 (Week 3)**: Integrate frontend with Stripe
3. **Phase 4 (Week 4)**: Implement sales funnel
4. **Phase 5 (Week 5)**: Add subscription management UI
5. **Phase 6 (Week 6)**: Testing and deployment

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Billing Guide](https://stripe.com/docs/billing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [AWS Lambda with Stripe](https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=embedded-form#lambda)
