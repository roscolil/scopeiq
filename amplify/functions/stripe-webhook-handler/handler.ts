import Stripe from 'stripe'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../data/resource'

// Configure Amplify for Lambda execution
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!,
        region: process.env.AWS_REGION!,
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    ssr: true,
  },
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const client = generateClient<Schema>({
  authMode: 'iam',
})

export const handler: APIGatewayProxyHandler = async event => {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature']

  if (!sig) {
    console.error('No signature in headers')
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
        await handleTrialWillEnd(
          stripeEvent.data.object as Stripe.Subscription,
        )
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

  console.log('Updating subscription for company:', companyId)

  // Check if subscription exists
  const { data: existingSubscriptions } = await client.models.Subscription.list(
    {
      filter: { companyId: { eq: companyId } },
    },
  )

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    // Update existing
    await client.models.Subscription.update({
      id: existingSubscriptions[0].id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: tier,
      status: subscription.status as any,
      billingCycle: billingCycle as any,
      currentPeriodStart: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    })
    console.log('Subscription updated')
  } else {
    // Create new
    await client.models.Subscription.create({
      companyId: companyId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: tier as any,
      status: subscription.status as any,
      billingCycle: billingCycle as any,
      currentPeriodStart: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    console.log('Subscription created')
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  const { data: existingSubscriptions } = await client.models.Subscription.list(
    {
      filter: { companyId: { eq: companyId } },
    },
  )

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    await client.models.Subscription.update({
      id: existingSubscriptions[0].id,
      status: 'canceled' as any,
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    console.log('Subscription marked as canceled')
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string,
  )
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  await client.models.Payment.create({
    companyId: companyId,
    subscriptionId: invoice.subscription as string,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded' as any,
    description: invoice.description || 'Subscription payment',
    invoiceUrl: invoice.hosted_invoice_url || '',
    receiptUrl: invoice.invoice_pdf || '',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  })

  console.log('Payment recorded:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string,
  )
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  await client.models.Payment.create({
    companyId: companyId,
    subscriptionId: invoice.subscription as string,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed' as any,
    description: `Payment failed: ${invoice.description || 'Subscription payment'}`,
    createdAt: new Date().toISOString(),
  })

  console.log('Failed payment recorded:', invoice.id)
  // TODO: Send payment failed email
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata.companyId

  if (!companyId) return

  console.log(`Trial ending soon for company: ${companyId}`)
  // TODO: Send trial ending notification email
}

function getPriceIdToTier(
  priceId: string,
): 'starter' | 'professional' | 'enterprise' {
  // Map price IDs from environment variables
  const starterMonthly = process.env.VITE_STRIPE_PRICE_STARTER_MONTHLY
  const starterYearly = process.env.VITE_STRIPE_PRICE_STARTER_YEARLY
  const proMonthly = process.env.VITE_STRIPE_PRICE_PROFESSIONAL_MONTHLY
  const proYearly = process.env.VITE_STRIPE_PRICE_PROFESSIONAL_YEARLY

  if (priceId === starterMonthly || priceId === starterYearly) {
    return 'starter'
  }
  if (priceId === proMonthly || priceId === proYearly) {
    return 'professional'
  }

  return 'starter' // default
}
