/**
 * Cost Protection Configuration
 *
 * CRITICAL: This module defines hard spending limits to prevent runaway API costs.
 * These limits are enforced at multiple layers to ensure no surprise bills.
 *
 * Philosophy: Better to have angry users than a $5,000 API bill.
 */

// Hard spending limits (in USD)
export const COST_LIMITS = {
  // Daily limits
  MAX_DAILY_SPEND: parseFloat(process.env.MAX_DAILY_SPEND || '10.00'),
  MAX_HOURLY_SPEND: parseFloat(process.env.MAX_HOURLY_SPEND || '2.00'),

  // Per-user limits
  MAX_USER_DAILY_COST: parseFloat(process.env.MAX_USER_DAILY_COST || '0.50'),
  MAX_USER_HOURLY_COST: parseFloat(process.env.MAX_USER_HOURLY_COST || '0.10'),

  // Per-request limits
  MAX_SINGLE_REQUEST_COST: parseFloat(process.env.MAX_SINGLE_REQUEST_COST || '0.10'),

  // Emergency kill switch
  EMERGENCY_SHUTDOWN_LIMIT: parseFloat(process.env.EMERGENCY_SHUTDOWN_LIMIT || '50.00'),

  // Monthly budget
  MAX_MONTHLY_SPEND: parseFloat(process.env.MAX_MONTHLY_SPEND || '200.00'),
} as const;

// API cost constants (in USD)
export const API_COSTS = {
  OPENAI_GPT4O_MINI: parseFloat(process.env.OPENAI_COST_PER_CALL || '0.015'),
  REPLICATE_SDXL: parseFloat(process.env.REPLICATE_COST_PER_CALL || '0.04'),
  MESHY_3D_PREVIEW: parseFloat(process.env.MESHY_PREVIEW_COST || '0.10'),
  MESHY_3D_REFINE: parseFloat(process.env.MESHY_REFINE_COST || '0.30'),
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  FREE_USER: {
    requests_per_minute: parseInt(process.env.FREE_REQUESTS_PER_MINUTE || '2', 10),
    requests_per_hour: parseInt(process.env.FREE_REQUESTS_PER_HOUR || '10', 10),
    requests_per_day: parseInt(process.env.FREE_REQUESTS_PER_DAY || '20', 10),
  },
  PREMIUM_USER: {
    requests_per_minute: parseInt(process.env.PREMIUM_REQUESTS_PER_MINUTE || '10', 10),
    requests_per_hour: parseInt(process.env.PREMIUM_REQUESTS_PER_HOUR || '100', 10),
    requests_per_day: parseInt(process.env.PREMIUM_REQUESTS_PER_DAY || '500', 10),
  },
  GLOBAL: {
    max_concurrent_api_calls: parseInt(process.env.MAX_CONCURRENT_API_CALLS || '5', 10),
    requests_per_second: parseInt(process.env.GLOBAL_REQUESTS_PER_SECOND || '2', 10),
    max_queue_length: parseInt(process.env.MAX_QUEUE_LENGTH || '100', 10),
  },
} as const;

// Alert thresholds (percentage of limit)
export const ALERT_THRESHOLDS = {
  WARNING: 0.5,  // 50% of limit
  CRITICAL: 0.8, // 80% of limit
  EMERGENCY: 0.95, // 95% of limit
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  SIMILAR_THRESHOLD: parseFloat(process.env.CACHE_SIMILAR_THRESHOLD || '0.85'),
  TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '86400', 10), // 24 hours
} as const;

// Redis keys for cost tracking
export const REDIS_KEYS = {
  EMERGENCY_SHUTDOWN: 'cost:emergency_shutdown',
  USER_SPEND_PREFIX: 'cost:user_spend',
  GLOBAL_SPEND_HOUR: 'cost:global:hour',
  GLOBAL_SPEND_DAY: 'cost:global:day',
  GLOBAL_SPEND_MONTH: 'cost:global:month',
  AVERAGE_REQUEST_COST: 'cost:average_request',
  CIRCUIT_BREAKER_STATE: 'cost:circuit_breaker:state',
  CIRCUIT_BREAKER_FAILURES: 'cost:circuit_breaker:failures',
  BLOCKED_USER_PREFIX: 'cost:blocked_user',
  QUEUE_LENGTH: 'cost:queue:length',
  CONCURRENT_REQUESTS: 'cost:concurrent:count',
} as const;

// Admin alert configuration
export const ADMIN_ALERTS = {
  EMAIL: process.env.ADMIN_ALERT_EMAIL || '',
  PHONE: process.env.ADMIN_ALERT_PHONE || '',
  WEBHOOK: process.env.COST_ALERT_WEBHOOK || '',
  ENABLE_EMAIL: process.env.ENABLE_EMAIL_ALERTS === 'true',
  ENABLE_SMS: process.env.ENABLE_SMS_ALERTS === 'true',
  ENABLE_WEBHOOK: process.env.ENABLE_WEBHOOK_ALERTS === 'true',
} as const;

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 3, // Number of cost spikes before emergency shutdown
  RESET_TIMEOUT_MS: 3600000, // 1 hour
  HALF_OPEN_REQUESTS: 3, // Number of test requests when recovering
  COST_SPIKE_MULTIPLIER: 3, // Cost must be 3x average to count as spike
} as const;

// Queue configuration
export const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 100,
  PROCESS_INTERVAL_MS: 1000, // Process queue every second
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds per request
  PRIORITY_PREMIUM: 10,
  PRIORITY_FREE: 1,
} as const;

// Abuse detection thresholds
export const ABUSE_DETECTION = {
  RAPID_FIRE_THRESHOLD: 10, // Requests in window
  RAPID_FIRE_WINDOW_MS: 60000, // 1 minute
  DUPLICATE_REQUEST_THRESHOLD: 5, // Same comparison
  DUPLICATE_REQUEST_WINDOW_MS: 300000, // 5 minutes
  MULTIPLE_IP_THRESHOLD: 5, // Different IPs for same user
  MULTIPLE_IP_WINDOW_MS: 3600000, // 1 hour
  COST_SPIKE_THRESHOLD: 10, // Times average cost
  AUTO_BLOCK_DURATION_MS: 86400000, // 24 hours
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_COST_PROTECTION: process.env.ENABLE_COST_PROTECTION !== 'false',
  ENABLE_EMERGENCY_SHUTDOWN: process.env.ENABLE_EMERGENCY_SHUTDOWN !== 'false',
  ENABLE_CIRCUIT_BREAKER: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
  ENABLE_ABUSE_DETECTION: process.env.ENABLE_ABUSE_DETECTION !== 'false',
  ENABLE_QUEUE_SYSTEM: process.env.ENABLE_QUEUE_SYSTEM !== 'false',
  ENABLE_GRACEFUL_DEGRADATION: process.env.ENABLE_GRACEFUL_DEGRADATION !== 'false',
  CACHE_ONLY_MODE: process.env.CACHE_ONLY_MODE === 'true',
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
} as const;

// Validation: Ensure critical env vars are set
if (COST_LIMITS.MAX_DAILY_SPEND <= 0) {
  console.warn('⚠️ MAX_DAILY_SPEND not set or invalid, using default: $10.00');
}

if (COST_LIMITS.EMERGENCY_SHUTDOWN_LIMIT <= 0) {
  console.warn('⚠️ EMERGENCY_SHUTDOWN_LIMIT not set or invalid, using default: $50.00');
}

// Only check for REDIS_URL at runtime, not during build
if (typeof window === 'undefined' && !process.env.REDIS_URL && process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
  console.error('❌ REDIS_URL is required for cost protection in production!');
}

// Export helper functions
export function getCostKey(type: 'user' | 'hour' | 'day' | 'month', identifier?: string): string {
  const now = new Date();

  switch (type) {
    case 'user':
      const day = now.toISOString().split('T')[0];
      return `${REDIS_KEYS.USER_SPEND_PREFIX}:${identifier}:${day}`;

    case 'hour':
      const hour = `${now.toISOString().split('T')[0]}:${now.getHours()}`;
      return `${REDIS_KEYS.GLOBAL_SPEND_HOUR}:${hour}`;

    case 'day':
      const dayKey = now.toISOString().split('T')[0];
      return `${REDIS_KEYS.GLOBAL_SPEND_DAY}:${dayKey}`;

    case 'month':
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return `${REDIS_KEYS.GLOBAL_SPEND_MONTH}:${month}`;

    default:
      throw new Error(`Unknown cost key type: ${type}`);
  }
}

export function getBlockedUserKey(userId: string): string {
  return `${REDIS_KEYS.BLOCKED_USER_PREFIX}:${userId}`;
}

export function calculateEstimatedCost(operations: {
  openai?: number;
  replicate?: number;
  meshyPreview?: number;
  meshyRefine?: number;
}): number {
  const openaiCost = (operations.openai || 0) * API_COSTS.OPENAI_GPT4O_MINI;
  const replicateCost = (operations.replicate || 0) * API_COSTS.REPLICATE_SDXL;
  const meshyPreviewCost = (operations.meshyPreview || 0) * API_COSTS.MESHY_3D_PREVIEW;
  const meshyRefineCost = (operations.meshyRefine || 0) * API_COSTS.MESHY_3D_REFINE;

  return openaiCost + replicateCost + meshyPreviewCost + meshyRefineCost;
}

export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getTimeUntilReset(type: 'hour' | 'day' | 'month'): number {
  const now = new Date();

  switch (type) {
    case 'hour':
      return (60 - now.getMinutes()) * 60 * 1000;

    case 'day':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - now.getTime();

    case 'month':
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.getTime() - now.getTime();

    default:
      throw new Error(`Unknown reset type: ${type}`);
  }
}

// Export all as default for easy importing
export default {
  COST_LIMITS,
  API_COSTS,
  RATE_LIMITS,
  ALERT_THRESHOLDS,
  CACHE_CONFIG,
  REDIS_KEYS,
  ADMIN_ALERTS,
  CIRCUIT_BREAKER_CONFIG,
  QUEUE_CONFIG,
  ABUSE_DETECTION,
  FEATURE_FLAGS,
  getCostKey,
  getBlockedUserKey,
  calculateEstimatedCost,
  formatCost,
  getTimeUntilReset,
};
