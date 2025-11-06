/**
 * @file app/api/comparison/create/route.ts
 * @purpose Main API endpoint for creating size comparisons
 *
 * CRITICAL DEPENDENCIES:
 * - Supabase (auth & database) - REQUIRED
 * - OpenAI API (dimensions) - REQUIRED for new comparisons
 * - Redis (optional) - For cost tracking and rate limiting
 *
 * FLOW OVERVIEW:
 * 1. Validate input
 * 2. Check cache (FREE, <10ms)
 * 3. If cache hit → return immediately
 * 4. If cache miss → check auth & credits
 * 5. Generate via OpenAI (~$0.02, 1-2 seconds)
 * 6. Save to cache for future requests
 * 7. Deduct credit (if free user)
 * 8. Save to user history
 * 9. Return result
 *
 * COST ANALYSIS:
 * - Cache hit: $0.00, ~100ms response
 * - Cache miss (free user): $0.02, ~2s response, -1 credit
 * - Cache miss (premium): $0.02, ~2s response, no credit deduction
 *
 * COMMON ISSUES:
 * - "No credits remaining" → User exhausted daily credits
 *   Fix: Wait for reset or upgrade to premium
 *
 * - "Invalid dimensions" → OpenAI API returned malformed data
 *   Fix: Check OpenAI API key, retry request
 *
 * - "Authentication required" → User not logged in
 *   Fix: Redirect to login page
 *
 * - Slow responses → OpenAI API latency or high queue
 *   Fix: Check OpenAI status, consider caching more aggressively
 *
 * MONITORING:
 * - Cache hit rate should be >70%
 * - Average response time <500ms (with good cache hit rate)
 * - Error rate <1%
 *
 * @see /docs/architecture/API_FLOW.md for detailed request lifecycle
 * @see /docs/architecture/CACHING_STRATEGY.md for cache optimization
 * @see /docs/troubleshooting/COMMON_ISSUES.md for debugging
 *
 * @last_modified 2025-11-06
 * @modified_by Production readiness audit
 * @modification_reason Added comprehensive inline documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canUserGenerateComparison,
  deductUserCredit,
  isPremiumUser,
} from '@/lib/credits'
import {
  getCachedComparison,
  cacheComparison,
  saveComparisonToHistory,
} from '@/lib/comparison-cache'
import {
  trackComparisonCreated,
  trackCacheHit,
  trackCreditDepleted,
} from '@/lib/analytics'
import { fetchObjectDimensions, validateDimensions } from '@/lib/ai-dimensions'

/**
 * POST /api/comparison/create
 *
 * Creates a comparison between two objects
 *
 * @param request NextRequest with body: { object1Name: string, object2Name: string }
 *
 * @returns {Object} {
 *   success: true,
 *   data: {
 *     object1: ObjectDimensions,
 *     object2: ObjectDimensions,
 *     fromCache: boolean,
 *     qualityTier: 'free' | 'premium',
 *     creditsRemaining?: number,
 *     isPremium: boolean
 *   }
 * }
 *
 * @throws {400} Invalid input (missing or empty object names)
 * @throws {401} Not authenticated (for new comparisons)
 * @throws {403} No credits remaining (free users only)
 * @throws {500} Generation failed (OpenAI error, database error)
 *
 * @example
 * // Request
 * POST /api/comparison/create
 * {
 *   "object1Name": "elephant",
 *   "object2Name": "bus"
 * }
 *
 * // Response (cache hit)
 * {
 *   "success": true,
 *   "data": {
 *     "object1": { "length": 6.0, "width": 3.2, "height": 4.0, "unit": "meters" },
 *     "object2": { "length": 12.0, "width": 2.5, "height": 3.4, "unit": "meters" },
 *     "fromCache": true,
 *     "qualityTier": "free",
 *     "creditsRemaining": 4,
 *     "isPremium": false
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // STEP 1: INPUT VALIDATION & SANITIZATION
    // ========================================================================
    //
    // Parse request body
    // SECURITY: Malformed JSON will throw and be caught by try/catch
    const { object1Name, object2Name } = await request.json()

    // Validate required fields
    // WHY: Prevent empty/null requests that waste API calls
    if (
      !object1Name ||
      !object2Name ||
      typeof object1Name !== 'string' ||
      typeof object2Name !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Both object names are required' },
        { status: 400 }
      )
    }

    // Sanitize input
    // WHY: Prevent injection attacks and excessive API costs
    // - trim() removes leading/trailing whitespace
    // - slice(0, 200) limits length to prevent:
    //   1. Large OpenAI API costs (charged per token)
    //   2. Database varchar overflow
    //   3. Cache key bloat
    const obj1 = object1Name.trim().slice(0, 200)
    const obj2 = object2Name.trim().slice(0, 200)

    // Validate sanitized input
    // EDGE CASE: "   " (spaces only) becomes "" after trim
    if (obj1.length === 0 || obj2.length === 0) {
      return NextResponse.json(
        { error: 'Object names cannot be empty' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 2: AUTHENTICATION & USER TIER CHECK
    // ========================================================================
    //
    // Get authenticated user
    // NOTE: Authentication is OPTIONAL at this stage:
    // - Guests CAN view cached comparisons (free)
    // - Guests CANNOT generate new comparisons
    // WHY: Allows showing cached results without forcing signup
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Determine quality tier
    // Premium users get watermark-free images
    // Free users get watermarked images
    // COST: Premium tier cache is separate from free tier
    const isPremium = user ? await isPremiumUser(user.id) : false
    const qualityTier: 'free' | 'premium' = isPremium ? 'premium' : 'free'

    // ========================================================================
    // STEP 3: CACHE LOOKUP (Highest Priority - Saves Money!)
    // ========================================================================
    //
    // Check if this comparison already exists in cache
    // PERFORMANCE: ~20-30ms database query
    // COST: $0.00 (no external API calls)
    // CACHE KEY: Normalized, alphabetically sorted object names + quality tier
    //
    // How it works:
    // - "Elephant vs Bus" → normalized to ("bus", "elephant") + "free"
    // - "Bus vs Elephant" → normalized to ("bus", "elephant") + "free"
    // - Both requests hit the same cache entry!
    //
    // See: /lib/comparison-cache.ts → normalizeObjectName()
    const cached = await getCachedComparison(obj1, obj2, qualityTier)

    if (cached) {
      // ✅ CACHE HIT!
      // This saved us ~$0.02 in API costs and ~2 seconds of latency
      //
      // Track metrics for monitoring cache efficiency
      await trackCacheHit(cached.generation_cost, obj1, obj2)

      // Save to user's history if authenticated
      if (user) {
        await saveComparisonToHistory({
          userId: user.id,
          object1Name: obj1,
          object2Name: obj2,
          object1Dimensions: cached.object1_dimensions as any,
          object2Dimensions: cached.object2_dimensions as any,
          fromCache: true,
          cacheEntryId: cached.id,
          cost: 0, // No cost for cache hit
          wasPremium: isPremium,
        })

        await trackComparisonCreated({
          userId: user.id,
          object1: obj1,
          object2: obj2,
          fromCache: true,
          isPremium,
          cost: 0,
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          object1: cached.object1_dimensions,
          object2: cached.object2_dimensions,
          fromCache: true,
          qualityTier,
        },
      })
    }

    // STEP 2: Not in cache - need to generate (costs money)
    // Check authentication
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in to create new comparisons',
        },
        { status: 401 }
      )
    }

    // STEP 3: Check if user has credits or is premium
    const creditCheck = await canUserGenerateComparison(user.id)

    if (!creditCheck.allowed) {
      // User has no credits
      await trackCreditDepleted(user.id, 0)

      return NextResponse.json(
        {
          error: 'No credits remaining',
          message: creditCheck.reason,
          creditsRemaining: 0,
          isPremium: false,
        },
        { status: 403 }
      )
    }

    // STEP 4: Generate new comparison (costs $0.01-0.03)
    const [dimensions1, dimensions2] = await Promise.all([
      fetchObjectDimensions(obj1),
      fetchObjectDimensions(obj2),
    ])

    // Validate results
    if (!validateDimensions(dimensions1) || !validateDimensions(dimensions2)) {
      return NextResponse.json(
        { error: 'Invalid dimensions received from AI' },
        { status: 500 }
      )
    }

    const generationCost = 0.02 // Approximate cost for 2 OpenAI API calls

    // STEP 5: Deduct credit if free user (premium users don't need credits)
    if (!isPremium) {
      const deducted = await deductUserCredit(user.id)
      if (!deducted) {
        return NextResponse.json(
          { error: 'Failed to deduct credit' },
          { status: 500 }
        )
      }
    }

    // STEP 6: Cache for future use
    await cacheComparison({
      object1Name: obj1,
      object2Name: obj2,
      object1Dimensions: dimensions1,
      object2Dimensions: dimensions2,
      generationCost,
      qualityTier,
    })

    // STEP 7: Save to user's history
    await saveComparisonToHistory({
      userId: user.id,
      object1Name: obj1,
      object2Name: obj2,
      object1Dimensions: dimensions1,
      object2Dimensions: dimensions2,
      fromCache: false,
      cost: isPremium ? 0 : generationCost,
      wasPremium: isPremium,
    })

    // STEP 8: Track analytics
    await trackComparisonCreated({
      userId: user.id,
      object1: obj1,
      object2: obj2,
      fromCache: false,
      isPremium,
      cost: generationCost,
    })

    // STEP 9: Return results
    return NextResponse.json({
      success: true,
      data: {
        object1: dimensions1,
        object2: dimensions2,
        fromCache: false,
        qualityTier,
        creditsRemaining: isPremium ? null : creditCheck.creditsRemaining! - 1,
        isPremium,
      },
    })
  } catch (error: any) {
    console.error('Comparison creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create comparison', details: error.message },
      { status: 500 }
    )
  }
}

export const runtime = 'edge'
