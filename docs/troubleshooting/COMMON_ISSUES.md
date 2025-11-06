# Common Issues & Solutions

**Last Updated:** 2025-11-06
**Purpose:** Quick reference guide for debugging common problems

---

## Table of Contents
1. [User-Facing Issues](#user-facing-issues)
2. [API/Backend Issues](#apibackend-issues)
3. [Database Issues](#database-issues)
4. [Cost Protection Issues](#cost-protection-issues)
5. [Performance Issues](#performance-issues)

---

## User-Facing Issues

### Issue: "No credits remaining"

**Symptoms:**
- User sees "Out of credits for today"
- User claims they just signed up / haven't used the app

**Diagnosis:**
```bash
# Check user's credit status
psql $DATABASE_URL -c "
  SELECT credits_remaining, credits_reset_time, is_premium, total_comparisons
  FROM user_profiles
  WHERE id = 'USER_ID_HERE';
"
```

**Common Causes:**
1. Credits actually used up (check `total_comparisons`)
2. Credits haven't reset yet (check `credits_reset_time`)
3. Redis counter out of sync with database

**Solutions:**

**Manual Credit Reset:**
```sql
-- Reset credits immediately
UPDATE user_profiles
SET
  credits_remaining = 5,
  credits_reset_time = NOW() + INTERVAL '24 hours'
WHERE id = 'USER_ID_HERE';
```

**Check Redis:**
```bash
redis-cli GET "user:credits:USER_ID_HERE"
# If shows 0 but DB shows 5, Redis is stale
redis-cli DEL "user:credits:USER_ID_HERE"  # Force refresh
```

---

### Issue: "Payment succeeded but still not premium"

**Symptoms:**
- User paid via Stripe
- Still shows as free user
- Stripe dashboard shows successful payment

**Diagnosis:**
```sql
-- Check payment record
SELECT * FROM payment_transactions
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC LIMIT 5;

-- Check user premium status
SELECT is_premium, premium_expires, stripe_customer_id, stripe_subscription_id
FROM user_profiles
WHERE id = 'USER_ID_HERE';
```

**Common Causes:**
1. Webhook didn't fire
2. Webhook fired but failed to process
3. Wrong user ID in webhook

**Solutions:**

**Manually Grant Premium:**
```sql
UPDATE user_profiles
SET
  is_premium = true,
  premium_expires = NOW() + INTERVAL '1 month',  -- or '1 year'
  stripe_subscription_id = 'sub_xxx'  -- from Stripe dashboard
WHERE id = 'USER_ID_HERE';
```

**Check Stripe Webhooks:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook URL
3. Check recent events for failures
4. Manually retry failed webhook if needed

**Verify Webhook Secret:**
```bash
echo $STRIPE_WEBHOOK_SECRET
# Should match Stripe dashboard webhook signing secret
```

---

### Issue: Comparison loads forever / times out

**Symptoms:**
- Spinner spins indefinitely
- Request eventually fails with timeout
- Browser console shows 504 or no response

**Diagnosis:**
```bash
# Check if request reached backend
tail -f /var/log/app.log | grep "comparison/create"

# Check API provider status
curl https://replicate.com/api/status
curl https://status.openai.com/api/v2/status.json
```

**Common Causes:**
1. Replicate API slow/down
2. OpenAI API slow/down
3. Queue is full (high traffic)
4. Database connection timeout

**Solutions:**

**Check Queue:**
```bash
redis-cli GET "cost:concurrent:count"
redis-cli LLEN "cost:queue"
# If queue > 50, system is overloaded
```

**Check API Keys:**
```bash
# Test Replicate
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":"test"}'

# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Enable Cache-Only Mode (temporary):**
```bash
export CACHE_ONLY_MODE=true
# Restart app
# Users can only view cached comparisons
```

---

## API/Backend Issues

### Issue: All requests return 503 "Service unavailable"

**Symptoms:**
- Every API call fails with 503
- Error: "Service temporarily unavailable"

**Diagnosis:**
```bash
# Check emergency shutdown
redis-cli GET "cost:emergency_shutdown"
# If "true", emergency shutdown is active

# Check maintenance mode
env | grep MAINTENANCE_MODE
# If MAINTENANCE_MODE=true, in maintenance
```

**Common Causes:**
1. Emergency shutdown triggered (cost limits hit)
2. Maintenance mode enabled
3. Redis connection lost
4. Database connection lost

**Solutions:**

**Clear Emergency Shutdown:**
```bash
redis-cli DEL "cost:emergency_shutdown"
redis-cli DEL "cost:emergency_shutdown:reason"

# Check what triggered it
redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"
# If > $10, legitimately hit limit
```

**Check Service Connections:**
```bash
# Test Redis
redis-cli PING
# Should return "PONG"

# Test Database
psql $DATABASE_URL -c "SELECT NOW();"
# Should return current timestamp

# If either fails, check service status
```

---

### Issue: Rate limit errors for all users

**Symptoms:**
- Users getting "Rate limit exceeded" immediately
- Happens even for new users
- Global rate limit appears hit

**Diagnosis:**
```bash
# Check global rate limit
redis-cli GET "ratelimit:global:second"
redis-cli TTL "ratelimit:global:second"

# Check rate limit config
env | grep REQUESTS_PER
```

**Common Causes:**
1. Rate limit too low for traffic
2. Single user/bot flooding system
3. Redis keys not expiring

**Solutions:**

**Increase Global Rate Limit:**
```bash
export GLOBAL_REQUESTS_PER_SECOND=5  # Up from 2
# Restart app
```

**Find Flooding User:**
```sql
SELECT user_id, COUNT(*) as requests
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '1 minute'
GROUP BY user_id
ORDER BY requests DESC
LIMIT 10;
```

**Block Flooding User:**
```bash
redis-cli SET "cost:blocked_user:ABUSIVE_USER_ID" "rate_limit_abuse"
redis-cli EXPIRE "cost:blocked_user:ABUSIVE_USER_ID" 86400
```

---

### Issue: API keys invalid / authentication failures

**Symptoms:**
- Error: "Invalid API key"
- Error: "Unauthorized"
- All AI generation fails

**Diagnosis:**
```bash
# Check environment variables are set
env | grep -E "(REPLICATE|OPENAI|MESHY)_API"

# Test each key
curl https://api.replicate.com/v1/models \
  -H "Authorization: Token $REPLICATE_API_TOKEN"
# Should return 200, not 401

curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
# Should return 200, not 401
```

**Common Causes:**
1. API key expired / revoked
2. Environment variable not set / typo
3. Exceeded API quota

**Solutions:**

**Update API Keys:**
```bash
# Update .env file
nano .env

# Find these lines and update:
REPLICATE_API_TOKEN=new_token_here
OPENAI_API_KEY=new_key_here

# Restart app
pm2 restart app
# or
systemctl restart sizeeasy
```

**Check API Quotas:**
- Replicate: https://replicate.com/account/billing
- OpenAI: https://platform.openai.com/usage
- Meshy: https://meshy.ai/dashboard

---

## Database Issues

### Issue: Database connection errors

**Symptoms:**
- Error: "Connection refused"
- Error: "Too many connections"
- Error: "timeout"

**Diagnosis:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check connection string
echo $DATABASE_URL
# Should start with postgresql://

# Count active connections
psql $DATABASE_URL -c "
  SELECT COUNT(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

**Common Causes:**
1. Database server down (Supabase outage)
2. Too many open connections (connection leak)
3. Wrong connection string
4. Network issue

**Solutions:**

**Check Supabase Status:**
- Visit: https://status.supabase.com
- Check your project dashboard

**Kill Idle Connections:**
```sql
-- Find idle connections
SELECT pid, state, query_start, query
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '1 hour';

-- Kill them
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '1 hour';
```

**Increase Connection Pool (if needed):**
```typescript
// Update Supabase client configuration
const supabase = createClient(url, key, {
  db: {
    pool: {
      max: 20,  // Increase from default
      min: 2,
      idleTimeoutMillis: 30000
    }
  }
});
```

---

### Issue: Slow database queries

**Symptoms:**
- API responses take 5-10 seconds
- Database CPU high
- Users complaining of slowness

**Diagnosis:**
```sql
-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey';
```

**Common Causes:**
1. Missing indexes
2. Large table scans
3. Unoptimized queries

**Solutions:**

**Add Missing Indexes:**
```sql
-- Example: Speed up user lookup
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Example: Speed up cache lookup (should already exist)
CREATE UNIQUE INDEX idx_cache_lookup
  ON comparisons_cache(object1_name, object2_name, quality_tier);
```

**Optimize Queries:**
```sql
-- Before: Slow
SELECT * FROM comparison_history
WHERE user_id = 'xxx'
ORDER BY created_at DESC;

-- After: Add index
CREATE INDEX idx_history_user_created
  ON comparison_history(user_id, created_at DESC);
```

---

## Cost Protection Issues

### Issue: Legitimate traffic blocked by cost limits

**Symptoms:**
- Busy time (e.g., launch day, viral tweet)
- Requests denied with "Daily limit reached"
- Limit hit at 2pm instead of midnight

**Diagnosis:**
```bash
# Check current spend
redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"
echo "Daily limit: $MAX_DAILY_SPEND"

# Check spending pattern
psql $DATABASE_URL -c "
  SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as comparisons,
    SUM(cost) as cost,
    COUNT(DISTINCT user_id) as unique_users
  FROM comparison_history
  WHERE created_at > CURRENT_DATE
  GROUP BY hour
  ORDER BY hour DESC;
"
```

**Solutions:**

**Temporarily Raise Limits:**
```bash
# Update .env
export MAX_DAILY_SPEND=25.00  # Up from 10.00
export MAX_HOURLY_SPEND=5.00  # Up from 2.00

# Restart app
pm2 restart app

# REMEMBER TO MONITOR CLOSELY!
watch -n 10 'redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"'
```

**Optimize Cost:**
- Check cache hit rate (should be >70%)
- Pre-warm cache with popular comparisons
- Consider upgrading API tier for volume discounts

---

### Issue: Circuit breaker keeps tripping

**Symptoms:**
- Requests denied randomly
- Error: "Service unavailable"
- Circuit breaker state = "OPEN"

**Diagnosis:**
```bash
# Check circuit state
redis-cli GET "cost:circuit_breaker:state"

# Check recent costs
psql $DATABASE_URL -c "
  SELECT * FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY cost DESC
  LIMIT 10;
"

# Check average cost
redis-cli GET "cost:average_request"
```

**Common Causes:**
1. 3D model generation (costs more)
2. API pricing increased
3. Cost calculation bug

**Solutions:**

**Reset Circuit Breaker:**
```bash
redis-cli SET "cost:circuit_breaker:state" "CLOSED"
redis-cli SET "cost:circuit_breaker:failures" "0"
redis-cli DEL "cost:circuit_breaker:opened_at"
```

**Adjust Threshold:**
```bash
# If 3D is legitimately more expensive
export COST_SPIKE_MULTIPLIER=5  # Up from 3
# Restart app
```

---

## Performance Issues

### Issue: Cache hit rate below 50%

**Symptoms:**
- API costs higher than expected
- Slow response times
- Many cache misses

**Diagnosis:**
```sql
-- Check cache hit rate
SELECT
  COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) as hit_rate,
  COUNT(*) FILTER (WHERE from_cache) as hits,
  COUNT(*) FILTER (WHERE NOT from_cache) as misses
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Find duplicate cache entries (normalization issue)
SELECT object1_name, object2_name, COUNT(*) as dups
FROM comparisons_cache
GROUP BY LOWER(object1_name), LOWER(object2_name)
HAVING COUNT(*) > 1;
```

**Common Causes:**
1. Normalization not working (case sensitivity)
2. Users requesting unique comparisons
3. Cache eviction too aggressive

**Solutions:**

**Fix Normalization:**
```typescript
// Ensure normalization is applied
export function normalizeObjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
```

**Pre-warm Popular Comparisons:**
```bash
npm run script:prewarm-cache
# Generates top 100 popular comparisons
```

---

### Issue: Redis memory full

**Symptoms:**
- Error: "OOM command not allowed"
- Redis rejecting writes
- Cost tracking not working

**Diagnosis:**
```bash
# Check Redis memory usage
redis-cli INFO memory | grep used_memory_human
redis-cli INFO memory | grep maxmemory_human

# Find large keys
redis-cli --bigkeys
```

**Solutions:**

**Clear Old Keys:**
```bash
# Find and delete expired cost keys
redis-cli KEYS "cost:user_spend:*:2024-10-*" | xargs redis-cli DEL

# Clear old rate limit keys
redis-cli KEYS "ratelimit:*" | xargs redis-cli DEL
```

**Increase Redis Memory (if using Upstash):**
- Upgrade plan at upstash.com
- Or implement key eviction policy

---

## Quick Diagnostics

### System Health Check

```bash
#!/bin/bash
# Save as: scripts/health-check.sh

echo "=== SizeEasy Health Check ==="
echo ""

# 1. Redis
echo "Redis:"
redis-cli PING && echo "✓ Connected" || echo "✗ Disconnected"

# 2. Database
echo "Database:"
psql $DATABASE_URL -c "SELECT NOW();" > /dev/null 2>&1 && echo "✓ Connected" || echo "✗ Disconnected"

# 3. Emergency Shutdown
SHUTDOWN=$(redis-cli GET "cost:emergency_shutdown")
echo "Emergency Shutdown: ${SHUTDOWN:-false}"

# 4. Circuit Breaker
CIRCUIT=$(redis-cli GET "cost:circuit_breaker:state")
echo "Circuit Breaker: ${CIRCUIT:-CLOSED}"

# 5. Current Spend
DAY_SPEND=$(redis-cli GET "cost:global:day:$(date +%Y-%m-%d)")
echo "Daily Spend: \$${DAY_SPEND:-0} / \$$MAX_DAILY_SPEND"

# 6. Cache Hit Rate (last hour)
CACHE_RATE=$(psql $DATABASE_URL -t -c "
  SELECT ROUND(COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*), 2)
  FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '1 hour';
")
echo "Cache Hit Rate: ${CACHE_RATE}%"

echo ""
echo "=== End Health Check ==="
```

**Run:**
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

---

## Related Documentation

- **System Overview:** `/docs/architecture/SYSTEM_OVERVIEW.md`
- **Error Codes:** `/docs/troubleshooting/ERROR_CODES.md`
- **Emergency Procedures:** `/docs/troubleshooting/EMERGENCY_PROCEDURES.md`
- **Cost Protection:** `/docs/architecture/COST_PROTECTION.md`
