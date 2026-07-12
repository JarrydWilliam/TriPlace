import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const userResult = await db.execute(sql`SELECT id FROM users WHERE email = 'samevibe.review@gmail.com' LIMIT 1`);
  if (!userResult.rows || userResult.rows.length === 0) {
     console.log('User not found');
     process.exit(1);
  }
  const userId = userResult.rows[0].id;
  
  const memberships = await db.execute(sql`SELECT community_id FROM community_members WHERE user_id = ${userId}`);
  
  console.log('Reviewer ID:', userId);
  console.log('Current memberships count:', memberships.rows.length);
  
  if (memberships.rows.length > 5) {
    const toDelete = memberships.rows.slice(5).map(r => r.community_id);
    for (const cid of toDelete) {
       await db.execute(sql`DELETE FROM community_members WHERE user_id = ${userId} AND community_id = ${cid}`);
    }
    console.log('Successfully removed extra communities.');
  } else {
    console.log('Reviewer already has 5 or fewer communities.');
  }
  process.exit(0);
}

run().catch(console.error);
