import { db } from './server/db.js';
import { users, communities, communityMembers } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });

  if (!user) {
    console.log("Reviewer account not found!");
    process.exit(1);
  }

  const joined = await db.select({
    name: communities.name
  }).from(communityMembers)
  .innerJoin(communities, eq(communityMembers.communityId, communities.id))
  .where(eq(communityMembers.userId, user.id));

  const allComms = await db.query.communities.findMany();
  const joinedNames = joined.map(j => j.name);
  const unjoined = allComms.filter(c => !joinedNames.includes(c.name)).map(c => c.name);

  console.log("Reviewer ID:", user.id);
  console.log("Joined Communities (", joined.length, "):", joinedNames);
  console.log("Unjoined Communities (", unjoined.length, "):", unjoined);
  
  process.exit(0);
}
run().catch(console.error);
