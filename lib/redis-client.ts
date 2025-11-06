/**
 * Redis Client for Cost Protection
 *
 * Provides Redis connection for real-time cost tracking and rate limiting.
 * Uses Upstash Redis for serverless edge compatibility.
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis credentials required for production cost protection');
      }

      // In development, use mock Redis if not configured
      console.warn('⚠️ Redis not configured, using in-memory mock (development only)');
      return createMockRedis();
    }

    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return redis;
}

// Mock Redis for development (NOT for production!)
function createMockRedis(): Redis {
  const store = new Map<string, { value: any; expiry?: number }>();

  const mockRedis = {
    async get(key: string) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      return item.value;
    },

    async set(key: string, value: any, options?: { ex?: number; px?: number }) {
      const expiry = options?.ex
        ? Date.now() + options.ex * 1000
        : options?.px
        ? Date.now() + options.px
        : undefined;

      store.set(key, { value, expiry });
      return 'OK';
    },

    async incr(key: string) {
      const current = (await mockRedis.get(key)) || 0;
      const newValue = Number(current) + 1;
      await mockRedis.set(key, newValue);
      return newValue;
    },

    async incrby(key: string, amount: number) {
      const current = (await mockRedis.get(key)) || 0;
      const newValue = Number(current) + amount;
      await mockRedis.set(key, newValue);
      return newValue;
    },

    async incrbyfloat(key: string, amount: number) {
      const current = (await mockRedis.get(key)) || 0;
      const newValue = Number(current) + amount;
      await mockRedis.set(key, newValue);
      return newValue;
    },

    async del(...keys: string[]) {
      let count = 0;
      keys.forEach((key) => {
        if (store.delete(key)) count++;
      });
      return count;
    },

    async expire(key: string, seconds: number) {
      const item = store.get(key);
      if (item) {
        item.expiry = Date.now() + seconds * 1000;
        return 1;
      }
      return 0;
    },

    async ttl(key: string) {
      const item = store.get(key);
      if (!item) return -2;
      if (!item.expiry) return -1;
      const remaining = Math.floor((item.expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    },

    async exists(...keys: string[]) {
      return keys.filter((key) => {
        const item = store.get(key);
        if (!item) return false;
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key);
          return false;
        }
        return true;
      }).length;
    },

    async mget(...keys: string[]) {
      return keys.map((key) => {
        const item = store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key);
          return null;
        }
        return item.value;
      });
    },

    async setex(key: string, seconds: number, value: any) {
      return mockRedis.set(key, value, { ex: seconds });
    },

    async setnx(key: string, value: any) {
      if (store.has(key)) return 0;
      await mockRedis.set(key, value);
      return 1;
    },

    async lpush(key: string, ...values: any[]) {
      const item = store.get(key);
      const list = item?.value || [];
      list.unshift(...values);
      store.set(key, { value: list, expiry: item?.expiry });
      return list.length;
    },

    async rpush(key: string, ...values: any[]) {
      const item = store.get(key);
      const list = item?.value || [];
      list.push(...values);
      store.set(key, { value: list, expiry: item?.expiry });
      return list.length;
    },

    async llen(key: string) {
      const item = store.get(key);
      return item?.value?.length || 0;
    },

    async lrange(key: string, start: number, stop: number) {
      const item = store.get(key);
      const list = item?.value || [];
      return list.slice(start, stop === -1 ? undefined : stop + 1);
    },

    async ltrim(key: string, start: number, stop: number) {
      const item = store.get(key);
      if (item?.value) {
        item.value = item.value.slice(start, stop === -1 ? undefined : stop + 1);
      }
      return 'OK';
    },

    async keys(pattern: string) {
      // Simple pattern matching (only supports * wildcard)
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(store.keys()).filter((key) => regex.test(key));
    },

    async flushdb() {
      store.clear();
      return 'OK';
    },
  } as unknown as Redis;

  return mockRedis;
}

// Helper function to safely increment a cost counter
export async function incrementCost(
  key: string,
  amount: number,
  expirySeconds?: number
): Promise<number> {
  const redis = getRedisClient();

  try {
    const newValue = await redis.incrbyfloat(key, amount);

    // Set expiry if provided and this is a new key
    if (expirySeconds) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiry
        await redis.expire(key, expirySeconds);
      } else if (ttl === -2) {
        // Key doesn't exist (shouldn't happen after incrbyfloat, but be safe)
        await redis.expire(key, expirySeconds);
      }
    }

    return newValue;
  } catch (error) {
    console.error('Failed to increment cost in Redis:', error);
    throw error;
  }
}

// Helper function to get multiple cost values at once
export async function getCostMetrics(keys: string[]): Promise<Record<string, number>> {
  const redis = getRedisClient();

  try {
    const values = await redis.mget(...keys);
    const metrics: Record<string, number> = {};

    keys.forEach((key, index) => {
      metrics[key] = Number(values[index]) || 0;
    });

    return metrics;
  } catch (error) {
    console.error('Failed to get cost metrics from Redis:', error);
    return keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  }
}

// Helper function to check if emergency shutdown is active
export async function isEmergencyShutdownActive(): Promise<boolean> {
  const redis = getRedisClient();

  try {
    const value = await redis.get('cost:emergency_shutdown');
    return value === 'true' || value === '1' || value === 1;
  } catch (error) {
    console.error('Failed to check emergency shutdown status:', error);
    // Fail safe: if we can't check, assume it's active
    return true;
  }
}

// Helper function to activate emergency shutdown
export async function activateEmergencyShutdown(durationSeconds: number = 3600): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.set('cost:emergency_shutdown', 'true', { ex: durationSeconds });
    console.error('🚨 EMERGENCY SHUTDOWN ACTIVATED - API costs exceeded limits');
  } catch (error) {
    console.error('Failed to activate emergency shutdown:', error);
    throw error;
  }
}

// Helper function to deactivate emergency shutdown (manual override)
export async function deactivateEmergencyShutdown(): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del('cost:emergency_shutdown');
    console.log('✅ Emergency shutdown deactivated');
  } catch (error) {
    console.error('Failed to deactivate emergency shutdown:', error);
    throw error;
  }
}

// Helper function to get current spend
export async function getCurrentSpend(
  type: 'user' | 'hour' | 'day' | 'month',
  identifier?: string
): Promise<number> {
  const redis = getRedisClient();
  const { getCostKey } = await import('@/config/costProtection');
  const key = getCostKey(type, identifier);

  try {
    const value = await redis.get(key);
    return Number(value) || 0;
  } catch (error) {
    console.error(`Failed to get current spend for ${type}:`, error);
    return 0;
  }
}

// Helper function to reset spend tracking (for testing)
export async function resetSpendTracking(): Promise<void> {
  const redis = getRedisClient();

  try {
    const keys = await redis.keys('cost:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    console.log('✅ Spend tracking reset');
  } catch (error) {
    console.error('Failed to reset spend tracking:', error);
    throw error;
  }
}

export default getRedisClient;
