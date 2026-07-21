import { config } from 'dotenv';
config();

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.execute(sql`SELECT event_id, user_id, COUNT(*) AS duplicate_count FROM event_attendees GROUP BY event_id, user_id HAVING COUNT(*) > 1`);
  console.log('RESULT:', JSON.stringify(res.rows));
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
