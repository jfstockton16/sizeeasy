/**
 * Create Comparison API Route
 * Main API for creating comparisons with credit checking and caching
 * This implements the cache-first architecture to minimize costs
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

export async function POST(request: NextRequest) {
  try {
    const { object1Name, object2Name } = await request.json()

    // Validate input
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
    const obj1 = object1Name.trim().slice(0, 200)
    const obj2 = object2Name.trim().slice(0, 200)

    if (obj1.length === 0 || obj2.length === 0) {
      return NextResponse.json(
        { error: 'Object names cannot be empty' },
        { status: 400 }
      )
    }

    // Get authenticated user (optional - guests can't generate but can view cached)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Determine quality tier
    const isPremium = user ? await isPremiumUser(user.id) : false
    const qualityTier: 'free' | 'premium' = isPremium ? 'premium' : 'free'

    // STEP 1: Check cache first (costs $0)
    const cached = await getCachedComparison(obj1, obj2, qualityTier)

    if (cached) {
      // Cache hit! Save money
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
