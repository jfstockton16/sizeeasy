/**
 * Stripe Checkout API Route
 * Creates a Stripe checkout session for premium subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackPremiumUpgradeShown } from '@/lib/analytics'
import type { UserProfile } from '@/lib/types/database'
import Stripe from 'stripe'

// Lazy initialize Stripe to avoid build-time errors
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
  })
}

export async function POST(request: NextRequest) {
  try {
    const { planType, triggerPoint } = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profile = profileData as UserProfile

    // Track analytics
    await trackPremiumUpgradeShown(user.id, triggerPoint || 'upgrade_modal')

    // Determine price ID based on plan type
    const priceId =
      planType === 'yearly'
        ? process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 })
    }

    // Create or get Stripe customer
    let customerId = profile.stripe_customer_id
    const stripe = getStripeClient()

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Update profile with customer ID
      await supabase
        .from('user_profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: planType,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
