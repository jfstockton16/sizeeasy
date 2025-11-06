/**
 * @file lib/errors/ERROR_REGISTRY.ts
 * @purpose Master error registry - all possible errors and their solutions
 *
 * IMPORTANT: When adding a new error:
 * 1. Add entry here
 * 2. Update /docs/troubleshooting/ERROR_CODES.md
 * 3. Add to monitoring dashboard if critical
 *
 * @last_modified 2025-11-06
 */

export interface ErrorDefinition {
  code: string;
  name: string;
  httpCode: number;
  userMessage: string;
  internalMessage?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertAdmin?: boolean;
  possibleCauses: string[];
  solutions: string[];
  debugSteps: string[];
  relatedFiles: string[];
  documentation?: string;
}

/**
 * Master Error Registry
 * All application errors are defined here with comprehensive troubleshooting info
 */
export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION (1xx)
  // ============================================================================

  E101: {
    code: 'E101',
    name: 'NotAuthenticated',
    httpCode: 401,
    userMessage: 'Please log in to continue',
    severity: 'LOW',
    possibleCauses: [
      'User not logged in',
      'Session expired',
      'Auth cookie missing',
    ],
    solutions: [
      'Click "Log In" button',
      'Sign in with Google/Email',
      'Refresh page if recently logged in',
    ],
    debugSteps: [
      'Check Supabase session in browser cookies',
      'Verify JWT token is present',
      'Check middleware.ts authentication logic',
    ],
    relatedFiles: [
      'middleware.ts',
      'lib/supabase/middleware.ts',
      'app/api/*/route.ts',
    ],
    documentation: '/docs/troubleshooting/COMMON_ISSUES.md#e101-not-authenticated',
  },

  E102: {
    code: 'E102',
    name: 'InvalidSession',
    httpCode: 401,
    userMessage: 'Your session has expired. Please log in again.',
    severity: 'LOW',
    possibleCauses: [
      'JWT token expired (>1 hour old)',
      'Token tampered with',
      'Supabase project reset',
    ],
    solutions: [
      'Refresh page',
      'Log out and log back in',
      'Clear browser cookies',
    ],
    debugSteps: [
      'Decode JWT to check expiration: jwt.io',
      'Verify Supabase project URL matches',
      'Check Supabase auth settings',
    ],
    relatedFiles: [
      'lib/supabase/middleware.ts',
      'lib/supabase/client.ts',
    ],
  },

  E103: {
    code: 'E103',
    name: 'AccountSuspended',
    httpCode: 403,
    userMessage: 'Your account has been suspended. Please contact support.',
    severity: 'HIGH',
    alertAdmin: false,
    possibleCauses: [
      'Account manually blocked by admin',
      'Abuse detection triggered',
      'Payment fraud detected',
    ],
    solutions: [
      'Contact support: support@sizeeasy.com',
      'Review terms of service',
    ],
    debugSteps: [
      'redis-cli GET "cost:blocked_user:{userId}"',
      'Check analytics_events for abuse patterns',
      'Review recent comparison_history for anomalies',
    ],
    relatedFiles: [
      'lib/costProtection/abuseDetection.ts',
      'lib/costProtection/preRequestValidation.ts',
    ],
    documentation: '/docs/troubleshooting/COMMON_ISSUES.md#account-suspended',
  },

  // ============================================================================
  // CREDITS & PAYMENT (2xx)
  // ============================================================================

  E201: {
    code: 'E201',
    name: 'InsufficientCredits',
    httpCode: 402,
    userMessage: "You're out of credits for today. Share to earn more or upgrade to premium!",
    severity: 'LOW',
    possibleCauses: [
      'User used all 5 daily credits',
      'Credits haven\'t reset yet',
      'Credit reset time not reached',
    ],
    solutions: [
      'Share a comparison (+2 credits)',
      'Refer a friend (+10 credits)',
      'Wait for daily reset at midnight UTC',
      'Upgrade to premium for unlimited comparisons',
    ],
    debugSteps: [
      'SELECT credits_remaining, credits_reset_time FROM user_profiles WHERE id = ?',
      'Check if credits_reset_time < NOW()',
      'Verify is_premium = false',
    ],
    relatedFiles: [
      'lib/credits.ts',
      'app/api/credits/check/route.ts',
      'app/api/comparison/create/route.ts',
    ],
    documentation: '/docs/troubleshooting/COMMON_ISSUES.md#no-credits-remaining',
  },

  E202: {
    code: 'E202',
    name: 'CreditDeductionFailed',
    httpCode: 500,
    userMessage: 'Unable to process your request. Please try again.',
    internalMessage: 'Failed to deduct credit from user account',
    severity: 'HIGH',
    alertAdmin: true,
    possibleCauses: [
      'Database function error',
      'Race condition in credit deduction',
      'Database connection timeout',
      'deduct_credit() function missing',
    ],
    solutions: [
      'Try again in a few seconds',
      'Contact support if persists',
    ],
    debugSteps: [
      'Check database function exists: SELECT * FROM pg_proc WHERE proname = \'deduct_credit\'',
      'Test function manually: SELECT deduct_credit(\'user-id\')',
      'Check database logs for errors',
      'Verify user_profiles table accessible',
    ],
    relatedFiles: [
      'lib/credits.ts',
      'supabase/migrations/*_deduct_credit.sql',
    ],
  },

  E203: {
    code: 'E203',
    name: 'PaymentProcessingError',
    httpCode: 500,
    userMessage: 'Payment failed. Please try again or contact support.',
    internalMessage: 'Stripe payment processing failed',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'Stripe API error',
      'Webhook not received',
      'Database write failed',
      'Invalid webhook signature',
    ],
    solutions: [
      'Try payment again',
      'Check Stripe for successful charge',
      'Contact support if charged but not upgraded',
    ],
    debugSteps: [
      'Check Stripe Dashboard → Payments for transaction',
      'Check Stripe → Webhooks for delivery status',
      'Query payment_transactions table for record',
      'Verify STRIPE_WEBHOOK_SECRET matches dashboard',
    ],
    relatedFiles: [
      'app/api/stripe/webhook/route.ts',
      'app/api/stripe/create-checkout/route.ts',
    ],
    documentation: '/docs/architecture/PAYMENT_FLOW.md',
  },

  // ============================================================================
  // RATE LIMITING & COSTS (3xx)
  // ============================================================================

  E301: {
    code: 'E301',
    name: 'RateLimitMinute',
    httpCode: 429,
    userMessage: 'Too many requests. Please wait 60 seconds and try again.',
    severity: 'LOW',
    possibleCauses: [
      'User exceeded 2 requests/minute (free tier)',
      'Rapid clicking / automation',
    ],
    solutions: [
      'Wait 60 seconds',
      'Upgrade to premium for 10 requests/minute',
    ],
    debugSteps: [
      'redis-cli GET "ratelimit:user:{userId}:minute"',
      'redis-cli TTL "ratelimit:user:{userId}:minute"',
      'Check @upstash/ratelimit configuration',
    ],
    relatedFiles: [
      'lib/costProtection/rateLimiter.ts',
      'config/costProtection.ts',
    ],
    documentation: '/docs/architecture/COST_PROTECTION.md#layer-2-rate-limiting',
  },

  E302: {
    code: 'E302',
    name: 'RateLimitHour',
    httpCode: 429,
    userMessage: 'Hourly limit reached. Try again in a few minutes.',
    severity: 'MEDIUM',
    possibleCauses: [
      'User exceeded 10 requests/hour (free tier)',
      'Heavy usage pattern',
    ],
    solutions: [
      'Wait for hourly reset',
      'Upgrade to premium for 100 requests/hour',
    ],
    debugSteps: [
      'redis-cli GET "ratelimit:user:{userId}:hour"',
      'redis-cli TTL "ratelimit:user:{userId}:hour"',
    ],
    relatedFiles: [
      'lib/costProtection/rateLimiter.ts',
    ],
  },

  E303: {
    code: 'E303',
    name: 'RateLimitDay',
    httpCode: 429,
    userMessage: 'Daily limit reached. Resets at midnight UTC.',
    severity: 'MEDIUM',
    possibleCauses: [
      'User exceeded 20 requests/day (free tier)',
      'Daily limit legitimately hit',
    ],
    solutions: [
      'Wait for midnight UTC reset',
      'Upgrade to premium for 500 requests/day',
    ],
    debugSteps: [
      'redis-cli GET "ratelimit:user:{userId}:day"',
    ],
    relatedFiles: [
      'lib/costProtection/rateLimiter.ts',
    ],
  },

  E304: {
    code: 'E304',
    name: 'UserCostLimit',
    httpCode: 429,
    userMessage: "You've reached your daily generation limit. Upgrade for unlimited.",
    severity: 'MEDIUM',
    possibleCauses: [
      'User exceeded $0.50 daily cost limit',
      'Generated many expensive comparisons (3D models)',
    ],
    solutions: [
      'Wait for daily reset',
      'Upgrade to premium (no individual limits)',
    ],
    debugSteps: [
      'redis-cli GET "cost:user_spend:{userId}:{YYYY-MM-DD}"',
      'SELECT SUM(cost) FROM comparison_history WHERE user_id = ? AND created_at > CURRENT_DATE',
    ],
    relatedFiles: [
      'lib/costProtection/preRequestValidation.ts',
    ],
  },

  E305: {
    code: 'E305',
    name: 'GlobalHourlyLimit',
    httpCode: 429,
    userMessage: 'System experiencing high load. Please try again in a few minutes.',
    severity: 'HIGH',
    alertAdmin: true,
    possibleCauses: [
      'All users combined exceeded $2/hour',
      'Traffic spike',
      'Attack/abuse',
    ],
    solutions: [
      'Wait 5-10 minutes',
      'System will automatically recover',
    ],
    debugSteps: [
      'redis-cli GET "cost:global:hour:{YYYY-MM-DD:HH}"',
      'Check analytics for traffic spike',
      'Review top spenders in last hour',
    ],
    relatedFiles: [
      'lib/costProtection/preRequestValidation.ts',
      'config/costProtection.ts',
    ],
    documentation: '/docs/troubleshooting/COMMON_ISSUES.md#cost-protection-issues',
  },

  E306: {
    code: 'E306',
    name: 'GlobalDailyLimit',
    httpCode: 503,
    userMessage: 'Daily generation limit reached. Service will resume tomorrow.',
    internalMessage: 'CRITICAL: Emergency shutdown triggered',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'All users exceeded $10/day spending',
      'Abuse attack',
      'Viral traffic spike',
    ],
    solutions: [
      'Service resumes at midnight UTC',
      'Check status page for updates',
    ],
    debugSteps: [
      'redis-cli GET "cost:global:day:{YYYY-MM-DD}"',
      'redis-cli GET "cost:emergency_shutdown"',
      'Run: SELECT * FROM comparison_history WHERE created_at > CURRENT_DATE ORDER BY cost DESC',
      'Check for abusive users or bots',
    ],
    relatedFiles: [
      'lib/costProtection/preRequestValidation.ts',
    ],
    documentation: '/docs/troubleshooting/EMERGENCY_PROCEDURES.md',
  },

  // ============================================================================
  // EXTERNAL APIs (4xx)
  // ============================================================================

  E401: {
    code: 'E401',
    name: 'OpenAIError',
    httpCode: 500,
    userMessage: 'Unable to fetch object dimensions. Please try again.',
    internalMessage: 'OpenAI API call failed',
    severity: 'HIGH',
    alertAdmin: true,
    possibleCauses: [
      'OpenAI API down',
      'API key invalid or expired',
      'Rate limit exceeded',
      'Network timeout',
    ],
    solutions: [
      'Try again in a few minutes',
      'Use common objects (have cached dimensions)',
    ],
    debugSteps: [
      'curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"',
      'Check https://status.openai.com',
      'Verify OPENAI_API_KEY in .env',
      'Check OpenAI account billing',
    ],
    relatedFiles: [
      'lib/ai-dimensions.ts',
      'app/api/fetch-dimensions/route.ts',
    ],
  },

  E402: {
    code: 'E402',
    name: 'ReplicateError',
    httpCode: 500,
    userMessage: 'Image generation failed. Please try again.',
    internalMessage: 'Replicate SDXL generation failed',
    severity: 'HIGH',
    alertAdmin: true,
    possibleCauses: [
      'Replicate API down',
      'API token invalid',
      'Model error',
      'NSFW content filter triggered',
    ],
    solutions: [
      'Try again',
      'Try different objects',
      'Check service status',
    ],
    debugSteps: [
      'curl https://api.replicate.com/v1/models -H "Authorization: Token $REPLICATE_API_TOKEN"',
      'Check https://replicate.com/status',
      'Review Replicate dashboard logs',
    ],
    relatedFiles: [
      'app/api/generate-image/route.ts',
    ],
  },

  // ============================================================================
  // SYSTEM & INFRASTRUCTURE (5xx)
  // ============================================================================

  E501: {
    code: 'E501',
    name: 'EmergencyShutdown',
    httpCode: 503,
    userMessage: 'Service temporarily unavailable. We\'ll be back shortly.',
    internalMessage: 'Emergency shutdown active',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'Cost limit exceeded',
      'Manual shutdown triggered',
      'System abuse detected',
    ],
    solutions: [
      'Wait for service to resume',
      'Check status page',
    ],
    debugSteps: [
      'redis-cli GET "cost:emergency_shutdown"',
      'redis-cli GET "cost:emergency_shutdown:reason"',
      './scripts/check-spend.sh',
    ],
    relatedFiles: [
      'lib/costProtection/preRequestValidation.ts',
    ],
    documentation: '/docs/troubleshooting/EMERGENCY_PROCEDURES.md',
  },

  E502: {
    code: 'E502',
    name: 'RedisConnectionError',
    httpCode: 503,
    userMessage: 'Service temporarily unavailable',
    internalMessage: 'Cannot connect to Redis',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'Upstash Redis down',
      'Network issue',
      'Invalid credentials',
    ],
    solutions: [
      'Service will auto-recover when Redis returns',
    ],
    debugSteps: [
      'redis-cli PING',
      'Check Upstash dashboard',
      'Verify UPSTASH_REDIS_REST_URL',
    ],
    relatedFiles: [
      'lib/redis-client.ts',
    ],
  },

  E503: {
    code: 'E503',
    name: 'DatabaseConnectionError',
    httpCode: 503,
    userMessage: 'Service temporarily unavailable',
    internalMessage: 'Cannot connect to Supabase',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'Supabase down',
      'Too many connections',
      'Network issue',
    ],
    solutions: [
      'Service will auto-recover',
    ],
    debugSteps: [
      'psql $DATABASE_URL -c "SELECT NOW();"',
      'Check https://status.supabase.com',
      'Check connection pool settings',
    ],
    relatedFiles: [
      'lib/supabase/server.ts',
    ],
  },

  E504: {
    code: 'E504',
    name: 'CircuitBreakerOpen',
    httpCode: 503,
    userMessage: 'Service temporarily in degraded mode',
    internalMessage: 'Circuit breaker tripped due to cost spikes',
    severity: 'CRITICAL',
    alertAdmin: true,
    possibleCauses: [
      'Multiple consecutive cost spikes detected',
      'API pricing changed',
      'Expensive operations (3D models)',
    ],
    solutions: [
      'Service will auto-recover in 1 hour',
      'Try again later',
    ],
    debugSteps: [
      'redis-cli GET "cost:circuit_breaker:state"',
      'redis-cli GET "cost:circuit_breaker:failures"',
      'SELECT * FROM comparison_history ORDER BY cost DESC LIMIT 10',
    ],
    relatedFiles: [
      'lib/costProtection/circuitBreaker.ts',
    ],
    documentation: '/docs/architecture/COST_PROTECTION.md#layer-4-circuit-breaker',
  },
};

/**
 * Get error definition by code
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  return ERROR_REGISTRY[code];
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  additionalDetails?: Record<string, any>
) {
  const error = getErrorDefinition(code);

  if (!error) {
    return {
      error: {
        code: 'E000',
        message: 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    error: {
      code: error.code,
      name: error.name,
      message: error.userMessage,
      details: additionalDetails,
      timestamp: new Date().toISOString(),
      documentation: error.documentation,
    },
  };
}

/**
 * Log error with full context
 */
export async function logError(
  code: string,
  context: {
    userId?: string;
    endpoint?: string;
    details?: string;
    metadata?: Record<string, any>;
  }
) {
  const error = getErrorDefinition(code);

  if (!error) {
    console.error('Unknown error code:', code);
    return;
  }

  const logEntry = {
    code: error.code,
    name: error.name,
    severity: error.severity,
    internalMessage: error.internalMessage,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Log to console
  console.error(`[${error.code}] ${error.name}:`, logEntry);

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (error.alertAdmin) {
  //   await sendAdminAlert(logEntry);
  // }

  // TODO: Save to analytics_events table
  // await saveToAnalytics('error', logEntry);
}

export default ERROR_REGISTRY;
