/**
 * Stripe Webhook Handler
 * Handles Stripe events for subscription management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { trackPremiumConverted } from '@/lib/analytics'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planType = session.metadata?.plan_type as 'monthly' | 'yearly'

        if (!userId) break

        // Get user profile to track comparisons before upgrade
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('total_comparisons')
          // @ts-expect-error - Supabase type inference issue
          .eq('id', userId)
          .single()

        // Update user to premium
        const premiumExpires = new Date()
        premiumExpires.setFullYear(
          premiumExpires.getFullYear() + (planType === 'yearly' ? 1 : 0),
          premiumExpires.getMonth() + (planType === 'monthly' ? 1 : 0)
        )

        await supabase
          .from('user_profiles')
          // @ts-expect-error - Supabase type inference issue
          .update({
            is_premium: true,
            premium_expires: premiumExpires.toISOString(),
            stripe_subscription_id: session.subscription as string,
          })
          // @ts-expect-error
          .eq('id', userId)

        // Record transaction
        await supabase.from('payment_transactions')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          user_id: userId,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_subscription_id: session.subscription as string,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          status: 'succeeded',
          plan_type: planType,
        })

        // Track analytics
        await trackPremiumConverted(
          userId,
          (profile as any)?.total_comparisons || 0,
          planType
        )

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (!userId) break

        // Update premium expiry
        const premiumExpires = new Date((subscription as any).current_period_end * 1000)

        await supabase
          .from('user_profiles')
          // @ts-expect-error - Supabase type inference issue
          .update({
            is_premium: subscription.status === 'active',
            premium_expires: premiumExpires.toISOString(),
          })
          // @ts-expect-error
          .eq('id', userId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (!userId) break

        // Cancel premium
        await supabase
          .from('user_profiles')
          // @ts-expect-error - Supabase type inference issue
          .update({
            is_premium: false,
            premium_expires: new Date().toISOString(),
          })
          // @ts-expect-error
          .eq('id', userId)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscription = await stripe.subscriptions.retrieve(
          (invoice as any).subscription as string
        )
        const userId = (subscription as any).metadata?.supabase_user_id

        if (!userId) break

        // Record failed transaction
        await supabase.from('payment_transactions')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          user_id: userId,
          stripe_payment_intent_id: (invoice as any).payment_intent as string,
          stripe_subscription_id: (invoice as any).subscription as string,
          amount: ((invoice as any).amount_due || 0) / 100,
          currency: (invoice as any).currency?.toUpperCase() || 'USD',
          status: 'failed',
        })

        // TODO: Send email notification about failed payment

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
