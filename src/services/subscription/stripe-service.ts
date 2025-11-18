import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

/**
 * Get Stripe instance (singleton pattern)
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export interface CheckoutSessionParams {
  companyId: string
  priceId: string
  email: string
  successUrl?: string
  cancelUrl?: string
}

/**
 * Create a Stripe checkout session for subscription purchase
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams,
): Promise<{ sessionId: string; url: string } | null> {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: params.companyId,
        priceId: params.priceId,
        email: params.email,
        successUrl:
          params.successUrl ||
          `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl:
          params.cancelUrl || `${window.location.origin}/pricing?canceled=true`,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create checkout session')
    }

    const data = await response.json()
    return {
      sessionId: data.sessionId,
      url: data.url,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return null
  }
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(
  params: CheckoutSessionParams,
): Promise<void> {
  const stripe = await getStripe()
  if (!stripe) {
    console.error('Stripe not loaded')
    return
  }

  const session = await createCheckoutSession(params)
  if (!session) {
    console.error('Failed to create checkout session')
    return
  }

  // Redirect to Stripe Checkout
  const { error } = await stripe.redirectToCheckout({
    sessionId: session.sessionId,
  })

  if (error) {
    console.error('Error redirecting to checkout:', error)
  }
}

export interface ManageSubscriptionParams {
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

/**
 * Manage subscription (upgrade, downgrade, cancel, reactivate)
 */
export async function manageSubscription(
  params: ManageSubscriptionParams,
): Promise<{
  success: boolean
  url?: string
  message?: string
  error?: string
}> {
  try {
    const response = await fetch('/api/manage-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: params.action,
        companyId: params.companyId,
        newPriceId: params.newPriceId,
        returnUrl:
          params.returnUrl || `${window.location.origin}/dashboard/settings`,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to manage subscription')
    }

    const data = await response.json()
    return {
      success: data.success || false,
      url: data.url,
      message: data.message,
    }
  } catch (error) {
    console.error('Error managing subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Open Stripe Customer Portal
 */
export async function openCustomerPortal(
  companyId: string,
  returnUrl?: string,
): Promise<void> {
  const result = await manageSubscription({
    action: 'create_portal_session',
    companyId,
    returnUrl,
  })

  if (result.success && result.url) {
    window.location.href = result.url
  } else {
    console.error('Failed to create portal session:', result.error)
  }
}

/**
 * Get price ID for a specific tier and billing cycle
 */
export function getPriceId(
  tier: 'starter' | 'professional' | 'enterprise',
  billingCycle: 'monthly' | 'yearly',
): string {
  const envVar = `VITE_STRIPE_PRICE_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`
  const priceId = import.meta.env[envVar]

  if (!priceId) {
    console.error(`Missing price ID for ${tier} ${billingCycle}`)
    return ''
  }

  return priceId
}
