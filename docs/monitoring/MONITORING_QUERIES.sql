/**
 * Monitoring & Health Check SQL Queries
 *
 * Purpose: Daily health checks and system monitoring
 * Run these queries every morning to check system health
 *
 * Quick Start: psql $DATABASE_URL -f docs/monitoring/MONITORING_QUERIES.sql
 *
 * Last Updated: 2025-11-06
 */

-- ============================================================================
-- SYSTEM HEALTH DASHBOARD
-- ============================================================================

\echo '=== SYSTEM HEALTH DASHBOARD ==='
\echo ''

-- 1. Daily Active Users (DAU)
\echo '1. Daily Active Users (Last 7 Days)'
SELECT
  DATE(created_at) as day,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_comparisons,
  COUNT(*) / COUNT(DISTINCT user_id) as avg_comparisons_per_user
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

\echo ''

-- 2. Cache Performance
\echo '2. Cache Performance (Last 24 Hours)'
SELECT
  COUNT(*) FILTER (WHERE from_cache) as cache_hits,
  COUNT(*) FILTER (WHERE NOT from_cache) as cache_misses,
  COUNT(*) as total_requests,
  ROUND(COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*), 2) as cache_hit_rate_pct,
  SUM(cost) as total_cost,
  SUM(CASE WHEN from_cache THEN 0 ELSE cost END) as actual_cost,
  SUM(CASE WHEN from_cache THEN cost ELSE 0 END) as cost_saved
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours';

\echo ''

-- 3. API Cost Analysis (Today)
\echo '3. API Cost Analysis (Today)'
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as comparisons,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*), 2) as cache_hit_rate
FROM comparison_history
WHERE created_at >= CURRENT_DATE
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

\echo ''

-- 4. Premium Conversion
\echo '4. Premium User Statistics'
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_premium AND premium_expires > NOW()) as active_premium,
  COUNT(*) FILTER (WHERE is_premium AND premium_expires < NOW()) as expired_premium,
  ROUND(COUNT(*) FILTER (WHERE is_premium AND premium_expires > NOW()) * 100.0 / COUNT(*), 2) as premium_rate_pct,
  SUM(total_comparisons) as total_comparisons_all_time
FROM user_profiles;

\echo ''

-- 5. Credit System Health
\echo '5. Credit System Status'
SELECT
  AVG(credits_remaining) as avg_credits_remaining,
  COUNT(*) FILTER (WHERE credits_remaining = 0) as users_out_of_credits,
  COUNT(*) FILTER (WHERE credits_remaining > 0) as users_with_credits,
  COUNT(*) FILTER (WHERE is_founder) as founder_users
FROM user_profiles
WHERE NOT is_premium;

\echo ''

-- ============================================================================
-- COST & ABUSE MONITORING
-- ============================================================================

\echo '=== COST & ABUSE MONITORING ==='
\echo ''

-- 6. Top Spenders Today
\echo '6. Top 10 Spenders (Today)'
SELECT
  up.email,
  up.is_premium,
  COUNT(*) as comparisons_today,
  SUM(ch.cost) as total_cost_today,
  COUNT(*) FILTER (WHERE ch.from_cache) as cache_hits,
  COUNT(*) FILTER (WHERE NOT ch.from_cache) as new_generations
FROM comparison_history ch
JOIN user_profiles up ON ch.user_id = up.id
WHERE ch.created_at >= CURRENT_DATE
GROUP BY up.id, up.email, up.is_premium
ORDER BY total_cost_today DESC
LIMIT 10;

\echo ''

-- 7. Suspicious Activity Patterns
\echo '7. Potential Abuse Detection'
-- Users making many identical requests
SELECT
  user_id,
  object1_name,
  object2_name,
  COUNT(*) as duplicate_requests,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request,
  MAX(created_at) - MIN(created_at) as time_span
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, object1_name, object2_name
HAVING COUNT(*) > 5
ORDER BY duplicate_requests DESC
LIMIT 10;

\echo ''

-- 8. Hourly Cost Trajectory
\echo '8. Cost Trajectory (Last 24 Hours)'
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  SUM(cost) as hourly_cost,
  COUNT(*) as requests,
  AVG(cost) as avg_cost_per_request
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

\echo ''

-- ============================================================================
-- CACHE EFFICIENCY
-- ============================================================================

\echo '=== CACHE EFFICIENCY METRICS ==='
\echo ''

-- 9. Most Popular Cached Comparisons
\echo '9. Top 20 Most Popular Cached Comparisons'
SELECT
  object1_name,
  object2_name,
  quality_tier,
  times_served,
  generation_cost,
  (times_served - 1) * generation_cost as total_cost_saved,
  last_served_at,
  AGE(NOW(), created_at) as cache_age
FROM comparisons_cache
ORDER BY times_served DESC
LIMIT 20;

\echo ''

-- 10. Cache Growth Rate
\echo '10. Cache Growth (Last 30 Days)'
SELECT
  DATE(created_at) as day,
  COUNT(*) as new_cache_entries,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_entries
FROM comparisons_cache
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

\echo ''

-- 11. Cache Value Analysis
\echo '11. Cache ROI Analysis'
SELECT
  COUNT(*) as total_cache_entries,
  SUM(times_served) as total_serves,
  SUM((times_served - 1) * generation_cost) as total_cost_saved,
  AVG(times_served) as avg_serves_per_entry,
  SUM(CASE WHEN times_served = 1 THEN 1 ELSE 0 END) as single_use_entries,
  ROUND(SUM(CASE WHEN times_served = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as single_use_pct
FROM comparisons_cache;

\echo ''

-- ============================================================================
-- PAYMENT & REVENUE TRACKING
-- ============================================================================

\echo '=== PAYMENT & REVENUE ==='
\echo ''

-- 12. Revenue This Month
\echo '12. Revenue Summary (This Month)'
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_revenue,
  COUNT(DISTINCT user_id) as unique_paying_users,
  COUNT(*) FILTER (WHERE plan_type = 'monthly') as monthly_subs,
  COUNT(*) FILTER (WHERE plan_type = 'yearly') as yearly_subs
FROM payment_transactions
WHERE created_at >= DATE_TRUNC('month', NOW());

\echo ''

-- 13. Churn Analysis
\echo '13. Premium Churn (Expired in Last 30 Days)'
SELECT
  COUNT(*) as churned_users,
  AVG(total_comparisons) as avg_comparisons_before_churn,
  AVG(comparisons_this_month) as avg_comparisons_last_month
FROM user_profiles
WHERE is_premium = true
  AND premium_expires BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  AND premium_expires < NOW();

\echo ''

-- ============================================================================
-- ERROR MONITORING
-- ============================================================================

\echo '=== ERROR TRACKING ==='
\echo ''

-- 14. Error Frequency (Last 24 Hours)
\echo '14. Most Common Errors (Last 24 Hours)'
SELECT
  event_data->>'error_code' as error_code,
  event_data->>'error_name' as error_name,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(created_at) as last_occurrence
FROM analytics_events
WHERE event_name = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_data->>'error_code', event_data->>'error_name'
ORDER BY occurrences DESC
LIMIT 10;

\echo ''

-- ============================================================================
-- ENGAGEMENT METRICS
-- ============================================================================

\echo '=== USER ENGAGEMENT ==='
\echo ''

-- 15. User Cohort Analysis
\echo '15. User Cohorts (Sign-up Week Performance)'
SELECT
  DATE_TRUNC('week', up.created_at) as signup_week,
  COUNT(DISTINCT up.id) as users_signed_up,
  COUNT(DISTINCT ch.user_id) as users_who_made_comparison,
  ROUND(COUNT(DISTINCT ch.user_id) * 100.0 / COUNT(DISTINCT up.id), 2) as activation_rate,
  SUM(CASE WHEN ch.created_at IS NOT NULL THEN 1 ELSE 0 END) as total_comparisons,
  AVG(CASE WHEN ch.created_at IS NOT NULL THEN 1 ELSE 0 END) as avg_comparisons_per_active_user
FROM user_profiles up
LEFT JOIN comparison_history ch ON up.id = ch.user_id
WHERE up.created_at > NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', up.created_at)
ORDER BY signup_week DESC;

\echo ''

-- 16. Retention Analysis
\echo '16. User Retention (7-Day Return Rate)'
SELECT
  DATE_TRUNC('week', first_comparison) as cohort_week,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN returned_day_7 THEN user_id END) as returned_users,
  ROUND(COUNT(DISTINCT CASE WHEN returned_day_7 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id), 2) as retention_rate
FROM (
  SELECT
    user_id,
    MIN(created_at) as first_comparison,
    BOOL_OR(created_at > MIN(created_at) + INTERVAL '7 days') as returned_day_7
  FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '60 days'
  GROUP BY user_id
) cohorts
GROUP BY DATE_TRUNC('week', first_comparison)
ORDER BY cohort_week DESC;

\echo ''

-- ============================================================================
-- REFERRAL PROGRAM PERFORMANCE
-- ============================================================================

\echo '=== REFERRAL PROGRAM ==='
\echo ''

-- 17. Referral Success Rate
\echo '17. Referral Program Statistics'
SELECT
  COUNT(*) as total_referrals,
  COUNT(DISTINCT referrer_id) as users_who_referred,
  COUNT(*) / COUNT(DISTINCT referrer_id) as avg_referrals_per_referrer,
  SUM(credits_awarded) as total_credits_awarded,
  COUNT(*) FILTER (WHERE reward_claimed) as rewards_claimed
FROM referrals
WHERE created_at > NOW() - INTERVAL '30 days';

\echo ''

-- 18. Top Referrers
\echo '18. Top 10 Referrers (All Time)'
SELECT
  up.email,
  COUNT(*) as total_referrals,
  SUM(r.credits_awarded) as total_credits_earned,
  MIN(r.created_at) as first_referral,
  MAX(r.created_at) as latest_referral
FROM referrals r
JOIN user_profiles up ON r.referrer_id = up.id
GROUP BY up.id, up.email
ORDER BY total_referrals DESC
LIMIT 10;

\echo ''

-- ============================================================================
-- DATABASE PERFORMANCE
-- ============================================================================

\echo '=== DATABASE PERFORMANCE ==='
\echo ''

-- 19. Table Sizes
\echo '19. Database Table Sizes'
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''

-- 20. Slow Queries (if pg_stat_statements enabled)
\echo '20. Slowest Queries (Requires pg_stat_statements)'
SELECT
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms,
  ROUND(total_exec_time::numeric, 2) as total_time_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

\echo ''

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

\echo '=== AUTOMATED RECOMMENDATIONS ==='
\echo ''

-- Cache eviction candidates
\echo '21. Cache Entries to Consider Removing (>90 days old, <3 serves)'
SELECT
  COUNT(*) as entries_to_remove,
  SUM(generation_cost) as total_generation_cost,
  SUM((times_served - 1) * generation_cost) as total_value_generated
FROM comparisons_cache
WHERE last_served_at < NOW() - INTERVAL '90 days'
  AND times_served < 3;

\echo ''

-- Index usage
\echo '22. Unused Indexes (Consider Dropping)'
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

\echo ''

\echo '=== END OF HEALTH CHECK ==='
\echo 'Generated at:'
SELECT NOW();
