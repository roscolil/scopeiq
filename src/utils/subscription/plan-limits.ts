/**
 * Subscription Plan Limits and Enforcement
 * 
 * Defines limits for each subscription tier and provides utilities
 * to check if users have reached their plan limits.
 */

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'

export interface PlanLimits {
  tier: SubscriptionTier
  projects: number // -1 = unlimited
  documentsPerProject: number // -1 = unlimited
  storage: number // in GB, -1 = unlimited
  aiFeatures: 'basic' | 'advanced' | 'custom'
  support: 'email' | 'priority' | 'dedicated'
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  starter: {
    tier: 'starter',
    projects: 5,
    documentsPerProject: 100,
    storage: 1, // 1GB
    aiFeatures: 'basic',
    support: 'email',
  },
  professional: {
    tier: 'professional',
    projects: 25,
    documentsPerProject: -1, // unlimited
    storage: 10, // 10GB
    aiFeatures: 'advanced',
    support: 'priority',
  },
  enterprise: {
    tier: 'enterprise',
    projects: -1, // unlimited
    documentsPerProject: -1, // unlimited
    storage: -1, // unlimited
    aiFeatures: 'custom',
    support: 'dedicated',
  },
}

export interface UsageStats {
  projectCount: number
  documentCount: number
  storageUsedGB: number
}

export interface LimitCheckResult {
  allowed: boolean
  limit: number
  current: number
  remaining: number
  limitType: 'projects' | 'documents' | 'storage' | 'ai-features'
}

/**
 * Get the subscription tier for a user
 * Currently defaults to 'starter' - integrate with actual subscription service
 */
export function getUserSubscriptionTier(
  userContext: { companyId: string } | null,
): SubscriptionTier {
  // TODO: Integrate with actual subscription service
  // For now, return 'starter' as default
  // In production, this would query a subscription table or service
  return 'starter'
}

/**
 * Get plan limits for a specific tier
 */
export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
  return PLAN_LIMITS[tier]
}

/**
 * Check if user can create a new project
 */
export function canCreateProject(
  tier: SubscriptionTier,
  currentProjectCount: number,
): LimitCheckResult {
  const limits = getPlanLimits(tier)
  const unlimited = limits.projects === -1

  return {
    allowed: unlimited || currentProjectCount < limits.projects,
    limit: limits.projects,
    current: currentProjectCount,
    remaining: unlimited ? -1 : Math.max(0, limits.projects - currentProjectCount),
    limitType: 'projects',
  }
}

/**
 * Check if user can upload a document to a project
 */
export function canUploadDocument(
  tier: SubscriptionTier,
  currentDocumentCount: number,
): LimitCheckResult {
  const limits = getPlanLimits(tier)
  const unlimited = limits.documentsPerProject === -1

  return {
    allowed: unlimited || currentDocumentCount < limits.documentsPerProject,
    limit: limits.documentsPerProject,
    current: currentDocumentCount,
    remaining: unlimited
      ? -1
      : Math.max(0, limits.documentsPerProject - currentDocumentCount),
    limitType: 'documents',
  }
}

/**
 * Check if user has sufficient storage
 */
export function canUploadFile(
  tier: SubscriptionTier,
  currentStorageGB: number,
  fileSizeGB: number,
): LimitCheckResult {
  const limits = getPlanLimits(tier)
  const unlimited = limits.storage === -1

  const wouldExceed = currentStorageGB + fileSizeGB > limits.storage

  return {
    allowed: unlimited || !wouldExceed,
    limit: limits.storage,
    current: currentStorageGB,
    remaining: unlimited ? -1 : Math.max(0, limits.storage - currentStorageGB),
    limitType: 'storage',
  }
}

/**
 * Check if user can use advanced AI features
 */
export function canUseAIFeature(
  tier: SubscriptionTier,
  featureLevel: 'basic' | 'advanced' | 'custom',
): LimitCheckResult {
  const limits = getPlanLimits(tier)
  
  const featureHierarchy = { basic: 0, advanced: 1, custom: 2 }
  const userLevel = featureHierarchy[limits.aiFeatures]
  const requiredLevel = featureHierarchy[featureLevel]

  return {
    allowed: userLevel >= requiredLevel,
    limit: userLevel,
    current: requiredLevel,
    remaining: userLevel - requiredLevel,
    limitType: 'ai-features',
  }
}

/**
 * Get a user-friendly message for when a limit is reached
 */
export function getLimitMessage(check: LimitCheckResult): string {
  if (check.allowed) {
    return ''
  }

  switch (check.limitType) {
    case 'projects':
      return `You've reached your plan limit of ${check.limit} projects. Upgrade to create more.`
    case 'documents':
      return `You've reached your plan limit of ${check.limit} documents per project. Upgrade for unlimited documents.`
    case 'storage':
      return `You've used ${check.current.toFixed(2)}GB of your ${check.limit}GB storage limit. Upgrade for more storage.`
    case 'ai-features':
      return 'This AI feature requires a Professional or Enterprise plan. Upgrade to unlock advanced AI capabilities.'
    default:
      return 'You\'ve reached your plan limit. Please upgrade to continue.'
  }
}

/**
 * Get the appropriate paywall variant based on limit type
 */
export function getPaywallVariant(
  limitType: LimitCheckResult['limitType'],
): 'projects' | 'documents' | 'ai-features' | 'storage' {
  return limitType
}
