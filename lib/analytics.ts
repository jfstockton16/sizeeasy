/**
 * Analytics Utilities
 * Track monetization metrics and user behavior
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

type AnalyticsEventData = Record<string, any>

/**
 * Track analytics event
 */
export async function trackEvent(
  eventName: string,
  eventData?: AnalyticsEventData,
  userId?: string | null,
  sessionId?: string | null
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase.from('analytics_events').insert({
    user_id: userId || null,
    event_name: eventName,
    event_data: eventData || null,
    session_id: sessionId || null,
  })
}

/**
 * Track credit depletion
 */
export async function trackCreditDepleted(
  userId: string,
  totalComparisonsToday: number
): Promise<void> {
  await trackEvent('credit_depleted', { total_comparisons_today: totalComparisonsToday }, userId)
}

/**
 * Track premium upgrade shown
 */
export async function trackPremiumUpgradeShown(
  userId: string | null,
  triggerPoint: string
): Promise<void> {
  await trackEvent('premium_upgrade_shown', { trigger_point: triggerPoint }, userId)
}

/**
 * Track comparison shared
 */
export async function trackComparisonShared(
  userId: string,
  platform: string,
  creditsEarned: number
): Promise<void> {
  await trackEvent(
    'comparison_shared',
    { platform, credits_earned: creditsEarned },
    userId
  )
}

/**
 * Track cache hit
 */
export async function trackCacheHit(
  savedCost: number,
  object1: string,
  object2: string
): Promise<void> {
  await trackEvent('cache_hit', {
    saved_cost: savedCost,
    object1,
    object2,
  })
}

/**
 * Track premium conversion
 */
export async function trackPremiumConverted(
  userId: string,
  comparisonsBeforeUpgrade: number,
  planType: 'monthly' | 'yearly'
): Promise<void> {
  await trackEvent(
    'premium_converted',
    {
      comparisons_before_upgrade: comparisonsBeforeUpgrade,
      plan_type: planType,
    },
    userId
  )
}

/**
 * Track comparison created
 */
export async function trackComparisonCreated(params: {
  userId: string | null
  object1: string
  object2: string
  fromCache: boolean
  isPremium: boolean
  cost: number
}): Promise<void> {
  await trackEvent(
    'comparison_created',
    {
      object1: params.object1,
      object2: params.object2,
      from_cache: params.fromCache,
      is_premium: params.isPremium,
      cost: params.cost,
    },
    params.userId
  )
}

/**
 * Track 3D model generation
 */
export async function track3DModelGenerated(
  userId: string | null,
  objectName: string,
  success: boolean,
  cost: number
): Promise<void> {
  await trackEvent(
    '3d_model_generated',
    {
      object_name: objectName,
      success,
      cost,
    },
    userId
  )
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(): Promise<{
  totalUsers: number
  creditDepletions: number
  upgradeShown: number
  premiumConverted: number
  conversionRate: number
}> {
  const supabase = createServiceRoleClient()

  // Get total users
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  // Get credit depletions
  const { count: creditDepletions } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'credit_depleted')

  // Get upgrade shown events
  const { count: upgradeShown } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'premium_upgrade_shown')

  // Get premium conversions
  const { count: premiumConverted } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_premium', true)

  const conversionRate =
    totalUsers && totalUsers > 0 && premiumConverted
      ? (premiumConverted / totalUsers) * 100
      : 0

  return {
    totalUsers: totalUsers || 0,
    creditDepletions: creditDepletions || 0,
    upgradeShown: upgradeShown || 0,
    premiumConverted: premiumConverted || 0,
    conversionRate: Math.round(conversionRate * 100) / 100,
  }
}

/**
 * Get monthly revenue data
 */
export async function getMonthlyRevenue(): Promise<{
  monthly: number
  yearly: number
  total: number
  transactions: number
}> {
  const supabase = createServiceRoleClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('amount, plan_type, status')
    .eq('status', 'succeeded')
    .gte('created_at', thirtyDaysAgo)

  if (error || !data) {
    return { monthly: 0, yearly: 0, total: 0, transactions: 0 }
  }

  const monthly = data
    .filter(t => t.plan_type === 'monthly')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const yearly = data
    .filter(t => t.plan_type === 'yearly')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    monthly: Math.round(monthly * 100) / 100,
    yearly: Math.round(yearly * 100) / 100,
    total: Math.round((monthly + yearly) * 100) / 100,
    transactions: data.length,
  }
}

/**
 * Get cost analysis
 */
export async function getCostAnalysis(): Promise<{
  totalAPIcost: number
  averageCostPerUser: number
  premiumUserMargin: number
}> {
  const supabase = createServiceRoleClient()

  // Get total API cost from comparison history
  const { data: historyData } = await supabase
    .from('comparison_history')
    .select('cost')

  const totalAPICost = historyData
    ? historyData.reduce((sum, item) => sum + Number(item.cost), 0)
    : 0

  // Get user count
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const averageCostPerUser = totalUsers ? totalAPICost / totalUsers : 0

  // Premium margin: $3.99 revenue - average cost
  const premiumUserMargin = 3.99 - averageCostPerUser

  return {
    totalAPIcost: Math.round(totalAPICost * 100) / 100,
    averageCostPerUser: Math.round(averageCostPerUser * 100) / 100,
    premiumUserMargin: Math.round(premiumUserMargin * 100) / 100,
  }
}
