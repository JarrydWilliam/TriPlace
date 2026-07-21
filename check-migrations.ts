import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations`);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
check();
