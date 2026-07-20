import { config } from 'dotenv';
config();
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.ts';
import { db } from '../server/db.ts';
import { events, eventAttendees } from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

let app: express.Express;
let failures = 0;
let passes = 0;

async function assertEqual(expected: any, actual: any, message: string) {
  if (expected !== actual) {
    console.error(`❌ FAIL: ${message} (Expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passes++;
  }
}

async function runTests() {
  if (!process.env.TEST_DATABASE_URL) {
    console.warn("⚠️ TEST_DATABASE_URL is not set. Skipping Neon PostgreSQL integration tests.");
    console.warn("Please run this script again once the isolated Neon test branch is configured.");
    process.exit(0);
  }

  // Override process.env.DATABASE_URL so the app connects to the test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  console.log('--- Setting up Test App ---');
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  const testAuthMiddleware = (req: any, res: any, next: any) => {
    const mockUid = req.headers['x-test-uid'];
    if (!mockUid) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }
    req.user = { id: parseInt(mockUid) };
    next();
  };

  await registerRoutes(app, { authMiddleware: testAuthMiddleware });

  console.log('--- Running Concurrency Tests ---');
  
  const iterations = 100;
  let maxObservedCapacity = 0;

  for (let i = 0; i < iterations; i++) {
    // 1. Create a new active future event with capacity 2
    const [event] = await db.insert(events).values({
      title: `Final-seat Concurrency Test ${i}`,
      description: 'Concurrency load test',
      organizer: 'Test Org',
      date: new Date(Date.now() + 86400000), // tomorrow
      location: 'Test Location',
      address: 'Test Address',
      category: 'test',
      status: 'active',
      maxAttendees: 2
    }).returning();
    const testEventId = event.id;

    // 2. Seed one attendee
    await db.insert(eventAttendees).values({
      eventId: testEventId,
      userId: 999, // Seed user
      status: 'going',
      registeredAt: new Date()
    });

    // 3. Send five simultaneous RSVP requests from five different eligible users
    const userIds = [1001, 1002, 1003, 1004, 1005];
    const requests = userIds.map(uid => 
      request(app)
        .post(`/api/events/${testEventId}/register`)
        .set('x-test-uid', uid.toString())
        .send({ status: 'going' })
    );

    // 4. Wait for every request to settle
    const responses = await Promise.all(requests);

    // 5. Query final attendance count
    const [countResult] = await db.execute(sql`SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ${testEventId}`);
    const finalCount = parseInt(countResult.count as string);
    
    if (finalCount > maxObservedCapacity) {
      maxObservedCapacity = finalCount;
    }

    const successes = responses.filter(r => r.status === 201).length;
    const capacityErrors = responses.filter(r => r.status === 409 && r.body.message.includes('capacity')).length;

    if (successes !== 1 || capacityErrors !== 4 || finalCount !== 2) {
      console.error(`❌ FAIL: Iteration ${i} failed! Successes: ${successes}, Capacity Errors: ${capacityErrors}, Final Count: ${finalCount}`);
      failures++;
      break;
    }
  }

  if (failures === 0) {
    console.log(`✅ PASS: 100 iterations of Final-seat concurrency test. Max observed capacity: ${maxObservedCapacity} (Expected: 2)`);
    passes++;
  }

  console.log('--- Running Duplicate Concurrency Test ---');
  
  const [dupEvent] = await db.insert(events).values({
    title: `Duplicate Concurrency Test`,
    description: 'Testing duplicate constraint',
    organizer: 'Test Org',
    date: new Date(Date.now() + 86400000),
    location: 'Test',
    address: 'Test',
    category: 'test',
    status: 'active',
    maxAttendees: 5
  }).returning();

  const dupRequests = [1, 2, 3, 4, 5].map(_ => 
    request(app)
      .post(`/api/events/${dupEvent.id}/register`)
      .set('x-test-uid', '2001') // SAME USER
      .send({ status: 'going' })
  );

  const dupResponses = await Promise.all(dupRequests);
  const dupSuccesses = dupResponses.filter(r => r.status === 201).length;
  const dupErrors = dupResponses.filter(r => r.status === 409 && r.body.message.includes('Already registered')).length;

  const [dupCountResult] = await db.execute(sql`SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ${dupEvent.id}`);
  const dupFinalCount = parseInt(dupCountResult.count as string);

  if (dupSuccesses === 1 && dupErrors === 4 && dupFinalCount === 1) {
    console.log('✅ PASS: Duplicate concurrency test');
    passes++;
  } else {
    console.error(`❌ FAIL: Duplicate concurrency. Successes: ${dupSuccesses}, Errors: ${dupErrors}, Count: ${dupFinalCount}`);
    failures++;
  }

  // Cleanup all test data
  console.log('--- Cleaning up Test Data ---');
  await db.execute(sql`DELETE FROM event_attendees WHERE user_id >= 999`);
  await db.execute(sql`DELETE FROM events WHERE category = 'test'`);

  console.log(`\nTEST TOTALS: ${passes + failures} | PASSES: ${passes} | FAILURES: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
