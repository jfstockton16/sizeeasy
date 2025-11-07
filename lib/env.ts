/**
 * Environment Variable Validation
 *
 * Validates and provides type-safe access to environment variables.
 * Throws errors at startup if required variables are missing.
 *
 * Usage:
 *   import { env } from '@/lib/env'
 *   const apiKey = env.OPENAI_API_KEY
 */

interface EnvConfig {
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // API Keys (Required for core functionality)
  OPENAI_API_KEY: string

  // API Keys (Optional - features degrade gracefully)
  REPLICATE_API_TOKEN?: string
  MESHY_API_KEY?: string

  // Stripe (Required for payments)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID: string
  NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID: string

  // App Configuration
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_ANALYTICS_ID?: string

  // Redis (Required for production, optional for development)
  REDIS_URL?: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string

  // Cost Protection Configuration (Optional - uses defaults)
  MAX_DAILY_SPEND?: string
  MAX_HOURLY_SPEND?: string
  MAX_MONTHLY_SPEND?: string
  MAX_USER_DAILY_COST?: string
  MAX_USER_HOURLY_COST?: string
  MAX_SINGLE_REQUEST_COST?: string
  EMERGENCY_SHUTDOWN_LIMIT?: string

  // API Cost Constants (Optional - uses defaults)
  OPENAI_COST_PER_CALL?: string
  REPLICATE_COST_PER_CALL?: string
  MESHY_PREVIEW_COST?: string
  MESHY_REFINE_COST?: string

  // Rate Limiting (Optional - uses defaults)
  FREE_REQUESTS_PER_MINUTE?: string
  FREE_REQUESTS_PER_HOUR?: string
  FREE_REQUESTS_PER_DAY?: string
  PREMIUM_REQUESTS_PER_MINUTE?: string
  PREMIUM_REQUESTS_PER_HOUR?: string
  PREMIUM_REQUESTS_PER_DAY?: string
  MAX_CONCURRENT_API_CALLS?: string
  GLOBAL_REQUESTS_PER_SECOND?: string
  MAX_QUEUE_LENGTH?: string

  // Cache Configuration (Optional - uses defaults)
  CACHE_SIMILAR_THRESHOLD?: string
  CACHE_TTL_SECONDS?: string

  // Admin Alerts (Optional)
  ADMIN_ALERT_EMAIL?: string
  ADMIN_ALERT_PHONE?: string
  COST_ALERT_WEBHOOK?: string

  // Alert Toggles (Optional - defaults to false)
  ENABLE_EMAIL_ALERTS?: string
  ENABLE_SMS_ALERTS?: string
  ENABLE_WEBHOOK_ALERTS?: string

  // Feature Flags (Optional - defaults to true/false)
  ENABLE_COST_PROTECTION?: string
  ENABLE_EMERGENCY_SHUTDOWN?: string
  ENABLE_CIRCUIT_BREAKER?: string
  ENABLE_ABUSE_DETECTION?: string
  ENABLE_QUEUE_SYSTEM?: string
  ENABLE_GRACEFUL_DEGRADATION?: string
  CACHE_ONLY_MODE?: string
  MAINTENANCE_MODE?: string

  // Internal Next.js/Vercel variables
  NODE_ENV?: string
  VERCEL_ENV?: string
}

class EnvironmentValidator {
  private validated = false
  private validationErrors: string[] = []
  private validationWarnings: string[] = []

  /**
   * Validate a required environment variable
   */
  private validateRequired(key: string, value: string | undefined): string {
    if (!value || value.trim() === '') {
      this.validationErrors.push(`Missing required environment variable: ${key}`)
      return ''
    }
    return value
  }

  /**
   * Validate an optional environment variable
   */
  private validateOptional(key: string, value: string | undefined, defaultValue?: string): string | undefined {
    if (!value || value.trim() === '') {
      if (defaultValue) {
        this.validationWarnings.push(`Using default for ${key}: ${defaultValue}`)
      }
      return defaultValue
    }
    return value
  }

  /**
   * Validate URL format
   */
  private validateUrl(key: string, value: string | undefined, required = true): string {
    if (required) {
      const validatedValue = this.validateRequired(key, value)
      if (validatedValue && !this.isValidUrl(validatedValue)) {
        this.validationErrors.push(`Invalid URL format for ${key}: ${validatedValue}`)
      }
      return validatedValue
    } else {
      if (value && !this.isValidUrl(value)) {
        this.validationErrors.push(`Invalid URL format for ${key}: ${value}`)
      }
      return value || ''
    }
  }

  /**
   * Check if string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate the environment
   * This should be called at application startup
   */
  validate(): EnvConfig {
    if (this.validated) {
      return process.env as unknown as EnvConfig
    }

    const isDevelopment = process.env.NODE_ENV !== 'production'
    const isProduction = process.env.NODE_ENV === 'production'
    const isVercelProduction = process.env.VERCEL_ENV === 'production'

    // Validate Supabase (always required)
    this.validateUrl('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
    this.validateRequired('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    this.validateRequired('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Validate OpenAI (required for core functionality)
    this.validateRequired('OPENAI_API_KEY', process.env.OPENAI_API_KEY)

    // Validate optional API keys
    if (!process.env.REPLICATE_API_TOKEN) {
      this.validationWarnings.push('REPLICATE_API_TOKEN not set - image generation will be disabled')
    }
    if (!process.env.MESHY_API_KEY) {
      this.validationWarnings.push('MESHY_API_KEY not set - 3D model generation will be disabled')
    }

    // Validate Stripe (required for payments)
    this.validateRequired('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    this.validateRequired('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY)
    this.validateRequired('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET)
    this.validateRequired('NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID', process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID)
    this.validateRequired('NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID', process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID)

    // Validate App URL
    this.validateUrl('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL)

    // Validate Redis (required in production)
    if (isProduction && isVercelProduction) {
      const hasRedis = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
      if (!hasRedis) {
        this.validationErrors.push('Redis is required in production (REDIS_URL or UPSTASH_REDIS_REST_URL)')
      }
      if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
        this.validationErrors.push('UPSTASH_REDIS_REST_TOKEN is required when using UPSTASH_REDIS_REST_URL')
      }
    } else if (!isDevelopment) {
      if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
        this.validationWarnings.push('Redis not configured - using in-memory mock (not recommended for production)')
      }
    }

    // Report validation results
    if (this.validationWarnings.length > 0) {
      console.warn('\n⚠️  Environment Validation Warnings:')
      this.validationWarnings.forEach(warning => console.warn(`   - ${warning}`))
      console.warn('')
    }

    if (this.validationErrors.length > 0) {
      console.error('\n❌ Environment Validation Errors:')
      this.validationErrors.forEach(error => console.error(`   - ${error}`))
      console.error('\nPlease check your .env file and ensure all required variables are set.')
      console.error('See .env.example for reference.\n')

      // Only throw in production - allow development with missing vars for flexibility
      if (isProduction) {
        throw new Error('Environment validation failed. Cannot start application.')
      }
    } else {
      if (!isDevelopment) {
        console.log('✅ Environment validation passed')
      }
    }

    this.validated = true
    return process.env as unknown as EnvConfig
  }

  /**
   * Get environment variable with type safety
   */
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    if (!this.validated) {
      this.validate()
    }
    return process.env[key] as EnvConfig[K]
  }

  /**
   * Check if running in development mode
   */
  get isDevelopment(): boolean {
    return process.env.NODE_ENV !== 'production'
  }

  /**
   * Check if running in production mode
   */
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  /**
   * Check if running in test mode
   */
  get isTest(): boolean {
    return process.env.NODE_ENV === 'test'
  }

  /**
   * Check if running on Vercel production
   */
  get isVercelProduction(): boolean {
    return process.env.VERCEL_ENV === 'production'
  }
}

// Create singleton instance
const validator = new EnvironmentValidator()

// Validate on import (only in Node.js environment)
if (typeof window === 'undefined') {
  try {
    validator.validate()
  } catch (error) {
    // Error already logged, just exit
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Export validated environment variables
export const env = validator

// Export type for use in other files
export type { EnvConfig }
