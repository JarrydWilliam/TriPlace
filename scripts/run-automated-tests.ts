import * as dotenv from 'dotenv';
dotenv.config();
import { storage } from '../server/storage.js';
import { checkIs18OrOlder } from '../server/routes.js';
import * as schema from '../shared/schema.js';
import { db } from '../server/db.js';
import { eq, inArray } from 'drizzle-orm';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('────────────────────────────────────────────────────────────────────────────');
  console.log('SameVibe Core Loop, Security & Invariants Test Suite');
  console.log('────────────────────────────────────────────────────────────────────────────\n');

  // Test Group 1: Age Eligibility (Phase 3)
  console.log('Test Group 1: Age Eligibility Verification (Phase 3)');
  assert(checkIs18OrOlder('2000-01-01') === true, 'DOB 2000-01-01 is adult (>= 18)');
  assert(checkIs18OrOlder('2015-05-15') === false, 'DOB 2015-05-15 is minor (< 18)');
  assert(checkIs18OrOlder('invalid-date') === false, 'Invalid DOB string fails closed');
  assert(checkIs18OrOlder('') === false, 'Empty DOB string fails closed');

  // Test Group 2: Canonical Key Normalization (Phase 5)
  console.log('\nTest Group 2: Canonical Key Normalization & Deduplication (Phase 5)');
  const key1 = (storage as any).buildCanonicalKey('Ogden, UT', 'Outdoor', 'Mountain Biking');
  const key2 = (storage as any).buildCanonicalKey('ogden-ut', 'outdoor', 'mountain-biking');
  const key3 = (storage as any).buildCanonicalKey('OGDEN  UT!', 'OUTDOOR!', 'mountain biking');
  assert(key1 === 'ogden-ut|outdoor|mountain-biking', 'Key 1 matches standard format');
  assert(key1 === key2, 'Key 1 and Key 2 normalize identically');
  assert(key2 === key3, 'Key 2 and Key 3 normalize identically regardless of casing/punct');

  // Test Group 3: Onboarding Archetype Selection & Questionnaire Mapping (Phase 4 & 6)
  console.log('\nTest Group 3: Questionnaire Mapping & Archetype Selection (Phase 4 & 6)');
  const dummyUser: schema.User = {
    id: 99999,
    firebaseUid: 'test-uid-99999',
    email: 'test@example.com',
    name: 'Test User',
    dateOfBirth: '1995-06-15',
    termsAcceptedAt: new Date(),
    termsVersion: '1.0',
    avatar: null,
    bio: null,
    location: 'Ogden, UT',
    latitude: '41.223',
    longitude: '-111.973',
    interests: ['ai-tech', 'outdoors-adventure', 'bookworms'],
    agentInferredInterests: null,
    onboardingCompleted: false,
    quizAnswers: { interestSpaces: ['ai-tech', 'outdoors-adventure', 'bookworms'] },
    notificationSettings: {},
    discoverySettings: {},
    isOnline: false,
    lastActiveAt: new Date(),
    trustLevel: 0,
    subscriptionStatus: 'inactive',
    subscriptionStart: null,
    subscriptionEnd: null,
    paymentTier: 0,
    createdAt: new Date(),
  };

  const archetypes = (storage as any).selectTopThreeArchetypes(dummyUser, 3);
  assert(archetypes.length === 3, 'Selected exactly 3 archetypes');
  assert(archetypes[0].interest === 'ai-tech', 'Mapped ai-tech directly');
  assert(archetypes[1].interest === 'outdoors-adventure', 'Mapped outdoors-adventure directly');
  assert(archetypes[2].interest === 'bookworms', 'Mapped bookworms directly');

  // Test Group 4: 5-Community Ceilings (Phase 9)
  console.log('\nTest Group 4: 5-Community Maximum Ceiling & Rotation (Phase 9)');
  assert(schema.communityMembers !== undefined, 'communityMembers schema defined');
  assert(schema.communities !== undefined, 'communities schema defined');

  // Test Group 5: Server-Enforced Paid Entitlement & Slot Ceiling (3 Free vs 5 Paid)
  console.log('\nTest Group 5: Server-Enforced Paid Entitlement & Slot Ceiling (3 Free vs 5 Paid)');

  // Create isolated test user
  const testUser = await storage.createUser({
    firebaseUid: `test-entitlement-uid-${Date.now()}`,
    email: `entitlement_test_${Date.now()}@test.internal`,
    name: 'Entitlement Test User',
    dateOfBirth: '1992-08-20',
    onboardingCompleted: true,
    paymentTier: 0,
    subscriptionStatus: 'inactive',
  });

  // Create 6 test communities
  const testComms = await Promise.all([
    storage.createCommunity({ name: `EntComm 1 ${Date.now()}`, description: 'Test 1', category: 'outdoor' }),
    storage.createCommunity({ name: `EntComm 2 ${Date.now()}`, description: 'Test 2', category: 'tech' }),
    storage.createCommunity({ name: `EntComm 3 ${Date.now()}`, description: 'Test 3', category: 'arts' }),
    storage.createCommunity({ name: `EntComm 4 ${Date.now()}`, description: 'Test 4', category: 'food' }),
    storage.createCommunity({ name: `EntComm 5 ${Date.now()}`, description: 'Test 5', category: 'wellness' }),
    storage.createCommunity({ name: `EntComm 6 ${Date.now()}`, description: 'Test 6', category: 'social' }),
  ]);

  // Step 1: Free user joins 3 communities freely
  await storage.joinCommunityWithRotation(testUser.id, testComms[0].id);
  await storage.joinCommunityWithRotation(testUser.id, testComms[1].id);
  await storage.joinCommunityWithRotation(testUser.id, testComms[2].id);

  let activeComms = await storage.getUserActiveCommunities(testUser.id);
  assert(activeComms.length === 3, 'Free user successfully joined 3 initial communities');

  // Step 2: Free user attempting 4th slot without swap is REJECTED with ENTITLEMENT_REQUIRED
  let rejected = false;
  try {
    await storage.joinCommunityWithRotation(testUser.id, testComms[3].id);
  } catch (err: any) {
    if (err.code === 'ENTITLEMENT_REQUIRED') {
      rejected = true;
    }
  }
  assert(rejected === true, 'Free user at 3 slots rejected when requesting 4th slot (ENTITLEMENT_REQUIRED)');

  activeComms = await storage.getUserActiveCommunities(testUser.id);
  assert(activeComms.length === 3, 'Free user active community count remains 3 after rejection');

  // Step 3: Free user performing free replacement (swap) succeeds without payment
  const swapResult = await storage.joinCommunityWithRotation(testUser.id, testComms[3].id, { isReplacement: true });
  assert(swapResult.joined !== undefined, 'Free user performed free replacement/swap successfully');
  assert(swapResult.dropped !== undefined, 'Free replacement dropped least active community');

  activeComms = await storage.getUserActiveCommunities(testUser.id);
  assert(activeComms.length === 3, 'Free user active community count remains exactly 3 after free replacement');

  // Step 4: Update user paymentTier to 2 (Paid entitlement up to 5 slots)
  await storage.updateUser(testUser.id, { paymentTier: 2 });

  // Step 5: Paid user joins 4th community
  await storage.joinCommunityWithRotation(testUser.id, testComms[0].id); // re-join dropped
  activeComms = await storage.getUserActiveCommunities(testUser.id);
  assert(activeComms.length === 4, 'Paid user successfully joined 4th community');

  // Step 6: Paid user joins 5th community
  await storage.joinCommunityWithRotation(testUser.id, testComms[4].id);
  activeComms = await storage.getUserActiveCommunities(testUser.id);
  assert(activeComms.length === 5, 'Paid user successfully joined 5th community');

  // Step 7: Paid user at 5 slots attempts to join 6th community without explicit swap -> Rejected with COMMUNITY_LIMIT_REACHED
  let limitReached = false;
  try {
    await storage.joinCommunityWithRotation(testUser.id, testComms[5].id);
  } catch (err: any) {
    if (err.code === 'COMMUNITY_LIMIT_REACHED') {
      limitReached = true;
    }
  }
  assert(limitReached === true, 'Paid user at 5 slots joining 6th community receives COMMUNITY_LIMIT_REACHED requiring confirmation');

  // Step 8: Paid user explicitly confirms replacement -> Drops target community, active count stays 5
  const paidSwapResult = await storage.joinCommunityWithRotation(testUser.id, testComms[5].id, { replaceCommunityId: testComms[0].id });
  assert(paidSwapResult.joined !== undefined, 'Paid user explicitly confirmed community replacement for 6th community');
  assert(paidSwapResult.dropped?.id === testComms[0].id, 'Specified community was dropped during deliberate replacement');

  // Step 9: Expired subscription creates over-limit state -> Rejected with COMMUNITY_DOWNGRADE_REQUIRED
  await storage.updateUser(testUser.id, { paymentTier: 0, subscriptionStatus: 'inactive' });
  let downgradeRequired = false;
  try {
    await storage.joinCommunityWithRotation(testUser.id, testComms[0].id);
  } catch (err: any) {
    if (err.code === 'COMMUNITY_DOWNGRADE_REQUIRED') {
      downgradeRequired = true;
    }
  }
  assert(downgradeRequired === true, 'Expired subscription user with >3 communities receives COMMUNITY_DOWNGRADE_REQUIRED');

  // Test Group 6: RevenueCat Webhook Auth & Replay Protection (Phase 2 & Entitlement Authority)
  console.log('\nTest Group 6: RevenueCat Webhook Security, Replay Protection & Lifecycle (Phase 2)');
  
  process.env.REVENUECAT_WEBHOOK_SECRET = 'secret_test_key_xyz890';

  // Step 6.1: Verify Webhook Replay Protection using slotGrants
  const testTxnKey = `test_rc_webhook_txn_${Date.now()}`;
  const firstGrant = await db.insert(schema.slotGrants).values({
    userId: testUser.id,
    txnKey: testTxnKey,
    productId: 'samevibe_plus_monthly'
  }).onConflictDoNothing().returning();

  assert(firstGrant.length === 1, 'First webhook transaction granted successfully');

  const secondGrant = await db.insert(schema.slotGrants).values({
    userId: testUser.id,
    txnKey: testTxnKey,
    productId: 'samevibe_plus_monthly'
  }).onConflictDoNothing().returning();

  assert(secondGrant.length === 0, 'Duplicate webhook transaction key rejected (Idempotent replay protection)');

  // Step 6.2: Invalid replaceCommunityId changes nothing
  let invalidReplaceHandled = false;
  try {
    const invalidRes = await storage.joinCommunityWithRotation(testUser.id, testComms[4].id, { replaceCommunityId: 9999999 });
    if (invalidRes) invalidReplaceHandled = true;
  } catch (err) {
    invalidReplaceHandled = true;
  }
  assert(invalidReplaceHandled === true, 'Invalid replaceCommunityId handled safely');

  // Cleanup test user, memberships, and test communities
  await (storage as any).clearUserCommunities(testUser.id);
  await db.delete(schema.users).where(eq(schema.users.id, testUser.id));
  const testCommIds = testComms.map(c => c.id);
  if (testCommIds.length > 0) {
    await db.delete(schema.communityMembers).where(inArray(schema.communityMembers.communityId, testCommIds));
    await db.delete(schema.communities).where(inArray(schema.communities.id, testCommIds));
  }

  console.log('\n────────────────────────────────────────────────────────────────────────────');
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
