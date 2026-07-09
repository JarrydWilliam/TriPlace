import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

const API_BASE = "https://samevibe-sandy.vercel.app";

async function testCorsPreflightForPath(path: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'capacitor://localhost',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin') || res.headers.get('Access-Control-Allow-Origin');
    if (allowOrigin === 'capacitor://localhost' || allowOrigin === '*') {
      return `PASS (${allowOrigin})`;
    }
    return `FAIL (got: ${allowOrigin}, status: ${res.status})`;
  } catch (e: any) {
    return `FAIL (error: ${e.message})`;
  }
}

async function testGet(path: string): Promise<{ status: number, data: any, text: string }> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch(e) {}
  return { status: res.status, data, text };
}

async function verify() {
  console.log("=".repeat(60));
  console.log("SameVibe Production Verification — Build 57 pre-flight");
  console.log("=".repeat(60));
  
  if (!process.env.DATABASE_URL) {
    console.error("FAIL: DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // ─── 1. Reviewer Account ────────────────────────────────────────────────────
  console.log("\n[1] Reviewer Account");
  const reviewerEmail = 'samevibe.review@gmail.com';
  const users = await db.select().from(schema.users).where(eq(schema.users.email, reviewerEmail));
  const reviewer = users[0];

  if (!reviewer) {
    console.log(`FAIL: Reviewer profile missing for ${reviewerEmail}`);
    process.exit(1);
  }
  console.log(`PASS: Reviewer profile exists (DB ID: ${reviewer.id})`);
  console.log(`INFO: Firebase UID: KZF2qV18HsRAx8PhMzHaEC5oVGk1`);
  console.log(`INFO: onboardingCompleted: ${reviewer.onboardingCompleted}`);
  console.log(`INFO: latitude: ${reviewer.latitude}, longitude: ${reviewer.longitude}`);
  console.log(`INFO: interests: ${JSON.stringify(reviewer.interests)}`);
  
  if (!reviewer.onboardingCompleted) {
    console.log("FAIL: reviewer onboardingCompleted is false — will see quiz instead of dashboard!");
  }

  // ─── 2. Communities in DB ───────────────────────────────────────────────────
  console.log("\n[2] Communities in DB");
  const allCommunities = await db.select().from(schema.communities);
  console.log(`INFO: Found ${allCommunities.length} communities in DB`);
  allCommunities.forEach(c => console.log(`  - [${c.id}] ${c.name}`));

  // ─── 3. Reviewer Membership ─────────────────────────────────────────────────
  console.log("\n[3] Reviewer Community Memberships");
  const memberships = await db.select().from(schema.communityMembers)
    .where(eq(schema.communityMembers.userId, reviewer.id));
  console.log(`INFO: Reviewer joined ${memberships.length} communities`);
  if (memberships.length < 3) {
    console.log("WARN: Reviewer has < 3 community memberships — running join script...");
  }

  // ─── 4. Events in DB ────────────────────────────────────────────────────────
  console.log("\n[4] Events in DB");
  const allEvents = await db.select().from(schema.events);
  console.log(`INFO: Found ${allEvents.length} events in DB`);
  allEvents.forEach(e => console.log(`  - [${e.id}] ${e.title}`));
  if (allEvents.length === 0) {
    console.log("FAIL: No events in DB!");
  }

  // ─── 5. CORS Preflights ─────────────────────────────────────────────────────
  console.log("\n[5] CORS Preflight Tests (Origin: capacitor://localhost)");
  const corsPaths = [
    '/api/events/upcoming',
    '/api/communities/recommended?userId=3',
    `/api/communities/${allCommunities[0]?.id || 1}/dynamic-info?userId=${reviewer.id}`,
    `/api/users/${reviewer.id}/communities`,
    `/api/users/${reviewer.id}/active-communities`,
  ];
  for (const path of corsPaths) {
    const result = await testCorsPreflightForPath(path);
    console.log(`  ${path}: ${result}`);
  }

  // ─── 6. API Endpoint Tests ──────────────────────────────────────────────────
  console.log("\n[6] API Endpoint Tests");

  // User's joined communities
  const myComm = await testGet(`/api/users/${reviewer.id}/communities`);
  if (Array.isArray(myComm.data) && myComm.data.length > 0) {
    console.log(`PASS: /api/users/${reviewer.id}/communities → ${myComm.data.length} communities`);
  } else {
    console.log(`FAIL: /api/users/${reviewer.id}/communities → ${myComm.text.slice(0, 100)}`);
  }

  // User's active communities (dashboard "Your Communities")
  const activeCom = await testGet(`/api/users/${reviewer.id}/active-communities`);
  if (Array.isArray(activeCom.data) && activeCom.data.length > 0) {
    console.log(`PASS: /api/users/${reviewer.id}/active-communities → ${activeCom.data.length} communities`);
  } else {
    console.log(`FAIL: /api/users/${reviewer.id}/active-communities → ${activeCom.text.slice(0, 100)}`);
  }

  // Community detail for each joined community
  console.log("\n[7] Community Detail Tests (one per joined community)");
  const communityDetailIds = memberships.map(m => m.communityId).slice(0, 5);
  let detailPass = 0;
  let detailFail = 0;
  for (const communityId of communityDetailIds) {
    const detail = await testGet(`/api/communities/${communityId}/dynamic-info?userId=${reviewer.id}`);
    if (detail.status === 200 && detail.data?.id) {
      console.log(`  PASS: /api/communities/${communityId}/dynamic-info → "${detail.data.name}"`);
      detailPass++;
    } else {
      console.log(`  FAIL: /api/communities/${communityId}/dynamic-info → status ${detail.status}: ${detail.text.slice(0, 80)}`);
      detailFail++;
    }
  }
  console.log(`Community detail: ${detailPass} PASS, ${detailFail} FAIL`);

  // Events
  const events = await testGet(`/api/events/upcoming?userId=${reviewer.id}`);
  if (Array.isArray(events.data) && events.data.length > 0) {
    console.log(`\nPASS: /api/events/upcoming?userId=${reviewer.id} → ${events.data.length} events`);
  } else {
    console.log(`\nFAIL: Events API → ${events.text.slice(0, 100)}`);
  }

  // Profile
  const profile = await testGet(`/api/users/firebase/KZF2qV18HsRAx8PhMzHaEC5oVGk1`);
  if (profile.data?.id) {
    console.log(`PASS: /api/users/firebase/... → user ID ${profile.data.id}`);
  } else {
    console.log(`FAIL: Profile API → ${profile.text.slice(0, 100)}`);
  }

  // ─── 8. Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  const totalComm = allCommunities.length;
  const memberCount = memberships.length;
  const eventCount = allEvents.length;
  console.log(`Communities in DB: ${totalComm}`);
  console.log(`Reviewer memberships: ${memberCount}`);
  console.log(`Events in DB: ${eventCount}`);
  console.log(`Community detail tests: ${detailPass}/${communityDetailIds.length} PASS`);
  
  const allGood = totalComm >= 5 && memberCount >= 3 && eventCount >= 3 && detailPass === communityDetailIds.length;
  console.log(allGood ? "\n✅ READY FOR BUILD 57" : "\n❌ ISSUES FOUND — DO NOT BUILD YET");
}

verify().catch(console.error);
