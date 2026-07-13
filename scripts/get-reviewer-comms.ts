import { db } from '../server/db.js';
import { users, communities, communityMembers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });
  if (!user) {
    console.log('No user');
    return;
  }
  const members = await db.query.communityMembers.findMany({
    where: eq(communityMembers.userId, user.id)
  });
  for (const m of members) {
    const comm = await db.query.communities.findFirst({
      where: eq(communities.id, m.communityId)
    });
    console.log(comm.id, comm.name);
  }
  process.exit(0);
}
run();
