import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN discovery_settings jsonb DEFAULT '{"radius":50}'::jsonb`);
    console.log("Successfully added discovery_settings column.");
  } catch (err: any) {
    if (err.message.includes("already exists")) {
       console.log("Column already exists, no action needed.");
    } else {
       console.error("Error applying patch:", err);
    }
  }
  process.exit(0);
}
run().catch(console.error);
