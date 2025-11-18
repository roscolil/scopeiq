import Stripe from 'stripe'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export const handler: APIGatewayProxyHandler = async event => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    const { priceId, companyId, email, returnUrl } = JSON.parse(
      event.body || '{}',
    )

    if (!priceId || !companyId || !email || !returnUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters: priceId, companyId, email, returnUrl',
        }),
      }
    }

    console.log('Creating checkout session for:', { email, companyId, priceId })

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    let customer
    if (customers.data.length > 0) {
      customer = customers.data[0]
      console.log('Found existing customer:', customer.id)
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          companyId: companyId,
        },
      })
      console.log('Created new customer:', customer.id)
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

    console.log('Checkout session created:', session.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}
