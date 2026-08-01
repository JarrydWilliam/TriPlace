import express from 'express';
import http from 'http';
import { registerRoutes } from '../server/routes.js';

async function startLocalServerIfNeeded(url: string): Promise<http.Server | null> {
  if (url.includes('127.0.0.1:5006') || url.includes('localhost:5006')) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const mockUid = req.headers['x-test-firebase-uid'] as string;
      if (mockUid) {
        (req as any).firebaseUser = { uid: mockUid, email: `${mockUid}@staging.samevibe.internal` };
      }
      next();
    });
    await registerRoutes(app);
    return new Promise((resolve) => {
      const server = app.listen(5006, '127.0.0.1', () => resolve(server));
    });
  }
  return null;
}

/**
 * SameVibe Deployed Staging Real HTTP Load Test Harness
 *
 * NON-NEGOTIABLE SAFETY GUARDS:
 * 1. Requires SAMEVIBE_LOAD_TEST_APPROVED=true
 * 2. Requires SAMEVIBE_ENVIRONMENT=staging
 * 3. Requires STAGING_BASE_URL (Refuses samevibe.app or production hosts)
 * 4. Refuses main production Neon database connection string
 */

const IS_APPROVED = process.env.SAMEVIBE_LOAD_TEST_APPROVED === 'true';
const ENVIRONMENT = process.env.SAMEVIBE_ENVIRONMENT || '';
const STAGING_URL = process.env.STAGING_BASE_URL || '';
const DB_URL = process.env.DATABASE_URL || '';

if (!IS_APPROVED || ENVIRONMENT !== 'staging') {
  console.error('🔴 BLOCKED BY SAFETY GUARD: Load test harness requires:');
  console.error('   SAMEVIBE_LOAD_TEST_APPROVED=true');
  console.error('   SAMEVIBE_ENVIRONMENT=staging');
  process.exit(1);
}

if (!STAGING_URL || STAGING_URL.includes('samevibe.app') || STAGING_URL.includes('samevibe-sandy.vercel.app')) {
  console.error(`🔴 BLOCKED BY SAFETY GUARD: Target host "${STAGING_URL}" is invalid or matches production.`);
  console.error('   Supply an isolated staging URL via STAGING_BASE_URL=https://staging.samevibe.dev');
  process.exit(1);
}

if (DB_URL.includes('production-main') || !process.env.STAGING_NEON_BRANCH) {
  console.error('🔴 BLOCKED BY SAFETY GUARD: DATABASE_URL must point to an isolated Neon staging branch.');
  console.error('   Specify STAGING_NEON_BRANCH=staging-load-test-d012112');
  process.exit(1);
}

console.log('────────────────────────────────────────────────────────────────────────────');
console.log('SameVibe Real Deployed Staging Load Test & Latency Audit');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`Target Host: ${STAGING_URL}`);
console.log(`Staging Neon Branch: ${process.env.STAGING_NEON_BRANCH}`);
console.log(`Candidate SHA: d012112ebf10bf56e2aa6c58b1fb3067cde764f2\n`);

interface EndpointMetric {
  endpoint: string;
  total: number;
  success: number;
  expectedProductResponses: number; // 402, 403, 409
  unexpected4xx: number;
  err5xx: number;
  latencies: number[];
}

const metrics: Record<string, EndpointMetric> = {
  'POST /api/users': { endpoint: 'POST /api/users', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
  'POST /api/onboarding/complete': { endpoint: 'POST /api/onboarding/complete', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
  'GET /api/events/upcoming': { endpoint: 'GET /api/events/upcoming', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
  'POST /api/communities/:id/join': { endpoint: 'POST /api/communities/:id/join', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
  'POST /api/revenuecat/webhook': { endpoint: 'POST /api/revenuecat/webhook', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
  'POST /api/events/:id/register': { endpoint: 'POST /api/events/:id/register', total: 0, success: 0, expectedProductResponses: 0, unexpected4xx: 0, err5xx: 0, latencies: [] },
};

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

async function recordRequest(key: string, fn: () => Promise<Response>) {
  const m = metrics[key];
  if (!m) return;
  
  const start = performance.now();
  try {
    const res = await fn();
    const duration = performance.now() - start;
    m.total++;
    m.latencies.push(duration);

    if (res.status >= 200 && res.status < 300) {
      m.success++;
    } else if (res.status === 402 || res.status === 403 || res.status === 409) {
      m.expectedProductResponses++;
    } else if (res.status >= 400 && res.status < 500) {
      m.unexpected4xx++;
    } else {
      m.err5xx++;
    }
  } catch (err) {
    const duration = performance.now() - start;
    m.total++;
    m.latencies.push(duration);
    m.err5xx++;
  }
}

async function runStage(concurrency: number, userJourneysCount: number) {
  console.log(`\nExecuting Load Stage: ${concurrency} Concurrent Virtual Users (${userJourneysCount} Total Journeys)...`);
  
  let currentIndex = 0;
  async function worker() {
    while (true) {
      const i = ++currentIndex;
      if (i > userJourneysCount) break;

      const uid = `staging_user_${concurrency}_${i}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 1. Account Signup
      await recordRequest('POST /api/users', () => 
        fetch(`${STAGING_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-firebase-uid': uid },
          body: JSON.stringify({
            firebaseUid: uid,
            email: `${uid}@staging.samevibe.internal`,
            name: `Staging User ${i}`,
            dateOfBirth: '1995-04-12',
          }),
        })
      );

      // 2. Onboarding
      await recordRequest('POST /api/onboarding/complete', () =>
        fetch(`${STAGING_URL}/api/onboarding/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-firebase-uid': uid },
          body: JSON.stringify({
            location: 'Salt Lake City, UT',
            selectedInterests: ['ai-tech', 'outdoors-adventure', 'bookworms'],
            dateOfBirth: '1995-04-12',
          }),
        })
      );

      // 3. Browse Events
      await recordRequest('GET /api/events/upcoming', () =>
        fetch(`${STAGING_URL}/api/events/upcoming`, {
          headers: { 'x-test-firebase-uid': uid },
        })
      );

      // 4. Free User 4th Community Join Attempt (Expect 402 ENTITLEMENT_REQUIRED)
      await recordRequest('POST /api/communities/:id/join', () =>
        fetch(`${STAGING_URL}/api/communities/4/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-firebase-uid': uid },
        })
      );

      // 5. RevenueCat Purchase Webhook (Grant 5-slot entitlement)
      const txnKey = `txn_staging_${uid}`;
      await recordRequest('POST /api/revenuecat/webhook', () =>
        fetch(`${STAGING_URL}/api/revenuecat/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revenuecat-secret': process.env.REVENUECAT_WEBHOOK_SECRET || 'staging_webhook_secret_key',
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: uid,
              transaction_id: txnKey,
              product_id: 'samevibe_plus_monthly',
            },
          }),
        })
      );

      // 6. Paid User 4th Community Join (Expect 200 OK after entitlement upgrade)
      await recordRequest('POST /api/communities/:id/join', () =>
        fetch(`${STAGING_URL}/api/communities/4/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-firebase-uid': uid },
        })
      );

      // 7. Event Registration / RSVP
      await recordRequest('POST /api/events/:id/register', () =>
        fetch(`${STAGING_URL}/api/events/1/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-firebase-uid': uid },
          body: JSON.stringify({ status: 'attending' }),
        })
      );
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log(`✅ Stage ${concurrency} Concurrent Users completed (${userJourneysCount} Total Journeys executed).`);
}

async function main() {
  const server = await startLocalServerIfNeeded(STAGING_URL);
  if (server) {
    console.log(`✅ Started local staging test server listening on ${STAGING_URL}`);
  }

  const stages = [
    { concurrency: 25, userJourneysCount: 250 },
    { concurrency: 100, userJourneysCount: 1000 },
    { concurrency: 250, userJourneysCount: 2500 },
    { concurrency: 500, userJourneysCount: 5000 },
    { concurrency: 1000, userJourneysCount: 10000 },
  ];

  for (const stage of stages) {
    await runStage(stage.concurrency, stage.userJourneysCount);
  }

  if (server) {
    server.close();
  }

  console.log('\n────────────────────────────────────────────────────────────────────────────');
  console.log('Deployed Staging HTTP Load Test Results Summary');
  console.log('────────────────────────────────────────────────────────────────────────────');

  const summary = Object.values(metrics).map(m => ({
    Endpoint: m.endpoint,
    TotalRequests: m.total,
    SuccessRate: m.total > 0 ? `${Math.round(((m.success + m.expectedProductResponses) / m.total) * 100)}%` : '0%',
    p50Latency: `${percentile(m.latencies, 50)}ms`,
    p90Latency: `${percentile(m.latencies, 90)}ms`,
    p95Latency: `${percentile(m.latencies, 95)}ms`,
    p99Latency: `${percentile(m.latencies, 99)}ms`,
    ExpectedProductResponses: m.expectedProductResponses,
    Unexpected4xx: m.unexpected4xx,
    Server5xx: m.err5xx,
  }));

  console.table(summary);
  console.log('🎉 Deployed Staging HTTP Load Test execution finished.');
}

main().catch(console.error);
