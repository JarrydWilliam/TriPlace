import { config } from 'dotenv';
config();
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.ts';
import { db } from '../server/db.ts';
import { events, eventAttendees } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

let app: express.Express;
let testEventId: number;
let failures = 0;
let passes = 0;
let skips = 0;

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

  console.log('--- Setting up Test Data ---');
  const [event] = await db.insert(events).values({
    title: 'Test Security Event',
    description: 'An event for testing capacity and RSVP logic',
    organizer: 'Test Org',
    date: new Date(Date.now() + 86400000), // tomorrow
    location: 'Test Location',
    address: 'Test Address',
    category: 'test',
    status: 'active',
    maxAttendees: 1
  }).returning();
  testEventId = event.id;

  try {
    console.log('--- Running Tests ---');
    
    // Test 1
    const prodApp = express();
    prodApp.use(express.json());
    await registerRoutes(prodApp);
    const res1 = await request(prodApp).post(`/api/events/${testEventId}/register`).set('x-mock-user-id', '999');
    await assertEqual(401, res1.status, 'Production app does not accept x-mock-user-id bypass');

    // Test 2
    const res2 = await request(app).post(`/api/events/${testEventId}/register`).send({ status: 'going' });
    await assertEqual(401, res2.status, 'Unauthenticated request returns 401');

    // Test 3
    const res3 = await request(app).post(`/api/events/${testEventId}/register`).set('x-test-uid', '1').send({ status: 'going' });
    await assertEqual(201, res3.status, 'First RSVP succeeds');

    // Test 4
    const res4 = await request(app).post(`/api/events/${testEventId}/register`).set('x-test-uid', '1').send({ status: 'going' });
    await assertEqual(409, res4.status, 'Second RSVP by same user returns 409 (Already registered)');

    // Test 5
    const res5 = await request(app).post(`/api/events/${testEventId}/register`).set('x-test-uid', '2').send({ status: 'going' });
    await assertEqual(409, res5.status, 'Event is at capacity returns 409 (Capacity reached)');

    // Test 6
    const res6 = await request(app).delete(`/api/events/${testEventId}/register`).set('x-test-uid', '1');
    await assertEqual(200, res6.status, 'User cancels their own RSVP');

    // Test 7
    const res7 = await request(app).post(`/api/events/${testEventId}/register`).set('x-test-uid', '2').send({ status: 'going' });
    await assertEqual(201, res7.status, 'After cancellation, capacity frees up');
    
  } finally {
    console.log('--- Cleaning up Test Data ---');
    if (testEventId) {
      await db.delete(eventAttendees).where(eq(eventAttendees.eventId, testEventId));
      await db.delete(events).where(eq(events.id, testEventId));
    }
  }
  
  console.log(`\nTEST TOTALS: ${passes + failures} | PASSES: ${passes} | FAILURES: ${failures} | SKIPS: ${skips}`);
  process.exit(failures > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
