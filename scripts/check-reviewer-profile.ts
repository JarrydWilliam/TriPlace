import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [reviewer] = await db.select().from(schema.users)
    .where(eq(schema.users.email, 'samevibe.review@gmail.com'));

  if (!reviewer) {
    console.log("❌ Reviewer NOT found in database");
    process.exit(1);
  }

  console.log("\n=== REVIEWER PROFILE ===");
  console.log(`  ID:                  ${reviewer.id}`);
  console.log(`  Firebase UID:        ${reviewer.firebaseUid}`);
  console.log(`  Email:               ${reviewer.email}`);
  console.log(`  Name:                ${reviewer.name}`);
  console.log(`  Bio:                 ${reviewer.bio}`);
  console.log(`  Location:            ${reviewer.location}`);
  console.log(`  Interests:           ${(reviewer.interests || []).join(', ')}`);
  console.log(`  Onboarding complete: ${reviewer.onboardingCompleted}`);
  console.log(`  Terms version:       ${reviewer.termsVersion}`);
  console.log(`  Created:             ${reviewer.createdAt}`);

  const memberships = await db.select()
    .from(schema.communityMembers)
    .where(eq(schema.communityMembers.userId, reviewer.id));

  console.log(`\n=== COMMUNITY MEMBERSHIPS (${memberships.length} total) ===`);
  for (const m of memberships) {
    const [community] = await db.select().from(schema.communities)
      .where(eq(schema.communities.id, m.communityId));
    console.log(`  ✅ ${community?.name ?? 'Unknown'} (ID: ${m.communityId})`);
  }

  console.log("\n=== STATUS ===");
  const issues = [];
  if (!reviewer.name) issues.push("Missing name");
  if (!reviewer.onboardingCompleted) issues.push("Onboarding not completed");
  if (memberships.length === 0) issues.push("No community memberships");

  if (issues.length === 0) {
    console.log("✅ Reviewer profile is READY for Apple Review");
  } else {
    console.log("❌ Issues found:");
    issues.forEach(i => console.log(`  - ${i}`));
  }
}

run().catch(console.error);
