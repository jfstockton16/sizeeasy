-- SizeEasy Monetization Database Schema
-- This migration creates all tables needed for the credit system, premium subscriptions, and comparison caching

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,

  -- Credit System
  credits_remaining INTEGER NOT NULL DEFAULT 10, -- First-time users get 10 bonus credits
  credits_reset_time TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day'),
  total_credits_earned INTEGER NOT NULL DEFAULT 10,

  -- Premium Subscription
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_expires TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Usage Stats
  total_comparisons INTEGER NOT NULL DEFAULT 0,
  comparisons_this_month INTEGER NOT NULL DEFAULT 0,
  last_comparison_at TIMESTAMPTZ,

  -- Referral System
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES user_profiles(id),
  referral_credits_earned INTEGER NOT NULL DEFAULT 0,

  -- Launch Week Special
  is_founder BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT credits_positive CHECK (credits_remaining >= 0)
);

-- Index for faster lookups
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_premium ON user_profiles(is_premium) WHERE is_premium = TRUE;

-- Comparisons Cache Table (avoid duplicate API calls)
CREATE TABLE comparisons_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Object identifiers (normalized for cache key)
  object1_name TEXT NOT NULL,
  object2_name TEXT NOT NULL,

  -- Cached data
  object1_dimensions JSONB NOT NULL,
  object2_dimensions JSONB NOT NULL,

  -- 3D Model URLs (if generated)
  object1_model_url TEXT,
  object2_model_url TEXT,
  object1_thumbnail_url TEXT,
  object2_thumbnail_url TEXT,

  -- Image URLs (if generated)
  comparison_image_url TEXT,

  -- Cost tracking
  generation_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.02,
  times_served INTEGER NOT NULL DEFAULT 1,
  total_savings DECIMAL(10, 2) GENERATED ALWAYS AS (generation_cost * (times_served - 1)) STORED,

  -- Quality tier (for premium vs free)
  quality_tier TEXT NOT NULL DEFAULT 'free' CHECK (quality_tier IN ('free', 'premium')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_served_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on object pair (order-independent)
  CONSTRAINT unique_comparison_pair UNIQUE (
    LEAST(object1_name, object2_name),
    GREATEST(object1_name, object2_name),
    quality_tier
  )
);

-- Indexes for cache lookups
CREATE INDEX idx_comparisons_cache_lookup ON comparisons_cache(
  LEAST(object1_name, object2_name),
  GREATEST(object1_name, object2_name)
);
CREATE INDEX idx_comparisons_cache_popular ON comparisons_cache(times_served DESC);

-- Comparison History Table (track user activity)
CREATE TABLE comparison_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Comparison details
  object1_name TEXT NOT NULL,
  object2_name TEXT NOT NULL,
  object1_dimensions JSONB NOT NULL,
  object2_dimensions JSONB NOT NULL,

  -- Source (cache hit or new generation)
  from_cache BOOLEAN NOT NULL DEFAULT FALSE,
  cache_entry_id UUID REFERENCES comparisons_cache(id),

  -- Cost tracking
  cost DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  was_premium_at_time BOOLEAN NOT NULL DEFAULT FALSE,

  -- Engagement metrics
  views INTEGER NOT NULL DEFAULT 1,
  shares INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for user's history
  CONSTRAINT idx_user_comparison_history UNIQUE (user_id, id)
);

CREATE INDEX idx_comparison_history_user ON comparison_history(user_id, created_at DESC);
CREATE INDEX idx_comparison_history_popular ON comparison_history(views DESC) WHERE views > 100;

-- Referrals Table (track referral rewards)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  referrer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Reward tracking
  credits_awarded INTEGER NOT NULL DEFAULT 10,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,

  CONSTRAINT unique_referral UNIQUE (referrer_id, referred_user_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_pending ON referrals(reward_claimed) WHERE reward_claimed = FALSE;

-- Social Shares Table (track viral credit rewards)
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comparison_history_id UUID REFERENCES comparison_history(id) ON DELETE SET NULL,

  -- Share details
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'linkedin', 'other')),
  share_url TEXT,

  -- Reward tracking
  credits_awarded INTEGER NOT NULL DEFAULT 2,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_shares_user ON social_shares(user_id, created_at DESC);

-- Analytics Events Table (track monetization metrics)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Event details
  event_name TEXT NOT NULL,
  event_data JSONB,

  -- Session tracking
  session_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);

-- Payment Transactions Table (track Stripe payments)
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Stripe details
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Transaction details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),

  -- Subscription details (if applicable)
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payment_transactions_stripe ON payment_transactions(stripe_payment_intent_id);

-- Functions for automatic credit reset
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET
    credits_remaining = CASE
      WHEN is_founder THEN 20  -- Founders get 20 daily credits during launch week
      ELSE 5                    -- Regular users get 5 daily credits
    END,
    credits_reset_time = credits_reset_time + INTERVAL '1 day'
  WHERE
    is_premium = FALSE  -- Only reset for free users
    AND credits_reset_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Exclude similar chars (I, O, 0, 1)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_referral_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = NEW.referral_code) LOOP
      NEW.referral_code := generate_referral_code();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_referral_code
BEFORE INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code_trigger();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can view their own comparison history
CREATE POLICY "Users can view own history"
ON comparison_history FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own comparisons
CREATE POLICY "Users can insert own history"
ON comparison_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can view their own shares
CREATE POLICY "Users can view own shares"
ON social_shares FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own shares
CREATE POLICY "Users can insert own shares"
ON social_shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON payment_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Comparisons cache is publicly readable (but only service can write)
CREATE POLICY "Cache is publicly readable"
ON comparisons_cache FOR SELECT
TO public
USING (true);

-- Function to check and deduct credits
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INTEGER;
  v_is_premium BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Get current user status
  SELECT credits_remaining, is_premium, credits_reset_time
  INTO v_credits, v_is_premium, v_reset_time
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- Lock row for update

  -- Premium users don't need credits
  IF v_is_premium THEN
    RETURN TRUE;
  END IF;

  -- Check if credits need to be reset
  IF v_reset_time <= NOW() THEN
    PERFORM reset_daily_credits();

    -- Re-fetch updated credits
    SELECT credits_remaining INTO v_credits
    FROM user_profiles
    WHERE id = p_user_id;
  END IF;

  -- Check if user has credits
  IF v_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Deduct credit
  UPDATE user_profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add credits (for rewards)
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT DEFAULT 'reward')
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET
    credits_remaining = credits_remaining + p_amount,
    total_credits_earned = total_credits_earned + p_amount
  WHERE id = p_user_id
  AND is_premium = FALSE;  -- Don't add credits to premium users

  -- Log the event
  INSERT INTO analytics_events (user_id, event_name, event_data)
  VALUES (p_user_id, 'credits_added', jsonb_build_object(
    'amount', p_amount,
    'reason', p_reason
  ));
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with credit tracking and premium status';
COMMENT ON TABLE comparisons_cache IS 'Cached comparisons to avoid duplicate API calls';
COMMENT ON TABLE comparison_history IS 'User comparison history for tracking and analytics';
COMMENT ON TABLE referrals IS 'Referral tracking for viral growth';
COMMENT ON TABLE social_shares IS 'Social share tracking for viral credit rewards';
COMMENT ON TABLE analytics_events IS 'Analytics events for monetization metrics';
COMMENT ON TABLE payment_transactions IS 'Stripe payment transaction history';
COMMENT ON FUNCTION deduct_credit IS 'Deduct one credit from user, returns false if insufficient';
COMMENT ON FUNCTION add_credits IS 'Add credits to user for rewards/referrals';
COMMENT ON FUNCTION reset_daily_credits IS 'Reset daily credits for all free users';
