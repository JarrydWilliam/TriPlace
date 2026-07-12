import { db } from "../server/db";
import { users, communityMembers, communities } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
  const reviewer = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });
  
  if (!reviewer) {
    console.log("Reviewer account not found.");
    process.exit(0);
  }
  
  const targetCommunityNames = [
    "Local Adventurers",
    "Creative Collaborators",
    "Wellness & Mindfulness Circle",
    "New in Town",
    "Weekend Plans"
  ];
  
  const targetCommunities = await db.query.communities.findMany({
    where: inArray(communities.name, targetCommunityNames)
  });
  
  if (targetCommunities.length !== 5) {
    console.log("Could not find all 5 target communities!");
    process.exit(1);
  }
  
  await db.delete(communityMembers).where(eq(communityMembers.userId, reviewer.id));
  
  for (const c of targetCommunities) {
    await db.insert(communityMembers).values({
      userId: reviewer.id,
      communityId: c.id,
      joinedAt: new Date()
    });
  }
  
  console.log("Successfully restored reviewer to 5 communities.");
  process.exit(0);
}

run().catch(console.error);
