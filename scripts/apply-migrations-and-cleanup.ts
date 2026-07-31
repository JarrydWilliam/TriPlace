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

  // 2. Clean up historical duplicate/over-limit community memberships for historical test users
  console.log('Cleaning up historical over-limit active community memberships (>5)...');
  // For users with > 5 active communities, keep the 5 most recent
  await sql`
    WITH RankedMemberships AS (
      SELECT id, user_id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at DESC) as rank
      FROM community_members
      WHERE is_active = true
    )
    UPDATE community_members
    SET is_active = false
    WHERE id IN (
      SELECT id FROM RankedMemberships WHERE rank > 5
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

  console.log('✅ Migrations and historical cleanup completed successfully!');
}

run().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
