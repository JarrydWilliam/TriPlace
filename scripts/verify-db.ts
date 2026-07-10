import { db } from '../server/db.js';
import { users, communityMembers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function verify() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });
  if (!user) { console.log('No user'); return; }
  const m = await db.query.communityMembers.findMany({ where: eq(communityMembers.userId, user.id) });
  console.log('Reviewer ID:', user.id);
  console.log('Total Joined:', m.length);
  process.exit(0);
}
verify().catch(console.error);
