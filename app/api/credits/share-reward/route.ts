/**
 * Share Reward API Route
 * Awards credits for sharing comparisons on social media
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardShareCredits } from '@/lib/credits'
import { trackComparisonShared } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const { platform, comparisonId } = await request.json()

    // Validate platform
    if (!['twitter', 'facebook', 'linkedin', 'other'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Award credits
    const result = await awardShareCredits(user.id, platform, comparisonId)

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to award credits' }, { status: 500 })
    }

    // Track analytics
    await trackComparisonShared(user.id, platform, result.creditsAwarded)

    return NextResponse.json({
      success: true,
      creditsAwarded: result.creditsAwarded,
      message: `+${result.creditsAwarded} credits earned for sharing!`,
    })
  } catch (error: any) {
    console.error('Error awarding share credits:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'edge'
