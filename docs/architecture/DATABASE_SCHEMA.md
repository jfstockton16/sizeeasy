# Database Schema Documentation

**Last Updated:** 2025-11-06
**Database:** Supabase PostgreSQL
**Purpose:** Complete documentation of all tables, relationships, indexes, and constraints

---

## Table of Contents
1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Tables](#tables)
3. [Relationships](#relationships)
4. [Database Functions](#database-functions)
5. [Indexes](#indexes)
6. [Common Queries](#common-queries)

---

## Entity Relationship Diagram

```
┌──────────────────┐          ┌──────────────────┐
│  user_profiles   │◄─────────┤ comparison_history│
│                  │ 1      * │                  │
│ • id (PK)        │          │ • id (PK)        │
│ • email          │          │ • user_id (FK)   │
│ • credits        │          │ • cache_entry_id │
│ • is_premium     │          │ • cost           │
│ • stripe_cust_id │          │ • views          │
│ • referral_code  │          └──────┬───────────┘
└─────┬─────┬──────┘                 │
      │     │                        │
      │     │                        │
      │     └────────┐               │
      │              │               │
      │         ┌────▼─────┐    ┌────▼──────────────┐
      │         │referrals │    │comparisons_cache  │
      │         │          │    │                   │
      │    *    │• id (PK) │    │• id (PK)          │
      ├─────────┤• referrer│    │• object1_name     │
      │         │• referred│    │• object2_name     │
      │         │• credits │    │• dimensions       │
      │         └──────────┘    │• model_urls       │
      │                         │• times_served (!)  │
      │                         │• quality_tier     │
      │         ┌──────────────┐└───────────────────┘
      │         │social_shares │
      │    *    │              │
      ├─────────┤• id (PK)     │
      │         │• user_id (FK)│
      │         │• platform    │
      │         │• credits_awrd│
      │         └──────────────┘
      │
      │         ┌───────────────────┐
      │    *    │analytics_events   │
      └─────────┤• id (PK)          │
                │• user_id (FK)     │
                │• event_name       │
                │• event_data (JSON)│
                └───────────────────┘

      ┌─────────────────────┐
      │payment_transactions │
      │• id (PK)            │
      │• user_id (FK)       │
      │• stripe_payment_id  │
      │• amount             │
      │• status             │
      └─────────────────────┘
```

---

## Tables

### 1. user_profiles

**Purpose:** Central user account information, credits, and premium status

**Location:** Used by `/lib/credits.ts`, `/app/api/credits/*`

```sql
CREATE TABLE user_profiles (
  -- Identity
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,

  -- Credit System
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  credits_reset_time TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  total_credits_earned INTEGER NOT NULL DEFAULT 0,

  -- Premium Status
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_expires TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Usage Stats
  total_comparisons INTEGER NOT NULL DEFAULT 0,
  comparisons_this_month INTEGER NOT NULL DEFAULT 0,
  last_comparison_at TIMESTAMPTZ,

  -- Referral System
  referral_code TEXT UNIQUE NOT NULL DEFAULT generate_referral_code(),
  referred_by TEXT REFERENCES user_profiles(referral_code),
  referral_credits_earned INTEGER NOT NULL DEFAULT 0,

  -- Special Status
  is_founder BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Fields:**
- `credits_remaining`: Decrements on each comparison (if not premium)
- `credits_reset_time`: When credits reset to 5 (or 20 for founders)
- `is_premium`: If true, unlimited comparisons (check premium_expires)
- `referral_code`: Unique code user shares (e.g., "ABC123")
- `referred_by`: Code of user who referred them

**Indexes:**
```sql
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX idx_user_profiles_premium ON user_profiles(is_premium) WHERE is_premium = true;
```

**Common Issues:**
- **Credits not resetting:** Check `credits_reset_time` is in the past, run `reset_user_credits(user_id)`
- **Premium not working:** Verify `premium_expires > NOW()`
- **Referral not found:** Check `referral_code` exists and matches exactly (case-sensitive)

---

### 2. comparisons_cache

**Purpose:** Global cache of all generated comparisons, reused across all users

**Location:** Used by `/lib/comparison-cache.ts`

**CRITICAL:** This table saves us money! High cache hit rate = lower API costs.

```sql
CREATE TABLE comparisons_cache (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Cache Key (normalized, alphabetical)
  object1_name TEXT NOT NULL,
  object2_name TEXT NOT NULL,
  quality_tier TEXT NOT NULL DEFAULT 'free' CHECK (quality_tier IN ('free', 'premium')),

  -- Dimensions (JSON: {length, width, height, unit})
  object1_dimensions JSONB NOT NULL,
  object2_dimensions JSONB NOT NULL,

  -- Generated Assets
  object1_model_url TEXT,          -- 3D model URL (optional)
  object2_model_url TEXT,
  object1_thumbnail_url TEXT,      -- 3D thumbnail
  object2_thumbnail_url TEXT,
  comparison_image_url TEXT,       -- Main 2D comparison image

  -- Metrics
  generation_cost NUMERIC(10, 4) NOT NULL DEFAULT 0.02,
  times_served INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_served_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint ensures one entry per comparison per tier
  CONSTRAINT unique_comparison_per_tier
    UNIQUE (object1_name, object2_name, quality_tier)
);
```

**Key Fields:**
- `object1_name`, `object2_name`: Normalized, lowercase, alphabetical order
- `times_served`: Increments each time cache is hit (useful metric!)
- `quality_tier`: 'free' (with watermark) or 'premium' (no watermark)
- `generation_cost`: Actual cost to generate (for ROI tracking)

**Example Data:**
```sql
INSERT INTO comparisons_cache VALUES (
  uuid_generate_v4(),
  'bmw x4',           -- Alphabetically first
  'elephant',         -- Alphabetically second
  'free',
  '{"length": 4.75, "width": 1.92, "height": 1.62, "unit": "meters"}',
  '{"length": 6.0, "width": 3.2, "height": 4.0, "unit": "meters"}',
  NULL, NULL, NULL, NULL,
  'https://storage.supabase.co/comparisons/bmw-elephant-123.jpg',
  0.055,  -- Cost of generation
  37,     -- Served 37 times (saved 36 × $0.055 = $1.98!)
  '2024-11-01 10:00:00',
  '2024-11-06 15:30:00'
);
```

**Indexes:**
```sql
-- Primary lookup index (CRITICAL for performance)
CREATE UNIQUE INDEX idx_cache_lookup
  ON comparisons_cache(object1_name, object2_name, quality_tier);

-- Find popular comparisons
CREATE INDEX idx_cache_times_served
  ON comparisons_cache(times_served DESC);

-- Cleanup old entries
CREATE INDEX idx_cache_last_served
  ON comparisons_cache(last_served_at);
```

**Cache Invalidation:**
```sql
-- Delete entries not served in 90 days (cost savings diminishes over time)
DELETE FROM comparisons_cache
WHERE last_served_at < NOW() - INTERVAL '90 days'
  AND times_served <= 2;
```

**Common Issues:**
- **Cache not hitting:** Check object names are normalized (lowercase, trimmed)
- **Duplicate cache entries:** Unique constraint should prevent this
- **Cache growing too large:** Run cleanup query above

---

### 3. comparison_history

**Purpose:** User's personal comparison history (what they've generated/viewed)

**Location:** Used by `/lib/comparison-cache.ts` → `saveComparisonToHistory()`

```sql
CREATE TABLE comparison_history (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- What was compared
  object1_name TEXT NOT NULL,
  object2_name TEXT NOT NULL,
  object1_dimensions JSONB NOT NULL,
  object2_dimensions JSONB NOT NULL,

  -- How it was served
  from_cache BOOLEAN NOT NULL DEFAULT false,
  cache_entry_id UUID REFERENCES comparisons_cache(id),
  cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
  was_premium_at_time BOOLEAN NOT NULL DEFAULT false,

  -- Engagement metrics
  views INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Fields:**
- `from_cache`: If true, cost = 0 (served from cache)
- `cache_entry_id`: Links to global cache entry (if applicable)
- `cost`: Actual cost incurred (0 if from cache, ~$0.055 if new)
- `was_premium_at_time`: User's premium status when generated

**Indexes:**
```sql
CREATE INDEX idx_history_user_id ON comparison_history(user_id);
CREATE INDEX idx_history_created_at ON comparison_history(created_at DESC);
CREATE INDEX idx_history_cache_entry ON comparison_history(cache_entry_id);
```

**Common Queries:**
```sql
-- User's recent comparisons
SELECT * FROM comparison_history
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;

-- User's total spend this month
SELECT SUM(cost) as total_spend
FROM comparison_history
WHERE user_id = 'user-uuid'
  AND created_at >= date_trunc('month', NOW());

-- Cache hit rate for user
SELECT
  COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) as cache_hit_rate
FROM comparison_history
WHERE user_id = 'user-uuid';
```

---

### 4. referrals

**Purpose:** Track referral relationships and credit rewards

**Location:** Used by `/lib/credits.ts` → `awardReferralCredits()`

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES user_profiles(id),
  referred_user_id UUID NOT NULL REFERENCES user_profiles(id),
  credits_awarded INTEGER NOT NULL DEFAULT 10,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,

  -- Prevent duplicate referrals
  CONSTRAINT unique_referral UNIQUE (referrer_id, referred_user_id)
);
```

**How It Works:**
1. User A shares referral code "ABC123"
2. User B signs up with code "ABC123"
3. System creates referral record
4. User A gets 10 bonus credits
5. Both users notified

**Indexes:**
```sql
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
```

**Common Queries:**
```sql
-- How many users has someone referred?
SELECT COUNT(*) as total_referrals
FROM referrals
WHERE referrer_id = 'user-uuid';

-- Total credits earned from referrals
SELECT SUM(credits_awarded) as total_credits
FROM referrals
WHERE referrer_id = 'user-uuid'
  AND reward_claimed = true;
```

---

### 5. social_shares

**Purpose:** Track social media shares and credit rewards

**Location:** Used by `/lib/credits.ts` → `awardShareCredits()`

```sql
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  comparison_history_id UUID REFERENCES comparison_history(id),
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'linkedin', 'other')),
  share_url TEXT,
  credits_awarded INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**How It Works:**
1. User shares comparison on Twitter
2. System records share event
3. User gets +2 credits immediately
4. Can share multiple comparisons

**Indexes:**
```sql
CREATE INDEX idx_shares_user_id ON social_shares(user_id);
CREATE INDEX idx_shares_platform ON social_shares(platform);
CREATE INDEX idx_shares_created_at ON social_shares(created_at DESC);
```

**Anti-Abuse:**
```sql
-- Limit: 5 shares per day per user
SELECT COUNT(*) FROM social_shares
WHERE user_id = 'user-uuid'
  AND created_at > NOW() - INTERVAL '24 hours';
-- If >= 5, deny share reward
```

---

### 6. analytics_events

**Purpose:** General-purpose event tracking for analytics and debugging

**Location:** Used by `/lib/analytics.ts`

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  event_name TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Common Events:**
- `comparison_created` - User generated a comparison
- `cache_hit` - Comparison served from cache
- `cache_miss` - Had to generate new comparison
- `credit_depleted` - User ran out of credits
- `premium_upgrade` - User upgraded to premium
- `viral_credits_awarded` - Comparison hit 100+ views

**Indexes:**
```sql
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_event_data ON analytics_events USING GIN(event_data);
```

**Example Queries:**
```sql
-- Daily active users
SELECT COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at >= CURRENT_DATE
  AND event_name IN ('comparison_created', 'page_view');

-- Popular objects
SELECT
  event_data->>'object1' as object,
  COUNT(*) as comparisons
FROM analytics_events
WHERE event_name = 'comparison_created'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_data->>'object1'
ORDER BY comparisons DESC
LIMIT 20;
```

---

### 7. payment_transactions

**Purpose:** Stripe payment history and subscription tracking

**Location:** Used by `/app/api/stripe/webhook/route.ts`

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_payments_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payments_stripe_payment ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payment_transactions(status);
```

**Webhook Flow:**
1. User clicks "Upgrade to Premium"
2. Stripe checkout session created
3. User pays
4. Stripe sends webhook
5. We insert `payment_transactions` record
6. We update `user_profiles.is_premium = true`

---

## Database Functions

### 1. deduct_credit(p_user_id UUID)

**Purpose:** Atomically decrement user's credits

**File:** SQL migration (should be in `/supabase/migrations/`)

```sql
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Atomically decrement and return new value
  UPDATE user_profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id
    AND credits_remaining > 0
    AND (NOT is_premium OR premium_expires < NOW())
  RETURNING credits_remaining INTO v_credits;

  -- Return success if row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

**Why Atomic:** Prevents race conditions where two requests check credits simultaneously

**Usage:**
```typescript
const { data, error } = await supabase.rpc('deduct_credit', {
  p_user_id: userId
});
// data = true if success, false if no credits
```

---

### 2. add_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT)

**Purpose:** Add credits to user (for rewards)

```sql
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'reward'
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET
    credits_remaining = credits_remaining + p_amount,
    total_credits_earned = total_credits_earned + p_amount
  WHERE id = p_user_id;

  -- Log the credit addition
  INSERT INTO analytics_events (user_id, event_name, event_data)
  VALUES (p_user_id, 'credits_added', jsonb_build_object(
    'amount', p_amount,
    'reason', p_reason
  ));
END;
$$ LANGUAGE plpgsql;
```

---

### 3. reset_daily_credits()

**Purpose:** Cron job to reset credits for all users at midnight

**Scheduled:** Run daily at 00:00 UTC

```sql
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET
    credits_remaining = CASE
      WHEN is_founder THEN 20
      ELSE 5
    END,
    credits_reset_time = NOW() + INTERVAL '24 hours'
  WHERE credits_reset_time <= NOW()
    AND (NOT is_premium OR premium_expires < NOW());
END;
$$ LANGUAGE plpgsql;
```

**Setup Cron:**
```sql
-- Using pg_cron extension
SELECT cron.schedule(
  'reset-daily-credits',
  '0 0 * * *',  -- Every day at midnight
  'SELECT reset_daily_credits();'
);
```

---

## Common Queries

### Check System Health

```sql
-- Cache hit rate (last 24 hours)
SELECT
  COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) as cache_hit_rate,
  COUNT(*) as total_comparisons,
  COUNT(*) FILTER (WHERE from_cache) as cache_hits,
  COUNT(*) FILTER (WHERE NOT from_cache) as cache_misses,
  SUM(cost) as total_cost_incurred
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Daily active users
SELECT DATE(created_at) as day, COUNT(DISTINCT user_id) as dau
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Premium conversion rate
SELECT
  COUNT(*) FILTER (WHERE is_premium) * 100.0 / COUNT(*) as premium_rate
FROM user_profiles;
```

### Find Abusive Users

```sql
-- Users generating too many comparisons
SELECT
  user_id,
  COUNT(*) as comparisons_today,
  SUM(cost) as cost_today
FROM comparison_history
WHERE created_at > CURRENT_DATE
GROUP BY user_id
HAVING COUNT(*) > 50
ORDER BY comparisons_today DESC;

-- Users sharing too frequently (possible abuse)
SELECT
  user_id,
  COUNT(*) as shares_today,
  SUM(credits_awarded) as credits_from_shares
FROM social_shares
WHERE created_at > CURRENT_DATE
GROUP BY user_id
HAVING COUNT(*) > 10
ORDER BY shares_today DESC;
```

---

## Backup and Recovery

### Supabase Automatic Backups
- **Daily backups:** Retained for 7 days (Pro plan)
- **Point-in-time recovery:** Available (Pro plan)

### Manual Backup
```bash
# Backup entire database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20241106.sql
```

### Critical Tables (Priority Order)
1. `user_profiles` - User accounts and credits
2. `payment_transactions` - Financial records
3. `comparisons_cache` - Expensive to regenerate
4. `comparison_history` - User data
5. `referrals`, `social_shares` - Less critical
6. `analytics_events` - Can be regenerated

---

## Related Documentation

- **System Overview:** `/docs/architecture/SYSTEM_OVERVIEW.md`
- **API Flow:** `/docs/architecture/API_FLOW.md`
- **Type Definitions:** `/lib/types/database.ts`
- **Supabase Dashboard:** https://app.supabase.com/project/YOUR_PROJECT_ID
