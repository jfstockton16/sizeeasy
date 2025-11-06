# Cost Protection System Documentation

## 🚨 CRITICAL: Preventing Runaway API Costs

This document describes the comprehensive multi-layer cost protection system implemented in SizeEasy to prevent unexpected API charges that could result in thousands of dollars in surprise bills.

**Philosophy**: Better to have angry users than a $5,000 API bill.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Protection Layers](#protection-layers)
4. [Configuration](#configuration)
5. [Monitoring](#monitoring)
6. [Testing](#testing)
7. [Emergency Procedures](#emergency-procedures)
8. [Deployment Checklist](#deployment-checklist)

---

## Overview

### The Problem

SizeEasy integrates with multiple external APIs that charge per request:
- **OpenAI (gpt-4o-mini)**: ~$0.015 per call
- **Replicate (Stable Diffusion)**: ~$0.04 per image
- **Meshy (3D Generation)**: ~$0.10-0.30 per model

Without protection, a malicious actor or bug could:
- Make thousands of API calls in minutes
- Generate unlimited images/3D models
- Incur $1,000+ in charges before detection
- Exhaust monthly budgets in hours

### The Solution

A **5-layer defense system** that enforces hard limits at multiple levels:

1. **Pre-Request Validation** - Check all limits before any API call
2. **Rate Limiting** - Token bucket algorithm to throttle requests
3. **Request Queueing** - Manage capacity and prevent surges
4. **Circuit Breaker** - Auto-shutdown on cost spikes
5. **Abuse Detection** - Block malicious patterns

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming API Request                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Layer 1: Pre-Validation    │
        │  - Emergency shutdown?      │
        │  - User blocked?            │
        │  - Daily limit reached?     │
        │  - Hourly limit reached?    │
        └────────┬────────────────────┘
                 │ ✅ Allowed
                 ▼
        ┌─────────────────────────────┐
        │  Layer 2: Rate Limiting     │
        │  - Check rate limits        │
        │  - Free: 2/min, 10/hr       │
        │  - Premium: 10/min, 100/hr  │
        └────────┬────────────────────┘
                 │ ✅ Not rate limited
                 ▼
        ┌─────────────────────────────┐
        │  Layer 3: Abuse Detection   │
        │  - Rapid-fire attacks?      │
        │  - Duplicate spam?          │
        │  - API key sharing?         │
        │  - Cost anomalies?          │
        └────────┬────────────────────┘
                 │ ✅ Not abusive
                 ▼
        ┌─────────────────────────────┐
        │  Layer 4: Circuit Breaker   │
        │  - Cost spike detected?     │
        │  - State: CLOSED/OPEN       │
        │  - Auto-shutdown trigger    │
        └────────┬────────────────────┘
                 │ ✅ Circuit closed
                 ▼
        ┌─────────────────────────────┐
        │  Layer 5: Queue Management  │
        │  - Queue if at capacity     │
        │  - Priority-based           │
        │  - Max 100 requests         │
        └────────┬────────────────────┘
                 │ ✅ Capacity available
                 ▼
        ┌─────────────────────────────┐
        │   Execute API Request       │
        │   Record actual cost        │
        │   Update all trackers       │
        └─────────────────────────────┘
```

---

## Protection Layers

### Layer 1: Pre-Request Validation

**File**: `lib/costProtection/preRequestValidation.ts`

Checks performed BEFORE any API call:

#### Checks:
1. ✅ Emergency shutdown active?
2. ✅ User is blocked for abuse?
3. ✅ Maintenance mode enabled?
4. ✅ Cache-only mode enabled?
5. ✅ Single request cost > limit?
6. ✅ Hourly global spend > limit?
7. ✅ Daily global spend > limit?
8. ✅ User daily spend > limit?
9. ✅ User hourly spend > limit?

#### Usage:
```typescript
import { validateAPIRequest } from '@/lib/costProtection/preRequestValidation';

const validation = await validateAPIRequest({
  userId: 'user_123',
  requestType: 'comparison',
  estimatedCost: 0.05,
  userTier: 'free',
  ip: '192.168.1.1',
});

if (!validation.allowed) {
  return NextResponse.json({ error: validation.reason }, { status: 429 });
}

// Proceed with API call...
```

#### Limits Enforced:
- Max daily spend: **$10.00** (configurable)
- Max hourly spend: **$2.00** (configurable)
- Max per-user daily: **$0.50** (free users only)
- Max single request: **$0.10** (prevents expensive operations)
- Emergency shutdown: **$50.00** (kill switch)

---

### Layer 2: Rate Limiting

**File**: `lib/costProtection/rateLimiter.ts`

Implements **sliding window rate limiting** using Upstash Redis.

#### Rate Limits:

**Free Users:**
- 2 requests/minute
- 10 requests/hour
- 20 requests/day

**Premium Users:**
- 10 requests/minute
- 100 requests/hour
- 500 requests/day

**Global (All Users):**
- Max 5 concurrent API calls
- 2 requests/second globally

#### Usage:
```typescript
import { checkRateLimit } from '@/lib/costProtection/rateLimiter';

const rateLimitCheck = await checkRateLimit('user_123', 'free');

if (!rateLimitCheck.success) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfter: rateLimitCheck.retryAfter
    },
    { status: 429 }
  );
}
```

---

### Layer 3: Request Queueing

**File**: `lib/costProtection/queueSystem.ts`

Queues requests when system is at capacity.

#### Features:
- Max queue size: 100 requests
- Priority-based (premium > free)
- FIFO within priority level
- Projected cost validation
- Auto-reject if queue full

#### Usage:
```typescript
import { enqueueRequest } from '@/lib/costProtection/queueSystem';

const result = await enqueueRequest({
  userId: 'user_123',
  requestType: 'comparison',
  estimatedCost: 0.05,
  priority: 1,
  userTier: 'free',
  data: { object1: 'iPhone', object2: 'Samsung' },
});

if (result.queued) {
  return NextResponse.json({
    status: 'queued',
    position: result.status.position,
    estimatedWait: result.status.estimatedWaitTimeMs,
  });
}
```

---

### Layer 4: Circuit Breaker

**File**: `lib/costProtection/circuitBreaker.ts`

Automatically shuts down API access if costs spike unexpectedly.

#### States:
- **CLOSED**: Normal operation
- **OPEN**: Emergency shutdown (no requests allowed)
- **HALF_OPEN**: Testing recovery (limited requests)

#### Triggers:
1. Cost spike: Request costs 3x average
2. Failure threshold: 3 spikes in short period
3. Manual admin trigger

#### Auto-Recovery:
- OPEN → HALF_OPEN: After 1 hour
- HALF_OPEN → CLOSED: After 3 successful test requests
- HALF_OPEN → OPEN: If test requests fail

#### Usage:
```typescript
import { checkCircuitBreaker } from '@/lib/costProtection/circuitBreaker';

const circuitCheck = await checkCircuitBreaker();

if (!circuitCheck.allowed) {
  return NextResponse.json(
    { error: 'Service temporarily unavailable' },
    { status: 503 }
  );
}
```

---

### Layer 5: Abuse Detection

**File**: `lib/costProtection/abuseDetection.ts`

Detects and blocks malicious patterns.

#### Patterns Detected:
1. **Rapid-fire**: 10+ requests in 1 minute
2. **Duplicate spam**: Same comparison 5+ times in 5 minutes
3. **API key sharing**: Same user from 5+ IPs in 1 hour
4. **Cost anomaly**: User spending 10x average

#### Auto-Block:
- Abuse score ≥ 75: User auto-blocked for 24 hours
- Abuse score 50-74: Flagged for review
- Abuse score < 50: Allowed

#### Usage:
```typescript
import { checkUser } from '@/lib/costProtection/abuseDetection';

const abuseCheck = await checkUser('user_123', '192.168.1.1', requestData);

if (abuseCheck.shouldBlock) {
  // User will be auto-blocked
  return NextResponse.json(
    { error: 'Account suspended for suspicious activity' },
    { status: 403 }
  );
}
```

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# Redis (Required for production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Cost Limits (USD)
MAX_DAILY_SPEND=10.00
MAX_HOURLY_SPEND=2.00
MAX_MONTHLY_SPEND=200.00
MAX_USER_DAILY_COST=0.50
MAX_SINGLE_REQUEST_COST=0.10
EMERGENCY_SHUTDOWN_LIMIT=50.00

# API Costs (USD)
OPENAI_COST_PER_CALL=0.015
REPLICATE_COST_PER_CALL=0.04
MESHY_PREVIEW_COST=0.10
MESHY_REFINE_COST=0.30

# Rate Limits - Free Users
FREE_REQUESTS_PER_MINUTE=2
FREE_REQUESTS_PER_HOUR=10
FREE_REQUESTS_PER_DAY=20

# Rate Limits - Premium Users
PREMIUM_REQUESTS_PER_MINUTE=10
PREMIUM_REQUESTS_PER_HOUR=100
PREMIUM_REQUESTS_PER_DAY=500

# Global Limits
MAX_CONCURRENT_API_CALLS=5
GLOBAL_REQUESTS_PER_SECOND=2

# Feature Flags
ENABLE_COST_PROTECTION=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_ABUSE_DETECTION=true
```

### Cost Limits Configuration

Located in `config/costProtection.ts`:

```typescript
export const COST_LIMITS = {
  MAX_DAILY_SPEND: parseFloat(process.env.MAX_DAILY_SPEND || '10.00'),
  MAX_HOURLY_SPEND: parseFloat(process.env.MAX_HOURLY_SPEND || '2.00'),
  MAX_USER_DAILY_COST: parseFloat(process.env.MAX_USER_DAILY_COST || '0.50'),
  MAX_SINGLE_REQUEST_COST: parseFloat(process.env.MAX_SINGLE_REQUEST_COST || '0.10'),
  EMERGENCY_SHUTDOWN_LIMIT: parseFloat(process.env.EMERGENCY_SHUTDOWN_LIMIT || '50.00'),
};
```

---

## Monitoring

### Cost Dashboard

**Endpoint**: `GET /api/admin/costs`

Real-time cost monitoring dashboard:

```bash
curl https://yourapp.com/api/admin/costs
```

**Response**:
```json
{
  "spend": {
    "current_hour": 1.23,
    "current_day": 5.67,
    "current_month": 89.01,
    "average_request": 0.023
  },
  "budget": {
    "daily": {
      "used": 56.7,
      "limit": 10.00,
      "remaining": 4.33,
      "resetIn": 43200000
    }
  },
  "system": {
    "circuit_breaker": {
      "state": "CLOSED",
      "failures": 0
    },
    "queue": {
      "length": 0,
      "averageWaitTimeMs": 0
    },
    "cache": {
      "hitRate": 0.42,
      "savings": 2.34
    }
  },
  "alerts": {
    "level": "warning",
    "message": "Notice: 50% of daily budget consumed"
  }
}
```

### Admin Controls

**Endpoint**: `POST /api/admin/controls`

Manual kill switches and emergency controls:

#### Emergency Shutdown:
```bash
curl -X POST https://yourapp.com/api/admin/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "emergency_shutdown", "params": {"durationSeconds": 3600}}'
```

#### Deactivate Shutdown:
```bash
curl -X POST https://yourapp.com/api/admin/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "deactivate_shutdown"}'
```

#### Reset Circuit Breaker:
```bash
curl -X POST https://yourapp.com/api/admin/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_circuit_breaker"}'
```

#### Enable Cache-Only Mode:
```bash
curl -X POST https://yourapp.com/api/admin/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "enable_cache_only_mode"}'
```

#### Unblock User:
```bash
curl -X POST https://yourapp.com/api/admin/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "unblock_user", "params": {"userId": "user_123"}}'
```

---

## Testing

### Cost Simulator

Run simulations WITHOUT making real API calls:

```bash
# Normal traffic pattern
npm run cost-simulator -- normal

# Traffic surge (200 concurrent users)
npm run cost-simulator -- surge

# Abuse patterns (rapid-fire, spam, sharing)
npm run cost-simulator -- abuse

# Cost spike (expensive requests)
npm run cost-simulator -- cost-spike

# Distributed load (1000 users)
npm run cost-simulator -- distributed
```

**Output**:
```
============================================================
📊 SIMULATION RESULTS: surge
============================================================
Total Requests:      200
Allowed:             45 (22.5%)
Blocked:             155 (77.5%)
Total Cost:          $1.13
Average Latency:     23ms
Circuit Breaker:     🔴 TRIPPED
Errors:              0

Blocked Reasons:
  - rate_limit: 89
  - cost_limit: 45
  - capacity: 21
============================================================
```

---

## Emergency Procedures

### If Costs Spike:

**Immediate (< 1 minute):**
1. Redis sets `emergency_shutdown` flag
2. All new requests blocked with 503 error
3. Queue cleared to prevent further costs

**Within 1 minute:**
1. Email sent to `ADMIN_ALERT_EMAIL`
2. SMS sent to `ADMIN_ALERT_PHONE` (if configured)
3. Webhook notification (if configured)

**Within 5 minutes:**
1. Admin reviews dashboard: `/api/admin/costs`
2. Checks circuit breaker status
3. Reviews abuse detection logs

**Within 10 minutes:**
1. Decision: Resume or investigate
2. If bug: Fix code and redeploy
3. If attack: Keep shutdown active, investigate

**Within 1 hour:**
1. Auto-recovery: Emergency shutdown expires
2. Circuit breaker transitions to HALF_OPEN
3. Limited test requests allowed

### Manual Recovery:

```bash
# Check status
curl https://yourapp.com/api/admin/costs

# Reset circuit breaker
curl -X POST https://yourapp.com/api/admin/controls \
  -d '{"action": "reset_circuit_breaker"}'

# Deactivate emergency shutdown
curl -X POST https://yourapp.com/api/admin/controls \
  -d '{"action": "deactivate_shutdown"}'

# Clear queue (if needed)
curl -X POST https://yourapp.com/api/admin/controls \
  -d '{"action": "clear_queue"}'
```

---

## Deployment Checklist

### Pre-Launch:

- [ ] Set up Upstash Redis account
- [ ] Add Redis credentials to environment variables
- [ ] Configure cost limits (start conservative)
- [ ] Set admin alert email/phone
- [ ] Test cost simulator with all scenarios
- [ ] Verify circuit breaker works
- [ ] Test emergency shutdown/recovery
- [ ] Add admin authentication to control endpoints

### Post-Launch Monitoring:

- [ ] Monitor `/api/admin/costs` dashboard daily
- [ ] Set up automated alerts at 50%, 80%, 95% of budget
- [ ] Review cache hit rate (should be >40% after 1 month)
- [ ] Check for blocked users in abuse detection logs
- [ ] Verify rate limits are appropriate for user behavior
- [ ] Adjust limits based on actual costs

### Monthly Review:

- [ ] Analyze actual API costs vs estimates
- [ ] Update cost constants if APIs change pricing
- [ ] Review circuit breaker trips (should be rare/zero)
- [ ] Analyze abuse patterns and adjust thresholds
- [ ] Check queue analytics for capacity planning
- [ ] Update budget limits based on revenue

---

## Key Benefits

### Cost Protection:
- ✅ Hard limits prevent runaway costs
- ✅ Multiple layers provide defense in depth
- ✅ Automatic shutdown on anomalies
- ✅ Manual kill switches for emergencies

### User Experience:
- ✅ Graceful degradation (cache-only mode)
- ✅ Queue system vs hard errors
- ✅ Clear error messages with retry times
- ✅ Premium users get higher limits

### Operational:
- ✅ Real-time monitoring dashboard
- ✅ Abuse detection reduces support burden
- ✅ Circuit breaker prevents cascading failures
- ✅ Redis-backed for edge runtime compatibility

---

## Support

For questions or issues:
1. Check dashboard: `/api/admin/costs`
2. Review audit report: `COST_PROTECTION_AUDIT.md`
3. Test with simulator: `npm run cost-simulator`

**Remember**: Better to have angry users than a $5,000 API bill! 🚨
