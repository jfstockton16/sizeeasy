/**
 * Cost Monitoring Dashboard API
 *
 * Real-time cost monitoring and analytics for admins.
 * Provides comprehensive cost metrics and controls.
 * PROTECTED: This endpoint requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSpend } from '@/lib/redis-client';
import { COST_LIMITS, getTimeUntilReset } from '@/config/costProtection';
import { getCircuitBreakerStatus } from '@/lib/costProtection/circuitBreaker';
import { getQueueAnalytics } from '@/lib/costProtection/queueSystem';
import { getValidationSummary } from '@/lib/costProtection/preRequestValidation';
import { getSystemAbuseStats } from '@/lib/costProtection/abuseDetection';
import { getRedisClient } from '@/lib/redis-client';
import { requireAdmin } from '@/lib/auth/admin';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

/**
 * GET /api/admin/costs
 * Get comprehensive cost dashboard metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    if (!admin) {
      logger.warn('Unauthorized admin costs access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = getRedisClient();

    // Gather all metrics in parallel
    const [
      hourlySpend,
      dailySpend,
      monthlySpend,
      averageRequestCost,
      circuitBreakerStatus,
      queueAnalytics,
      abuseStats,
      cacheStats,
    ] = await Promise.all([
      getCurrentSpend('hour'),
      getCurrentSpend('day'),
      getCurrentSpend('month'),
      redis.get('cost:average_request').then((v) => Number(v) || 0),
      getCircuitBreakerStatus(),
      getQueueAnalytics(),
      getSystemAbuseStats(),
      getCacheStats(),
    ]);

    // Calculate projections
    const now = new Date();
    const hourProgress = now.getMinutes() / 60;
    const dayProgress = (now.getHours() + hourProgress) / 24;

    const projectedDailySpend = dayProgress > 0 ? dailySpend / dayProgress : dailySpend;
    const projectedMonthlySpend = dailySpend * 30; // Rough estimate

    // Calculate budget utilization
    const hourlyBudgetUsed = (hourlySpend / COST_LIMITS.MAX_HOURLY_SPEND) * 100;
    const dailyBudgetUsed = (dailySpend / COST_LIMITS.MAX_DAILY_SPEND) * 100;
    const monthlyBudgetUsed = (monthlySpend / COST_LIMITS.MAX_MONTHLY_SPEND) * 100;

    // Calculate estimated savings from cache
    const estimatedSavingsFromCache = cacheStats.hitRate * dailySpend;

    // Determine alert status
    let alertLevel: 'ok' | 'warning' | 'critical' | 'emergency' = 'ok';
    let alertMessage: string | undefined;

    if (dailyBudgetUsed >= 95) {
      alertLevel = 'emergency';
      alertMessage = 'CRITICAL: 95% of daily budget consumed';
    } else if (dailyBudgetUsed >= 80) {
      alertLevel = 'critical';
      alertMessage = 'WARNING: 80% of daily budget consumed';
    } else if (dailyBudgetUsed >= 50) {
      alertLevel = 'warning';
      alertMessage = 'Notice: 50% of daily budget consumed';
    }

    if (circuitBreakerStatus.state === 'OPEN') {
      alertLevel = 'emergency';
      alertMessage = 'EMERGENCY: Circuit breaker is OPEN';
    }

    const metrics = {
      // Current spend
      spend: {
        current_hour: hourlySpend,
        current_day: dailySpend,
        current_month: monthlySpend,
        average_request: averageRequestCost,
      },

      // Projections
      projections: {
        daily: projectedDailySpend,
        monthly: projectedMonthlySpend,
      },

      // Budget utilization (percentage)
      budget: {
        hourly: {
          used: hourlyBudgetUsed,
          limit: COST_LIMITS.MAX_HOURLY_SPEND,
          remaining: COST_LIMITS.MAX_HOURLY_SPEND - hourlySpend,
          resetIn: getTimeUntilReset('hour'),
        },
        daily: {
          used: dailyBudgetUsed,
          limit: COST_LIMITS.MAX_DAILY_SPEND,
          remaining: COST_LIMITS.MAX_DAILY_SPEND - dailySpend,
          resetIn: getTimeUntilReset('day'),
        },
        monthly: {
          used: monthlyBudgetUsed,
          limit: COST_LIMITS.MAX_MONTHLY_SPEND,
          remaining: COST_LIMITS.MAX_MONTHLY_SPEND - monthlySpend,
          resetIn: getTimeUntilReset('month'),
        },
      },

      // System status
      system: {
        circuit_breaker: {
          state: circuitBreakerStatus.state,
          failures: circuitBreakerStatus.failures,
          lastFailure: circuitBreakerStatus.lastFailureTime,
          resetTime: circuitBreakerStatus.resetTime,
          reason: circuitBreakerStatus.reason,
        },
        queue: {
          length: queueAnalytics.totalQueued,
          averageWaitTimeMs: queueAnalytics.averageWaitTimeMs,
          estimatedCost: queueAnalytics.totalEstimatedCost,
          byTier: queueAnalytics.queuedByTier,
          byType: queueAnalytics.queuedByType,
        },
        cache: {
          hitRate: cacheStats.hitRate,
          totalHits: cacheStats.totalHits,
          totalMisses: cacheStats.totalMisses,
          savings: estimatedSavingsFromCache,
        },
      },

      // Abuse detection
      abuse: {
        totalBlocked: abuseStats.totalBlockedUsers,
        blockedLast24h: abuseStats.blockedLast24h,
        patterns: abuseStats.activePatterns,
      },

      // Alerts
      alerts: {
        level: alertLevel,
        message: alertMessage,
        activeAlerts: await getActiveAlerts(),
      },

      // Timestamp
      timestamp: new Date().toISOString(),
      refreshedAt: Date.now(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Error getting cost metrics', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to get cost metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats(): Promise<{
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}> {
  const redis = getRedisClient();

  try {
    const [hits, misses] = await Promise.all([
      redis.get('cache:hits').then((v) => Number(v) || 0),
      redis.get('cache:misses').then((v) => Number(v) || 0),
    ]);

    const total = hits + misses;
    const hitRate = total > 0 ? hits / total : 0;

    return {
      hitRate,
      totalHits: hits,
      totalMisses: misses,
    };
  } catch (error) {
    logger.error('Error getting cache stats', error instanceof Error ? error : undefined);
    return {
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
    };
  }
}

/**
 * Get active alerts
 */
async function getActiveAlerts(): Promise<
  Array<{
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>
> {
  const redis = getRedisClient();
  const alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }> = [];

  try {
    // Check for cost threshold alerts
    const dailySpend = await getCurrentSpend('day');
    const dailyLimit = COST_LIMITS.MAX_DAILY_SPEND;

    if (dailySpend >= dailyLimit * 0.95) {
      alerts.push({
        type: 'budget',
        severity: 'error',
        message: `Daily budget at ${((dailySpend / dailyLimit) * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
    } else if (dailySpend >= dailyLimit * 0.8) {
      alerts.push({
        type: 'budget',
        severity: 'warning',
        message: `Daily budget at ${((dailySpend / dailyLimit) * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
    }

    // Check circuit breaker
    const circuitBreaker = await getCircuitBreakerStatus();
    if (circuitBreaker.state !== 'CLOSED') {
      alerts.push({
        type: 'circuit_breaker',
        severity: circuitBreaker.state === 'OPEN' ? 'error' : 'warning',
        message: `Circuit breaker is ${circuitBreaker.state}`,
        timestamp: Date.now(),
      });
    }

    // Check queue length
    const queue = await getQueueAnalytics();
    if (queue.totalQueued > 50) {
      alerts.push({
        type: 'queue',
        severity: 'warning',
        message: `Queue length: ${queue.totalQueued} requests`,
        timestamp: Date.now(),
      });
    }

    return alerts;
  } catch (error) {
    logger.error('Error getting active alerts', error instanceof Error ? error : undefined);
    return alerts;
  }
}
