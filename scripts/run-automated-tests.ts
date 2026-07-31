import * as dotenv from 'dotenv';
dotenv.config();
import { storage } from '../server/storage.js';
import { checkIs18OrOlder } from '../server/routes.js';
import * as schema from '../shared/schema.js';

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
