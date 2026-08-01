import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('FAIL: DATABASE_URL missing');
    process.exit(1);
  }

  console.log('Applying DB Migrations 001 & 002 and performing historical cleanup...');
  const sql = neon(dbUrl);

  // 1. Add canonical_key and is_developing columns to communities
  console.log('Adding canonical_key and is_developing to communities...');
  await sql`
    ALTER TABLE communities
      ADD COLUMN IF NOT EXISTS canonical_key text,
      ADD COLUMN IF NOT EXISTS is_developing boolean NOT NULL DEFAULT false;
  `;

  console.log('Ensuring event columns and seed events exist...');
  await sql`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS source_url text,
      ADD COLUMN IF NOT EXISTS source_attribution text,
      ADD COLUMN IF NOT EXISTS source_name text,
      ADD COLUMN IF NOT EXISTS external_id text,
      ADD COLUMN IF NOT EXISTS last_scraped_at timestamp with time zone DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
  `;

  await sql`
    INSERT INTO events (id, title, description, organizer, date, location, address, category, created_at)
    VALUES (1, 'Salt Lake AI & Tech Gathering', 'Weekly community gathering for tech enthusiasts', 'SameVibe Community', NOW() + INTERVAL '7 days', 'Salt Lake City, UT', 'Main St & 200 S', 'ai-tech', NOW())
    ON CONFLICT (id) DO NOTHING;
  `;

  // 2. Clean up historical over-limit active community memberships (>5 for paid, >3 for free)
  console.log('Cleaning up historical over-limit active community memberships (>3 for free, >5 for paid)...');
  await sql`
    WITH RankedMemberships AS (
      SELECT cm.id, cm.user_id,
             u.payment_tier, u.subscription_status,
             ROW_NUMBER() OVER (PARTITION BY cm.user_id ORDER BY cm.joined_at DESC) as rank
      FROM community_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.is_active = true
    )
    UPDATE community_members
    SET is_active = false
    WHERE id IN (
      SELECT id FROM RankedMemberships 
      WHERE (COALESCE(subscription_status, 'inactive') NOT IN ('active', 'trialing') 
             AND COALESCE(payment_tier, 0) = 0 AND rank > 3)
         OR (rank > CASE WHEN COALESCE(subscription_status, 'inactive') IN ('active', 'trialing') THEN 5 ELSE LEAST(5, 3 + COALESCE(payment_tier, 0)) END)
    );
  `;

  // 3. For historical onboarding_completed users with < 3 communities, reset onboarding_completed to false so they get clean 3-community onboarding
  console.log('Resetting onboarding_completed for historical users with < 3 communities...');
  await sql`
    UPDATE users
    SET onboarding_completed = false
    WHERE id IN (
      SELECT u.id
      FROM users u
      LEFT JOIN community_members cm ON u.id = cm.user_id AND cm.is_active = true
      WHERE u.onboarding_completed = true
      GROUP BY u.id
      HAVING COUNT(cm.id) < 3
    );
  `;

  // 4. Create unique indexes
  console.log('Creating unique indexes...');
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cm_user_community_unique
      ON community_members (user_id, community_id);
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ea_user_event_unique
      ON event_attendees (user_id, event_id);
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS communities_canonical_key_unique
      ON communities (canonical_key)
      WHERE canonical_key IS NOT NULL;
  `;

  console.log('Ensuring slot_grants table exists...');
  await sql`
    CREATE TABLE IF NOT EXISTS slot_grants (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      txn_key TEXT NOT NULL,
      product_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS slot_grants_txn_key_unique
      ON slot_grants (txn_key);
  `;

  console.log('Cleaning up synthetic load test users...');
  await sql`DELETE FROM community_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@staging.samevibe.internal%')`;
  await sql`DELETE FROM users WHERE email LIKE '%@staging.samevibe.internal%'`;

  console.log('✅ Migrations and historical cleanup completed successfully!');
}

run().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
