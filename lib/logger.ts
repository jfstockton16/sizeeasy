/**
 * Centralized logging system for SizeEasy
 *
 * Provides structured logging with different levels and automatic error tracking.
 * In production, logs can be sent to external services (Sentry, Datadog, etc.)
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User logged in', { userId: '123' })
 *   logger.error('Failed to create comparison', error, { context: 'additional data' })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error
  stack?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private isTest = process.env.NODE_ENV === 'test'

  /**
   * Format a log entry for output
   */
  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp
    const level = entry.level.toUpperCase().padEnd(5)
    let output = `[${timestamp}] ${level} ${entry.message}`

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | ${JSON.stringify(entry.context)}`
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`
      if (entry.stack && this.isDevelopment) {
        output += `\n${entry.stack}`
      }
    }

    return output
  }

  /**
   * Send log to external service (Sentry, Datadog, etc.)
   * TODO: Implement when error tracking service is configured
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Only send errors and warnings to external services in production
    if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'warn')) {
      // TODO: Integrate with Sentry/Datadog/LogRocket
      // Example:
      // if (entry.level === 'error') {
      //   Sentry.captureException(entry.error || new Error(entry.message), {
      //     extra: entry.context,
      //   })
      // }
    }
  }

  /**
   * Save log to database analytics
   * TODO: Implement when needed for long-term analysis
   */
  private async saveToDatabase(entry: LogEntry): Promise<void> {
    // In production, save important logs to database
    if (!this.isDevelopment && entry.level === 'error') {
      // TODO: Save to analytics_events table in Supabase
      // This can be used for debugging and analytics
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
    // Skip debug logs in production
    if (!this.isDevelopment && level === 'debug') {
      return
    }

    // Skip all logs in test mode unless it's an error
    if (this.isTest && level !== 'error') {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      stack: error?.stack,
    }

    // Console output
    const formatted = this.formatLog(entry)
    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }

    // Send to external services (async, don't block)
    this.sendToExternalService(entry).catch(() => {
      // Silently fail - logging shouldn't break the app
    })

    // Save to database (async, don't block)
    this.saveToDatabase(entry).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context)
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context)
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context)
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    let errorObj: Error | undefined

    // Handle both Error objects and unknown errors
    if (error instanceof Error) {
      errorObj = error
    } else if (error) {
      errorObj = new Error(String(error))
    }

    this.log('error', message, errorObj, context)
  }

  /**
   * Log an event with custom data
   */
  event(eventName: string, data?: LogContext): void {
    this.log('info', `Event: ${eventName}`, undefined, data)
  }

  /**
   * Create a child logger with default context
   * Useful for adding consistent context to all logs in a module
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger()
    const originalLog = childLogger.log.bind(childLogger)

    childLogger.log = (level: LogLevel, message: string, error?: Error, context?: LogContext) => {
      const mergedContext = { ...defaultContext, ...context }
      originalLog(level, message, error, mergedContext)
    }

    return childLogger
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types for use in other files
export type { LogLevel, LogContext }
