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

interface RequestBody {
  action:
    | 'upgrade'
    | 'downgrade'
    | 'cancel'
    | 'reactivate'
    | 'create_portal_session'
  companyId: string
  newPriceId?: string
  returnUrl?: string
}

export const handler: APIGatewayProxyHandler = async event => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '',
    }
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Request body required' }),
    }
  }

  try {
    const body: RequestBody = JSON.parse(event.body)
    const { action, companyId, newPriceId, returnUrl } = body

    // Get subscription from database
    const { data: subscriptions } = await client.models.Subscription.list({
      filter: { companyId: { eq: companyId } },
    })

    if (!subscriptions || subscriptions.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Subscription not found' }),
      }
    }

    const subscription = subscriptions[0]

    switch (action) {
      case 'upgrade':
      case 'downgrade':
        if (!newPriceId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'newPriceId required' }),
          }
        }
        return await handlePlanChange(
          subscription.stripeSubscriptionId!,
          newPriceId,
        )

      case 'cancel':
        return await handleCancellation(subscription.stripeSubscriptionId!)

      case 'reactivate':
        return await handleReactivation(subscription.stripeSubscriptionId!)

      case 'create_portal_session':
        return await createPortalSession(
          subscription.stripeCustomerId!,
          returnUrl || process.env.VITE_APP_URL || 'http://localhost:8080',
        )

      default:
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Invalid action' }),
        }
    }
  } catch (error) {
    console.error('Error managing subscription:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

async function handlePlanChange(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Update the subscription with new price
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
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodEnd: updatedSubscription.current_period_end,
        },
      }),
    }
  } catch (error) {
    console.error('Error changing plan:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to change plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

async function handleCancellation(subscriptionId: string) {
  try {
    // Cancel at end of billing period
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Subscription will be canceled at end of billing period',
        subscription: {
          id: updatedSubscription.id,
          cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
          currentPeriodEnd: updatedSubscription.current_period_end,
        },
      }),
    }
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

async function handleReactivation(subscriptionId: string) {
  try {
    // Remove scheduled cancellation
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: false,
      },
    )

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Subscription reactivated',
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        },
      }),
    }
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to reactivate subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<{
  statusCode: number
  headers: Record<string, string>
  body: string
}> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        url: session.url,
      }),
    }
  } catch (error) {
    console.error('Error creating portal session:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to create portal session',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}
