/**
 * Cost Simulator
 *
 * Simulates various traffic patterns to test cost protection systems.
 * Does NOT make real API calls - only tests the protection layers.
 *
 * Usage:
 *   npm run cost-simulator -- --scenario surge
 *   npm run cost-simulator -- --scenario abuse
 *   npm run cost-simulator -- --scenario normal
 */

import { validateAPIRequest, recordAPIRequestCost } from '../lib/costProtection/preRequestValidation';
import { checkRateLimit } from '../lib/costProtection/rateLimiter';
import { checkUser } from '../lib/costProtection/abuseDetection';
import { enqueueRequest } from '../lib/costProtection/queueSystem';
import { checkCircuitBreaker, checkCost } from '../lib/costProtection/circuitBreaker';
import { calculateEstimatedCost } from '../config/costProtection';

interface SimulationResult {
  scenario: string;
  totalRequests: number;
  allowed: number;
  blocked: number;
  blockedReasons: Record<string, number>;
  totalCost: number;
  averageLatency: number;
  circuitBreakerTripped: boolean;
  errors: number;
}

/**
 * Run simulation
 */
async function runSimulation(scenario: string): Promise<SimulationResult> {
  console.log(`\n🎯 Running simulation: ${scenario}\n`);

  const result: SimulationResult = {
    scenario,
    totalRequests: 0,
    allowed: 0,
    blocked: 0,
    blockedReasons: {},
    totalCost: 0,
    averageLatency: 0,
    circuitBreakerTripped: false,
    errors: 0,
  };

  let totalLatency = 0;

  switch (scenario) {
    case 'normal':
      await simulateNormalTraffic(result);
      break;

    case 'surge':
      await simulateSurgeTraffic(result);
      break;

    case 'abuse':
      await simulateAbusePatterns(result);
      break;

    case 'cost-spike':
      await simulateCostSpike(result);
      break;

    case 'distributed':
      await simulateDistributedLoad(result);
      break;

    default:
      console.error(`Unknown scenario: ${scenario}`);
      process.exit(1);
  }

  result.averageLatency = result.totalRequests > 0 ? totalLatency / result.totalRequests : 0;

  return result;
}

/**
 * Simulate normal traffic (baseline)
 */
async function simulateNormalTraffic(result: SimulationResult) {
  console.log('Simulating normal traffic pattern...');

  const users = generateUsers(50, 'mixed');
  const duration = 60 * 1000; // 1 minute
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    // Random user makes a request
    const user = users[Math.floor(Math.random() * users.length)];

    await simulateRequest(user, result);

    // Wait between 100-500ms
    await sleep(100 + Math.random() * 400);
  }
}

/**
 * Simulate traffic surge
 */
async function simulateSurgeTraffic(result: SimulationResult) {
  console.log('Simulating traffic surge...');

  const users = generateUsers(200, 'mixed');

  // Rapid burst of requests
  const promises = users.map((user) => simulateRequest(user, result));

  await Promise.all(promises);
}

/**
 * Simulate abuse patterns
 */
async function simulateAbusePatterns(result: SimulationResult) {
  console.log('Simulating abuse patterns...');

  // Scenario 1: Rapid-fire from single user
  console.log('  - Rapid-fire attack...');
  const abuser1 = generateUsers(1, 'free')[0];
  for (let i = 0; i < 20; i++) {
    await simulateRequest(abuser1, result);
    await sleep(10);
  }

  // Scenario 2: Same comparison spam
  console.log('  - Duplicate request spam...');
  const abuser2 = generateUsers(1, 'free')[0];
  for (let i = 0; i < 10; i++) {
    await simulateRequest(abuser2, result, {
      comparison: { object1: 'iPhone', object2: 'Samsung Galaxy' },
    });
    await sleep(100);
  }

  // Scenario 3: Multiple IPs (API key sharing)
  console.log('  - API key sharing detection...');
  const sharer = generateUsers(1, 'premium')[0];
  for (let i = 0; i < 10; i++) {
    sharer.ip = `192.168.1.${i}`;
    await simulateRequest(sharer, result);
    await sleep(50);
  }
}

/**
 * Simulate cost spike
 */
async function simulateCostSpike(result: SimulationResult) {
  console.log('Simulating cost spike...');

  const user = generateUsers(1, 'premium')[0];

  // Make a few normal requests
  for (let i = 0; i < 3; i++) {
    await simulateRequest(user, result, {
      estimatedCost: 0.02,
    });
  }

  // Then make expensive requests (should trigger circuit breaker)
  for (let i = 0; i < 5; i++) {
    await simulateRequest(user, result, {
      estimatedCost: 0.5, // 10x normal cost
    });
    await sleep(100);
  }
}

/**
 * Simulate distributed load (many users)
 */
async function simulateDistributedLoad(result: SimulationResult) {
  console.log('Simulating distributed load from 1000 users...');

  const users = generateUsers(1000, 'mixed');

  // Each user makes 1-5 requests
  const promises: Promise<void>[] = [];

  for (const user of users) {
    const requestCount = 1 + Math.floor(Math.random() * 5);

    for (let i = 0; i < requestCount; i++) {
      promises.push(
        (async () => {
          await sleep(Math.random() * 10000); // Spread over 10 seconds
          await simulateRequest(user, result);
        })()
      );
    }
  }

  await Promise.all(promises);
}

/**
 * Simulate a single request
 */
async function simulateRequest(
  user: TestUser,
  result: SimulationResult,
  overrides?: {
    comparison?: any;
    estimatedCost?: number;
  }
) {
  const startTime = Date.now();
  result.totalRequests++;

  try {
    // Estimate cost
    const estimatedCost =
      overrides?.estimatedCost ||
      calculateEstimatedCost({
        openai: 2, // 2 OpenAI calls per comparison
        replicate: Math.random() > 0.5 ? 1 : 0, // 50% chance of image generation
        meshyPreview: Math.random() > 0.8 ? 1 : 0, // 20% chance of 3D model
      });

    // Check circuit breaker
    const circuitCheck = await checkCircuitBreaker();
    if (!circuitCheck.allowed) {
      result.blocked++;
      result.blockedReasons['circuit_breaker'] = (result.blockedReasons['circuit_breaker'] || 0) + 1;
      result.circuitBreakerTripped = true;
      return;
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(user.id, user.tier);
    if (!rateLimitCheck.success) {
      result.blocked++;
      result.blockedReasons['rate_limit'] = (result.blockedReasons['rate_limit'] || 0) + 1;
      return;
    }

    // Check abuse
    const abuseCheck = await checkUser(user.id, user.ip, overrides?.comparison);
    if (abuseCheck.shouldBlock) {
      result.blocked++;
      result.blockedReasons['abuse_detected'] = (result.blockedReasons['abuse_detected'] || 0) + 1;
      return;
    }

    // Validate request
    const validation = await validateAPIRequest({
      userId: user.id,
      requestType: 'comparison',
      estimatedCost,
      userTier: user.tier,
      ip: user.ip,
    });

    if (!validation.allowed) {
      result.blocked++;
      const reason = validation.reason?.includes('limit')
        ? 'cost_limit'
        : validation.reason?.includes('capacity')
        ? 'capacity'
        : 'other';
      result.blockedReasons[reason] = (result.blockedReasons[reason] || 0) + 1;
      return;
    }

    // Request allowed!
    result.allowed++;
    result.totalCost += estimatedCost;

    // Record cost
    await recordAPIRequestCost(
      {
        userId: user.id,
        requestType: 'comparison',
        estimatedCost,
        userTier: user.tier,
        ip: user.ip,
      },
      estimatedCost
    );

    // Check for cost anomaly (for circuit breaker)
    await checkCost(estimatedCost, 0.02);
  } catch (error) {
    result.errors++;
    console.error('Simulation error:', error);
  }

  const latency = Date.now() - startTime;
  result.averageLatency =
    (result.averageLatency * (result.totalRequests - 1) + latency) / result.totalRequests;
}

/**
 * Generate test users
 */
function generateUsers(count: number, mix: 'free' | 'premium' | 'mixed'): TestUser[] {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    let tier: 'free' | 'premium' | 'founder';

    if (mix === 'mixed') {
      const rand = Math.random();
      tier = rand < 0.7 ? 'free' : rand < 0.95 ? 'premium' : 'founder';
    } else {
      tier = mix;
    }

    users.push({
      id: `user_${i}`,
      tier,
      ip: `192.168.${Math.floor(i / 255)}.${i % 255}`,
    });
  }

  return users;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Print results
 */
function printResults(result: SimulationResult) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 SIMULATION RESULTS: ${result.scenario}`);
  console.log('='.repeat(60));
  console.log(`Total Requests:      ${result.totalRequests}`);
  console.log(`Allowed:             ${result.allowed} (${((result.allowed / result.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Blocked:             ${result.blocked} (${((result.blocked / result.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Total Cost:          $${result.totalCost.toFixed(2)}`);
  console.log(`Average Latency:     ${result.averageLatency.toFixed(0)}ms`);
  console.log(`Circuit Breaker:     ${result.circuitBreakerTripped ? '🔴 TRIPPED' : '🟢 OK'}`);
  console.log(`Errors:              ${result.errors}`);

  if (Object.keys(result.blockedReasons).length > 0) {
    console.log('\nBlocked Reasons:');
    Object.entries(result.blockedReasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

// Run simulation
interface TestUser {
  id: string;
  tier: 'free' | 'premium' | 'founder';
  ip: string;
}

const scenario = process.argv[2] || 'normal';
runSimulation(scenario)
  .then((result) => {
    printResults(result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Simulation failed:', error);
    process.exit(1);
  });
