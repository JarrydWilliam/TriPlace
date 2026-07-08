import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Adding columns to events table...");
  try {
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_promoted boolean DEFAULT false`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_online_fallback boolean DEFAULT false`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS affiliate_url text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS source_url text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS source_attribution text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS source_name text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS last_scraped_at timestamp DEFAULT now()`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at timestamp`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'`;
    console.log("Done.");
  } catch (e) {
    console.error(e);
  }
}
run();
