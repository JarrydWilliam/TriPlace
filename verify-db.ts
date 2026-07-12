import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  const userResult = await db.execute(sql`SELECT id, email FROM users WHERE email = 'samevibe.review@gmail.com' LIMIT 1`);
  const userId = userResult.rows[0].id;

  const totalComm = await db.execute(sql`SELECT count(*) as count FROM communities`);
  console.log(`Total communities in DB: ${totalComm.rows[0].count}`);

  const joined = await db.execute(sql`
    SELECT c.id, c.name, c.category 
    FROM communities c 
    JOIN community_members cm ON c.id = cm.community_id 
    WHERE cm.user_id = ${userId}
  `);
  console.log(`Reviewer joined communities (${joined.rows.length}):`);
  joined.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.name}, Category: ${r.category}`));

  const notJoined = await db.execute(sql`
    SELECT c.id, c.name, c.category 
    FROM communities c 
    WHERE c.id NOT IN (SELECT community_id FROM community_members WHERE user_id = ${userId})
    LIMIT 5
  `);
  console.log(`\nSample of 'New Communities' (Not Joined):`);
  notJoined.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.name}, Category: ${r.category}`));
  
  process.exit(0);
}
run().catch(console.error);
