/**
 * Referral Signup API Route
 * Awards credits when a referred user signs up
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { awardReferralCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const { referredUserId, referralCode } = await request.json()

    if (!referredUserId || !referralCode) {
      return NextResponse.json(
        { error: 'Missing referredUserId or referralCode' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Find referrer by referral code
    type ReferrerResult = { id: string } | null
    const { data: referrerData, error: referrerError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle() as { data: ReferrerResult; error: any }

    if (referrerError || !referrerData) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    const referrerId: string = referrerData.id

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerId as any)
      .eq('referred_user_id', referredUserId as any)
      .maybeSingle()

    if (existingReferral) {
      return NextResponse.json(
        { error: 'Referral already recorded' },
        { status: 400 }
      )
    }

    // Award credits to referrer
    const result = await awardReferralCredits(referrerId, referredUserId)

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to award credits' }, { status: 500 })
    }

    // Update referred user's profile
    await supabase
      .from('user_profiles')
      // @ts-expect-error - Supabase type inference issue
      .update({ referred_by: referrerId } as any)
      .eq('id', referredUserId as any)

    return NextResponse.json({
      success: true,
      creditsAwarded: result.creditsAwarded,
      message: 'Referral recorded successfully!',
    })
  } catch (error: any) {
    console.error('Error processing referral:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'edge'
