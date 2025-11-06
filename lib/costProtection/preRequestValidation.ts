/**
 * Layer 1: Pre-Request Validation
 *
 * Validates all API requests before they can incur costs.
 * This is the first line of defense against runaway API costs.
 */

import { getRedisClient, getCurrentSpend, isEmergencyShutdownActive } from '@/lib/redis-client';
import { COST_LIMITS, getCostKey, getBlockedUserKey, FEATURE_FLAGS } from '@/config/costProtection';

export interface ValidationContext {
  userId?: string;
  requestType: 'comparison' | 'image' | '3d-model' | 'dimensions';
  estimatedCost: number;
  userTier: 'free' | 'premium' | 'founder';
  ip?: string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // Seconds until they can retry
  currentSpend?: {
    user: number;
    hourly: number;
    daily: number;
  };
}

/**
 * Main validation function - checks all cost limits
 */
export async function validateAPIRequest(context: ValidationContext): Promise<ValidationResult> {
  // Skip validation if cost protection is disabled (only for development)
  if (!FEATURE_FLAGS.ENABLE_COST_PROTECTION && process.env.NODE_ENV !== 'production') {
    return { allowed: true };
  }

  // Check 1: Emergency shutdown
  const emergencyShutdown = await checkEmergencyShutdown();
  if (!emergencyShutdown.allowed) {
    return emergencyShutdown;
  }

  // Check 2: User is blocked
  if (context.userId) {
    const userBlocked = await checkUserBlocked(context.userId);
    if (!userBlocked.allowed) {
      return userBlocked;
    }
  }

  // Check 3: Maintenance mode
  if (FEATURE_FLAGS.MAINTENANCE_MODE) {
    return {
      allowed: false,
      reason: 'Service is in maintenance mode. Please try again later.',
      retryAfter: 1800, // 30 minutes
    };
  }

  // Check 4: Cache-only mode (no new generations allowed)
  if (FEATURE_FLAGS.CACHE_ONLY_MODE) {
    return {
      allowed: false,
      reason: 'New generations are temporarily disabled. Only cached comparisons available.',
      retryAfter: 3600, // 1 hour
    };
  }

  // Check 5: Single request cost limit
  const singleRequestLimit = await checkSingleRequestCost(context.estimatedCost);
  if (!singleRequestLimit.allowed) {
    return singleRequestLimit;
  }

  // Check 6: Hourly global spend
  const hourlyLimit = await checkHourlySpend(context.estimatedCost);
  if (!hourlyLimit.allowed) {
    return hourlyLimit;
  }

  // Check 7: Daily global spend
  const dailyLimit = await checkDailySpend(context.estimatedCost);
  if (!dailyLimit.allowed) {
    return dailyLimit;
  }

  // Check 8: Per-user daily cost (only for free users)
  if (context.userId && context.userTier === 'free') {
    const userDailyLimit = await checkUserDailySpend(context.userId, context.estimatedCost);
    if (!userDailyLimit.allowed) {
      return userDailyLimit;
    }
  }

  // Check 9: Per-user hourly cost (only for free users)
  if (context.userId && context.userTier === 'free') {
    const userHourlyLimit = await checkUserHourlySpend(context.userId, context.estimatedCost);
    if (!userHourlyLimit.allowed) {
      return userHourlyLimit;
    }
  }

  // All checks passed
  const currentSpend = {
    user: context.userId ? await getCurrentUserDailySpend(context.userId) : 0,
    hourly: await getCurrentSpend('hour'),
    daily: await getCurrentSpend('day'),
  };

  return {
    allowed: true,
    currentSpend,
  };
}

/**
 * Check if emergency shutdown is active
 */
async function checkEmergencyShutdown(): Promise<ValidationResult> {
  const isActive = await isEmergencyShutdownActive();

  if (isActive) {
    return {
      allowed: false,
      reason: 'API temporarily disabled - cost limit reached. Service will resume automatically.',
      retryAfter: 3600, // 1 hour
    };
  }

  return { allowed: true };
}

/**
 * Check if user is blocked for abuse
 */
async function checkUserBlocked(userId: string): Promise<ValidationResult> {
  const redis = getRedisClient();
  const blockKey = getBlockedUserKey(userId);

  try {
    const blockData = await redis.get(blockKey);

    if (blockData) {
      const ttl = await redis.ttl(blockKey);
      const reason = typeof blockData === 'string' ? blockData : 'Account temporarily suspended for abuse';

      return {
        allowed: false,
        reason,
        retryAfter: ttl > 0 ? ttl : 86400, // Default to 24 hours
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user block status:', error);
    // Fail open (allow request) if Redis is down
    return { allowed: true };
  }
}

/**
 * Check if single request cost exceeds limit
 */
async function checkSingleRequestCost(estimatedCost: number): Promise<ValidationResult> {
  if (estimatedCost > COST_LIMITS.MAX_SINGLE_REQUEST_COST) {
    return {
      allowed: false,
      reason: `Request cost ($${estimatedCost.toFixed(2)}) exceeds maximum allowed ($${COST_LIMITS.MAX_SINGLE_REQUEST_COST.toFixed(2)})`,
    };
  }

  return { allowed: true };
}

/**
 * Check hourly global spend limit
 */
async function checkHourlySpend(estimatedCost: number): Promise<ValidationResult> {
  const currentHourlySpend = await getCurrentSpend('hour');
  const projectedSpend = currentHourlySpend + estimatedCost;

  if (projectedSpend > COST_LIMITS.MAX_HOURLY_SPEND) {
    const { getTimeUntilReset } = await import('@/config/costProtection');
    const retryAfter = Math.ceil(getTimeUntilReset('hour') / 1000);

    return {
      allowed: false,
      reason: 'Service temporarily at capacity. Please try again in a few minutes.',
      retryAfter,
      currentSpend: {
        user: 0,
        hourly: currentHourlySpend,
        daily: 0,
      },
    };
  }

  return { allowed: true };
}

/**
 * Check daily global spend limit
 */
async function checkDailySpend(estimatedCost: number): Promise<ValidationResult> {
  const currentDailySpend = await getCurrentSpend('day');
  const projectedSpend = currentDailySpend + estimatedCost;

  if (projectedSpend > COST_LIMITS.MAX_DAILY_SPEND) {
    const { getTimeUntilReset } = await import('@/config/costProtection');
    const retryAfter = Math.ceil(getTimeUntilReset('day') / 1000);

    return {
      allowed: false,
      reason: 'Daily service limit reached. Service will resume tomorrow.',
      retryAfter,
      currentSpend: {
        user: 0,
        hourly: 0,
        daily: currentDailySpend,
      },
    };
  }

  return { allowed: true };
}

/**
 * Check per-user daily spend limit
 */
async function checkUserDailySpend(userId: string, estimatedCost: number): Promise<ValidationResult> {
  const currentUserSpend = await getCurrentUserDailySpend(userId);
  const projectedSpend = currentUserSpend + estimatedCost;

  if (projectedSpend > COST_LIMITS.MAX_USER_DAILY_COST) {
    const { getTimeUntilReset } = await import('@/config/costProtection');
    const retryAfter = Math.ceil(getTimeUntilReset('day') / 1000);

    return {
      allowed: false,
      reason: 'Daily limit reached - try again tomorrow or upgrade to Premium for unlimited access.',
      retryAfter,
      currentSpend: {
        user: currentUserSpend,
        hourly: 0,
        daily: 0,
      },
    };
  }

  return { allowed: true };
}

/**
 * Check per-user hourly spend limit
 */
async function checkUserHourlySpend(userId: string, estimatedCost: number): Promise<ValidationResult> {
  const redis = getRedisClient();
  const now = new Date();
  const hour = `${now.toISOString().split('T')[0]}:${now.getHours()}`;
  const key = `cost:user_spend:${userId}:hour:${hour}`;

  try {
    const currentUserHourlySpend = Number(await redis.get(key)) || 0;
    const projectedSpend = currentUserHourlySpend + estimatedCost;

    if (projectedSpend > COST_LIMITS.MAX_USER_HOURLY_COST) {
      const { getTimeUntilReset } = await import('@/config/costProtection');
      const retryAfter = Math.ceil(getTimeUntilReset('hour') / 1000);

      return {
        allowed: false,
        reason: 'You are making requests too quickly. Please slow down and try again in a few minutes.',
        retryAfter,
        currentSpend: {
          user: currentUserHourlySpend,
          hourly: 0,
          daily: 0,
        },
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user hourly spend:', error);
    // Fail open if Redis is down
    return { allowed: true };
  }
}

/**
 * Get current user daily spend
 */
async function getCurrentUserDailySpend(userId: string): Promise<number> {
  const redis = getRedisClient();
  const key = getCostKey('user', userId);

  try {
    const value = await redis.get(key);
    return Number(value) || 0;
  } catch (error) {
    console.error('Error getting user daily spend:', error);
    return 0;
  }
}

/**
 * Record successful API request cost
 * Call this AFTER the API request succeeds
 */
export async function recordAPIRequestCost(context: ValidationContext, actualCost: number): Promise<void> {
  const redis = getRedisClient();
  const now = new Date();

  try {
    // Record hourly spend
    const hourKey = getCostKey('hour');
    await redis.incrbyfloat(hourKey, actualCost);
    await redis.expire(hourKey, 3600); // 1 hour expiry

    // Record daily spend
    const dayKey = getCostKey('day');
    await redis.incrbyfloat(dayKey, actualCost);
    await redis.expire(dayKey, 86400); // 24 hour expiry

    // Record monthly spend
    const monthKey = getCostKey('month');
    await redis.incrbyfloat(monthKey, actualCost);
    // Keep monthly data for 90 days
    await redis.expire(monthKey, 7776000);

    // Record user daily spend (if user is identified)
    if (context.userId) {
      const userDayKey = getCostKey('user', context.userId);
      await redis.incrbyfloat(userDayKey, actualCost);
      await redis.expire(userDayKey, 86400);

      // Record user hourly spend
      const hour = `${now.toISOString().split('T')[0]}:${now.getHours()}`;
      const userHourKey = `cost:user_spend:${context.userId}:hour:${hour}`;
      await redis.incrbyfloat(userHourKey, actualCost);
      await redis.expire(userHourKey, 3600);
    }

    // Update average request cost (rolling average)
    await updateAverageRequestCost(actualCost);
  } catch (error) {
    console.error('Error recording API request cost:', error);
    // Don't throw - we don't want to fail the request if cost recording fails
  }
}

/**
 * Update rolling average request cost
 */
async function updateAverageRequestCost(cost: number): Promise<void> {
  const redis = getRedisClient();
  const avgKey = 'cost:average_request';
  const countKey = 'cost:request_count';

  try {
    const currentAvg = Number(await redis.get(avgKey)) || 0;
    const currentCount = Number(await redis.get(countKey)) || 0;

    const newCount = currentCount + 1;
    const newAvg = (currentAvg * currentCount + cost) / newCount;

    await redis.set(avgKey, newAvg);
    await redis.set(countKey, newCount);

    // Reset counts monthly
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 0) {
      await redis.del(avgKey, countKey);
    }
  } catch (error) {
    console.error('Error updating average request cost:', error);
  }
}

/**
 * Get validation summary for debugging/logging
 */
export async function getValidationSummary(userId?: string): Promise<{
  globalHourlySpend: number;
  globalDailySpend: number;
  globalMonthlySpend: number;
  userDailySpend: number;
  averageRequestCost: number;
  emergencyShutdown: boolean;
  limits: typeof COST_LIMITS;
}> {
  const redis = getRedisClient();

  const [
    globalHourlySpend,
    globalDailySpend,
    globalMonthlySpend,
    userDailySpend,
    averageRequestCost,
    emergencyShutdown,
  ] = await Promise.all([
    getCurrentSpend('hour'),
    getCurrentSpend('day'),
    getCurrentSpend('month'),
    userId ? getCurrentUserDailySpend(userId) : Promise.resolve(0),
    redis.get('cost:average_request').then((v) => Number(v) || 0),
    isEmergencyShutdownActive(),
  ]);

  return {
    globalHourlySpend,
    globalDailySpend,
    globalMonthlySpend,
    userDailySpend,
    averageRequestCost,
    emergencyShutdown,
    limits: COST_LIMITS,
  };
}
