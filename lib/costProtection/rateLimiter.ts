/**
 * Layer 2: Request Throttling (Rate Limiting)
 *
 * Implements token bucket algorithm for rate limiting.
 * Prevents abuse by limiting requests per time period.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '@/lib/redis-client';
import { RATE_LIMITS } from '@/config/costProtection';

export type UserTier = 'free' | 'premium' | 'founder';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds to wait before retry
}

// Create rate limiters for different tiers
let rateLimiters: {
  free: {
    perMinute: Ratelimit;
    perHour: Ratelimit;
    perDay: Ratelimit;
  };
  premium: {
    perMinute: Ratelimit;
    perHour: Ratelimit;
    perDay: Ratelimit;
  };
  global: {
    perSecond: Ratelimit;
    perEndpoint: Ratelimit;
  };
} | null = null;

/**
 * Initialize rate limiters
 */
function getRateLimiters() {
  if (rateLimiters) {
    return rateLimiters;
  }

  const redis = getRedisClient();

  rateLimiters = {
    free: {
      perMinute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.FREE_USER.requests_per_minute,
          '1 m'
        ),
        analytics: true,
        prefix: 'ratelimit:free:minute',
      }),
      perHour: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.FREE_USER.requests_per_hour,
          '1 h'
        ),
        analytics: true,
        prefix: 'ratelimit:free:hour',
      }),
      perDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.FREE_USER.requests_per_day,
          '1 d'
        ),
        analytics: true,
        prefix: 'ratelimit:free:day',
      }),
    },
    premium: {
      perMinute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.PREMIUM_USER.requests_per_minute,
          '1 m'
        ),
        analytics: true,
        prefix: 'ratelimit:premium:minute',
      }),
      perHour: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.PREMIUM_USER.requests_per_hour,
          '1 h'
        ),
        analytics: true,
        prefix: 'ratelimit:premium:hour',
      }),
      perDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.PREMIUM_USER.requests_per_day,
          '1 d'
        ),
        analytics: true,
        prefix: 'ratelimit:premium:day',
      }),
    },
    global: {
      perSecond: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.GLOBAL.requests_per_second,
          '1 s'
        ),
        analytics: true,
        prefix: 'ratelimit:global:second',
      }),
      perEndpoint: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1000, '1 m'),
        analytics: true,
        prefix: 'ratelimit:endpoint',
      }),
    },
  };

  return rateLimiters;
}

/**
 * Check rate limit for a user
 */
export async function checkRateLimit(
  identifier: string,
  tier: UserTier = 'free'
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();

  // Founders get same limits as premium
  const effectiveTier = tier === 'founder' ? 'premium' : tier;

  try {
    // Check all time windows (minute, hour, day)
    const [minuteResult, hourResult, dayResult] = await Promise.all([
      limiters[effectiveTier].perMinute.limit(identifier),
      limiters[effectiveTier].perHour.limit(identifier),
      limiters[effectiveTier].perDay.limit(identifier),
    ]);

    // If any limit is exceeded, return that result
    if (!minuteResult.success) {
      return {
        success: false,
        limit: minuteResult.limit,
        remaining: minuteResult.remaining,
        reset: minuteResult.reset,
        retryAfter: Math.ceil((minuteResult.reset - Date.now()) / 1000),
      };
    }

    if (!hourResult.success) {
      return {
        success: false,
        limit: hourResult.limit,
        remaining: hourResult.remaining,
        reset: hourResult.reset,
        retryAfter: Math.ceil((hourResult.reset - Date.now()) / 1000),
      };
    }

    if (!dayResult.success) {
      return {
        success: false,
        limit: dayResult.limit,
        remaining: dayResult.remaining,
        reset: dayResult.reset,
        retryAfter: Math.ceil((dayResult.reset - Date.now()) / 1000),
      };
    }

    // All limits passed - return the most restrictive remaining count
    const minRemaining = Math.min(
      minuteResult.remaining,
      hourResult.remaining,
      dayResult.remaining
    );

    return {
      success: true,
      limit: dayResult.limit,
      remaining: minRemaining,
      reset: dayResult.reset,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);

    // Fail open - allow request if rate limiting fails
    // But log the error for investigation
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Check global rate limit (affects all users)
 */
export async function checkGlobalRateLimit(): Promise<RateLimitResult> {
  const limiters = getRateLimiters();

  try {
    const result = await limiters.global.perSecond.limit('global');

    if (!result.success) {
      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      };
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Error checking global rate limit:', error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 1000,
    };
  }
}

/**
 * Check rate limit for specific endpoint
 */
export async function checkEndpointRateLimit(endpoint: string): Promise<RateLimitResult> {
  const limiters = getRateLimiters();

  try {
    const result = await limiters.global.perEndpoint.limit(endpoint);

    if (!result.success) {
      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      };
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Error checking endpoint rate limit:', error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Check rate limit by IP address (for anonymous users)
 */
export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const limiters = getRateLimiters();

  try {
    // Anonymous users get free tier limits
    const result = await limiters.free.perMinute.limit(`ip:${ip}`);

    if (!result.success) {
      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      };
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Error checking IP rate limit:', error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Concurrent request limiter
 */
export async function checkConcurrentRequests(): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const redis = getRedisClient();
  const maxConcurrent = RATE_LIMITS.GLOBAL.max_concurrent_api_calls;

  try {
    const current = Number(await redis.get('cost:concurrent:count')) || 0;

    if (current >= maxConcurrent) {
      return {
        allowed: false,
        current,
        max: maxConcurrent,
      };
    }

    return {
      allowed: true,
      current,
      max: maxConcurrent,
    };
  } catch (error) {
    console.error('Error checking concurrent requests:', error);
    return {
      allowed: true,
      current: 0,
      max: maxConcurrent,
    };
  }
}

/**
 * Increment concurrent request counter
 * Call this when starting an API request
 */
export async function incrementConcurrentRequests(): Promise<number> {
  const redis = getRedisClient();

  try {
    const count = await redis.incr('cost:concurrent:count');

    // Set expiry to prevent leaks from crashes
    await redis.expire('cost:concurrent:count', 300); // 5 minutes

    return count;
  } catch (error) {
    console.error('Error incrementing concurrent requests:', error);
    return 0;
  }
}

/**
 * Decrement concurrent request counter
 * Call this when API request completes (success or failure)
 */
export async function decrementConcurrentRequests(): Promise<number> {
  const redis = getRedisClient();

  try {
    const current = Number(await redis.get('cost:concurrent:count')) || 0;

    if (current > 0) {
      const count = await redis.decr('cost:concurrent:count');
      return Math.max(0, count);
    }

    return 0;
  } catch (error) {
    console.error('Error decrementing concurrent requests:', error);
    return 0;
  }
}

/**
 * Get rate limit status for user (for display in UI)
 */
export async function getRateLimitStatus(
  identifier: string,
  tier: UserTier = 'free'
): Promise<{
  minute: { limit: number; remaining: number; reset: number };
  hour: { limit: number; remaining: number; reset: number };
  day: { limit: number; remaining: number; reset: number };
}> {
  const limiters = getRateLimiters();
  const effectiveTier = tier === 'founder' ? 'premium' : tier;

  try {
    // Get current status without consuming tokens
    const redis = getRedisClient();

    const minuteKey = `ratelimit:${effectiveTier}:minute:${identifier}`;
    const hourKey = `ratelimit:${effectiveTier}:hour:${identifier}`;
    const dayKey = `ratelimit:${effectiveTier}:day:${identifier}`;

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      redis.get(minuteKey).then((v) => Number(v) || 0),
      redis.get(hourKey).then((v) => Number(v) || 0),
      redis.get(dayKey).then((v) => Number(v) || 0),
    ]);

    const limits = RATE_LIMITS[effectiveTier.toUpperCase() as 'FREE' | 'PREMIUM'];
    const now = Date.now();

    return {
      minute: {
        limit: limits.requests_per_minute,
        remaining: Math.max(0, limits.requests_per_minute - minuteCount),
        reset: now + 60000, // Next minute
      },
      hour: {
        limit: limits.requests_per_hour,
        remaining: Math.max(0, limits.requests_per_hour - hourCount),
        reset: now + 3600000, // Next hour
      },
      day: {
        limit: limits.requests_per_day,
        remaining: Math.max(0, limits.requests_per_day - dayCount),
        reset: now + 86400000, // Next day
      },
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);

    // Return default values
    const limits = RATE_LIMITS[effectiveTier.toUpperCase() as 'FREE' | 'PREMIUM'];
    const now = Date.now();

    return {
      minute: {
        limit: limits.requests_per_minute,
        remaining: limits.requests_per_minute,
        reset: now + 60000,
      },
      hour: {
        limit: limits.requests_per_hour,
        remaining: limits.requests_per_hour,
        reset: now + 3600000,
      },
      day: {
        limit: limits.requests_per_day,
        remaining: limits.requests_per_day,
        reset: now + 86400000,
      },
    };
  }
}

/**
 * Reset rate limits for a user (admin function)
 */
export async function resetRateLimits(identifier: string, tier: UserTier = 'free'): Promise<void> {
  const redis = getRedisClient();
  const effectiveTier = tier === 'founder' ? 'premium' : tier;

  try {
    const patterns = [
      `ratelimit:${effectiveTier}:minute:${identifier}`,
      `ratelimit:${effectiveTier}:hour:${identifier}`,
      `ratelimit:${effectiveTier}:day:${identifier}`,
    ];

    await Promise.all(patterns.map((key) => redis.del(key)));

    console.log(`✅ Rate limits reset for ${identifier} (${tier})`);
  } catch (error) {
    console.error('Error resetting rate limits:', error);
    throw error;
  }
}
