/**
 * Admin Control Panel API
 *
 * Manual kill switches and emergency controls for cost protection.
 * PROTECTED: This endpoint requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  activateEmergencyShutdown,
  deactivateEmergencyShutdown,
  getRedisClient,
} from '@/lib/redis-client';
import { resetCircuitBreaker, triggerCircuitBreaker } from '@/lib/costProtection/circuitBreaker';
import { clearQueue } from '@/lib/costProtection/queueSystem';
import { resetRateLimits } from '@/lib/costProtection/rateLimiter';
import { unblockUser } from '@/lib/costProtection/abuseDetection';
import { FEATURE_FLAGS } from '@/config/costProtection';
import { requireAdmin, logAdminAction } from '@/lib/auth/admin';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

/**
 * POST /api/admin/controls
 * Execute admin control actions
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    if (!admin) {
      logger.warn('Unauthorized admin control access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, params } = body;

    // Log admin action for audit trail
    await logAdminAction(action, { params, adminEmail: admin.email });

    switch (action) {
      case 'emergency_shutdown':
        return await handleEmergencyShutdown(params);

      case 'deactivate_shutdown':
        return await handleDeactivateShutdown();

      case 'trigger_circuit_breaker':
        return await handleTriggerCircuitBreaker(params);

      case 'reset_circuit_breaker':
        return await handleResetCircuitBreaker();

      case 'clear_queue':
        return await handleClearQueue();

      case 'reset_rate_limits':
        return await handleResetRateLimits(params);

      case 'unblock_user':
        return await handleUnblockUser(params);

      case 'enable_cache_only_mode':
        return await handleCacheOnlyMode(true);

      case 'disable_cache_only_mode':
        return await handleCacheOnlyMode(false);

      case 'enable_maintenance_mode':
        return await handleMaintenanceMode(true);

      case 'disable_maintenance_mode':
        return await handleMaintenanceMode(false);

      case 'reset_all_costs':
        return await handleResetAllCosts();

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error executing admin control', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to execute control action' },
      { status: 500 }
    );
  }
}

/**
 * Activate emergency shutdown
 */
async function handleEmergencyShutdown(params?: { durationSeconds?: number }) {
  try {
    const duration = params?.durationSeconds || 3600; // Default 1 hour
    await activateEmergencyShutdown(duration);

    return NextResponse.json({
      success: true,
      message: `Emergency shutdown activated for ${duration} seconds`,
      expiresAt: Date.now() + duration * 1000,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to activate emergency shutdown' },
      { status: 500 }
    );
  }
}

/**
 * Deactivate emergency shutdown
 */
async function handleDeactivateShutdown() {
  try {
    await deactivateEmergencyShutdown();

    return NextResponse.json({
      success: true,
      message: 'Emergency shutdown deactivated',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to deactivate emergency shutdown' },
      { status: 500 }
    );
  }
}

/**
 * Manually trigger circuit breaker
 */
async function handleTriggerCircuitBreaker(params?: { reason?: string }) {
  try {
    const reason = params?.reason || 'Manual admin trigger';
    await triggerCircuitBreaker(reason);

    return NextResponse.json({
      success: true,
      message: 'Circuit breaker triggered',
      reason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to trigger circuit breaker' },
      { status: 500 }
    );
  }
}

/**
 * Reset circuit breaker
 */
async function handleResetCircuitBreaker() {
  try {
    await resetCircuitBreaker();

    return NextResponse.json({
      success: true,
      message: 'Circuit breaker reset',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset circuit breaker' },
      { status: 500 }
    );
  }
}

/**
 * Clear request queue
 */
async function handleClearQueue() {
  try {
    await clearQueue();

    return NextResponse.json({
      success: true,
      message: 'Request queue cleared',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear queue' },
      { status: 500 }
    );
  }
}

/**
 * Reset rate limits for a user
 */
async function handleResetRateLimits(params?: { userId?: string; tier?: 'free' | 'premium' }) {
  try {
    if (!params?.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await resetRateLimits(params.userId, params.tier || 'free');

    return NextResponse.json({
      success: true,
      message: `Rate limits reset for user ${params.userId}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset rate limits' },
      { status: 500 }
    );
  }
}

/**
 * Unblock a user
 */
async function handleUnblockUser(params?: { userId?: string }) {
  try {
    if (!params?.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await unblockUser(params.userId);

    return NextResponse.json({
      success: true,
      message: `User ${params.userId} unblocked`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}

/**
 * Enable/disable cache-only mode
 */
async function handleCacheOnlyMode(enabled: boolean) {
  try {
    const redis = getRedisClient();
    await redis.set('feature:cache_only_mode', enabled ? 'true' : 'false');

    return NextResponse.json({
      success: true,
      message: `Cache-only mode ${enabled ? 'enabled' : 'disabled'}`,
      cacheOnlyMode: enabled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to toggle cache-only mode' },
      { status: 500 }
    );
  }
}

/**
 * Enable/disable maintenance mode
 */
async function handleMaintenanceMode(enabled: boolean) {
  try {
    const redis = getRedisClient();
    await redis.set('feature:maintenance_mode', enabled ? 'true' : 'false');

    return NextResponse.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      maintenanceMode: enabled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to toggle maintenance mode' },
      { status: 500 }
    );
  }
}

/**
 * Reset all cost tracking (for testing)
 */
async function handleResetAllCosts() {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys('cost:*');

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return NextResponse.json({
      success: true,
      message: 'All cost tracking reset',
      keysDeleted: keys.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset cost tracking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/controls
 * Get current control states
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    if (!admin) {
      logger.warn('Unauthorized admin control access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = getRedisClient();

    const [emergencyShutdown, cacheOnlyMode, maintenanceMode] = await Promise.all([
      redis.get('cost:emergency_shutdown').then((v) => v === 'true' || v === '1'),
      redis.get('feature:cache_only_mode').then((v) => v === 'true'),
      redis.get('feature:maintenance_mode').then((v) => v === 'true'),
    ]);

    return NextResponse.json({
      emergencyShutdown,
      cacheOnlyMode,
      maintenanceMode,
      featureFlags: FEATURE_FLAGS,
    });
  } catch (error) {
    logger.error('Error getting control states', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to get control states' },
      { status: 500 }
    );
  }
}
