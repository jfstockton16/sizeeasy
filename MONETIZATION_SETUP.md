# SizeEasy Monetization System Setup Guide

This guide will help you set up the complete monetization system for SizeEasy, including user authentication, credit management, premium subscriptions, and payment processing.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup (Supabase)](#database-setup-supabase)
4. [Payment Setup (Stripe)](#payment-setup-stripe)
5. [Environment Variables](#environment-variables)
6. [Testing](#testing)
7. [Launch Checklist](#launch-checklist)

---

## Overview

The SizeEasy monetization system includes:

- **Free Tier**: 5 daily credits (refreshes at midnight)
- **First-time Bonus**: 10 credits on signup
- **Premium Tier**: $3.99/month or $29.99/year (25% discount)
- **Viral Rewards**: Credits for sharing and referrals
- **Cache-First Architecture**: Minimize API costs by caching comparisons

### Key Features

✅ User authentication with Supabase
✅ Daily credit system with automatic refresh
✅ Premium subscription management with Stripe
✅ Comparison caching to reduce costs
✅ Social sharing rewards (+2 credits)
✅ Referral system (+10 credits per referral)
✅ Analytics tracking for conversion metrics
✅ Watermarks for free tier users
✅ HD exports for premium users

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- A Stripe account (test mode to start)
- Basic knowledge of SQL and TypeScript

---

## Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose a name, database password, and region
4. Wait for the project to be created (~2 minutes)

### Step 2: Run Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_initial_monetization_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (this will create all tables, functions, and policies)

### Step 3: Verify Tables

Go to **Table Editor** and verify these tables exist:

- `user_profiles`
- `comparisons_cache`
- `comparison_history`
- `referrals`
- `social_shares`
- `analytics_events`
- `payment_transactions`

### Step 4: Get API Keys

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ KEEP SECRET - never expose to client)

### Step 5: Configure Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google**, **GitHub**, etc. for social login
4. Go to **Authentication** > **URL Configuration**
5. Set **Site URL** to your production domain (e.g., `https://sizeeasy.com`)
6. Add **Redirect URLs**:
   - `http://localhost:3000/**` (for development)
   - `https://sizeeasy.com/**` (for production)

---

## Payment Setup (Stripe)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Activate your account (you can test in test mode first)

### Step 2: Create Products

1. Go to **Products** > **Add Product**

**Monthly Plan:**
- Name: "SizeEasy Premium - Monthly"
- Description: "Unlimited comparisons, no watermarks, HD exports"
- Pricing: $3.99 USD / month
- Recurring: Monthly
- Copy the **Price ID** (starts with `price_...`)

**Yearly Plan:**
- Name: "SizeEasy Premium - Yearly"
- Description: "Unlimited comparisons, no watermarks, HD exports (25% discount)"
- Pricing: $29.99 USD / year
- Recurring: Yearly
- Copy the **Price ID** (starts with `price_...`)

### Step 3: Get API Keys

1. Go to **Developers** > **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)

### Step 4: Set Up Webhook

1. Go to **Developers** > **Webhooks**
2. Click **Add Endpoint**
3. Set **Endpoint URL** to: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_...`)

### Step 5: Test Mode

- Use test credit cards from [Stripe docs](https://stripe.com/docs/testing)
- Test card: `4242 4242 4242 4242` (any future expiry, any CVC)

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Fill in the values:

```env
# Replicate API (for AI image generation)
REPLICATE_API_TOKEN=your_replicate_token_here

# OpenAI API (for fetching object dimensions)
OPENAI_API_KEY=your_openai_api_key_here

# Meshy API (for 3D model generation)
MESHY_API_KEY=your_meshy_api_key_here

# Supabase (Database & Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (Payment Processing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_monthly_id
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_yearly_id

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL when deploying
```

⚠️ **IMPORTANT**: Never commit `.env.local` to Git! It's already in `.gitignore`.

---

## Testing

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Test Authentication

1. Open `http://localhost:3000`
2. Click "Sign In" in the navigation
3. Create a new account
4. Verify email (check Supabase logs if email isn't sent)
5. Check Supabase **Table Editor** > `user_profiles` - you should see your user

### Test Credits

1. Sign in to your test account
2. You should see "10 credits left" in the navigation (first-time bonus)
3. Create a comparison (e.g., "car vs airplane")
4. Check that credits decrease to 9
5. Check Supabase **Table Editor** > `comparison_history` - you should see the comparison

### Test Cache

1. Create the same comparison again
2. It should load instantly (from cache)
3. Credits should NOT decrease
4. Check Supabase **Table Editor** > `comparisons_cache` - `times_served` should be 2

### Test Premium Upgrade

1. Click "Upgrade to Premium" in the navigation
2. Select a plan (Monthly or Yearly)
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. You should be redirected back with "UNLIMITED" badge
6. Check Supabase **Table Editor** > `user_profiles` - `is_premium` should be `true`

### Test Webhooks (Locally)

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret (whsec_...)
# Update STRIPE_WEBHOOK_SECRET in .env.local
```

---

## Launch Checklist

Before going live, complete these steps:

### Pre-Launch

- [ ] Test all user flows (signup, login, create comparison, upgrade)
- [ ] Test payment flow with Stripe test cards
- [ ] Verify webhook handling (check Stripe dashboard > Webhooks > Events)
- [ ] Test credit system (daily refresh, deductions, rewards)
- [ ] Test cache system (verify cost savings)
- [ ] Review Supabase Row Level Security policies
- [ ] Set up email templates in Supabase (welcome, reset password)
- [ ] Configure rate limiting (Vercel or Cloudflare)

### Launch Day

- [ ] Switch Stripe from test mode to live mode
- [ ] Update `.env` with production API keys
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set up production webhook URL in Stripe
- [ ] Enable Vercel Analytics or Google Analytics
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Create backup of Supabase database
- [ ] Test one full payment flow in production

### Post-Launch

- [ ] Monitor Stripe dashboard for payments
- [ ] Monitor Supabase logs for errors
- [ ] Check cache hit rate (should be >40% after first week)
- [ ] Track conversion metrics (free → premium)
- [ ] Set up automated backups
- [ ] Plan A/B tests for pricing/features

---

## Cost Optimization Tips

### 1. Cache Aggressively

The cache system is your biggest cost saver. Current implementation:

- Check cache BEFORE any API call
- Cache every comparison (object1 + object2 pair)
- Serve repeat requests for $0

**Expected Savings**: After 1 month, 40%+ of requests will be cache hits.

### 2. Monitor API Costs

Track costs in the `comparison_history` table:

```sql
-- Total API cost
SELECT SUM(cost) as total_cost FROM comparison_history;

-- Average cost per user
SELECT
  user_id,
  COUNT(*) as comparisons,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost
FROM comparison_history
GROUP BY user_id;

-- Cache hit rate
SELECT
  from_cache,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM comparison_history
GROUP BY from_cache;
```

### 3. Set Usage Limits

Free tier limits are already configured:
- 5 credits per day
- Resets at midnight
- Unused credits don't accumulate

This keeps costs predictable: **~$0.20/month per free user** on average.

### 4. Premium User Margins

- Monthly: $3.99 revenue - $0.50 avg cost = **$3.49 profit (87% margin)**
- Yearly: $29.99 revenue - $6.00 avg cost = **$23.99 profit (80% margin)**

Even heavy premium users (100+ comparisons/month) cost <$2 in API fees.

---

## Analytics Dashboard

View key metrics in Supabase:

```sql
-- Conversion funnel
SELECT
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM user_profiles WHERE is_premium = true) as premium_users,
  ROUND((SELECT COUNT(*) FROM user_profiles WHERE is_premium = true) * 100.0 /
        (SELECT COUNT(*) FROM user_profiles), 2) as conversion_rate;

-- Revenue (last 30 days)
SELECT
  plan_type,
  COUNT(*) as transactions,
  SUM(amount) as total_revenue
FROM payment_transactions
WHERE status = 'succeeded'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY plan_type;

-- Most popular comparisons
SELECT
  object1_name,
  object2_name,
  times_served,
  generation_cost,
  ROUND(generation_cost * (times_served - 1), 2) as total_savings
FROM comparisons_cache
ORDER BY times_served DESC
LIMIT 10;

-- Daily active users
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as daily_active_users
FROM comparison_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### Users Not Getting Credits

**Check:**
1. Supabase **Table Editor** > `user_profiles` > `credits_remaining`
2. Verify `credits_reset_time` is in the future
3. Check if user is marked as premium (they don't get credits)
4. Look at Supabase **Logs** for errors

**Fix:**
```sql
-- Manually reset user credits
UPDATE user_profiles
SET credits_remaining = 5,
    credits_reset_time = NOW() + INTERVAL '1 day'
WHERE id = 'user-uuid-here';
```

### Stripe Webhook Not Working

**Check:**
1. Stripe **Developers** > **Webhooks** > **Attempts**
2. Verify endpoint URL is correct
3. Check webhook signing secret matches `.env`
4. Look at **Events** tab for raw webhook payload

**Fix:**
- Test with Stripe CLI: `stripe trigger checkout.session.completed`
- Check Next.js API logs: `npm run dev` output
- Verify webhook handler: `/api/stripe/webhook`

### Cache Not Working

**Check:**
1. Supabase **Table Editor** > `comparisons_cache`
2. Verify objects are normalized (lowercase, trimmed)
3. Check if quality tier matches (free vs premium)

**Fix:**
```sql
-- View cache contents
SELECT
  object1_name,
  object2_name,
  quality_tier,
  times_served
FROM comparisons_cache
ORDER BY created_at DESC;
```

---

## Support

For questions or issues:

1. Check the [GitHub Issues](https://github.com/yourusername/sizeeasy/issues)
2. Review Supabase docs: [supabase.com/docs](https://supabase.com/docs)
3. Review Stripe docs: [stripe.com/docs](https://stripe.com/docs)
4. Contact: support@sizeeasy.com

---

## License

This monetization system is part of SizeEasy. All rights reserved.
