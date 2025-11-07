'use client'

/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI.
 * Logs errors to the logging system for debugging.
 *
 * Usage:
 *   <ErrorBoundary fallback={<ErrorFallback />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import React, { Component, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to our centralized logger
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorInfo: errorInfo,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h2>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * API Error Fallback Component
 * Specialized fallback for API-related errors
 */
export function APIErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            API Request Failed
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>
              We couldn't complete your request. Please check your internet connection and try again.
            </p>
            {error && process.env.NODE_ENV === 'development' && (
              <p className="mt-2 font-mono text-xs">{error.message}</p>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Component Error Fallback
 * Smaller fallback for component-level errors
 */
export function ComponentErrorFallback({ error, resetError }: { error?: Error; resetError?: () => void }) {
  return (
    <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
      <div className="flex items-center">
        <svg
          className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          This component failed to load
        </p>
      </div>
      {resetError && (
        <button
          onClick={resetError}
          className="mt-3 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
