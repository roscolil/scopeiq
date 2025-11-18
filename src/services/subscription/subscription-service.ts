import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../amplify/data/resource'

const client = generateClient<Schema>()

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'

export interface CompanySubscription {
  id: string
  companyId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  billingCycle: 'monthly' | 'yearly'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
  canceledAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Get subscription for a company
 */
export async function getCompanySubscription(
  companyId: string,
): Promise<CompanySubscription | null> {
  try {
    const { data: subscriptions, errors } =
      await client.models.Subscription.list({
        filter: { companyId: { eq: companyId } },
      })

    if (errors || !subscriptions || subscriptions.length === 0) {
      return null
    }

    // Return the most recent subscription
    const subscription = subscriptions[0]

    return {
      id: subscription.id,
      companyId: subscription.companyId,
      stripeCustomerId: subscription.stripeCustomerId || '',
      stripeSubscriptionId: subscription.stripeSubscriptionId || '',
      stripePriceId: subscription.stripePriceId || '',
      tier: subscription.tier as SubscriptionTier,
      status: subscription.status as SubscriptionStatus,
      billingCycle: subscription.billingCycle as 'monthly' | 'yearly',
      currentPeriodStart: subscription.currentPeriodStart || '',
      currentPeriodEnd: subscription.currentPeriodEnd || '',
      trialStart: subscription.trialStart || undefined,
      trialEnd: subscription.trialEnd || undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      canceledAt: subscription.canceledAt || undefined,
      createdAt: subscription.createdAt || '',
      updatedAt: subscription.updatedAt || '',
    }
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

/**
 * Check if subscription is currently in trial period
 */
export function isTrialing(subscription: CompanySubscription | null): boolean {
  if (!subscription || !subscription.trialEnd) return false

  const trialEndDate = new Date(subscription.trialEnd)
  const now = new Date()

  return (
    subscription.status === 'trialing' ||
    (subscription.status === 'active' && now < trialEndDate)
  )
}

/**
 * Get remaining days in trial period
 */
export function getTrialDaysRemaining(
  subscription: CompanySubscription | null,
): number {
  if (!subscription || !subscription.trialEnd) return 0

  const trialEndDate = new Date(subscription.trialEnd)
  const now = new Date()

  if (now >= trialEndDate) return 0

  const diffTime = trialEndDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Check if subscription is active (including trial)
 */
export function isSubscriptionActive(
  subscription: CompanySubscription | null,
): boolean {
  if (!subscription) return false

  return (
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due'
  )
}

/**
 * Check if subscription has payment issues
 */
export function hasPaymentIssue(
  subscription: CompanySubscription | null,
): boolean {
  if (!subscription) return false

  return (
    subscription.status === 'past_due' ||
    subscription.status === 'incomplete' ||
    subscription.status === 'unpaid'
  )
}

/**
 * Get subscription tier label
 */
export function getTierLabel(tier: SubscriptionTier): string {
  const labels: Record<SubscriptionTier, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }
  return labels[tier] || tier
}

/**
 * Get subscription status label
 */
export function getStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Payment Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
    unpaid: 'Unpaid',
  }
  return labels[status] || status
}

/**
 * Get subscription status color
 */
export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    active: 'text-green-600',
    trialing: 'text-blue-600',
    past_due: 'text-orange-600',
    canceled: 'text-gray-600',
    incomplete: 'text-yellow-600',
    incomplete_expired: 'text-red-600',
    unpaid: 'text-red-600',
  }
  return colors[status] || 'text-gray-600'
}

/**
 * Get payment history for a company
 */
export async function getPaymentHistory(companyId: string) {
  try {
    const { data: payments, errors } = await client.models.Payment.list({
      filter: { companyId: { eq: companyId } },
    })

    if (errors || !payments) {
      return []
    }

    // Sort by created date descending
    return payments.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return []
  }
}

/**
 * Get usage metrics for a company
 */
export async function getUsageMetrics(companyId: string, month?: string) {
  try {
    const filter: any = { companyId: { eq: companyId } }

    if (month) {
      filter.month = { eq: month }
    }

    const { data: metrics, errors } = await client.models.UsageMetrics.list({
      filter,
    })

    if (errors || !metrics) {
      return []
    }

    // Sort by month descending
    return metrics.sort((a, b) => {
      return (b.month || '').localeCompare(a.month || '')
    })
  } catch (error) {
    console.error('Error fetching usage metrics:', error)
    return []
  }
}

/**
 * Get current month's usage
 */
export async function getCurrentUsage(companyId: string) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const metrics = await getUsageMetrics(companyId, month)
  return metrics.length > 0 ? metrics[0] : null
}
