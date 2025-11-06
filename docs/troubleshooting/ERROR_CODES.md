# Error Codes Reference

**Last Updated:** 2025-11-06
**Purpose:** Complete registry of all error codes, causes, and solutions

---

## Error Code Format

```
E[Category][Number]

Categories:
- 1xx: Authentication & Authorization
- 2xx: Credits & Payment
- 3xx: Rate Limiting & Costs
- 4xx: API & External Services
- 5xx: System & Infrastructure
```

---

## Authentication & Authorization (1xx)

### E101: Not Authenticated

**HTTP Code:** 401
**Message:** "Please log in to continue"

**Cause:** User not logged in or session expired

**User Action:**
1. Click "Log In" button
2. Sign in with Google/Email
3. Retry request

**Debug:**
```bash
# Check if user has valid session
# Look for Supabase auth cookie in browser devtools
```

---

### E102: Invalid Session

**HTTP Code:** 401
**Message:** "Your session has expired. Please log in again."

**Cause:** JWT token expired or invalid

**User Action:**
1. Refresh page
2. Log in again

**Debug:**
```typescript
// Verify JWT
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Session invalid
}
```

---

### E103: Account Suspended

**HTTP Code:** 403
**Message:** "Your account has been suspended due to policy violations"

**Cause:** Account manually blocked by admin

**User Action:**
- Contact support: support@sizeeasy.com

**Admin Action:**
```bash
# Check why blocked
redis-cli GET "cost:blocked_user:USER_ID"

# Unblock
redis-cli DEL "cost:blocked_user:USER_ID"
```

---

## Credits & Payment (2xx)

### E201: Insufficient Credits

**HTTP Code:** 402
**Message:** "You're out of credits for today. Share a comparison or upgrade to premium!"

**Cause:**
- User used all 5 daily credits
- Credits haven't reset yet

**User Action:**
1. Share a comparison (+2 credits)
2. Refer a friend (+10 credits)
3. Wait for daily reset
4. Upgrade to premium (unlimited)

**Debug:**
```sql
SELECT credits_remaining, credits_reset_time
FROM user_profiles
WHERE id = 'user-id';
```

**Fix:**
```sql
-- Manually grant credits
UPDATE user_profiles
SET credits_remaining = 5
WHERE id = 'user-id';
```

---

### E202: Credit Deduction Failed

**HTTP Code:** 500
**Message:** "Unable to process your request. Please try again."

**Cause:**
- Database function error
- Race condition
- Database connection issue

**Debug:**
```sql
-- Check if deduct_credit function exists
SELECT * FROM pg_proc WHERE proname = 'deduct_credit';

-- Test function
SELECT deduct_credit('user-id');
```

**Fix:**
```sql
-- Recreate function
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  UPDATE user_profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id
    AND credits_remaining > 0
    AND (NOT is_premium OR premium_expires < NOW())
  RETURNING credits_remaining INTO v_credits;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

---

### E203: Payment Processing Error

**HTTP Code:** 500
**Message:** "Payment failed. Please try again or contact support."

**Cause:**
- Stripe API error
- Webhook not received
- Database write failed

**User Action:**
1. Check Stripe for successful charge
2. Contact support if charged but not upgraded

**Debug:**
```bash
# Check Stripe webhook logs
# Stripe Dashboard → Developers → Webhooks → Recent Events

# Check payment_transactions table
psql $DATABASE_URL -c "
  SELECT * FROM payment_transactions
  WHERE user_id = 'user-id'
  ORDER BY created_at DESC;
"
```

---

### E204: Premium Expired

**HTTP Code:** 402
**Message:** "Your premium subscription has expired. Renew to continue."

**Cause:** `premium_expires < NOW()`

**User Action:**
- Click "Renew Premium"

**Debug:**
```sql
SELECT is_premium, premium_expires
FROM user_profiles
WHERE id = 'user-id';
```

---

## Rate Limiting & Costs (3xx)

### E301: Rate Limit Exceeded - Minute

**HTTP Code:** 429
**Message:** "Too many requests. Please wait 60 seconds and try again."

**Cause:** User exceeded 2 requests/minute (free) or 10/min (premium)

**User Action:**
- Wait 60 seconds
- Upgrade to premium for higher limits

**Debug:**
```bash
# Check user's rate limit status
redis-cli GET "ratelimit:user:USER_ID:minute"
redis-cli TTL "ratelimit:user:USER_ID:minute"
```

**Fix (Emergency):**
```bash
# Reset user's rate limit
redis-cli DEL "ratelimit:user:USER_ID:minute"
```

---

### E302: Rate Limit Exceeded - Hour

**HTTP Code:** 429
**Message:** "Hourly limit reached. Try again in X minutes."

**Cause:** User exceeded 10 requests/hour (free) or 100/hour (premium)

**User Action:**
- Wait for hour reset
- Upgrade to premium

**Debug:**
```bash
redis-cli GET "ratelimit:user:USER_ID:hour"
redis-cli TTL "ratelimit:user:USER_ID:hour"
```

---

### E303: Rate Limit Exceeded - Day

**HTTP Code:** 429
**Message:** "Daily limit reached. Resets at midnight UTC."

**Cause:** User exceeded 20 requests/day (free) or 500/day (premium)

**User Action:**
- Wait for midnight UTC reset
- Upgrade to premium

---

### E304: User Daily Cost Limit

**HTTP Code:** 429
**Message:** "You've reached your daily generation limit. Upgrade for unlimited."

**Cause:** User exceeded $0.50 daily cost limit (safety measure)

**Debug:**
```bash
redis-cli GET "cost:user_spend:USER_ID:$(date +%Y-%m-%d)"
```

**Fix:**
```bash
# Reset user's daily cost (if legitimate)
redis-cli DEL "cost:user_spend:USER_ID:$(date +%Y-%m-%d)"
```

---

### E305: Global Hourly Limit

**HTTP Code:** 429
**Message:** "System is experiencing high load. Please try again in a few minutes."

**Cause:** All users combined exceeded $2/hour spending

**User Action:**
- Wait 5-10 minutes
- System automatically recovers

**Admin Action:**
```bash
# Check current hourly spend
redis-cli GET "cost:global:hour:$(date +%Y-%m-%d:%H)"

# Temporarily raise limit
export MAX_HOURLY_SPEND=5.00
# Restart app
```

---

### E306: Global Daily Limit

**HTTP Code:** 503
**Message:** "Daily generation limit reached. Service will resume tomorrow."

**Cause:** All users combined exceeded $10/day spending

**CRITICAL:** This triggers emergency shutdown!

**Admin Action:**
```bash
# Check what happened
psql $DATABASE_URL -c "
  SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as comparisons,
    SUM(cost) as cost,
    COUNT(DISTINCT user_id) as users
  FROM comparison_history
  WHERE created_at > CURRENT_DATE
  GROUP BY hour
  ORDER BY hour;
"

# If legitimate traffic, raise limit
export MAX_DAILY_SPEND=25.00

# Clear emergency shutdown
redis-cli DEL "cost:emergency_shutdown"

# Restart app
```

---

## API & External Services (4xx)

### E401: OpenAI API Error

**HTTP Code:** 500
**Message:** "Unable to fetch object dimensions. Please try again."

**Cause:**
- OpenAI API down
- API key invalid
- Rate limit exceeded

**User Action:**
- Try again in a few minutes

**Debug:**
```bash
# Test OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check OpenAI status
curl https://status.openai.com/api/v2/status.json
```

**Fix:**
```bash
# Update API key
export OPENAI_API_KEY=new_key_here

# Or use cached dimensions
# Check lib/objects.ts for fallback data
```

---

### E402: Replicate API Error

**HTTP Code:** 500
**Message:** "Image generation failed. Please try again."

**Cause:**
- Replicate API down
- API key invalid
- Model error

**Debug:**
```bash
# Test Replicate API
curl https://api.replicate.com/v1/models \
  -H "Authorization: Token $REPLICATE_API_TOKEN"

# Check Replicate status
curl https://replicate.com/api/status
```

**Fix:**
```bash
# Enable cache-only mode temporarily
export CACHE_ONLY_MODE=true
# Restart app

# Users can only access cached comparisons
```

---

### E403: Meshy API Error

**HTTP Code:** 500
**Message:** "3D model generation failed. 2D comparison still available."

**Cause:**
- Meshy API down
- API key invalid

**User Action:**
- 3D feature unavailable, but 2D works

**Fix:**
```bash
# Update Meshy API key
export MESHY_API_KEY=new_key_here
```

---

### E404: Stripe Webhook Error

**HTTP Code:** 400
**Message:** "Invalid webhook signature"

**Cause:**
- Webhook secret mismatch
- Replay attack detected

**Debug:**
```bash
# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Compare with Stripe dashboard webhook secret
# Stripe → Developers → Webhooks → [Your Webhook] → Signing Secret
```

**Fix:**
```bash
# Update webhook secret
export STRIPE_WEBHOOK_SECRET=whsec_new_secret_here
# Restart app
```

---

## System & Infrastructure (5xx)

### E501: Emergency Shutdown Active

**HTTP Code:** 503
**Message:** "Service temporarily unavailable. We'll be back shortly."

**Cause:** Emergency shutdown triggered (cost protection)

**User Action:**
- Wait a few minutes
- Check status page

**Admin Action:**
```bash
# Check why triggered
redis-cli GET "cost:emergency_shutdown:reason"

# Check current spend
./scripts/check-spend.sh

# If safe, clear shutdown
redis-cli DEL "cost:emergency_shutdown"
```

---

### E502: Redis Connection Error

**HTTP Code:** 503
**Message:** "Service temporarily unavailable"

**Cause:**
- Redis down
- Connection timeout
- Authentication failed

**Debug:**
```bash
# Test Redis connection
redis-cli PING

# Check Redis URL
echo $UPSTASH_REDIS_REST_URL
```

**Fix:**
```bash
# Restart Redis (if self-hosted)
systemctl restart redis

# Or update connection string
export UPSTASH_REDIS_REST_URL=new_url_here
# Restart app
```

---

### E503: Database Connection Error

**HTTP Code:** 503
**Message:** "Service temporarily unavailable"

**Cause:**
- Supabase down
- Too many connections
- Connection string invalid

**Debug:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check Supabase status
# Visit: https://status.supabase.com
```

**Fix:**
```bash
# Kill idle connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND query_start < NOW() - INTERVAL '1 hour';
"
```

---

### E504: Circuit Breaker Open

**HTTP Code:** 503
**Message:** "Service temporarily in degraded mode due to high costs"

**Cause:** Circuit breaker detected 3+ cost spikes

**Admin Action:**
```bash
# Check circuit state
redis-cli GET "cost:circuit_breaker:state"

# Check recent high-cost requests
psql $DATABASE_URL -c "
  SELECT * FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND cost > 0.15
  ORDER BY cost DESC;
"

# Reset circuit breaker
redis-cli SET "cost:circuit_breaker:state" "CLOSED"
redis-cli SET "cost:circuit_breaker:failures" "0"
```

---

### E505: Queue Full

**HTTP Code:** 503
**Message:** "System at capacity. Please try again in a moment."

**Cause:** Queue has 100+ pending requests

**User Action:**
- Wait 30 seconds
- Try again

**Admin Action:**
```bash
# Check queue length
redis-cli LLEN "cost:queue"

# Check concurrent requests
redis-cli GET "cost:concurrent:count"

# Increase concurrent limit
export MAX_CONCURRENT_API_CALLS=10  # Up from 5
# Restart app
```

---

### E506: Maintenance Mode

**HTTP Code:** 503
**Message:** "System under maintenance. We'll be back soon!"

**Cause:** `MAINTENANCE_MODE=true`

**Admin Action:**
```bash
# Disable maintenance mode
export MAINTENANCE_MODE=false
# Restart app
```

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "E301",
    "message": "Too many requests. Please wait 60 seconds.",
    "details": {
      "resetIn": 45,
      "limit": "2/minute",
      "current": 3
    },
    "timestamp": "2024-11-06T15:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## Logging Errors

All errors should be logged with context:

```typescript
import { logError } from '@/lib/logging';

logError('E301', {
  userId,
  endpoint: '/api/comparison/create',
  details: 'Minute rate limit exceeded',
  metadata: { limit: 2, current: 3 }
});
```

---

## Monitoring Error Rates

```sql
-- Error frequency (last 24 hours)
SELECT
  event_data->>'error_code' as error_code,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users
FROM analytics_events
WHERE event_name = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_data->>'error_code'
ORDER BY occurrences DESC;
```

---

## Related Documentation

- **Common Issues:** `/docs/troubleshooting/COMMON_ISSUES.md`
- **Emergency Procedures:** `/docs/troubleshooting/EMERGENCY_PROCEDURES.md`
- **Error Registry:** `/lib/errors/ERROR_REGISTRY.ts`
