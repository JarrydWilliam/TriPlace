-- SameVibe Post-Test Database Invariants Audit Queries
-- Date: 2026-07-31
-- Requirement: Every query below MUST return 0 rows for a passing release gate.

-- 1. No duplicate Firebase UID users
SELECT firebase_uid, COUNT(*) FROM users GROUP BY firebase_uid HAVING COUNT(*) > 1;

-- 2. No duplicate email users
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- 3. No underage approved users (DOB indicates < 18 years old)
SELECT id, email, date_of_birth FROM users 
WHERE date_of_birth IS NOT NULL 
  AND (CURRENT_DATE - date_of_birth::date) < 6570;

-- 4. No onboarding-completed users with fewer than 3 active communities
SELECT u.id, u.email, COUNT(cm.id) as active_count
FROM users u
LEFT JOIN community_members cm ON u.id = cm.user_id AND cm.is_active = true
WHERE u.onboarding_completed = true
GROUP BY u.id, u.email
HAVING COUNT(cm.id) < 3;

-- 5. No duplicate canonical community keys
SELECT canonical_key, COUNT(*) FROM communities
WHERE canonical_key IS NOT NULL
GROUP BY canonical_key HAVING COUNT(*) > 1;

-- 6. No duplicate user/community memberships
SELECT user_id, community_id, COUNT(*) FROM community_members
GROUP BY user_id, community_id HAVING COUNT(*) > 1;

-- 7. No user with more than 5 active communities
SELECT user_id, COUNT(*) as active_count FROM community_members
WHERE is_active = true
GROUP BY user_id HAVING COUNT(*) > 5;

-- 8. No duplicate user/event RSVP rows
SELECT user_id, event_id, COUNT(*) FROM event_attendees
GROUP BY user_id, event_id HAVING COUNT(*) > 1;

-- 9. No duplicate user/event reviews
SELECT user_id, event_id, COUNT(*) FROM event_reviews
GROUP BY user_id, event_id HAVING COUNT(*) > 1;

-- 10. No reviews submitted without an event_attendees record
SELECT r.id, r.user_id, r.event_id FROM event_reviews r
LEFT JOIN event_attendees ea ON r.user_id = ea.user_id AND r.event_id = ea.event_id
WHERE ea.id IS NULL OR ea.status != 'attended';

-- 11. No exact personal coordinates in canonical keys
SELECT id, name, canonical_key FROM communities
WHERE canonical_key ~ '[0-9]+\.[0-9]{4,}';
