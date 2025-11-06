/**
 * Layer 3: Smart Queueing System
 *
 * Queues API requests to prevent surge spending and manage capacity.
 * Implements priority queue with cost estimation.
 */

import { getRedisClient } from '@/lib/redis-client';
import { QUEUE_CONFIG, COST_LIMITS } from '@/config/costProtection';
import { getCurrentSpend } from '@/lib/redis-client';

export interface QueuedRequest {
  id: string;
  userId?: string;
  requestType: 'comparison' | 'image' | '3d-model' | 'dimensions';
  estimatedCost: number;
  priority: number; // Higher = more important
  userTier: 'free' | 'premium' | 'founder';
  timestamp: number;
  data: any; // Request-specific data
}

export interface QueueStatus {
  queueLength: number;
  estimatedWaitTimeMs: number;
  position?: number;
}

/**
 * Add request to queue
 */
export async function enqueueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp'>): Promise<{
  queued: boolean;
  requestId?: string;
  status?: QueueStatus;
  error?: string;
}> {
  const redis = getRedisClient();

  try {
    // Check if queue is full
    const queueLength = await redis.llen('queue:requests');

    if (queueLength >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      return {
        queued: false,
        error: 'Service overloaded - please try again later',
      };
    }

    // Check if request would exceed daily budget
    const projectedDailyCost = await getProjectedDailyCost();

    if (projectedDailyCost + request.estimatedCost > COST_LIMITS.MAX_DAILY_SPEND) {
      return {
        queued: false,
        error: 'Request would exceed daily budget - try again tomorrow',
      };
    }

    // Create request with ID and timestamp
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedRequest: QueuedRequest = {
      ...request,
      id: requestId,
      timestamp: Date.now(),
    };

    // Add to queue (priority-based)
    const queueKey = `queue:requests`;
    await redis.rpush(queueKey, JSON.stringify(queuedRequest));

    // Set expiry on queue to prevent memory leaks
    await redis.expire(queueKey, 3600); // 1 hour

    // Store request metadata for lookup
    await redis.set(
      `queue:request:${requestId}`,
      JSON.stringify(queuedRequest),
      { ex: 3600 }
    );

    // Get queue status
    const status = await getQueueStatus(requestId);

    return {
      queued: true,
      requestId,
      status,
    };
  } catch (error) {
    console.error('Error enqueueing request:', error);
    return {
      queued: false,
      error: 'Failed to queue request',
    };
  }
}

/**
 * Get next request from queue (priority-based)
 */
export async function dequeueRequest(): Promise<QueuedRequest | null> {
  const redis = getRedisClient();

  try {
    // Get all requests from queue
    const requests = await redis.lrange('queue:requests', 0, -1);

    if (requests.length === 0) {
      return null;
    }

    // Parse and sort by priority (higher priority first)
    const parsedRequests: QueuedRequest[] = requests
      .map((r) => {
        try {
          return JSON.parse(r as string);
        } catch {
          return null;
        }
      })
      .filter((r): r is QueuedRequest => r !== null);

    // Sort by priority (higher first), then by timestamp (older first)
    parsedRequests.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    const nextRequest = parsedRequests[0];

    if (!nextRequest) {
      return null;
    }

    // Remove from queue
    await redis.lrem('queue:requests', 1, JSON.stringify(nextRequest));

    return nextRequest;
  } catch (error) {
    console.error('Error dequeuing request:', error);
    return null;
  }
}

/**
 * Get queue status for a specific request
 */
export async function getQueueStatus(requestId: string): Promise<QueueStatus> {
  const redis = getRedisClient();

  try {
    const queueLength = await redis.llen('queue:requests');
    const requests = await redis.lrange('queue:requests', 0, -1);

    // Find position of request in queue
    let position: number | undefined;

    const parsedRequests: QueuedRequest[] = requests
      .map((r, index) => {
        try {
          const parsed = JSON.parse(r as string);
          if (parsed.id === requestId) {
            position = index + 1;
          }
          return parsed;
        } catch {
          return null;
        }
      })
      .filter((r): r is QueuedRequest => r !== null);

    // Estimate wait time based on average processing time
    const avgProcessingTimeMs = 5000; // 5 seconds per request
    const estimatedWaitTimeMs = position
      ? (position - 1) * avgProcessingTimeMs
      : queueLength * avgProcessingTimeMs;

    return {
      queueLength,
      estimatedWaitTimeMs,
      position,
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    return {
      queueLength: 0,
      estimatedWaitTimeMs: 0,
    };
  }
}

/**
 * Get projected daily cost (current + queued)
 */
async function getProjectedDailyCost(): Promise<number> {
  const redis = getRedisClient();

  try {
    // Get current daily spend
    const currentSpend = await getCurrentSpend('day');

    // Get queued requests
    const requests = await redis.lrange('queue:requests', 0, -1);
    const queuedCost = requests.reduce((total, r) => {
      try {
        const request = JSON.parse(r as string);
        return total + request.estimatedCost;
      } catch {
        return total;
      }
    }, 0);

    return currentSpend + queuedCost;
  } catch (error) {
    console.error('Error calculating projected daily cost:', error);
    return 0;
  }
}

/**
 * Process queue (to be called periodically)
 */
export async function processQueue(
  processor: (request: QueuedRequest) => Promise<void>
): Promise<void> {
  const redis = getRedisClient();

  try {
    // Check if already processing
    const isProcessing = await redis.get('queue:processing');

    if (isProcessing) {
      return; // Another process is already working on the queue
    }

    // Set processing flag
    await redis.set('queue:processing', 'true', { ex: 60 }); // 1 minute lock

    while (true) {
      // Check if we can process more requests
      const concurrentKey = 'cost:concurrent:count';
      const concurrent = Number(await redis.get(concurrentKey)) || 0;

      if (concurrent >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
        break; // Too many concurrent requests
      }

      // Get next request
      const request = await dequeueRequest();

      if (!request) {
        break; // Queue is empty
      }

      // Process request
      try {
        await processor(request);

        // Remove request metadata
        await redis.del(`queue:request:${request.id}`);
      } catch (error) {
        console.error('Error processing queued request:', error);

        // Re-queue request if it failed (with lower priority)
        if (request.priority > 0) {
          request.priority = Math.max(0, request.priority - 1);
          await redis.rpush('queue:requests', JSON.stringify(request));
        }
      }
    }

    // Clear processing flag
    await redis.del('queue:processing');
  } catch (error) {
    console.error('Error processing queue:', error);
    // Clear processing flag on error
    await redis.del('queue:processing');
  }
}

/**
 * Get queue analytics
 */
export async function getQueueAnalytics(): Promise<{
  totalQueued: number;
  averageWaitTimeMs: number;
  totalEstimatedCost: number;
  queuedByTier: {
    free: number;
    premium: number;
    founder: number;
  };
  queuedByType: {
    comparison: number;
    image: number;
    '3d-model': number;
    dimensions: number;
  };
}> {
  const redis = getRedisClient();

  try {
    const requests = await redis.lrange('queue:requests', 0, -1);

    const parsedRequests: QueuedRequest[] = requests
      .map((r) => {
        try {
          return JSON.parse(r as string);
        } catch {
          return null;
        }
      })
      .filter((r): r is QueuedRequest => r !== null);

    const queuedByTier = {
      free: 0,
      premium: 0,
      founder: 0,
    };

    const queuedByType = {
      comparison: 0,
      image: 0,
      '3d-model': 0,
      dimensions: 0,
    };

    let totalEstimatedCost = 0;
    let totalWaitTime = 0;

    parsedRequests.forEach((req, index) => {
      queuedByTier[req.userTier]++;
      queuedByType[req.requestType]++;
      totalEstimatedCost += req.estimatedCost;
      totalWaitTime += Date.now() - req.timestamp;
    });

    const averageWaitTimeMs = parsedRequests.length > 0 ? totalWaitTime / parsedRequests.length : 0;

    return {
      totalQueued: parsedRequests.length,
      averageWaitTimeMs,
      totalEstimatedCost,
      queuedByTier,
      queuedByType,
    };
  } catch (error) {
    console.error('Error getting queue analytics:', error);
    return {
      totalQueued: 0,
      averageWaitTimeMs: 0,
      totalEstimatedCost: 0,
      queuedByTier: { free: 0, premium: 0, founder: 0 },
      queuedByType: { comparison: 0, image: 0, '3d-model': 0, dimensions: 0 },
    };
  }
}

/**
 * Clear queue (admin function)
 */
export async function clearQueue(): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del('queue:requests');
    const keys = await redis.keys('queue:request:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    console.log('✅ Queue cleared');
  } catch (error) {
    console.error('Error clearing queue:', error);
    throw error;
  }
}
