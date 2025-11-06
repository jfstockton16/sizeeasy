/**
 * Comparison Cache Utilities
 * Implements cache-first architecture to minimize API costs
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ComparisonCache } from '@/lib/types/database'
import type { ObjectDimensions } from '@/lib/ai-dimensions'

/**
 * Normalize object names for cache key consistency
 * Ensures "BMW X4" and "bmw x4" are treated the same
 */
export function normalizeObjectName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Create ordered cache key (order-independent)
 * Ensures "A vs B" and "B vs A" use the same cache
 */
export function createCacheKey(object1: string, object2: string): {
  name1: string
  name2: string
} {
  const norm1 = normalizeObjectName(object1)
  const norm2 = normalizeObjectName(object2)

  // Alphabetical ordering for consistency
  if (norm1 <= norm2) {
    return { name1: norm1, name2: norm2 }
  }
  return { name1: norm2, name2: norm1 }
}

/**
 * Check if comparison exists in cache
 */
export async function getCachedComparison(
  object1Name: string,
  object2Name: string,
  qualityTier: 'free' | 'premium' = 'free'
): Promise<ComparisonCache | null> {
  const supabase = createServiceRoleClient()
  const { name1, name2 } = createCacheKey(object1Name, object2Name)

  const { data, error } = await supabase
    .from('comparisons_cache')
    .select('*')
    // @ts-expect-error - Supabase type inference issue
    .eq('object1_name', name1)
    // @ts-expect-error
    .eq('object2_name', name2)
    // @ts-expect-error
    .eq('quality_tier', qualityTier)
    .single()

  if (error || !data) {
    // Try fallback to free tier if premium not found
    if (qualityTier === 'premium') {
      return getCachedComparison(object1Name, object2Name, 'free')
    }
    return null
  }

  // Update last served time and increment counter
  await supabase
    .from('comparisons_cache')
    // @ts-expect-error - Supabase type inference issue
    .update({
      times_served: (data as any).times_served + 1,
      last_served_at: new Date().toISOString(),
    })
    .eq('id', (data as any).id)

  return data as unknown as ComparisonCache
}

/**
 * Save comparison to cache
 */
export async function cacheComparison(params: {
  object1Name: string
  object2Name: string
  object1Dimensions: ObjectDimensions
  object2Dimensions: ObjectDimensions
  object1ModelUrl?: string
  object2ModelUrl?: string
  object1ThumbnailUrl?: string
  object2ThumbnailUrl?: string
  comparisonImageUrl?: string
  generationCost?: number
  qualityTier?: 'free' | 'premium'
}): Promise<ComparisonCache | null> {
  const supabase = createServiceRoleClient()
  const { name1, name2 } = createCacheKey(params.object1Name, params.object2Name)

  // Determine which object goes where based on cache key ordering
  const isSwapped = normalizeObjectName(params.object1Name) !== name1

  const { data, error } = await supabase
    .from('comparisons_cache')
    .upsert(
      {
        object1_name: name1,
        object2_name: name2,
        object1_dimensions: isSwapped ? params.object2Dimensions : params.object1Dimensions,
        object2_dimensions: isSwapped ? params.object1Dimensions : params.object2Dimensions,
        object1_model_url: isSwapped ? params.object2ModelUrl : params.object1ModelUrl,
        object2_model_url: isSwapped ? params.object1ModelUrl : params.object2ModelUrl,
        object1_thumbnail_url: isSwapped
          ? params.object2ThumbnailUrl
          : params.object1ThumbnailUrl,
        object2_thumbnail_url: isSwapped
          ? params.object1ThumbnailUrl
          : params.object2ThumbnailUrl,
        comparison_image_url: params.comparisonImageUrl,
        generation_cost: params.generationCost || 0.02,
        quality_tier: params.qualityTier || 'free',
        last_served_at: new Date().toISOString(),
      },
      {
        onConflict: 'object1_name,object2_name,quality_tier',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error caching comparison:', error)
    return null
  }

  return data
}

/**
 * Save comparison to user's history
 */
export async function saveComparisonToHistory(params: {
  userId: string
  object1Name: string
  object2Name: string
  object1Dimensions: ObjectDimensions
  object2Dimensions: ObjectDimensions
  fromCache: boolean
  cacheEntryId?: string
  cost: number
  wasPremium: boolean
}): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('comparison_history')
    .insert({
      user_id: params.userId,
      object1_name: params.object1Name,
      object2_name: params.object2Name,
      object1_dimensions: params.object1Dimensions as any,
      object2_dimensions: params.object2Dimensions as any,
      from_cache: params.fromCache,
      cache_entry_id: params.cacheEntryId,
      cost: params.cost,
      was_premium_at_time: params.wasPremium,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving to history:', error)
    return null
  }

  return data.id
}

/**
 * Get user's comparison history
 */
export async function getUserComparisonHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('comparison_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching history:', error)
    return []
  }

  return data || []
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCached: number
  totalServed: number
  totalSavings: number
  hitRate: number
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('comparisons_cache')
    .select('times_served, generation_cost')

  if (error || !data) {
    return { totalCached: 0, totalServed: 0, totalSavings: 0, hitRate: 0 }
  }

  const totalCached = data.length
  const totalServed = data.reduce((sum, item) => sum + item.times_served, 0)
  const totalSavings = data.reduce(
    (sum, item) => sum + item.generation_cost * (item.times_served - 1),
    0
  )

  // Hit rate = (cache hits) / (total requests)
  // Cache hits = total served - total cached (each cached item is 1 initial generation)
  const cacheHits = totalServed - totalCached
  const hitRate = totalServed > 0 ? (cacheHits / totalServed) * 100 : 0

  return {
    totalCached,
    totalServed,
    totalSavings: Math.round(totalSavings * 100) / 100,
    hitRate: Math.round(hitRate * 100) / 100,
  }
}

/**
 * Get most popular comparisons
 */
export async function getPopularComparisons(limit: number = 10): Promise<ComparisonCache[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('comparisons_cache')
    .select('*')
    .order('times_served', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data
}

/**
 * Increment comparison views
 */
export async function incrementComparisonViews(comparisonId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('comparison_history')
    .update({
      views: supabase.raw('views + 1'),
    })
    .eq('id', comparisonId)
}

/**
 * Increment comparison shares
 */
export async function incrementComparisonShares(comparisonId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('comparison_history')
    .update({
      shares: supabase.raw('shares + 1'),
    })
    .eq('id', comparisonId)
}
