import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const reviewerEmail = 'samevibe.review@gmail.com';
  const users = await db.select().from(schema.users).where(eq(schema.users.email, reviewerEmail));
  const reviewer = users[0];

  if (!reviewer) {
    console.log("FAIL: Reviewer not found");
    process.exit(1);
  }

  // Update reviewer with SF coordinates for better match with seeded content
  await db.update(schema.users).set({
    onboardingCompleted: true,
    latitude: '37.7749',
    longitude: '-122.4194',
    interests: ['outdoor', 'music', 'tech', 'social', 'food', 'arts', 'wellness'],
    location: 'San Francisco, CA',
    name: 'SameVibe Reviewer',
  }).where(eq(schema.users.id, reviewer.id));
  console.log(`Updated reviewer (ID: ${reviewer.id}) with SF coordinates`);

  // Get all communities
  const allCommunities = await db.select().from(schema.communities);
  console.log(`Found ${allCommunities.length} communities in DB`);

  // Check existing memberships
  const existingMemberships = await db.select()
    .from(schema.communityMembers)
    .where(eq(schema.communityMembers.userId, reviewer.id));
  const joinedIds = new Set(existingMemberships.map(m => m.communityId));
  console.log(`Reviewer already joined ${joinedIds.size} communities`);

  // Join ALL communities
  let joined = 0;
  for (const community of allCommunities) {
    if (!joinedIds.has(community.id)) {
      await db.insert(schema.communityMembers).values({
        userId: reviewer.id,
        communityId: community.id,
      });
      console.log(`Joined: ${community.name}`);
      joined++;
    } else {
      console.log(`Already joined: ${community.name}`);
    }
  }

  console.log(`\nDone. Joined ${joined} new communities.`);
  
  // Verify
  const finalMemberships = await db.select()
    .from(schema.communityMembers)
    .where(eq(schema.communityMembers.userId, reviewer.id));
  console.log(`Reviewer now has ${finalMemberships.length} community memberships.`);
}

run().catch(console.error);
