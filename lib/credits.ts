/**
 * Credit Management Utilities
 * Handles credit checking, deduction, and rewards
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/database'

/**
 * Get user profile with credit information
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

/**
 * Check if user has credits or is premium
 */
export async function canUserGenerateComparison(userId: string): Promise<{
  allowed: boolean
  reason?: string
  creditsRemaining?: number
  isPremium?: boolean
}> {
  const profile = await getUserProfile(userId)

  if (!profile) {
    return { allowed: false, reason: 'User profile not found' }
  }

  // Premium users can always generate
  if (profile.is_premium) {
    // Check if premium hasn't expired
    if (profile.premium_expires && new Date(profile.premium_expires) > new Date()) {
      return { allowed: true, isPremium: true }
    }
  }

  // Check if credits need to be reset
  const resetTime = new Date(profile.credits_reset_time)
  const now = new Date()

  if (resetTime <= now) {
    // Credits should be reset - trigger reset
    await resetUserCredits(userId)
    // Re-fetch profile
    const updatedProfile = await getUserProfile(userId)
    if (!updatedProfile) {
      return { allowed: false, reason: 'Failed to reset credits' }
    }
    profile.credits_remaining = updatedProfile.credits_remaining
  }

  // Check if user has credits
  if (profile.credits_remaining > 0) {
    return {
      allowed: true,
      creditsRemaining: profile.credits_remaining,
      isPremium: false,
    }
  }

  return {
    allowed: false,
    reason: 'No credits remaining',
    creditsRemaining: 0,
    isPremium: false,
  }
}

/**
 * Deduct a credit from user
 */
export async function deductUserCredit(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // @ts-expect-error - Supabase type inference issue
  const { data, error } = await supabase.rpc('deduct_credit', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error deducting credit:', error)
    return false
  }

  // Update comparison count
  await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase type inference issue
    .update({
      // @ts-expect-error - supabase.raw may not exist in types
      total_comparisons: supabase.raw('total_comparisons + 1'),
      // @ts-expect-error - supabase.raw may not exist in types
      comparisons_this_month: supabase.raw('comparisons_this_month + 1'),
      last_comparison_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return data as unknown as boolean
}

/**
 * Reset user's daily credits
 */
export async function resetUserCredits(userId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const profile = await getUserProfile(userId)
  if (!profile || profile.is_premium) return

  const newCredits = profile.is_founder ? 20 : 5

  await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase type inference issue
    .update({
      credits_remaining: newCredits,
      credits_reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', userId)
}

/**
 * Add credits to user (for rewards)
 */
export async function addCredits(
  userId: string,
  amount: number,
  reason: string = 'reward'
): Promise<void> {
  const supabase = createServiceRoleClient()

  // @ts-expect-error - Supabase type inference issue
  await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  })
}

/**
 * Award credits for social share
 */
export async function awardShareCredits(
  userId: string,
  platform: 'twitter' | 'facebook' | 'linkedin' | 'other',
  comparisonId?: string
): Promise<{ success: boolean; creditsAwarded: number }> {
  const supabase = createServiceRoleClient()

  const creditsAwarded = 2

  // Record the share
  // @ts-expect-error - Supabase type inference issue
  const { error } = await supabase.from('social_shares').insert({
    user_id: userId,
    comparison_history_id: comparisonId || null,
    platform,
    credits_awarded: creditsAwarded,
  })

  if (error) {
    console.error('Error recording share:', error)
    return { success: false, creditsAwarded: 0 }
  }

  // Add credits
  await addCredits(userId, creditsAwarded, 'social_share')

  return { success: true, creditsAwarded }
}

/**
 * Award referral credits when referred user signs up
 */
export async function awardReferralCredits(
  referrerId: string,
  referredUserId: string
): Promise<{ success: boolean; creditsAwarded: number }> {
  const supabase = createServiceRoleClient()

  const creditsAwarded = 10

  // Record the referral
  // @ts-expect-error - Supabase type inference issue
  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    credits_awarded: creditsAwarded,
    reward_claimed: true,
    claimed_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Error recording referral:', error)
    return { success: false, creditsAwarded: 0 }
  }

  // Add credits to referrer
  await addCredits(referrerId, creditsAwarded, 'referral')

  // Update referrer profile
  await supabase
    .from('user_profiles')
    // @ts-expect-error - Supabase type inference issue
    .update({
      // @ts-expect-error - supabase.raw may not exist in types
      referral_credits_earned: supabase.raw('referral_credits_earned + ' + creditsAwarded),
    })
    .eq('id', referrerId)

  return { success: true, creditsAwarded }
}

/**
 * Award credits for viral comparison (100+ views)
 */
export async function awardViralCredits(
  userId: string,
  comparisonId: string,
  views: number
): Promise<{ success: boolean; creditsAwarded: number }> {
  if (views < 100) {
    return { success: false, creditsAwarded: 0 }
  }

  const creditsAwarded = 1

  // Check if already awarded for this comparison
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('analytics_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_name', 'viral_credits_awarded')
    .eq('event_data->comparison_id', comparisonId)
    .single()

  if (data) {
    // Already awarded
    return { success: false, creditsAwarded: 0 }
  }

  // Add credits
  await addCredits(userId, creditsAwarded, 'viral_comparison')

  // Record the event
  // @ts-expect-error - Supabase type inference issue
  await supabase.from('analytics_events').insert({
    user_id: userId,
    event_name: 'viral_credits_awarded',
    event_data: { comparison_id: comparisonId, views },
  })

  return { success: true, creditsAwarded }
}

/**
 * Check if user is premium
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)

  if (!profile || !profile.is_premium) return false

  // Check if premium hasn't expired
  if (profile.premium_expires && new Date(profile.premium_expires) < new Date()) {
    return false
  }

  return true
}

/**
 * Get time until credit reset
 */
export function getTimeUntilReset(resetTime: string): {
  hours: number
  minutes: number
  total: number
} {
  const reset = new Date(resetTime)
  const now = new Date()
  const diff = reset.getTime() - now.getTime()

  if (diff <= 0) {
    return { hours: 0, minutes: 0, total: 0 }
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { hours, minutes, total: diff }
}
