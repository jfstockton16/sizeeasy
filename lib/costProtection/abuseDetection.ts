/**
 * Abuse Detection System
 *
 * Detects and blocks abusive patterns that could lead to runaway costs.
 * Implements multiple detection strategies.
 */

import { getRedisClient } from '@/lib/redis-client';
import { ABUSE_DETECTION, getBlockedUserKey } from '@/config/costProtection';

export interface AbusePattern {
  rapid_fire: boolean;
  same_comparison_spam: boolean;
  api_key_sharing: boolean;
  cost_anomaly: boolean;
}

export interface AbuseCheckResult {
  isAbusive: boolean;
  patterns: AbusePattern;
  score: number; // 0-100, higher = more suspicious
  shouldBlock: boolean;
  reason?: string;
}

/**
 * Check user for abusive patterns
 */
export async function checkUser(
  userId: string,
  ip?: string,
  requestData?: any
): Promise<AbuseCheckResult> {
  const patterns: AbusePattern = {
    rapid_fire: await checkRapidRequests(userId),
    same_comparison_spam: await checkDuplicateRequests(userId, requestData),
    api_key_sharing: await checkMultipleIPs(userId, ip),
    cost_anomaly: await checkUserCostSpike(userId),
  };

  // Calculate abuse score (0-100)
  let score = 0;
  if (patterns.rapid_fire) score += 30;
  if (patterns.same_comparison_spam) score += 25;
  if (patterns.api_key_sharing) score += 25;
  if (patterns.cost_anomaly) score += 20;

  const isAbusive = score >= 50; // Threshold for abuse
  const shouldBlock = score >= 75; // Threshold for auto-block

  if (shouldBlock) {
    await blockUser(userId, patterns);
  }

  return {
    isAbusive,
    patterns,
    score,
    shouldBlock,
    reason: shouldBlock ? generateBlockReason(patterns) : undefined,
  };
}

/**
 * Check for rapid-fire requests (too many requests in short time)
 */
async function checkRapidRequests(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `abuse:rapid:${userId}`;

  try {
    const count = await redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await redis.pexpire(key, ABUSE_DETECTION.RAPID_FIRE_WINDOW_MS);
    }

    return count > ABUSE_DETECTION.RAPID_FIRE_THRESHOLD;
  } catch (error) {
    console.error('Error checking rapid requests:', error);
    return false;
  }
}

/**
 * Check for duplicate request spam (same comparison repeatedly)
 */
async function checkDuplicateRequests(userId: string, requestData?: any): Promise<boolean> {
  if (!requestData) return false;

  const redis = getRedisClient();

  try {
    // Create hash of request data
    const requestHash = JSON.stringify(requestData);
    const key = `abuse:duplicate:${userId}:${hashString(requestHash)}`;

    const count = await redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await redis.pexpire(key, ABUSE_DETECTION.DUPLICATE_REQUEST_WINDOW_MS);
    }

    return count > ABUSE_DETECTION.DUPLICATE_REQUEST_THRESHOLD;
  } catch (error) {
    console.error('Error checking duplicate requests:', error);
    return false;
  }
}

/**
 * Check for API key sharing (multiple IPs for same user)
 */
async function checkMultipleIPs(userId: string, ip?: string): Promise<boolean> {
  if (!ip) return false;

  const redis = getRedisClient();
  const key = `abuse:ips:${userId}`;

  try {
    // Add IP to set
    await redis.sadd(key, ip);
    await redis.pexpire(key, ABUSE_DETECTION.MULTIPLE_IP_WINDOW_MS);

    // Count unique IPs
    const ipCount = await redis.scard(key);

    return ipCount > ABUSE_DETECTION.MULTIPLE_IP_THRESHOLD;
  } catch (error) {
    console.error('Error checking multiple IPs:', error);
    return false;
  }
}

/**
 * Check for cost anomaly (user spending way more than average)
 */
async function checkUserCostSpike(userId: string): Promise<boolean> {
  const redis = getRedisClient();

  try {
    // Get user's recent cost
    const userCostKey = `cost:user_spend:${userId}:${new Date().toISOString().split('T')[0]}`;
    const userCost = Number(await redis.get(userCostKey)) || 0;

    // Get average user cost
    const avgCost = Number(await redis.get('cost:average_request')) || 0.02;

    // Spike if user cost is 10x average
    return userCost > avgCost * ABUSE_DETECTION.COST_SPIKE_THRESHOLD;
  } catch (error) {
    console.error('Error checking cost spike:', error);
    return false;
  }
}

/**
 * Block user for abuse
 */
export async function blockUser(userId: string, patterns: AbusePattern): Promise<void> {
  const redis = getRedisClient();
  const blockKey = getBlockedUserKey(userId);

  try {
    const blockData = {
      blockedAt: Date.now(),
      reason: generateBlockReason(patterns),
      patterns,
      autoBlock: true,
    };

    await redis.set(blockKey, JSON.stringify(blockData), {
      ex: ABUSE_DETECTION.AUTO_BLOCK_DURATION_MS / 1000,
    });

    console.warn('🚫 User blocked for abuse:', {
      userId,
      patterns,
      duration: '24 hours',
    });

    // Log to analytics
    await logAbuseEvent(userId, 'user_blocked', patterns);
  } catch (error) {
    console.error('Error blocking user:', error);
    throw error;
  }
}

/**
 * Unblock user (admin function)
 */
export async function unblockUser(userId: string): Promise<void> {
  const redis = getRedisClient();
  const blockKey = getBlockedUserKey(userId);

  try {
    await redis.del(blockKey);
    console.log('✅ User unblocked:', userId);

    // Log to analytics
    await logAbuseEvent(userId, 'user_unblocked', {
      rapid_fire: false,
      same_comparison_spam: false,
      api_key_sharing: false,
      cost_anomaly: false,
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    throw error;
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(userId: string): Promise<{
  blocked: boolean;
  reason?: string;
  blockedUntil?: number;
}> {
  const redis = getRedisClient();
  const blockKey = getBlockedUserKey(userId);

  try {
    const blockData = await redis.get(blockKey);

    if (!blockData) {
      return { blocked: false };
    }

    const data = JSON.parse(blockData as string);
    const ttl = await redis.ttl(blockKey);
    const blockedUntil = ttl > 0 ? Date.now() + ttl * 1000 : undefined;

    return {
      blocked: true,
      reason: data.reason,
      blockedUntil,
    };
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return { blocked: false };
  }
}

/**
 * Track request for abuse detection
 */
export async function trackRequest(
  userId: string,
  ip: string,
  requestData: any
): Promise<void> {
  const redis = getRedisClient();

  try {
    // Track request count
    const countKey = `abuse:count:${userId}`;
    await redis.incr(countKey);
    await redis.expire(countKey, 86400); // 24 hours

    // Track IP
    const ipKey = `abuse:ips:${userId}`;
    await redis.sadd(ipKey, ip);
    await redis.expire(ipKey, 3600); // 1 hour

    // Track request hash (for duplicate detection)
    const requestHash = hashString(JSON.stringify(requestData));
    const hashKey = `abuse:hash:${userId}:${requestHash}`;
    await redis.incr(hashKey);
    await redis.expire(hashKey, 300); // 5 minutes
  } catch (error) {
    console.error('Error tracking request:', error);
  }
}

/**
 * Get abuse statistics for user
 */
export async function getUserAbuseStats(userId: string): Promise<{
  requestCount24h: number;
  uniqueIPs: number;
  isBlocked: boolean;
  blockReason?: string;
  recentPatterns: AbusePattern;
}> {
  const redis = getRedisClient();

  try {
    const [requestCount, ipSet, blockData] = await Promise.all([
      redis.get(`abuse:count:${userId}`).then((v) => Number(v) || 0),
      redis.smembers(`abuse:ips:${userId}`),
      redis.get(getBlockedUserKey(userId)),
    ]);

    const recentPatterns: AbusePattern = {
      rapid_fire: await checkRapidRequests(userId),
      same_comparison_spam: false, // Would need request data
      api_key_sharing: (ipSet?.length || 0) > ABUSE_DETECTION.MULTIPLE_IP_THRESHOLD,
      cost_anomaly: await checkUserCostSpike(userId),
    };

    return {
      requestCount24h: requestCount,
      uniqueIPs: ipSet?.length || 0,
      isBlocked: !!blockData,
      blockReason: blockData ? JSON.parse(blockData as string).reason : undefined,
      recentPatterns,
    };
  } catch (error) {
    console.error('Error getting user abuse stats:', error);
    return {
      requestCount24h: 0,
      uniqueIPs: 0,
      isBlocked: false,
      recentPatterns: {
        rapid_fire: false,
        same_comparison_spam: false,
        api_key_sharing: false,
        cost_anomaly: false,
      },
    };
  }
}

/**
 * Generate block reason from patterns
 */
function generateBlockReason(patterns: AbusePattern): string {
  const reasons: string[] = [];

  if (patterns.rapid_fire) {
    reasons.push('Too many requests in short time');
  }
  if (patterns.same_comparison_spam) {
    reasons.push('Repeated identical requests');
  }
  if (patterns.api_key_sharing) {
    reasons.push('Multiple IPs detected (potential account sharing)');
  }
  if (patterns.cost_anomaly) {
    reasons.push('Abnormal cost patterns');
  }

  return reasons.length > 0
    ? `Account temporarily suspended: ${reasons.join(', ')}`
    : 'Suspicious activity detected';
}

/**
 * Hash string (simple hash for deduplication)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Log abuse event to analytics
 */
async function logAbuseEvent(
  userId: string,
  eventType: string,
  patterns: AbusePattern
): Promise<void> {
  // This would integrate with your analytics system
  console.log('Abuse event:', {
    userId,
    eventType,
    patterns,
    timestamp: new Date().toISOString(),
  });

  // TODO: Integrate with Supabase analytics_events table
}

/**
 * Get system-wide abuse statistics
 */
export async function getSystemAbuseStats(): Promise<{
  totalBlockedUsers: number;
  blockedLast24h: number;
  activePatterns: {
    rapid_fire: number;
    spam: number;
    sharing: number;
    cost: number;
  };
}> {
  const redis = getRedisClient();

  try {
    const blockedKeys = await redis.keys('cost:blocked_user:*');
    const totalBlockedUsers = blockedKeys.length;

    // Count blocks in last 24 hours
    let blockedLast24h = 0;
    const now = Date.now();

    for (const key of blockedKeys) {
      const data = await redis.get(key);
      if (data) {
        const { blockedAt } = JSON.parse(data as string);
        if (now - blockedAt < 86400000) {
          blockedLast24h++;
        }
      }
    }

    return {
      totalBlockedUsers,
      blockedLast24h,
      activePatterns: {
        rapid_fire: 0, // Would need to aggregate from all users
        spam: 0,
        sharing: 0,
        cost: 0,
      },
    };
  } catch (error) {
    console.error('Error getting system abuse stats:', error);
    return {
      totalBlockedUsers: 0,
      blockedLast24h: 0,
      activePatterns: {
        rapid_fire: 0,
        spam: 0,
        sharing: 0,
        cost: 0,
      },
    };
  }
}
