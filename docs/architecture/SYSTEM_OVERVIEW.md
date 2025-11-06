# SizeEasy System Architecture Overview

**Last Updated:** 2025-11-06
**Purpose:** Comprehensive overview of how all SizeEasy components connect and interact

---

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [Data Flow](#data-flow)
4. [Component Interactions](#component-interactions)
5. [Critical Dependencies](#critical-dependencies)
6. [Failure Modes](#failure-modes)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                     (Next.js Frontend)                       │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │   Next.js API   │          │  Vercel Edge   │
    │     Routes      │          │   Functions    │
    └────────┬────────┘          └───────┬────────┘
             │                            │
             └────────────┬───────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
  ┌─────▼──────┐   ┌─────▼──────┐   ┌─────▼──────┐
  │  Supabase  │   │   Upstash  │   │  External  │
  │ PostgreSQL │   │   Redis    │   │    APIs    │
  │            │   │            │   │            │
  │ • Auth     │   │ • Rate     │   │ • Replicate│
  │ • Database │   │   Limiting │   │ • OpenAI   │
  │ • Storage  │   │ • Cost     │   │ • Meshy    │
  │            │   │   Tracking │   │ • Stripe   │
  └────────────┘   └────────────┘   └────────────┘
```

---

## Technology Stack

### Frontend Layer
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **3D Rendering:** Three.js + React Three Fiber
- **State Management:** Zustand
- **Deployment:** Vercel (Edge Network)

### Backend Layer
- **API:** Next.js API Routes (serverless)
- **Runtime:** Node.js 20+
- **Database:** Supabase (PostgreSQL)
- **Cache:** Upstash Redis
- **Authentication:** Supabase Auth

### External Services
1. **Replicate** - AI image generation (SDXL)
   - Cost: ~$0.04 per image
   - Latency: 3-8 seconds

2. **OpenAI** - Object dimension fetching (GPT-4o-mini)
   - Cost: ~$0.015 per call
   - Latency: 1-2 seconds

3. **Meshy** - 3D model generation
   - Preview Cost: $0.10
   - Refined Cost: $0.30
   - Latency: 60-120 seconds

4. **Stripe** - Payment processing
   - Monthly: $9.99
   - Yearly: $99.99

---

## Data Flow

### 1. User Comparison Request Flow

```
User Input → Pre-Request Validation → Rate Limiting → Cost Check
                                           ↓
                                    Cache Lookup
                                           ↓
                                    ┌──────┴──────┐
                                    │   CACHED?   │
                                    └──────┬──────┘
                                    ┌──────┴──────┐
                          YES ←────┤             ├────→ NO
                             │                          │
                      Return Cached              Generate New
                      (Free, <10ms)                     │
                             │                   Cost Protection
                             │                          │
                             │                   Queue Request
                             │                          │
                             │                   Call APIs
                             │                          │
                             │                   Save to Cache
                             │                          │
                             └──────────┬───────────────┘
                                        │
                                 Deduct Credits
                                        │
                                  Save to History
                                        │
                                 Return Response
```

### 2. Credit System Flow

```
Request Received
     │
Check User Profile
     │
Is Premium? ──YES──→ Allow (unlimited)
     │
     NO
     │
Check Credits Remaining
     │
Credits > 0? ──NO──→ Check Reset Time
     │                      │
     YES              Reset if due
     │                      │
Allow Request          └──→ Recheck
     │
Execute Comparison
     │
Deduct 1 Credit
     │
Update Reset Timer
```

### 3. Cost Protection Flow

```
Request Arrives
     │
Emergency Shutdown? ──YES──→ Reject (503)
     │
     NO
     │
Check User Daily Spend
     │
Exceeds $0.50? ──YES──→ Reject (429)
     │
     NO
     │
Check Global Hourly Spend
     │
Exceeds $2.00? ──YES──→ Reject (429)
     │
     NO
     │
Check Global Daily Spend
     │
Exceeds $10.00? ──YES──→ Emergency Shutdown + Alert Admin
     │
     NO
     │
Allow + Track Cost
```

---

## Component Interactions

### API Routes → Services → Database

**Example: Create Comparison**

1. **API Route:** `/app/api/comparison/create/route.ts`
   - Receives user request
   - Validates input
   - Calls service layer

2. **Service Layer:** `/lib/comparison-cache.ts`
   - Checks cache
   - Orchestrates AI calls
   - Saves results

3. **Database:** Supabase
   - `comparisons_cache` - Stores generated comparisons
   - `comparison_history` - User's personal history
   - `user_profiles` - Credits and premium status

### Cost Protection Layers

**Layer 1: Pre-Request Validation** (`lib/costProtection/preRequestValidation.ts`)
- Checks emergency shutdown flag
- Validates user isn't blocked
- Verifies feature flags

**Layer 2: Rate Limiter** (`lib/costProtection/rateLimiter.ts`)
- Free users: 2/min, 10/hour, 20/day
- Premium users: 10/min, 100/hour, 500/day

**Layer 3: Cost Tracking** (Integrated across all API calls)
- Tracks per-user daily spend
- Tracks global hourly/daily/monthly spend
- Triggers alerts at thresholds

**Layer 4: Circuit Breaker** (`lib/costProtection/circuitBreaker.ts`)
- Detects cost spikes (3x average)
- Automatically triggers emergency shutdown
- Requires manual reset

**Layer 5: Queue System** (`lib/costProtection/queueSystem.ts`)
- Limits concurrent API calls (max 5)
- Prevents thundering herd problem
- Premium users get priority

---

## Critical Dependencies

### Required for Basic Operation

1. **Supabase Database**
   - **Purpose:** User authentication, data storage
   - **If Down:** Site completely broken
   - **Mitigation:** None - this is single point of failure
   - **Recovery:** Contact Supabase support, check status page

2. **Upstash Redis**
   - **Purpose:** Rate limiting, cost tracking
   - **If Down:** ALL requests rejected (fail closed)
   - **Mitigation:** Use `ENABLE_COST_PROTECTION=false` (dangerous)
   - **Recovery:** Switch to different Redis provider, update UPSTASH_REDIS_REST_URL

### Required for AI Features

3. **Replicate API**
   - **Purpose:** Image generation
   - **If Down:** New comparisons fail, cached still work
   - **Mitigation:** Enable `CACHE_ONLY_MODE=true`
   - **Recovery:** Wait for Replicate to recover, use alternative API

4. **OpenAI API**
   - **Purpose:** Fetch object dimensions
   - **If Down:** New comparisons fail
   - **Mitigation:** Maintain dimension database in `lib/objects.ts`
   - **Recovery:** Expand hardcoded dimensions list

5. **Meshy API**
   - **Purpose:** 3D model generation
   - **If Down:** 3D feature unavailable, 2D still works
   - **Mitigation:** 3D is optional feature
   - **Recovery:** No immediate action needed

### Required for Payments

6. **Stripe**
   - **Purpose:** Premium subscriptions
   - **If Down:** Can't upgrade, existing premium works
   - **Mitigation:** None needed
   - **Recovery:** Users retry later

---

## Failure Modes

### Scenario 1: Redis Outage
**Symptom:** All API requests return 503 "Service temporarily unavailable"

**Why:** System fails closed to prevent cost overruns

**Immediate Fix:**
```bash
# Temporary bypass (DANGEROUS - only use if Redis truly down)
export ENABLE_COST_PROTECTION=false

# OR switch to backup Redis
export UPSTASH_REDIS_REST_URL=your_backup_redis_url
```

**Long-term Fix:** Maintain backup Redis instance

---

### Scenario 2: Database Outage (Supabase)
**Symptom:** Users can't log in, all data requests fail

**Why:** Supabase is single point of failure

**Immediate Fix:**
```bash
# Enable maintenance mode to show better error
export MAINTENANCE_MODE=true
```

**Recovery:**
1. Check Supabase status page
2. Contact Supabase support if prolonged
3. Consider multi-region setup for future

---

### Scenario 3: Cost Limit Hit
**Symptom:** "Daily limit reached" errors

**Why:** Exceeded MAX_DAILY_SPEND

**Immediate Fix:**
```bash
# Check current spend
redis-cli GET "cost:global:day:YYYY-MM-DD"

# If legitimate spike, increase limit temporarily
export MAX_DAILY_SPEND=20.00

# If abuse, activate emergency shutdown
redis-cli SET "cost:emergency_shutdown" "true"
```

**Investigation:**
```sql
-- Find top spenders today
SELECT user_id, COUNT(*) as comparisons, SUM(cost) as total_cost
FROM comparison_history
WHERE created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 10;
```

---

### Scenario 4: API Key Revoked
**Symptom:** All Replicate/OpenAI calls failing

**Why:** API key invalid or quota exceeded

**Immediate Fix:**
```bash
# Enable cache-only mode
export CACHE_ONLY_MODE=true

# Update API key
export REPLICATE_API_TOKEN=new_token_here
export OPENAI_API_KEY=new_key_here
```

**Testing:**
```bash
# Test Replicate
curl https://api.replicate.com/v1/models \
  -H "Authorization: Token $REPLICATE_API_TOKEN"

# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## System Health Indicators

### Green (Healthy)
- Cache hit rate > 60%
- Average response time < 5s
- Daily API spend < 50% of limit
- Error rate < 1%

### Yellow (Warning)
- Cache hit rate < 40%
- Average response time > 10s
- Daily API spend > 70% of limit
- Error rate 1-5%

### Red (Critical)
- Cache hit rate < 20%
- Average response time > 30s
- Daily API spend > 90% of limit
- Error rate > 5%
- Emergency shutdown triggered

---

## Quick Reference

### File Locations
- **API Routes:** `/app/api/*/route.ts`
- **Services:** `/lib/*.ts`
- **Config:** `/config/costProtection.ts`
- **Database Types:** `/lib/types/database.ts`

### Environment Variables
See: `/docs/deployment/ENVIRONMENT_SETUP.md`

### Database Schema
See: `/docs/architecture/DATABASE_SCHEMA.md`

### Cost Protection Details
See: `/docs/architecture/COST_PROTECTION.md`

### Common Issues
See: `/docs/troubleshooting/COMMON_ISSUES.md`

---

**Next Steps:**
- New to the codebase? Read `API_FLOW.md` next
- Setting up environment? Read `ENVIRONMENT_SETUP.md`
- Debugging issues? Read `COMMON_ISSUES.md`
- Understanding costs? Read `COST_PROTECTION.md`
