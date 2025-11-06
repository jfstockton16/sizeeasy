# Caching Strategy Documentation

**Last Updated:** 2025-11-06
**Purpose:** Comprehensive caching strategy to minimize API costs
**Target:** 70%+ cache hit rate = 70% cost savings

---

## Why Caching Matters

Without caching:
- Every "elephant vs bus" comparison costs $0.055
- 1,000 comparisons = $55
- Same comparison repeated 100 times = $5.50 wasted

With caching:
- First "elephant vs bus" = $0.055
- Next 99 identical requests = $0 (served from cache)
- 100 comparisons = $0.055 total (99% savings!)

---

## Cache Architecture

```
┌──────────────┐
│   Request    │
│ "A vs B"     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│ 1. Normalize Input               │
│    "BMW X4" → "bmw x4"           │
│    "Elephant" → "elephant"       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 2. Create Cache Key              │
│    Alphabetical order:           │
│    ("bmw x4", "elephant")        │
│    Ensures A vs B = B vs A       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 3. Query comparisons_cache       │
│    WHERE object1 = 'bmw x4'      │
│      AND object2 = 'elephant'    │
│      AND tier = 'free'           │
└──────┬───────────────────────────┘
       │
   ┌───┴────┐
   │ FOUND? │
   └───┬────┘
   ┌───┴─────┐
YES│         │NO
   │         │
   ▼         ▼
┌─────┐  ┌──────────┐
│Cache│  │Generate  │
│Hit  │  │New       │
│(Free│  │($0.055)  │
│<10ms│  │5-10s)    │
└──┬──┘  └────┬─────┘
   │          │
   │          ▼
   │     ┌────────────┐
   │     │Save to     │
   │     │Cache for   │
   │     │Future      │
   │     └────┬───────┘
   │          │
   └──────────┴────────→ Return Result
```

---

## Cache Tables

### comparisons_cache

**Primary cache table** - stores all generated comparisons globally

```sql
CREATE TABLE comparisons_cache (
  id UUID PRIMARY KEY,
  object1_name TEXT NOT NULL,     -- Normalized, alphabetical
  object2_name TEXT NOT NULL,     -- Normalized, alphabetical
  quality_tier TEXT NOT NULL,     -- 'free' or 'premium'
  object1_dimensions JSONB NOT NULL,
  object2_dimensions JSONB NOT NULL,
  comparison_image_url TEXT,
  generation_cost NUMERIC(10, 4),
  times_served INTEGER DEFAULT 1,  -- KEY METRIC!
  last_served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,

  UNIQUE (object1_name, object2_name, quality_tier)
);
```

**Key Index (CRITICAL):**
```sql
CREATE UNIQUE INDEX idx_cache_lookup
  ON comparisons_cache(object1_name, object2_name, quality_tier);
```

This index makes cache lookups <10ms instead of scanning entire table.

---

## Normalization Rules

### Object Name Normalization

**Problem:** User types "BMW X4" vs "bmw x4" vs "  BMW  x4  "
**Solution:** Normalize all inputs

```typescript
export function normalizeObjectName(name: string): string {
  return name
    .trim()               // Remove leading/trailing spaces
    .toLowerCase()        // Case insensitive
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

// Examples:
normalizeObjectName("BMW X4")      // → "bmw x4"
normalizeObjectName("  BMW  x4 ")  // → "bmw x4"
normalizeObjectName("BMW X4")      // → "bmw x4" ✓ All same!
```

### Cache Key Ordering

**Problem:** "A vs B" should equal "B vs A"
**Solution:** Alphabetical ordering

```typescript
export function createCacheKey(object1: string, object2: string) {
  const norm1 = normalizeObjectName(object1);
  const norm2 = normalizeObjectName(object2);

  // Sort alphabetically
  if (norm1 <= norm2) {
    return { name1: norm1, name2: norm2 };
  }
  return { name1: norm2, name2: norm1 };
}

// Examples:
createCacheKey("Elephant", "BMW X4")
// → { name1: "bmw x4", name2: "elephant" }

createCacheKey("BMW X4", "Elephant")
// → { name1: "bmw x4", name2: "elephant" } ✓ Same key!
```

---

## Cache Lookup Flow

**File:** `/lib/comparison-cache.ts`

```typescript
export async function getCachedComparison(
  object1: string,
  object2: string,
  tier: 'free' | 'premium' = 'free'
): Promise<ComparisonCache | null> {
  const supabase = createServiceRoleClient();
  const { name1, name2 } = createCacheKey(object1, object2);

  const { data, error } = await supabase
    .from('comparisons_cache')
    .select('*')
    .eq('object1_name', name1)
    .eq('object2_name', name2)
    .eq('quality_tier', tier)
    .single();

  if (error || !data) {
    // Premium fallback: try free tier
    if (tier === 'premium') {
      return getCachedComparison(object1, object2, 'free');
    }
    return null; // Cache miss
  }

  // Cache hit! Update metrics
  await supabase
    .from('comparisons_cache')
    .update({
      times_served: data.times_served + 1,
      last_served_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return data;
}
```

**Performance:** ~20-30ms for cache hit

---

## Cache Storage Flow

**After generating new comparison:**

```typescript
export async function cacheComparison(params: {
  object1Name: string,
  object2Name: string,
  object1Dimensions: ObjectDimensions,
  object2Dimensions: ObjectDimensions,
  comparisonImageUrl: string,
  generationCost: number,
  qualityTier: 'free' | 'premium'
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { name1, name2 } = createCacheKey(
    params.object1Name,
    params.object2Name
  );

  // Determine if objects need to be swapped to match cache key
  const isSwapped = normalizeObjectName(params.object1Name) !== name1;

  await supabase
    .from('comparisons_cache')
    .upsert({
      object1_name: name1,
      object2_name: name2,
      object1_dimensions: isSwapped ? params.object2Dimensions : params.object1Dimensions,
      object2_dimensions: isSwapped ? params.object1Dimensions : params.object2Dimensions,
      comparison_image_url: params.comparisonImageUrl,
      generation_cost: params.generationCost,
      quality_tier: params.qualityTier,
      times_served: 1,
      last_served_at: new Date().toISOString()
    }, {
      onConflict: 'object1_name,object2_name,quality_tier'
    });
}
```

**Why Upsert?** Handles edge case where two users request same comparison simultaneously.

---

## Cache Metrics

### Times Served

**Most important metric** - shows cache ROI

```sql
-- Top 20 most served comparisons
SELECT
  object1_name,
  object2_name,
  times_served,
  generation_cost,
  (times_served - 1) * generation_cost as total_savings
FROM comparisons_cache
ORDER BY times_served DESC
LIMIT 20;

-- Example output:
-- elephant | bus | 157 | 0.055 | $8.58 saved
```

**Total Savings:**
```sql
SELECT
  SUM((times_served - 1) * generation_cost) as total_savings,
  COUNT(*) as cache_entries,
  SUM(times_served) as total_serves
FROM comparisons_cache;
```

### Cache Hit Rate

**Target: 70%+**

```sql
-- Last 24 hours
SELECT
  COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) as hit_rate,
  COUNT(*) FILTER (WHERE from_cache) as hits,
  COUNT(*) FILTER (WHERE NOT from_cache) as misses,
  COUNT(*) as total
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Troubleshooting Low Hit Rate:**
- Check normalization is working (case sensitivity?)
- Check for typos in popular objects
- Consider pre-warming cache with popular comparisons

---

## Pre-Warming Cache

**Strategy:** Generate popular comparisons in advance

```typescript
// scripts/prewarm-cache.ts
const popularComparisons = [
  ['elephant', 'bus'],
  ['whale', 'airplane'],
  ['giraffe', 'house'],
  ['car', 'truck'],
  // ... top 100 pairs
];

for (const [obj1, obj2] of popularComparisons) {
  const cached = await getCachedComparison(obj1, obj2);
  if (!cached) {
    console.log(`Generating: ${obj1} vs ${obj2}`);
    await generateAndCacheComparison(obj1, obj2);
    await sleep(2000); // Rate limit friendly
  }
}
```

**Run on:**
- Initial deployment
- After cache purge
- Weekly to refresh popular items

---

## Cache Invalidation

### When to Invalidate

1. **Image quality improved** - New AI model
2. **Watermark changed** - Design update
3. **Dimensions corrected** - Object data was wrong

### How to Invalidate

```sql
-- Invalidate specific comparison
DELETE FROM comparisons_cache
WHERE object1_name = 'elephant'
  AND object2_name = 'bus';

-- Invalidate all free tier (e.g., new watermark)
DELETE FROM comparisons_cache
WHERE quality_tier = 'free';

-- Invalidate old entries (>90 days, <3 serves)
DELETE FROM comparisons_cache
WHERE last_served_at < NOW() - INTERVAL '90 days'
  AND times_served < 3;
```

---

## Cache Eviction Policy

**Problem:** Cache grows unbounded = storage costs

**Solution:** Evict least valuable entries

```sql
-- Monthly cleanup job
DELETE FROM comparisons_cache
WHERE id IN (
  SELECT id FROM comparisons_cache
  WHERE last_served_at < NOW() - INTERVAL '90 days'
    AND times_served < 3
  ORDER BY last_served_at ASC
  LIMIT 1000
);
```

**Criteria:**
- Not served in 90+ days
- Served less than 3 times (low value)

**Expected Impact:** Remove ~1,000 low-value entries/month

---

## Quality Tiers

### Free Tier
- **Watermark:** "SizeEasy.com" logo
- **Image Quality:** Standard
- **Cached separately** from premium

### Premium Tier
- **No watermark**
- **Higher quality** (optional)
- **Dedicated cache** entries

**Fallback Logic:**
```typescript
// If premium not cached, fall back to free
const premiumCache = await getCachedComparison(obj1, obj2, 'premium');
if (!premiumCache) {
  const freeCache = await getCachedComparison(obj1, obj2, 'free');
  if (freeCache) {
    // Return free tier result to premium user
    // OR regenerate premium version
  }
}
```

---

## Monitoring Cache Health

### Dashboard Queries

**Daily Cache Stats:**
```sql
SELECT
  DATE(created_at) as day,
  COUNT(*) as new_cache_entries,
  SUM(times_served) as total_serves,
  AVG(times_served) as avg_serves_per_entry
FROM comparisons_cache
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

**Cache Growth:**
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as cache_entries
FROM comparisons_cache
GROUP BY month
ORDER BY month DESC;
```

**Storage Used:**
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('comparisons_cache')) as cache_table_size,
  COUNT(*) as total_entries,
  AVG(LENGTH(comparison_image_url::text)) as avg_url_length
FROM comparisons_cache;
```

---

## Troubleshooting

### Issue: Cache Hit Rate Dropping

**Symptoms:** Hit rate below 50%

**Diagnosis:**
```sql
-- Check if normalization is working
SELECT object1_name, object2_name, COUNT(*) as duplicates
FROM comparisons_cache
GROUP BY LOWER(object1_name), LOWER(object2_name)
HAVING COUNT(*) > 1;

-- Check for typo variations
SELECT object1_name, COUNT(*) as variations
FROM comparisons_cache
WHERE object1_name LIKE '%elephant%'
GROUP BY object1_name;
```

**Fixes:**
1. Improve normalization logic
2. Add fuzzy matching
3. Pre-warm common variations

---

### Issue: Cache Growing Too Fast

**Symptoms:** Table size > 10GB

**Diagnosis:**
```sql
-- Find low-value entries
SELECT
  object1_name,
  object2_name,
  times_served,
  created_at
FROM comparisons_cache
WHERE times_served = 1
  AND created_at < NOW() - INTERVAL '30 days'
ORDER BY created_at ASC
LIMIT 100;
```

**Fix:** Run eviction query more frequently

---

## Cache Performance Optimization

### Index Optimization

```sql
-- Essential index (already exists)
CREATE UNIQUE INDEX idx_cache_lookup
  ON comparisons_cache(object1_name, object2_name, quality_tier);

-- Performance monitoring index
CREATE INDEX idx_cache_times_served
  ON comparisons_cache(times_served DESC);

-- Eviction index
CREATE INDEX idx_cache_last_served
  ON comparisons_cache(last_served_at)
  WHERE times_served < 3;
```

### Query Optimization

**Before:**
```sql
-- Slow: Scans entire table
SELECT * FROM comparisons_cache
WHERE LOWER(object1_name) = 'elephant'
  AND LOWER(object2_name) = 'bus';
```

**After:**
```sql
-- Fast: Uses index
SELECT * FROM comparisons_cache
WHERE object1_name = 'elephant'  -- Already normalized
  AND object2_name = 'bus'       -- Already normalized
  AND quality_tier = 'free';
```

---

## Future Enhancements

### 1. Redis Hot Cache

**Problem:** Even PostgreSQL cache lookup is ~30ms

**Solution:** Add Redis layer for ultra-fast lookups

```
Request → Redis (2ms) → PostgreSQL (30ms) → Generate (5-10s)
          ↑ 95% hit    ↑ 4% hit          ↑ 1% miss
```

### 2. Predictive Pre-warming

**Use analytics to predict popular comparisons:**

```sql
-- Trending comparisons (last 7 days)
SELECT
  object1_name,
  object2_name,
  COUNT(*) as frequency
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '7 days'
  AND from_cache = false
GROUP BY object1_name, object2_name
HAVING COUNT(*) > 3
ORDER BY frequency DESC;
```

Auto-generate these during off-peak hours.

### 3. Fuzzy Matching

**Handle typos:**
- "elefant" → "elephant"
- "bmw x-4" → "bmw x4"

Use Levenshtein distance or fuzzy search.

---

## Related Documentation

- **System Overview:** `/docs/architecture/SYSTEM_OVERVIEW.md`
- **Database Schema:** `/docs/architecture/DATABASE_SCHEMA.md`
- **Cost Protection:** `/docs/architecture/COST_PROTECTION.md`
- **Implementation:** `/lib/comparison-cache.ts`
