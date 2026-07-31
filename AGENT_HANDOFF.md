# SameVibe - Agent Handoff

## Current Status (July 31, 2026)
**Active Branch**: `Jarryd`  
**Commit SHA**: `6782b0e`  
**Status**: 🎉 **10,000-USER MISSION & STRESS TEST HARDENING COMPLETE** — All 11 post-test database invariants passing with 0 violations on Neon. All automated security & core-loop tests passing. 10,000-user staging stress test harness active with safety guard. Capacitor iOS synced cleanly.

---

## ⚠️ REQUIRED: Run DB Migrations on Neon Before Next Deploy

Run the following against the Neon production database **before next launch** (safe to run multiple times):

```sql
-- Migration 001: Unique constraints on memberships and RSVPs
CREATE UNIQUE INDEX IF NOT EXISTS cm_user_community_unique
  ON community_members (user_id, community_id);

CREATE UNIQUE INDEX IF NOT EXISTS ea_user_event_unique
  ON event_attendees (user_id, event_id);

-- Migration 002: Canonical key and is_developing on communities
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS canonical_key text,
  ADD COLUMN IF NOT EXISTS is_developing boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS communities_canonical_key_unique
  ON communities (canonical_key)
  WHERE canonical_key IS NOT NULL;
```

Files are at: `migrations/001_unique_constraints.sql`, `migrations/002_canonical_community_key.sql`, and `migrations/003_post_test_invariants.sql`

---

## Founder Decision — Reviewer Account (2026-07-31, LOCKED)

**The reviewer/developer account (`samevibe.review@gmail.com`) is now a normal live user. It receives no special treatment in production code.**

- No automatic community joins on any read or login event
- No protected memberships, fixed slots, or fallback content
- No bypasses around onboarding, auth, age eligibility, or community limits
- The account may have 0–5 communities based on real manual actions
- Developer QA reset is only possible via explicit admin scripts (`scripts/join-reviewer-communities.ts`, guarded by `NODE_ENV !== 'production'` check)
- Production cannot invoke the reset scripts through any live user flow

This supersedes all older references to "guaranteed 3 communities for reviewer accounts" in this file.

---

## Founder Decision Lock: Updated Monetization Model
1. **Core Social Experience**: 100% Free (Community/event discovery, joining base 3 communities per month, creating activities, group chat, RSVP, reporting/blocking/safety).
2. **3 Free Monthly Active Communities**: Regular users get 3 free active community slots per month to focus their feed on their true top communities without noise.
3. **$0.99 / Month Community Slot Expansion**: Users can purchase +1 extra active community slot per month ($0.99/mo) up to a maximum total of 5 active communities.
4. **$4.99 / Month Organizer Promotion Subscription**: Recurring subscription for event organizers/hosts to promote eligible local events, receive a verified organizer profile badge, enhanced placement, and analytics. Promoted events are clearly labeled and quality-controlled.

---

## Branch Details
- **Active Branch**: `Jarryd` (pushed to `origin/Jarryd`, commit `d17f87c`)
- **Base Version**: `1.0.3` (Build 114)
- **Primary Focus**: Security hardening — all 19 P0/P1 audit findings fixed. Authentication fails-closed. All write endpoints enforce token-based ownership. Reads never mutate. Community rotation is transactional. DB unique constraints prevent duplicate rows. N+1 event query eliminated. DM endpoints require auth.

---

## Summary of Accomplished Work

### 1. Profile Page Padding & Navigation Clearance
- **Files**: `client/src/pages/profile.tsx`, `client/src/pages/settings/profile.tsx`
- **Changes**:
  - Increased bottom container padding to `pb-48` and added `pb-20` on Save button container.
  - Leaves over 120px of clear space above the floating `MobileNav` bar so no text, controls, or buttons are covered when scrolled down.

### 2. End-to-End Privacy Controls (5 Interactive Switch Toggles)
- **Files**: `client/src/components/ui/switch.tsx`, `client/src/pages/profile.tsx`, `client/src/pages/settings/profile.tsx`, `server/routes.ts`, `server/storage.ts`
- **Changes**:
  - Updated `<Switch>` component track to high-contrast cyan/slate and knob to pure white (`bg-white`) so toggle state is 100% visible on dark mode.
  - Added explicit **ON / OFF** status pill badges next to every toggle switch.
  - Connected all 5 privacy toggles to PostgreSQL `users.discovery_settings` JSONB column.

### 3. Dashboard Information Architecture & Section Clarity
- **Files**: `client/src/pages/dashboard.tsx`, `client/src/pages/communities.tsx`

### 4. ~~Guaranteed 3 Joined Communities for Reviewer Accounts~~ — REMOVED
- **Superseded by Founder Decision 2026-07-31.**
- `getUserActiveCommunities` is now a pure read. It does not auto-join communities.
- Developer QA resets use `scripts/join-reviewer-communities.ts` (admin script only).

### 5. RevenueCat TestFlight Sandbox Fallback & $0.99 Expansion
- **File**: `client/src/components/paywall-modal.tsx`

### 6. Security Hardening — All 19 P0/P1 Audit Findings (2026-07-31)
- **Files**: `server/routes.ts`, `server/storage.ts`, `shared/schema.ts`, `migrations/001_unique_constraints.sql`
- **Changes**:
  - **F1**: `requireAuth` fails-closed (503) when Firebase Admin is absent — previously called `next()`
  - **F2–F11, F17, F19**: 12 write routes now derive acting-user identity from `req.user` (verified auth token), never from request body
  - **F5**: Added server-side "must have RSVP'd to review" eligibility check
  - **F12**: `joinCommunity` uses `onConflictDoUpdate` — idempotent join, no duplicate rows
  - **F13**: `registerForEvent` uses `onConflictDoUpdate` — idempotent RSVP/attendance
  - **F14**: `joinCommunityWithRotation` wrapped in `db.transaction()` with `FOR UPDATE` lock
  - **F15**: `getUserActiveCommunities` is a pure read; no auto-join side effect
  - **F16**: Upcoming events uses `getEventAttendeesForEvents` (2 queries total vs 1 per event)
  - **F18**: DM conversation endpoints now require `requireAuth` + participant ownership check
  - **Schema**: Unique indexes on `(user_id, community_id)` and `(user_id, event_id)`
  - **Scripts**: `join-reviewer-communities.ts` and `seed-reviewer.ts` have `NODE_ENV === 'production'` guard


---

## Summary of Accomplished Work

### 1. Profile Page Padding & Navigation Clearance
- **Files**: `client/src/pages/profile.tsx`, `client/src/pages/settings/profile.tsx`
- **Changes**:
  - Increased bottom container padding to `pb-48` and added `pb-20` on Save button container.
  - Leaves over 120px of clear space above the floating `MobileNav` bar so no text, controls, or buttons are covered when scrolled down.

### 2. End-to-End Privacy Controls (5 Interactive Switch Toggles)
- **Files**: `client/src/components/ui/switch.tsx`, `client/src/pages/profile.tsx`, `client/src/pages/settings/profile.tsx`, `server/routes.ts`, `server/storage.ts`
- **Changes**:
  - Updated `<Switch>` component track to high-contrast cyan/slate and knob to pure white (`bg-white`) so toggle state is 100% visible on dark mode.
  - Added explicit **ON / OFF** status pill badges next to every toggle switch.
  - Connected all 5 privacy toggles (*Show Profile in Discovery*, *Show Location*, *Show Online Activity Status*, *Allow Direct Messaging*, *Show Joined Events*) to PostgreSQL `users.discovery_settings` JSONB column in API requests & state.
  - Enforced privacy settings on backend endpoints (`GET /api/users/:id/events`, `GET /api/communities/:id/members/live`, `GET /api/users/:id`).

### 3. Dashboard Information Architecture & Section Clarity
- **Files**: `client/src/pages/dashboard.tsx`, `client/src/pages/communities.tsx`
- **Changes**:
  - Renamed joined communities section to **"Vibe with My Communities"** (active joined circles).
  - Renamed recommended section to **"Suggested Communities"** (unjoined discovery groups).
  - Renamed top event carousel header to **"Upcoming Group Events"**.
  - Guaranteed 100% of non-joined active communities in the database display under **"Suggested Communities"**.

### 4. Guaranteed 3 Joined Communities for Reviewer Accounts
- **File**: `server/storage.ts`
- **Changes**:
  - Updated `getUserActiveCommunities` so if an account (including Apple Reviewer or test accounts) has fewer than 3 joined communities, the backend automatically auto-populates up to 3 active communities.

### 5. RevenueCat TestFlight Sandbox Fallback & $0.99 Expansion
- **File**: `client/src/components/paywall-modal.tsx`
- **Changes**:
  - Suppressed raw RevenueCat configuration dump popups in TestFlight/Sandbox testing.
  - Added seamless fallback to `/api/checkout/verify-revenuecat` on backend so testing $0.99 expansion slots or $4.99 promotion in TestFlight works smoothly and invalidates active community queries immediately.
  - Rendered explicit **"+ Add Expansion Slot ($0.99/mo)"** card directly inside the **"Vibe with My Communities"** carousel.

---

## Reviewer Accounts
| Account | Email | Password | Purpose |
|---|---|---|---|
| Populated | `samevibe.review@gmail.com` | `SameVibe2024!` | Primary Apple review account |
| New user | `samevibe.newreview@gmail.com` | `SameVibe2024!` | New user onboarding flow |

---

## Next Steps for Working on Another PC
1. **Pull the `Jarryd` Branch**:
   ```bash
   git fetch origin
   git checkout Jarryd
   git pull origin Jarryd
   ```
2. **Verify Local Build**:
   ```bash
   npx.cmd tsc --noEmit
   node node_modules/vite/bin/vite.js build
   ```
3. **Priority 2 Work Roadmap (Post-Approval Hardening)**:
   - **Security**: Rotate API keys (`OPENAI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`) in external dashboards.
   - **Avatar Migration**: Transition avatar storage from raw Base64 strings to Firebase Storage file upload returning download URLs.
   - **Security Settings**: Wire up backend password change endpoints if needed.

---

## Security & Release Guidelines
> **IMPORTANT ARCHITECTURE & SAFETY RULE**:
> Never zip and share a project folder without first checking for `.env` files and certificates. The `.env` should only ever live locally and in your deployment platform's secrets manager (Vercel env vars, Codemagic secrets).

