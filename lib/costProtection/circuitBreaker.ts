/**
 * Circuit Breaker Pattern for Cost Protection
 *
 * Automatically shuts down API access if costs spike unexpectedly.
 * Implements three states: CLOSED (normal), OPEN (shutdown), HALF_OPEN (testing).
 */

import { getRedisClient, activateEmergencyShutdown } from '@/lib/redis-client';
import { CIRCUIT_BREAKER_CONFIG, REDIS_KEYS } from '@/config/costProtection';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime?: number;
  resetTime?: number;
  reason?: string;
}

/**
 * Get current circuit breaker state
 */
export async function getCircuitBreakerState(): Promise<CircuitBreakerState> {
  const redis = getRedisClient();

  try {
    const state = await redis.get(REDIS_KEYS.CIRCUIT_BREAKER_STATE);
    return (state as CircuitBreakerState) || 'CLOSED';
  } catch (error) {
    console.error('Error getting circuit breaker state:', error);
    return 'CLOSED';
  }
}

/**
 * Set circuit breaker state
 */
async function setCircuitBreakerState(state: CircuitBreakerState): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.set(REDIS_KEYS.CIRCUIT_BREAKER_STATE, state);

    if (state === 'OPEN') {
      // Set expiry for auto-recovery
      await redis.expire(
        REDIS_KEYS.CIRCUIT_BREAKER_STATE,
        CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS / 1000
      );
    }
  } catch (error) {
    console.error('Error setting circuit breaker state:', error);
    throw error;
  }
}

/**
 * Get failure count
 */
async function getFailureCount(): Promise<number> {
  const redis = getRedisClient();

  try {
    const count = await redis.get(REDIS_KEYS.CIRCUIT_BREAKER_FAILURES);
    return Number(count) || 0;
  } catch (error) {
    console.error('Error getting failure count:', error);
    return 0;
  }
}

/**
 * Increment failure count
 */
async function incrementFailureCount(): Promise<number> {
  const redis = getRedisClient();

  try {
    const count = await redis.incr(REDIS_KEYS.CIRCUIT_BREAKER_FAILURES);

    // Set expiry to reset count after some time
    await redis.expire(
      REDIS_KEYS.CIRCUIT_BREAKER_FAILURES,
      CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS / 1000
    );

    return count;
  } catch (error) {
    console.error('Error incrementing failure count:', error);
    return 0;
  }
}

/**
 * Reset circuit breaker
 */
export async function resetCircuitBreaker(): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del(REDIS_KEYS.CIRCUIT_BREAKER_STATE);
    await redis.del(REDIS_KEYS.CIRCUIT_BREAKER_FAILURES);
    console.log('✅ Circuit breaker reset');
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    throw error;
  }
}

/**
 * Check if cost is abnormal (spike detection)
 */
export async function checkCost(cost: number, averageCost: number): Promise<{
  isNormal: boolean;
  reason?: string;
}> {
  const state = await getCircuitBreakerState();

  // If circuit is open, reject immediately
  if (state === 'OPEN') {
    return {
      isNormal: false,
      reason: 'Circuit breaker is OPEN - API temporarily disabled',
    };
  }

  // Check for cost spike (3x average)
  if (cost > averageCost * CIRCUIT_BREAKER_CONFIG.COST_SPIKE_MULTIPLIER) {
    console.warn(`⚠️ Cost spike detected: $${cost.toFixed(2)} vs average $${averageCost.toFixed(2)}`);

    const failures = await incrementFailureCount();

    if (failures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
      // Trigger circuit breaker
      await triggerCircuitBreaker(`Cost spike: $${cost.toFixed(2)} (${failures}x threshold)`);

      return {
        isNormal: false,
        reason: 'Circuit breaker OPEN - cost spike detected',
      };
    }

    return {
      isNormal: false,
      reason: `Cost spike detected (${failures}/${CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD})`,
    };
  }

  return { isNormal: true };
}

/**
 * Trigger circuit breaker (OPEN state)
 */
export async function triggerCircuitBreaker(reason: string): Promise<void> {
  const redis = getRedisClient();

  try {
    // Set state to OPEN
    await setCircuitBreakerState('OPEN');

    // Activate emergency shutdown
    await activateEmergencyShutdown(CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS / 1000);

    // Record failure time
    await redis.set(
      'circuit_breaker:last_failure',
      JSON.stringify({
        time: Date.now(),
        reason,
      }),
      { ex: 86400 } // Keep for 24 hours
    );

    console.error('🚨 CIRCUIT BREAKER TRIGGERED:', reason);

    // Send alerts (to be implemented)
    await sendCircuitBreakerAlert(reason);
  } catch (error) {
    console.error('Error triggering circuit breaker:', error);
    throw error;
  }
}

/**
 * Check if circuit breaker allows request
 */
export async function checkCircuitBreaker(): Promise<{
  allowed: boolean;
  reason?: string;
  state: CircuitBreakerState;
}> {
  const state = await getCircuitBreakerState();

  if (state === 'OPEN') {
    return {
      allowed: false,
      reason: 'Circuit breaker is OPEN - service temporarily disabled',
      state,
    };
  }

  if (state === 'HALF_OPEN') {
    // In HALF_OPEN state, allow limited requests to test recovery
    const redis = getRedisClient();
    const testCount = Number(await redis.get('circuit_breaker:test_count')) || 0;

    if (testCount >= CIRCUIT_BREAKER_CONFIG.HALF_OPEN_REQUESTS) {
      return {
        allowed: false,
        reason: 'Circuit breaker testing - please wait',
        state,
      };
    }

    // Allow request and increment test count
    await redis.incr('circuit_breaker:test_count');
    await redis.expire('circuit_breaker:test_count', 300); // 5 minutes

    return {
      allowed: true,
      state,
    };
  }

  // CLOSED state - normal operation
  return {
    allowed: true,
    state,
  };
}

/**
 * Record successful request (for HALF_OPEN state recovery)
 */
export async function recordSuccess(): Promise<void> {
  const state = await getCircuitBreakerState();

  if (state === 'HALF_OPEN') {
    const redis = getRedisClient();
    const successCount = await redis.incr('circuit_breaker:success_count');

    // If enough successes, close the circuit
    if (successCount >= CIRCUIT_BREAKER_CONFIG.HALF_OPEN_REQUESTS) {
      await setCircuitBreakerState('CLOSED');
      await redis.del('circuit_breaker:success_count');
      await redis.del('circuit_breaker:test_count');
      await resetCircuitBreaker();

      console.log('✅ Circuit breaker recovered - state: CLOSED');
    }
  }
}

/**
 * Record failure (for HALF_OPEN state)
 */
export async function recordFailure(reason: string): Promise<void> {
  const state = await getCircuitBreakerState();

  if (state === 'HALF_OPEN') {
    // Failed during testing - reopen circuit
    await triggerCircuitBreaker(`Recovery test failed: ${reason}`);
  }
}

/**
 * Auto-transition from OPEN to HALF_OPEN
 * Called periodically to check if circuit should start testing recovery
 */
export async function checkAutoRecovery(): Promise<void> {
  const state = await getCircuitBreakerState();

  if (state === 'OPEN') {
    const redis = getRedisClient();
    const lastFailure = await redis.get('circuit_breaker:last_failure');

    if (lastFailure) {
      const { time } = JSON.parse(lastFailure as string);
      const elapsed = Date.now() - time;

      if (elapsed >= CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS) {
        // Transition to HALF_OPEN
        await setCircuitBreakerState('HALF_OPEN');
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN (testing recovery)');
      }
    }
  }
}

/**
 * Get circuit breaker status
 */
export async function getCircuitBreakerStatus(): Promise<CircuitBreakerStatus> {
  const redis = getRedisClient();

  try {
    const state = await getCircuitBreakerState();
    const failures = await getFailureCount();
    const lastFailureData = await redis.get('circuit_breaker:last_failure');

    let lastFailureTime: number | undefined;
    let reason: string | undefined;
    let resetTime: number | undefined;

    if (lastFailureData) {
      const data = JSON.parse(lastFailureData as string);
      lastFailureTime = data.time;
      reason = data.reason;
      if (lastFailureTime !== undefined) {
        resetTime = lastFailureTime + CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS;
      }
    }

    return {
      state,
      failures,
      lastFailureTime,
      resetTime,
      reason,
    };
  } catch (error) {
    console.error('Error getting circuit breaker status:', error);
    return {
      state: 'CLOSED',
      failures: 0,
    };
  }
}

/**
 * Send alert when circuit breaker trips (placeholder)
 */
async function sendCircuitBreakerAlert(reason: string): Promise<void> {
  // This would integrate with email/SMS/webhook alerts
  console.error('🚨 CIRCUIT BREAKER ALERT:', reason);

  // TODO: Implement actual alerting
  // - Send email to admin
  // - Send SMS to on-call engineer
  // - Post to Slack/Discord
  // - Call webhook
}
