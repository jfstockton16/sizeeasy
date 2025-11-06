# SizeEasy Documentation

**Last Updated:** 2025-11-06
**Purpose:** Master documentation index for the entire SizeEasy application

---

## Quick Start

**New to the codebase?** Start here:
1. Read [SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md) - Understand how everything connects
2. Read [API_FLOW.md](architecture/API_FLOW.md) - Follow a request from start to finish
3. Read [DATABASE_SCHEMA.md](architecture/DATABASE_SCHEMA.md) - Understand data structure
4. Read [COMMON_ISSUES.md](troubleshooting/COMMON_ISSUES.md) - Debug common problems

**Setting up for the first time?**
1. Read [DEPLOYMENT.md](../DEPLOYMENT.md) in project root
2. Read [SETUP.md](../SETUP.md) in project root
3. Configure environment variables using [.env.example](../.env.example)

**Something broken?**
1. Check [COMMON_ISSUES.md](troubleshooting/COMMON_ISSUES.md)
2. Look up error code in [ERROR_CODES.md](troubleshooting/ERROR_CODES.md)
3. If critical, check [EMERGENCY_PROCEDURES.md](troubleshooting/EMERGENCY_PROCEDURES.md)

---

## Documentation Structure

```
docs/
├── README.md                          ← You are here
│
├── architecture/                      ← How the system works
│   ├── SYSTEM_OVERVIEW.md            ← START HERE: Complete architecture
│   ├── API_FLOW.md                   ← Request lifecycle walkthrough
│   ├── DATABASE_SCHEMA.md            ← All tables, relationships, queries
│   ├── COST_PROTECTION.md            ← How we prevent runaway costs
│   ├── CACHING_STRATEGY.md           ← Cache-first architecture
│   └── PAYMENT_FLOW.md               ← Stripe integration (if exists)
│
├── troubleshooting/                   ← When things go wrong
│   ├── COMMON_ISSUES.md              ← Symptoms → Solutions
│   ├── ERROR_CODES.md                ← All error codes with fixes
│   ├── DEBUGGING_GUIDE.md            ← Step-by-step debugging
│   └── EMERGENCY_PROCEDURES.md       ← What to do when site is down
│
├── deployment/                        ← Production deployment
│   ├── DEPLOYMENT_CHECKLIST.md       ← Pre-launch verification
│   ├── ENVIRONMENT_SETUP.md          ← All env variables explained
│   ├── ROLLBACK_PROCEDURE.md         ← How to undo deployments
│   └── MONITORING_SETUP.md           ← What to watch and why
│
├── api/                               ← External service documentation
│   ├── EXTERNAL_APIS.md              ← All third-party services
│   ├── RATE_LIMITS.md                ← All limits and throttles
│   └── WEBHOOK_HANDLERS.md           ← Stripe webhooks etc
│
├── decisions/                         ← Why we built it this way
│   ├── TECH_DECISIONS.md             ← Technology choices explained
│   ├── TRADE_OFFS.md                 ← Compromises and why
│   └── FUTURE_IMPROVEMENTS.md        ← Known issues to address
│
└── monitoring/                        ← Health checks and metrics
    └── MONITORING_QUERIES.sql        ← Daily health check queries
```

---

## Core Concepts

### 1. Cache-First Architecture

**Key Insight:** Every repeated comparison costs $0 instead of $0.02

```
Request → Cache Check → Hit? → Return (FREE, <100ms)
                      → Miss? → Generate → Save to Cache → Return
```

**Files:**
- [CACHING_STRATEGY.md](architecture/CACHING_STRATEGY.md)
- `/lib/comparison-cache.ts`
- `/lib/types/database.ts` (comparisons_cache table)

**Metrics:**
- Target cache hit rate: >70%
- Current savings: Check [MONITORING_QUERIES.sql](monitoring/MONITORING_QUERIES.sql) query #11

---

### 2. Multi-Layer Cost Protection

**Philosophy:** Better to have angry users than a $5,000 surprise bill

**5 Protection Layers:**
1. **Pre-Request Validation** - Emergency shutdown, blocked users
2. **Rate Limiting** - 2/min (free), 10/min (premium)
3. **Cost Tracking** - Per-user and global spending limits
4. **Circuit Breaker** - Detects cost spikes, auto-shutdown
5. **Queue System** - Limits concurrent API calls

**Files:**
- [COST_PROTECTION.md](architecture/COST_PROTECTION.md)
- `/lib/costProtection/*`
- `/config/costProtection.ts`

**Emergency:**
- If site is down, check [EMERGENCY_PROCEDURES.md](troubleshooting/EMERGENCY_PROCEDURES.md)

---

### 3. Credit System

**Free Users:**
- 5 credits per day
- 1 credit per comparison
- Resets at midnight UTC
- Can earn more by sharing (+2) or referring (+10)

**Premium Users:**
- Unlimited comparisons
- No watermark
- Monthly ($9.99) or Yearly ($99.99)

**Files:**
- `/lib/credits.ts`
- `/app/api/credits/*`
- Database: `user_profiles.credits_remaining`

**Troubleshooting:**
- [COMMON_ISSUES.md#no-credits](troubleshooting/COMMON_ISSUES.md#no-credits-remaining)

---

### 4. Database Schema

**7 Main Tables:**
1. `user_profiles` - User accounts, credits, premium status
2. `comparisons_cache` - Global cache (shared across all users)
3. `comparison_history` - User's personal history
4. `referrals` - Referral tracking
5. `social_shares` - Share tracking
6. `analytics_events` - General event tracking
7. `payment_transactions` - Stripe payments

**Files:**
- [DATABASE_SCHEMA.md](architecture/DATABASE_SCHEMA.md)
- `/lib/types/database.ts`
- `/supabase/migrations/*`

**Quick Queries:**
```sql
-- Check cache hit rate
SELECT COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*)
FROM comparison_history
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Find top spenders
SELECT user_id, SUM(cost) as total_cost
FROM comparison_history
WHERE created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY total_cost DESC;
```

---

## Monitoring Dashboard

**Daily Health Check:**
```bash
# Run all monitoring queries
psql $DATABASE_URL -f docs/monitoring/MONITORING_QUERIES.sql

# Or individual checks
./scripts/health-check.sh
```

**Key Metrics to Watch:**
1. **Cache Hit Rate** - Should be >70%
   - If <50%: Check normalization, pre-warm popular comparisons
2. **Daily API Spend** - Should be <$10
   - If >$8: Warning, investigate top spenders
3. **Error Rate** - Should be <1%
   - If >5%: Check error logs, external API status
4. **Response Time** - Should be <500ms average
   - If >2s: Check cache hit rate, API latency

**Files:**
- [MONITORING_QUERIES.sql](monitoring/MONITORING_QUERIES.sql)
- `/scripts/health-check.sh`
- `/scripts/check-spend.sh`

---

## Common Tasks

### Add a New Error Code

1. Add to `/lib/errors/ERROR_REGISTRY.ts`
2. Document in [ERROR_CODES.md](troubleshooting/ERROR_CODES.md)
3. Add handling in relevant API route
4. Test error response format

### Investigate High Costs

1. Run: `redis-cli GET "cost:global:day:$(date +%Y-%m-%d)"`
2. Check [MONITORING_QUERIES.sql](monitoring/MONITORING_QUERIES.sql) #6 (Top Spenders)
3. Look for abuse patterns
4. If legitimate, consider raising limits in `.env`

### Debug "Service Unavailable" Error

1. Check emergency shutdown: `redis-cli GET "cost:emergency_shutdown"`
2. Check circuit breaker: `redis-cli GET "cost:circuit_breaker:state"`
3. Check Redis connection: `redis-cli PING`
4. Check database: `psql $DATABASE_URL -c "SELECT NOW();"`
5. See [COMMON_ISSUES.md](troubleshooting/COMMON_ISSUES.md) for detailed steps

### Deploy to Production

1. Review [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)
2. Test staging environment
3. Backup database
4. Deploy
5. Run post-deployment health check
6. Monitor for 1 hour

---

## Error Code Quick Reference

| Code | Name | Severity | Action |
|------|------|----------|--------|
| E101 | Not Authenticated | LOW | User logs in |
| E201 | Insufficient Credits | LOW | User shares or upgrades |
| E301 | Rate Limit (Minute) | LOW | User waits 60s |
| E305 | Global Hourly Limit | HIGH | Admin investigates |
| E306 | Global Daily Limit | CRITICAL | Emergency shutdown active |
| E401 | OpenAI API Error | HIGH | Check API status |
| E501 | Emergency Shutdown | CRITICAL | Admin manually clears |
| E502 | Redis Error | CRITICAL | Check Redis connection |
| E503 | Database Error | CRITICAL | Check Supabase status |

**Full list:** [ERROR_CODES.md](troubleshooting/ERROR_CODES.md)

---

## Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18, TypeScript
- Tailwind CSS
- Three.js (3D visualization)

**Backend:**
- Next.js API Routes (serverless)
- Supabase (PostgreSQL + Auth)
- Upstash Redis (rate limiting)

**External APIs:**
- OpenAI GPT-4o-mini (dimensions)
- Replicate SDXL (images)
- Meshy (3D models)
- Stripe (payments)

**Deployment:**
- Vercel (Edge Network)
- Supabase (Database)
- Upstash (Redis)

---

## File Organization

**Code Structure:**
```
app/
├── api/                   ← API routes
│   ├── comparison/        ← Main comparison endpoint
│   ├── credits/           ← Credit management
│   └── stripe/            ← Payment webhooks

lib/
├── credits.ts             ← Credit system logic
├── comparison-cache.ts    ← Caching utilities
├── costProtection/        ← Cost protection layers
│   ├── preRequestValidation.ts
│   ├── rateLimiter.ts
│   ├── circuitBreaker.ts
│   └── queueSystem.ts
├── errors/                ← Error handling
│   └── ERROR_REGISTRY.ts
└── supabase/              ← Database client

config/
└── costProtection.ts      ← Cost limits & thresholds

docs/                      ← Documentation (you are here)
scripts/                   ← Utility scripts
supabase/                  ← Database migrations
```

---

## Support & Contact

**Issues:**
- GitHub Issues: https://github.com/yourrepo/sizeeasy/issues
- Production Alerts: Check Sentry/LogRocket

**Documentation Issues:**
- Found outdated info? Update the doc + commit
- Missing documentation? Add it following the template

**Emergency Contact:**
- On-call: Check PagerDuty/OpsGenie
- Email: admin@sizeeasy.com

---

## Contributing to Documentation

**When adding new documentation:**
1. Follow the template format (see existing files)
2. Include:
   - Clear purpose statement
   - Common issues & solutions
   - Code examples
   - Cross-references to related docs
3. Add entry to this README
4. Keep inline code comments up to date

**Documentation Standards:**
- Every file needs @file, @purpose, @last_modified headers
- Every function needs JSDoc with examples
- Every error needs a solution in ERROR_CODES.md
- Every external service needs rate limits documented

---

## Version History

| Date | Changes | Author |
|------|---------|--------|
| 2025-11-06 | Initial comprehensive documentation | Production Audit |
| 2025-11-06 | Added ERROR_REGISTRY and monitoring queries | Production Audit |
| 2025-11-06 | Created architecture documentation | Production Audit |

---

**Remember:** Documentation is code. Keep it updated, tested, and accurate.

**Last health check:** Run `./scripts/health-check.sh` to verify system status
**Last documentation update:** 2025-11-06
