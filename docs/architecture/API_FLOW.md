# API Request Flow Documentation

**Last Updated:** 2025-11-06
**Purpose:** Detailed walkthrough of every API request from start to finish

---

## Table of Contents
1. [Comparison Creation Flow](#comparison-creation-flow)
2. [Credit Check Flow](#credit-check-flow)
3. [Payment Flow](#payment-flow)
4. [3D Model Generation Flow](#3d-model-generation-flow)
5. [Admin Dashboard Flow](#admin-dashboard-flow)
6. [Error Handling](#error-handling)

---

## Comparison Creation Flow

**Endpoint:** `POST /api/comparison/create`
**File:** `/app/api/comparison/create/route.ts`
**Average Duration:** 100ms (cached) or 5-10s (new generation)

### Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                            │
│    POST /api/comparison/create                               │
│    Body: { object1: "elephant", object2: "bus" }            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATION                                            │
│    File: middleware.ts                                       │
│    - Verify Supabase session cookie                         │
│    - Extract user ID from JWT                               │
│    - Return 401 if not authenticated                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PRE-REQUEST VALIDATION                                    │
│    File: lib/costProtection/preRequestValidation.ts         │
│                                                              │
│    3.1 Check Emergency Shutdown                             │
│        Redis Key: "cost:emergency_shutdown"                 │
│        → If true: Return 503 "Service unavailable"          │
│                                                              │
│    3.2 Check Maintenance Mode                               │
│        Env: MAINTENANCE_MODE                                │
│        → If true: Return 503 "Under maintenance"            │
│                                                              │
│    3.3 Check User Blocked                                   │
│        Redis Key: "cost:blocked_user:{userId}"              │
│        → If blocked: Return 403 "Account suspended"         │
│                                                              │
│    3.4 Check Feature Flags                                  │
│        Env: ENABLE_COST_PROTECTION                          │
│        → Determines which protections are active            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RATE LIMITING                                             │
│    File: lib/costProtection/rateLimiter.ts                  │
│    Library: @upstash/ratelimit                              │
│                                                              │
│    4.1 Determine User Tier                                  │
│        Query: user_profiles.is_premium                      │
│        → Free: 2/min, 10/hour, 20/day                       │
│        → Premium: 10/min, 100/hour, 500/day                 │
│                                                              │
│    4.2 Check Rate Limit                                     │
│        Redis Keys:                                          │
│        - "ratelimit:user:{userId}:minute"                   │
│        - "ratelimit:user:{userId}:hour"                     │
│        - "ratelimit:user:{userId}:day"                      │
│        → If exceeded: Return 429 "Rate limit exceeded"      │
│                                                              │
│    4.3 Check Global Rate Limit                              │
│        Redis Key: "ratelimit:global:second"                 │
│        Limit: 2 requests/second globally                    │
│        → If exceeded: Queue request                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CREDIT VERIFICATION                                       │
│    File: lib/credits.ts → canUserGenerateComparison()       │
│                                                              │
│    5.1 Fetch User Profile                                   │
│        Table: user_profiles                                 │
│        Columns: is_premium, credits_remaining,              │
│                 credits_reset_time                          │
│                                                              │
│    5.2 Check Premium Status                                 │
│        If is_premium AND premium_expires > NOW():           │
│        → Allow (skip credit check)                          │
│        → Set isPremium flag                                 │
│                                                              │
│    5.3 Check Credit Reset Time                              │
│        If credits_reset_time <= NOW():                      │
│        → Call resetUserCredits()                            │
│        → Set credits_remaining = 5 (or 20 for founders)     │
│        → Set credits_reset_time = NOW() + 24 hours          │
│                                                              │
│    5.4 Check Credits Available                              │
│        If credits_remaining > 0:                            │
│        → Allow                                              │
│        Else:                                                │
│        → Return 402 "No credits remaining"                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CACHE LOOKUP                                              │
│    File: lib/comparison-cache.ts → getCachedComparison()    │
│                                                              │
│    6.1 Normalize Object Names                               │
│        "BMW X4" → "bmw x4"                                  │
│        "Elephant" → "elephant"                              │
│                                                              │
│    6.2 Create Cache Key (Alphabetical)                      │
│        "bmw x4" vs "elephant" → ("bmw x4", "elephant")      │
│        Ensures "A vs B" = "B vs A"                          │
│                                                              │
│    6.3 Query Cache Table                                    │
│        Table: comparisons_cache                             │
│        Query: WHERE object1_name = 'bmw x4'                 │
│               AND object2_name = 'elephant'                 │
│               AND quality_tier = 'free' (or 'premium')      │
│                                                              │
│    6.4 If Found:                                            │
│        → Increment times_served counter                     │
│        → Update last_served_at timestamp                    │
│        → Return cached data                                 │
│        → SKIP to step 11 (Save to History)                  │
│                                                              │
│    6.5 If Premium User + No Premium Cache:                  │
│        → Fallback to free tier cache                        │
│        → If found: Return free tier result                  │
└────────────────────────┬────────────────────────────────────┘
                         │ (Cache Miss)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. COST PROTECTION CHECK                                     │
│    File: lib/costProtection/preRequestValidation.ts         │
│                                                              │
│    7.1 Estimate Request Cost                                │
│        OpenAI call (dimensions): $0.015                     │
│        Replicate call (image): $0.04                        │
│        Total: ~$0.055                                       │
│                                                              │
│    7.2 Check User Daily Spend                               │
│        Redis Key: "cost:user_spend:{userId}:{YYYY-MM-DD}"   │
│        Limit: $0.50/day                                     │
│        → If would exceed: Return 429 "Daily user limit"     │
│                                                              │
│    7.3 Check Global Hourly Spend                            │
│        Redis Key: "cost:global:hour:{YYYY-MM-DD:HH}"        │
│        Limit: $2.00/hour                                    │
│        → If would exceed: Return 429 "System busy"          │
│                                                              │
│    7.4 Check Global Daily Spend                             │
│        Redis Key: "cost:global:day:{YYYY-MM-DD}"            │
│        Limit: $10.00/day                                    │
│        → If would exceed: EMERGENCY SHUTDOWN                │
│        → Set emergency_shutdown flag                        │
│        → Alert admin                                        │
│        → Return 503 "Service unavailable"                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. QUEUE REQUEST (If Needed)                                │
│    File: lib/costProtection/queueSystem.ts                  │
│                                                              │
│    8.1 Check Concurrent Requests                            │
│        Redis Key: "cost:concurrent:count"                   │
│        Limit: 5 concurrent API calls                        │
│                                                              │
│    8.2 If At Capacity:                                      │
│        → Add to queue with priority:                        │
│          - Premium users: priority 10                       │
│          - Free users: priority 1                           │
│        → Queue stored in Redis list                         │
│        → Wait for slot (max 30 seconds)                     │
│        → If timeout: Return 503 "Queue full"                │
│                                                              │
│    8.3 Acquire Slot:                                        │
│        → Increment concurrent counter                       │
│        → Proceed to generation                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. AI GENERATION                                             │
│                                                              │
│    9.1 Fetch Dimensions (OpenAI)                            │
│        File: lib/ai-dimensions.ts                           │
│        API: OpenAI GPT-4o-mini                              │
│        Prompt: "What are the dimensions of {object}?"       │
│        Response: { length, width, height, unit }            │
│        Cost: ~$0.015                                        │
│        Duration: 1-2 seconds                                │
│                                                              │
│        If Object in Hardcoded List:                         │
│        → Use lib/objects.ts data (free, instant)            │
│                                                              │
│    9.2 Generate Comparison Image (Replicate)                │
│        File: app/api/generate-image/route.ts                │
│        API: Replicate SDXL                                  │
│        Prompt: "Side by side comparison of {obj1} and       │
│                 {obj2}, photorealistic, scale accurate"     │
│        Cost: ~$0.04                                         │
│        Duration: 3-8 seconds                                │
│                                                              │
│        Returns: Image URL                                   │
│                                                              │
│    9.3 Add Watermark (If Free User)                         │
│        File: lib/watermark.ts                               │
│        → Download image from Replicate                      │
│        → Add "SizeEasy.com" watermark                       │
│        → Upload to Supabase Storage                         │
│        → Return new URL                                     │
│                                                              │
│    Total Generation Time: 5-10 seconds                      │
│    Total Cost: ~$0.055                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. SAVE TO CACHE                                            │
│     File: lib/comparison-cache.ts → cacheComparison()       │
│                                                              │
│     10.1 Prepare Cache Entry                                │
│          - Normalized object names (alphabetical)           │
│          - Dimensions for both objects                      │
│          - Generated image URL                              │
│          - Generation cost                                  │
│          - Quality tier (free/premium)                      │
│                                                              │
│     10.2 Upsert to Cache Table                              │
│          Table: comparisons_cache                           │
│          Conflict: (object1_name, object2_name, tier)       │
│          → If exists: Update                                │
│          → If new: Insert                                   │
│                                                              │
│     10.3 Set Initial Metrics                                │
│          times_served: 1                                    │
│          last_served_at: NOW()                              │
│                                                              │
│     Benefits Future Requests:                               │
│     - Next identical comparison: <100ms response            │
│     - Saves $0.055 per cache hit                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. TRACK COST                                               │
│     Atomically update Redis counters                        │
│                                                              │
│     11.1 User Daily Spend                                   │
│          Key: "cost:user_spend:{userId}:{YYYY-MM-DD}"       │
│          INCRBY: 0.055                                      │
│          TTL: 24 hours                                      │
│                                                              │
│     11.2 Global Hourly Spend                                │
│          Key: "cost:global:hour:{YYYY-MM-DD:HH}"            │
│          INCRBY: 0.055                                      │
│          TTL: 1 hour                                        │
│                                                              │
│     11.3 Global Daily Spend                                 │
│          Key: "cost:global:day:{YYYY-MM-DD}"                │
│          INCRBY: 0.055                                      │
│          TTL: 24 hours                                      │
│                                                              │
│     11.4 Monthly Spend                                      │
│          Key: "cost:global:month:{YYYY-MM}"                 │
│          INCRBY: 0.055                                      │
│          TTL: 31 days                                       │
│                                                              │
│     11.5 Check Alert Thresholds                             │
│          If daily > $5.00 (50%): Warning email              │
│          If daily > $8.00 (80%): Critical alert             │
│          If daily > $9.50 (95%): Emergency prep             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 12. DEDUCT CREDIT (If Free User)                            │
│     File: lib/credits.ts → deductUserCredit()               │
│                                                              │
│     12.1 Call Database Function                             │
│          Function: deduct_credit(p_user_id)                 │
│          → Atomically decrements credits_remaining          │
│          → Returns success boolean                          │
│                                                              │
│     12.2 Update User Stats                                  │
│          Table: user_profiles                               │
│          Updates:                                           │
│          - total_comparisons += 1                           │
│          - comparisons_this_month += 1                      │
│          - last_comparison_at = NOW()                       │
│                                                              │
│     Premium Users: Skip this step                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 13. SAVE TO USER HISTORY                                    │
│     File: lib/comparison-cache.ts →                         │
│           saveComparisonToHistory()                         │
│                                                              │
│     Table: comparison_history                               │
│     Insert:                                                 │
│     - user_id                                               │
│     - object1_name, object2_name                            │
│     - object1_dimensions, object2_dimensions                │
│     - from_cache (true/false)                               │
│     - cache_entry_id (if from cache)                        │
│     - cost (actual cost incurred)                           │
│     - was_premium_at_time                                   │
│     - created_at (timestamp)                                │
│                                                              │
│     Purpose:                                                │
│     - User can view their comparison history                │
│     - Analytics on user behavior                            │
│     - Audit trail for costs                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 14. RECORD ANALYTICS                                         │
│     File: lib/analytics.ts                                  │
│                                                              │
│     Table: analytics_events                                 │
│     Insert:                                                 │
│     - event_name: "comparison_created"                      │
│     - user_id                                               │
│     - event_data: {                                         │
│         object1, object2,                                   │
│         from_cache,                                         │
│         generation_time_ms,                                 │
│         cost,                                               │
│         user_tier: "free" | "premium"                       │
│       }                                                     │
│     - created_at                                            │
│                                                              │
│     Also Track in Vercel Analytics (if enabled)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 15. RELEASE QUEUE SLOT                                      │
│     File: lib/costProtection/queueSystem.ts                 │
│                                                              │
│     Redis Operation:                                        │
│     DECR "cost:concurrent:count"                            │
│                                                              │
│     Process Next in Queue (if any waiting)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 16. RETURN RESPONSE                                          │
│                                                              │
│     Status: 200 OK                                          │
│     Body: {                                                 │
│       success: true,                                        │
│       comparison: {                                         │
│         id: "uuid",                                         │
│         object1: { name, dimensions },                      │
│         object2: { name, dimensions },                      │
│         imageUrl: "https://...",                            │
│         fromCache: boolean,                                 │
│         generatedAt: "timestamp"                            │
│       },                                                    │
│       credits: {                                            │
│         remaining: 4,                                       │
│         resetTime: "2024-11-07T00:00:00Z"                   │
│       },                                                    │
│       cost: 0.055 (if from cache: 0)                        │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Timing Breakdown

### Cached Request (Ideal)
- Authentication: 20ms
- Validation: 10ms
- Rate limiting: 5ms
- Credit check: 15ms
- Cache lookup: 30ms
- Save to history: 20ms
- **Total: ~100ms**

### New Generation (Cache Miss)
- Authentication: 20ms
- Validation: 10ms
- Rate limiting: 5ms
- Credit check: 15ms
- Cache lookup: 30ms (miss)
- Cost protection: 10ms
- OpenAI dimensions: 1,500ms
- Replicate image: 6,000ms
- Watermark (if needed): 500ms
- Save to cache: 50ms
- Deduct credit: 20ms
- Save to history: 20ms
- **Total: ~8,180ms (8.2 seconds)**

### Queued Request
- Add above timing
- Queue wait time: 0-30,000ms
- **Total: 100ms - 38 seconds**

---

## Error Responses

| Code | Scenario | Message | User Action |
|------|----------|---------|-------------|
| 401 | Not authenticated | "Please log in" | Redirect to login |
| 402 | No credits | "Out of credits. Share to earn more!" | Share or upgrade |
| 403 | Account blocked | "Account suspended due to abuse" | Contact support |
| 429 | Rate limited | "Too many requests. Try again in X minutes" | Wait |
| 429 | Daily limit hit | "Daily generation limit reached" | Wait or upgrade |
| 503 | Emergency shutdown | "Service temporarily unavailable" | Wait, admin alerted |
| 503 | Maintenance mode | "Under maintenance, back soon" | Wait |
| 500 | AI API failure | "Generation failed. Please try again" | Retry |

---

## Cache Strategy Impact

**With 60% cache hit rate:**
- 60% of requests: ~100ms response
- 40% of requests: ~8s response
- Average: ~3.3s response time
- Cost savings: 60% × $0.055 = $0.033 per comparison saved

**With 80% cache hit rate:**
- 80% of requests: ~100ms response
- 20% of requests: ~8s response
- Average: ~1.7s response time
- Cost savings: 80% × $0.055 = $0.044 per comparison saved

**Target: Maintain >70% cache hit rate**

---

## Related Documentation

- **System Overview:** `/docs/architecture/SYSTEM_OVERVIEW.md`
- **Cost Protection:** `/docs/architecture/COST_PROTECTION.md`
- **Caching Strategy:** `/docs/architecture/CACHING_STRATEGY.md`
- **Error Codes:** `/docs/troubleshooting/ERROR_CODES.md`
- **Common Issues:** `/docs/troubleshooting/COMMON_ISSUES.md`
