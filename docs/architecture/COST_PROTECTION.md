# Cost Protection System Documentation

**Last Updated:** 2025-11-06
**Purpose:** Comprehensive documentation of all cost protection mechanisms
**Philosophy:** Better to have angry users than a $5,000 surprise bill

---

## Table of Contents
1. [Overview](#overview)
2. [Protection Layers](#protection-layers)
3. [Configuration](#configuration)
4. [Emergency Procedures](#emergency-procedures)
5. [Monitoring](#monitoring)
6. [Cost Tracking](#cost-tracking)

---

## Overview

SizeEasy uses external AI APIs that charge per request. Without protection, a malicious user or bug could generate thousands of dollars in charges overnight. This system implements **5 layers of protection** to prevent runaway costs.

### Cost Per Request
- **OpenAI (dimensions):** ~$0.015
- **Replicate (image):** ~$0.04
- **Meshy 3D (preview):** ~$0.10
- **Meshy 3D (refined):** ~$0.30
- **Typical comparison:** ~$0.055 (OpenAI + Replicate)

### Budget Limits
```
Daily:   $10.00  (182 comparisons max)
Hourly:  $2.00   (36 comparisons max)
Monthly: $200.00 (3,636 comparisons max)
```

---

## Protection Layers

```
Request → [1] Pre-Request → [2] Rate Limit → [3] Cost Check → [4] Circuit Breaker → [5] Queue → API
            Validation                                                                    ↓
            ↓                                                                           Success
      Emergency?                                                                         ↓
      Blocked?                                                                      Track Cost
      Maintenance?                                                                       ↓
            ↓                                                                        Update Redis
            PASS                                                                          ↓
                                                                                    Check Thresholds
                                                                                          ↓
                                                                                    Alert if needed
```

---

### Layer 1: Pre-Request Validation

**File:** `/lib/costProtection/preRequestValidation.ts`
**When:** Before any other processing
**Purpose:** Quick checks to reject requests immediately

```typescript
export async function validateRequest(userId: string): Promise<ValidationResult> {
  // 1. Check emergency shutdown
  const shutdownActive = await redis.get(REDIS_KEYS.EMERGENCY_SHUTDOWN);
  if (shutdownActive === 'true') {
    return {
      allowed: false,
      reason: 'EMERGENCY_SHUTDOWN',
      message: 'Service temporarily unavailable due to high costs'
    };
  }

  // 2. Check maintenance mode
  if (FEATURE_FLAGS.MAINTENANCE_MODE) {
    return {
      allowed: false,
      reason: 'MAINTENANCE',
      message: 'System under maintenance. Please try again later.'
    };
  }

  // 3. Check if user is blocked
  const blockedReason = await redis.get(getBlockedUserKey(userId));
  if (blockedReason) {
    return {
      allowed: false,
      reason: 'USER_BLOCKED',
      message: `Account suspended: ${blockedReason}`
    };
  }

  return { allowed: true };
}
```

**Redis Keys Used:**
- `cost:emergency_shutdown` - Boolean flag
- `cost:blocked_user:{userId}` - Reason for block

**How to Trigger Emergency Shutdown:**
```bash
redis-cli SET "cost:emergency_shutdown" "true"
redis-cli EXPIRE "cost:emergency_shutdown" 3600  # Auto-clear in 1 hour
```

**How to Block User:**
```bash
redis-cli SET "cost:blocked_user:USER_ID_HERE" "abuse_detected"
redis-cli EXPIRE "cost:blocked_user:USER_ID_HERE" 86400  # 24 hours
```

---

### Layer 2: Rate Limiting

**File:** `/lib/costProtection/rateLimiter.ts`
**Library:** `@upstash/ratelimit`
**Purpose:** Prevent request flooding

**Limits:**
```typescript
// Free Users
requests_per_minute: 2
requests_per_hour: 10
requests_per_day: 20

// Premium Users
requests_per_minute: 10
requests_per_hour: 100
requests_per_day: 500

// Global (All Users Combined)
requests_per_second: 2
max_concurrent_api_calls: 5
```

**Implementation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis-client';

const rateLimiters = {
  free: {
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, '1 m'),
      analytics: true,
    }),
    hour: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
    }),
    day: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '24 h'),
      analytics: true,
    }),
  },
  premium: {
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    }),
    // ... etc
  },
};

export async function checkRateLimit(userId: string, isPremium: boolean) {
  const tier = isPremium ? 'premium' : 'free';

  // Check all three windows
  const [minuteResult, hourResult, dayResult] = await Promise.all([
    rateLimiters[tier].minute.limit(userId),
    rateLimiters[tier].hour.limit(userId),
    rateLimiters[tier].day.limit(userId),
  ]);

  if (!minuteResult.success) {
    return {
      allowed: false,
      reason: 'RATE_LIMIT_MINUTE',
      resetIn: minuteResult.reset - Date.now(),
    };
  }

  // ... similar for hour and day
}
```

**Troubleshooting:**
```bash
# Check user's current rate limit status
redis-cli GET "ratelimit:user:USER_ID:minute"
redis-cli TTL "ratelimit:user:USER_ID:minute"

# Manually reset rate limit (use sparingly!)
redis-cli DEL "ratelimit:user:USER_ID:minute"
redis-cli DEL "ratelimit:user:USER_ID:hour"
redis-cli DEL "ratelimit:user:USER_ID:day"
```

---

### Layer 3: Cost Tracking & Limits

**File:** `/lib/costProtection/preRequestValidation.ts`
**Purpose:** Track actual dollar spend and enforce limits

**Limits:**
```typescript
MAX_USER_DAILY_COST: $0.50   // Per user, per day
MAX_USER_HOURLY_COST: $0.10  // Per user, per hour
MAX_HOURLY_SPEND: $2.00      // Global, per hour
MAX_DAILY_SPEND: $10.00      // Global, per day
EMERGENCY_SHUTDOWN_LIMIT: $50.00  // Failsafe
```

**Implementation:**
```typescript
export async function checkCostLimits(
  userId: string,
  estimatedCost: number = 0.055
): Promise<{ allowed: boolean; reason?: string }> {

  // Check user's daily spend
  const userDailyKey = getCostKey('user', userId);  // "cost:user_spend:USER_ID:2024-11-06"
  const userDailySpend = parseFloat(await redis.get(userDailyKey) || '0');

  if (userDailySpend + estimatedCost > COST_LIMITS.MAX_USER_DAILY_COST) {
    return {
      allowed: false,
      reason: `User daily limit of $${COST_LIMITS.MAX_USER_DAILY_COST} reached`
    };
  }

  // Check global hourly spend
  const hourlyKey = getCostKey('hour');  // "cost:global:hour:2024-11-06:14"
  const hourlySpend = parseFloat(await redis.get(hourlyKey) || '0');

  if (hourlySpend + estimatedCost > COST_LIMITS.MAX_HOURLY_SPEND) {
    return {
      allowed: false,
      reason: `System hourly limit of $${COST_LIMITS.MAX_HOURLY_SPEND} reached. Try again in ${getMinutesUntilNextHour()} minutes.`
    };
  }

  // Check global daily spend
  const dailyKey = getCostKey('day');  // "cost:global:day:2024-11-06"
  const dailySpend = parseFloat(await redis.get(dailyKey) || '0');

  if (dailySpend + estimatedCost > COST_LIMITS.MAX_DAILY_SPEND) {
    // CRITICAL: Trigger emergency shutdown!
    await triggerEmergencyShutdown('Daily spend limit exceeded');

    return {
      allowed: false,
      reason: 'Service temporarily unavailable'
    };
  }

  return { allowed: true };
}
```

**Redis Keys:**
```
cost:user_spend:{userId}:{YYYY-MM-DD}   (TTL: 24 hours)
cost:global:hour:{YYYY-MM-DD:HH}        (TTL: 1 hour)
cost:global:day:{YYYY-MM-DD}            (TTL: 24 hours)
cost:global:month:{YYYY-MM}             (TTL: 31 days)
```

**Tracking Actual Cost:**
```typescript
export async function trackCost(userId: string, actualCost: number) {
  const pipeline = redis.pipeline();

  // User daily spend
  const userKey = getCostKey('user', userId);
  pipeline.incrbyfloat(userKey, actualCost);
  pipeline.expire(userKey, 86400);  // 24 hours

  // Global hourly
  const hourKey = getCostKey('hour');
  pipeline.incrbyfloat(hourKey, actualCost);
  pipeline.expire(hourKey, 3600);  // 1 hour

  // Global daily
  const dayKey = getCostKey('day');
  pipeline.incrbyfloat(dayKey, actualCost);
  pipeline.expire(dayKey, 86400);

  // Global monthly
  const monthKey = getCostKey('month');
  pipeline.incrbyfloat(monthKey, actualCost);
  pipeline.expire(monthKey, 2678400);  // 31 days

  await pipeline.exec();

  // Check alert thresholds
  await checkAlertThresholds(dayKey, actualCost);
}
```

---

### Layer 4: Circuit Breaker

**File:** `/lib/costProtection/circuitBreaker.ts`
**Purpose:** Detect cost spikes and automatically shut down

**How It Works:**
1. Track average cost per request
2. If request cost is 3x average → increment failure counter
3. After 3 consecutive spikes → open circuit (emergency shutdown)
4. Wait 1 hour before allowing requests again (half-open state)
5. If spikes continue → open circuit again

```typescript
export async function checkCircuitBreaker(actualCost: number): Promise<boolean> {
  // Get circuit breaker state
  const state = await redis.get(REDIS_KEYS.CIRCUIT_BREAKER_STATE);

  if (state === 'OPEN') {
    // Circuit is open, check if timeout expired
    const openedAt = await redis.get(REDIS_KEYS.CIRCUIT_BREAKER_OPENED_AT);
    const elapsed = Date.now() - parseInt(openedAt || '0');

    if (elapsed > CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS) {
      // Move to half-open state
      await redis.set(REDIS_KEYS.CIRCUIT_BREAKER_STATE, 'HALF_OPEN');
      return true;  // Allow request
    }

    return false;  // Circuit still open
  }

  // Get average cost
  const avgCost = parseFloat(await redis.get(REDIS_KEYS.AVERAGE_REQUEST_COST) || '0.055');

  // Is this a cost spike?
  if (actualCost > avgCost * CIRCUIT_BREAKER_CONFIG.COST_SPIKE_MULTIPLIER) {
    // Increment failure counter
    const failures = await redis.incr(REDIS_KEYS.CIRCUIT_BREAKER_FAILURES);

    if (failures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
      // OPEN THE CIRCUIT
      await redis.set(REDIS_KEYS.CIRCUIT_BREAKER_STATE, 'OPEN');
      await redis.set(REDIS_KEYS.CIRCUIT_BREAKER_OPENED_AT, Date.now());
      await triggerEmergencyShutdown('Circuit breaker triggered due to cost spikes');

      return false;
    }
  } else {
    // Normal cost, reset failure counter
    await redis.set(REDIS_KEYS.CIRCUIT_BREAKER_FAILURES, 0);
  }

  // Update rolling average
  const newAvg = (avgCost * 0.9) + (actualCost * 0.1);  // Exponential moving average
  await redis.set(REDIS_KEYS.AVERAGE_REQUEST_COST, newAvg);

  return true;
}
```

**Manual Reset:**
```bash
# Reset circuit breaker (after investigating cause)
redis-cli SET "cost:circuit_breaker:state" "CLOSED"
redis-cli SET "cost:circuit_breaker:failures" "0"
redis-cli DEL "cost:circuit_breaker:opened_at"
```

---

### Layer 5: Queue System

**File:** `/lib/costProtection/queueSystem.ts`
**Purpose:** Limit concurrent API calls to prevent burst spending

**Configuration:**
```typescript
MAX_CONCURRENT_API_CALLS: 5
MAX_QUEUE_LENGTH: 100
REQUEST_TIMEOUT_MS: 30000  // 30 seconds
PRIORITY_PREMIUM: 10
PRIORITY_FREE: 1
```

**How It Works:**
```typescript
export async function queueRequest(
  userId: string,
  isPremium: boolean,
  requestFn: () => Promise<any>
): Promise<any> {
  // Check current concurrent requests
  const concurrent = await redis.incr(REDIS_KEYS.CONCURRENT_REQUESTS);

  if (concurrent <= QUEUE_CONFIG.MAX_CONCURRENT_API_CALLS) {
    // Slot available, execute immediately
    try {
      const result = await requestFn();
      return result;
    } finally {
      await redis.decr(REDIS_KEYS.CONCURRENT_REQUESTS);
    }
  }

  // All slots full, add to queue
  const queueLength = await redis.llen('cost:queue');

  if (queueLength >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
    throw new Error('Queue full. Please try again later.');
  }

  // Add to priority queue
  const queueItem = {
    userId,
    priority: isPremium ? QUEUE_CONFIG.PRIORITY_PREMIUM : QUEUE_CONFIG.PRIORITY_FREE,
    timestamp: Date.now(),
    requestId: crypto.randomUUID(),
  };

  await redis.zadd('cost:queue:priority', queueItem.priority, JSON.stringify(queueItem));

  // Wait for slot (with timeout)
  return await waitForSlot(queueItem.requestId, requestFn);
}
```

**Monitor Queue:**
```bash
# Check current concurrent requests
redis-cli GET "cost:concurrent:count"

# Check queue length
redis-cli LLEN "cost:queue"

# View queued requests
redis-cli ZRANGE "cost:queue:priority" 0 -1 WITHSCORES
```

---

## Configuration

**File:** `/config/costProtection.ts`

All limits are configurable via environment variables:

```bash
# Cost Limits (USD)
MAX_DAILY_SPEND=10.00
MAX_HOURLY_SPEND=2.00
MAX_MONTHLY_SPEND=200.00
MAX_USER_DAILY_COST=0.50
MAX_USER_HOURLY_COST=0.10
MAX_SINGLE_REQUEST_COST=0.10
EMERGENCY_SHUTDOWN_LIMIT=50.00

# API Costs (USD)
OPENAI_COST_PER_CALL=0.015
REPLICATE_COST_PER_CALL=0.04
MESHY_PREVIEW_COST=0.10
MESHY_REFINE_COST=0.30

# Rate Limits
FREE_REQUESTS_PER_MINUTE=2
FREE_REQUESTS_PER_HOUR=10
FREE_REQUESTS_PER_DAY=20
PREMIUM_REQUESTS_PER_MINUTE=10
PREMIUM_REQUESTS_PER_HOUR=100
PREMIUM_REQUESTS_PER_DAY=500

# Feature Flags
ENABLE_COST_PROTECTION=true
ENABLE_EMERGENCY_SHUTDOWN=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_ABUSE_DETECTION=true
ENABLE_QUEUE_SYSTEM=true
```

**How to Adjust Limits:**

1. Update `.env` file
2. Restart server
3. Verify new limits:
```typescript
import { COST_LIMITS } from '@/config/costProtection';
console.log('Current daily limit:', COST_LIMITS.MAX_DAILY_SPEND);
```

---

## Emergency Procedures

### Scenario 1: Daily Limit Hit Early

**Symptom:** Users getting "Daily limit reached" at 2pm

**Diagnosis:**
```bash
# Check current daily spend
redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"
# Example output: "8.50"

# Check spending by hour
for hour in {0..23}; do
  key="cost:global:hour:$(date +%Y-%m-%d):$hour"
  spend=$(redis-cli GET "$key")
  echo "Hour $hour: \$$spend"
done
```

**Possible Causes:**
1. Legitimate high traffic (good problem!)
2. Abuse/attack
3. Bug causing excessive API calls

**Actions:**
```bash
# Option 1: Raise limit temporarily (if legitimate traffic)
export MAX_DAILY_SPEND=20.00
# Restart app

# Option 2: Identify and block abusive user
psql $DATABASE_URL -c "
  SELECT user_id, COUNT(*) as requests, SUM(cost) as total_cost
  FROM comparison_history
  WHERE created_at > CURRENT_DATE
  GROUP BY user_id
  ORDER BY total_cost DESC
  LIMIT 10;
"
# Block top spender if suspicious
redis-cli SET "cost:blocked_user:SUSPICIOUS_USER_ID" "excessive_usage"

# Option 3: Enable cache-only mode
export CACHE_ONLY_MODE=true
# Restart app
```

---

### Scenario 2: Emergency Shutdown Triggered

**Symptom:** All requests return 503 "Service unavailable"

**Diagnosis:**
```bash
# Check if emergency shutdown is active
redis-cli GET "cost:emergency_shutdown"
# Output: "true"

# Check why it was triggered
redis-cli GET "cost:emergency_shutdown:reason"
# Output: "Daily spend limit exceeded"

# Check current spend
redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"
```

**Recovery:**
```bash
# 1. Investigate what happened
psql $DATABASE_URL -c "
  SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as comparisons,
    SUM(cost) as cost,
    COUNT(DISTINCT user_id) as unique_users
  FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC('hour', created_at)
  ORDER BY hour DESC;
"

# 2. If safe to resume, clear emergency shutdown
redis-cli DEL "cost:emergency_shutdown"
redis-cli DEL "cost:emergency_shutdown:reason"

# 3. Optionally raise limits
export MAX_DAILY_SPEND=15.00
# Restart app

# 4. Monitor closely
watch -n 10 'redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"'
```

---

### Scenario 3: Circuit Breaker Tripped

**Symptom:** Requests denied, circuit breaker state = OPEN

**Diagnosis:**
```bash
# Check circuit state
redis-cli GET "cost:circuit_breaker:state"
# Output: "OPEN"

# Check failure count
redis-cli GET "cost:circuit_breaker:failures"
# Output: "3"

# Check average vs spike costs
redis-cli GET "cost:average_request"
# Output: "0.055"

# Recent high-cost requests?
psql $DATABASE_URL -c "
  SELECT * FROM comparison_history
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND cost > 0.15
  ORDER BY cost DESC;
"
```

**Recovery:**
```bash
# 1. Investigate why costs spiked
# Check for:
# - 3D model generation (higher cost)
# - API pricing changes
# - Bugs in cost calculation

# 2. Fix underlying issue

# 3. Reset circuit breaker
redis-cli SET "cost:circuit_breaker:state" "CLOSED"
redis-cli SET "cost:circuit_breaker:failures" "0"
redis-cli DEL "cost:circuit_breaker:opened_at"
```

---

## Monitoring

### Dashboard Queries

**Current Spend (Real-time):**
```bash
#!/bin/bash
# save as: scripts/check-spend.sh

HOUR_KEY="cost:global:hour:$(date +%Y-%m-%d:%H)"
DAY_KEY="cost:global:day:$(date +%Y-%m-%d)"
MONTH_KEY="cost:global:month:$(date +%Y-%m)"

echo "=== Cost Monitoring Dashboard ==="
echo "Hourly Spend:  \$$(redis-cli GET "$HOUR_KEY") / \$2.00"
echo "Daily Spend:   \$$(redis-cli GET "$DAY_KEY") / \$10.00"
echo "Monthly Spend: \$$(redis-cli GET "$MONTH_KEY") / \$200.00"
echo ""
echo "Concurrent Requests: $(redis-cli GET "cost:concurrent:count") / 5"
echo "Queue Length: $(redis-cli LLEN "cost:queue")"
echo ""
echo "Circuit Breaker: $(redis-cli GET "cost:circuit_breaker:state")"
echo "Emergency Shutdown: $(redis-cli GET "cost:emergency_shutdown")"
```

**Run Continuously:**
```bash
watch -n 5 ./scripts/check-spend.sh
```

### Alerts

**Email Alert on High Spend:**
```typescript
// Add to cost tracking function
const dailySpend = parseFloat(await redis.get(dayKey) || '0');
const limit = COST_LIMITS.MAX_DAILY_SPEND;

if (dailySpend > limit * 0.8 && !alertSent) {
  await sendEmail({
    to: ADMIN_ALERTS.EMAIL,
    subject: '🚨 Cost Alert: 80% of daily limit reached',
    body: `Current spend: $${dailySpend.toFixed(2)} / $${limit}`
  });

  await redis.set('cost:alert_sent:80pct', 'true', 'EX', 3600);
}
```

---

## Cost Tracking

### Cost Attribution

Every request is tracked:
```typescript
// comparison_history table
{
  id: 'uuid',
  user_id: 'user-uuid',
  cost: 0.055,  // Actual cost incurred
  from_cache: false,
  created_at: '2024-11-06T15:30:00Z'
}
```

### Reports

**Monthly Cost by User Type:**
```sql
SELECT
  CASE WHEN was_premium_at_time THEN 'premium' ELSE 'free' END as user_type,
  COUNT(*) as comparisons,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost,
  COUNT(*) FILTER (WHERE from_cache) as cache_hits,
  COUNT(*) FILTER (WHERE NOT from_cache) as cache_misses
FROM comparison_history
WHERE created_at >= date_trunc('month', NOW())
GROUP BY was_premium_at_time;
```

**Cache Savings:**
```sql
SELECT
  SUM(CASE WHEN from_cache THEN generation_cost ELSE 0 END) as total_savings,
  COUNT(*) FILTER (WHERE from_cache) as cache_hits,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) as cache_hit_rate
FROM comparison_history ch
LEFT JOIN comparisons_cache cc ON ch.cache_entry_id = cc.id
WHERE ch.created_at >= date_trunc('month', NOW());
```

---

## Related Documentation

- **System Overview:** `/docs/architecture/SYSTEM_OVERVIEW.md`
- **API Flow:** `/docs/architecture/API_FLOW.md`
- **Configuration:** `/config/costProtection.ts`
- **Emergency Procedures:** `/docs/troubleshooting/EMERGENCY_PROCEDURES.md`
