import { db } from '../server/db.js';
import { users, communityMembers } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function run() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  const memberships = await db.query.communityMembers.findMany({
    where: eq(communityMembers.userId, user.id)
  });
  
  console.log('Reviewer ID:', user.id);
  console.log('Current memberships count:', memberships.length);
  
  if (memberships.length > 5) {
    // Keep first 5, delete the rest
    const toKeep = memberships.slice(0, 5).map(m => m.communityId);
    const toDelete = memberships.slice(5).map(m => m.communityId);
    
    console.log('Keeping communities:', toKeep);
    console.log('Deleting communities:', toDelete);
    
    for (const cid of toDelete) {
      await db.delete(communityMembers)
        .where(
          and(
            eq(communityMembers.userId, user.id),
            eq(communityMembers.communityId, cid)
          )
        );
    }
    console.log('Successfully removed extra communities.');
  } else {
    console.log('Reviewer already has 5 or fewer communities.');
  }
  process.exit(0);
}

run().catch(console.error);
