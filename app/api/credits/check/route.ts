/**
 * Check Credits API Route
 * Checks if user has credits or is premium
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUserGenerateComparison, getUserProfile } from '@/lib/credits'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can generate
    const check = await canUserGenerateComparison(user.id)

    // Get full profile
    const profile = await getUserProfile(user.id)

    return NextResponse.json({
      allowed: check.allowed,
      reason: check.reason,
      creditsRemaining: check.creditsRemaining,
      isPremium: check.isPremium,
      profile: profile,
    })
  } catch (error: any) {
    console.error('Error checking credits:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'edge'
