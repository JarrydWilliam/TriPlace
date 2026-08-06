-- SameVibe — Shared Canonical Community Model
-- Date: 2026-07-31
-- Founder decision: every user starts with 3 AI-matched communities.
-- Communities are shared: User A and User B with matching interests in the same
-- area join the SAME community, not separate copies.
--
-- canonical_key is the dedup identity: "{market}|{category}|{interest}"
-- e.g. "ogden-ut|outdoor|mountain-biking"
-- A unique partial index prevents duplicate AI-seeded communities even under
-- concurrent onboarding load.
--
-- is_developing is the honest "new community" flag for the UI.
-- It is set to true when the AI creates the community and set to false
-- once a real user-generated post or event exists.
--
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS canonical_key  text,
  ADD COLUMN IF NOT EXISTS is_developing  boolean NOT NULL DEFAULT false;

-- Partial unique index: only enforced for AI-seeded rows (canonical_key IS NOT NULL).
-- Manually-created communities with canonical_key = NULL are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS communities_canonical_key_unique
  ON communities (canonical_key)
  WHERE canonical_key IS NOT NULL;
