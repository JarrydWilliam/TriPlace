-- SameVibe Security Hardening Migration
-- Date: 2026-07-31
-- Audit findings: F12 (duplicate community memberships) and F13 (duplicate event RSVP/attendance rows)
--
-- These constraints enforce idempotency at the database layer.
-- The application layer already uses onConflictDoUpdate; these are a belt-and-suspenders defence.
--
-- Safe to run multiple times (CREATE UNIQUE INDEX IF NOT EXISTS).

-- F12: Prevent duplicate (userId, communityId) rows in community_members
CREATE UNIQUE INDEX IF NOT EXISTS cm_user_community_unique
  ON community_members (user_id, community_id);

-- F13: Prevent duplicate (userId, eventId) rows in event_attendees
-- This also ensures RSVP status changes update the existing row rather than creating a new one.
CREATE UNIQUE INDEX IF NOT EXISTS ea_user_event_unique
  ON event_attendees (user_id, event_id);
