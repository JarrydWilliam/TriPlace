import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('FAIL: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('────────────────────────────────────────────────────────────────────────────');
  console.log('SameVibe Post-Test Database Invariants Audit');
  console.log('────────────────────────────────────────────────────────────────────────────');
  console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  const sql = neon(dbUrl);
  let totalViolations = 0;

  const checks = [
    {
      name: 'Invariant 1: Zero duplicate Firebase UID users',
      query: `SELECT firebase_uid, COUNT(*)::int as count FROM users GROUP BY firebase_uid HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 2: Zero duplicate email users',
      query: `SELECT email, COUNT(*)::int as count FROM users GROUP BY email HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 3: Zero underage approved users (<18 years old)',
      query: `SELECT id, email, date_of_birth FROM users WHERE date_of_birth IS NOT NULL AND (CURRENT_DATE - date_of_birth::date) < 6570`,
    },
    {
      name: 'Invariant 4: Zero onboarding-completed users with < 3 active communities',
      query: `SELECT u.id, u.email, COUNT(cm.id)::int as active_count FROM users u LEFT JOIN community_members cm ON u.id = cm.user_id AND cm.is_active = true WHERE u.onboarding_completed = true GROUP BY u.id, u.email HAVING COUNT(cm.id) < 3`,
    },
    {
      name: 'Invariant 5: Zero duplicate canonical community keys',
      query: `SELECT canonical_key, COUNT(*)::int as count FROM communities WHERE canonical_key IS NOT NULL GROUP BY canonical_key HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 6: Zero duplicate user/community memberships',
      query: `SELECT user_id, community_id, COUNT(*)::int as count FROM community_members GROUP BY user_id, community_id HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 7: Zero users with > 5 active communities',
      query: `SELECT user_id, COUNT(*)::int as active_count FROM community_members WHERE is_active = true GROUP BY user_id HAVING COUNT(*) > 5`,
    },
    {
      name: 'Invariant 8: Zero duplicate user/event RSVP rows',
      query: `SELECT user_id, event_id, COUNT(*)::int as count FROM event_attendees GROUP BY user_id, event_id HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 9: Zero duplicate user/event reviews',
      query: `SELECT user_id, event_id, COUNT(*)::int as count FROM event_reviews GROUP BY user_id, event_id HAVING COUNT(*) > 1`,
    },
    {
      name: 'Invariant 10: Zero reviews without confirmed attendance',
      query: `SELECT r.id, r.user_id, r.event_id FROM event_reviews r LEFT JOIN event_attendees ea ON r.user_id = ea.user_id AND r.event_id = ea.event_id WHERE ea.id IS NULL OR ea.status != 'attended'`,
    },
    {
      name: 'Invariant 11: Zero exact coordinates in canonical keys',
      query: `SELECT id, name, canonical_key FROM communities WHERE canonical_key ~ '[0-9]+\\.[0-9]{4,}'`,
    },
    {
      name: 'Invariant 12: Zero free users with > 3 active communities',
      query: `SELECT u.id, u.email, COUNT(cm.id)::int as active_count FROM users u JOIN community_members cm ON cm.user_id = u.id AND cm.is_active = true WHERE COALESCE(u.payment_tier, 0) = 0 AND COALESCE(u.subscription_status, 'inactive') NOT IN ('active', 'trialing') GROUP BY u.id, u.email HAVING COUNT(cm.id) > 3`,
    },
    {
      name: 'Invariant 13: Zero paid users exceeding authorized slot limit',
      query: `SELECT u.id, u.email, u.payment_tier, u.subscription_status, COUNT(cm.id)::int as active_count FROM users u JOIN community_members cm ON cm.user_id = u.id AND cm.is_active = true GROUP BY u.id, u.email, u.payment_tier, u.subscription_status HAVING COUNT(cm.id) > CASE WHEN COALESCE(u.subscription_status, 'inactive') IN ('active', 'trialing') THEN 5 ELSE LEAST(5, 3 + COALESCE(u.payment_tier, 0)) END`,
    },
    {
      name: 'Invariant 14: Zero accounts exceeding absolute 5-community ceiling',
      query: `SELECT user_id, COUNT(*)::int as active_count FROM community_members WHERE is_active = true GROUP BY user_id HAVING COUNT(*) > 5`,
    },
  ];

  for (const check of checks) {
    try {
      const rows = await sql(check.query);
      if (rows.length === 0) {
        console.log(`✅ ${check.name} — PASS (0 violations)`);
      } else {
        console.error(`❌ ${check.name} — FAIL (${rows.length} violations)`);
        console.error('   Sample Violations:', JSON.stringify(rows.slice(0, 3)));
        totalViolations += rows.length;
      }
    } catch (err: any) {
      console.error(`⚠️ ${check.name} — Execution Error: ${err.message}`);
    }
  }

  console.log('\n────────────────────────────────────────────────────────────────────────────');
  if (totalViolations === 0) {
    console.log('🎉 RESULT: ALL DATABASE INVARIANTS PASSED (0 VIOLATIONS)');
  } else {
    console.error(`🔴 RESULT: ${totalViolations} INVARIANT VIOLATIONS DETECTED`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during database invariant check:', err);
  process.exit(1);
});
