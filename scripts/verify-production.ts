import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  console.log("Starting Production Verification...");
  if (!process.env.DATABASE_URL) {
    console.error("FAIL: DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // 1. Check Reviewer Profile
  const reviewerEmail = 'samevibe.review@gmail.com';
  const users = await db.select().from(schema.users).where(eq(schema.users.email, reviewerEmail));
  const reviewer = users[0];

  if (reviewer) {
    console.log(`PASS: Reviewer profile exists (ID: ${reviewer.id})`);
    console.log(`INFO: Reviewer onboardingCompleted: ${reviewer.onboardingCompleted}`);
  } else {
    console.log(`FAIL: Reviewer profile missing for ${reviewerEmail}`);
  }

  // 2. Check Communities in DB
  const allCommunities = await db.select().from(schema.communities);
  console.log(`INFO: Found ${allCommunities.length} communities in database.`);
  
  const requiredCommunities = [
    "New in Town", "Weekend Plans", "Live Music", "Food & Drinks",
    "Outdoor Adventures", "Fitness & Wellness", "Tech & Creatives"
  ];
  
  const foundNames = allCommunities.map(c => c.name);
  const missing = requiredCommunities.filter(name => !foundNames.includes(name));
  
  if (missing.length === 0) {
    console.log("PASS: All required starter communities exist in DB.");
  } else {
    console.log(`FAIL: Missing starter communities in DB: ${missing.join(', ')}`);
  }

  // 3. Check Events in DB
  const allEvents = await db.select().from(schema.events);
  console.log(`INFO: Found ${allEvents.length} events in database.`);
  if (allEvents.length > 0) {
    console.log("PASS: Events exist in DB.");
  } else {
    console.log("FAIL: No events found in DB.");
  }

  // 4. API Tests
  console.log("\nTesting API Endpoints against Vercel Production...");
  const API_BASE = "https://samevibe-sandy.vercel.app";
  
  if (reviewer) {
    try {
      const commRes = await fetch(`${API_BASE}/api/communities/recommended?userId=${reviewer.id}`);
      const commText = await commRes.text();
      let comms = [];
      try { comms = JSON.parse(commText); } catch(e) {}
      if (Array.isArray(comms) && comms.length > 0) {
        console.log(`PASS: Communities API returns ${comms.length} items for reviewer.`);
      } else {
        console.log(`FAIL: Communities API returned empty for reviewer. Output: ${commText.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`FAIL: Communities API error: ${e.message}`);
    }

    try {
      const eventRes = await fetch(`${API_BASE}/api/events/upcoming?userId=${reviewer.id}`);
      const eventText = await eventRes.text();
      let events = [];
      try { events = JSON.parse(eventText); } catch(e) {}
      if (Array.isArray(events) && events.length > 0) {
        console.log(`PASS: Events API returns ${events.length} items for reviewer.`);
      } else {
        console.log(`FAIL: Events API returned empty for reviewer. Output: ${eventText.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`FAIL: Events API error: ${e.message}`);
    }
  }
}

verify().catch(console.error);
