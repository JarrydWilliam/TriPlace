# SameVibe - Agent Handoff

## Current Status (August 7, 2026)
**Active Branch**: `Jarryd` (Remote HEAD SHA `3a78ae2` — Pushed to `origin/Jarryd` and `origin/main`)  
**Application Release Version**: `1.0.5` (Codemagic & TestFlight target)  
**Application Release Candidate Tag**: `samevibe-rc-3a78ae2`  
**Executive Status**: 🟢 **COMPLETE END-TO-END EVENT GEOLOCATION OVERHAUL & BUG FIXES IMPLEMENTED AND PUSHED. STRICT 50-MILE RADIUS ENFORCED ACROSS SCRAPERS, FILTERS, STORAGE, ROUTES, AND CLIENT UI.**

---

## Monetization & Entitlement Webhook Authority (2026-07-31)
1. **Free Account**: 3 active community slots.
2. **Paid Entitlement**: Expands active allowance up to 5 slots.
3. **Absolute Ceiling**: 5 active communities.
4. **Free Replacement**: Free user at 3 slots can swap/replace one of their 3 communities for free without paying (`isReplacement: true`).
5. **Entitlement Protection**: Free user attempting to add a 4th slot without payment or swap is rejected by server with `HTTP 402 Payment Required` (`code: 'ENTITLEMENT_REQUIRED'`).
6. **Deliberate 6th Community Replacement**: Joining a 6th community returns `HTTP 409 Conflict` (`code: 'COMMUNITY_LIMIT_REACHED'`) with the candidate active community list, requiring explicit user confirmation (`replaceCommunityId`) rather than silently dropping a community.
7. **Expired Subscription Downgrade Policy**: When a user's subscription expires while holding >3 communities, attempting a new join returns `HTTP 403 Forbidden` (`code: 'COMMUNITY_DOWNGRADE_REQUIRED'`) with their active community list. Existing communities remain readable; joining requires deactivating back to 3 or renewing.
8. **RevenueCat Webhook Authority (`POST /api/revenuecat/webhook`)**:
   - Signature/Auth header verification (`REVENUECAT_WEBHOOK_SECRET`)
   - Replay protection via DB-level unique constraint on `slot_grants.txn_key`
   - Lifecycle handlers (`INITIAL_PURCHASE` / `RENEWAL` -> active/5 slots; `CANCELLATION` / `EXPIRATION` -> expired/3 slots)
   - Client signup/profile routes strictly strip entitlement fields. Client-supplied flags have zero authority.

---

## DB Migrations Verified on Neon Production Database

The following migrations have been successfully executed against Neon PostgreSQL:

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

## Event Geolocation Pipeline & Radius Confinement (2026-08-07 Overhaul)

All 7 identified event leakage vectors have been systematically resolved:

1. **Scraper Precision**: `TicketmasterScraper`, `EventbriteScraper`, and `SeatGeekScraper` now query using exact `latitude` and `longitude` parameters rather than city-name string lookups.
2. **Orchestrator Coordination**: `EventScraperOrchestrator` passes live user GPS coordinates directly down to all scraper modules.
3. **Distance Filter Integrity**: `CommunityMatcher.filterByLocation` and `calculateEventDistance` check venue coordinates as primary distance sources and removed city-name string bypasses.
4. **City Coordinate Resolution**: `storage.ts` includes `resolveEventCoords` with Utah and national city coordinate lookups so events with location text (e.g. *"Salt Lake City, UT"*, *"Ogden, UT"*) but missing DB lat/lng columns are properly mapped to coordinates.
5. **Storage Fallback Protection**: `storage.getEventsByLocation` and `storage.getUpcomingEvents` return empty array `[]` on missing/invalid user coordinates, preventing global event leakage.
6. **Route-Level Geo Enforcement**: `GET /api/events`, `GET /api/communities/:id/events`, and `GET /api/communities/:id/scraped-events` extract user location/radius and filter results strictly to within 50 miles.
7. **UI Cleanliness**: Removed hardcoded Central Park (New York) and SOHO (New York) fallback cards from `dashboard.tsx` when `trendingEvents` is empty, replacing them with a local empty state. Fixed `use-geolocation.ts` hook dependency array to include `[userId]`.

---

## Founder Decision — Reviewer Account (2026-07-31, LOCKED)

**The reviewer/developer account (`samevibe.review@gmail.com`) is a normal live user. It receives no special treatment in production code.**

- No automatic community joins on any read or login event
- No protected memberships, fixed slots, or fallback content
- No bypasses around onboarding, auth, age eligibility, or community limits
- The account may have 0–5 communities based on real manual actions
- Developer QA reset is only possible via explicit admin scripts (`scripts/join-reviewer-communities.ts`, guarded by `NODE_ENV !== 'production'` check)
- Production cannot invoke the reset scripts through any live user flow

---

## Founder Decision Lock: Monetization Model
1. **Core Social Experience**: 100% Free (Community/event discovery, joining base 3 communities per month, creating activities, group chat, RSVP, reporting/blocking/safety).
2. **3 Free Monthly Active Communities**: Regular users get 3 free active community slots per month to focus their feed on their true top communities without noise.
3. **$0.99 / Month Community Slot Expansion**: Users can purchase +1 extra active community slot per month ($0.99/mo) up to a maximum total of 5 active communities.
4. **$4.99 / Month Organizer Promotion Subscription**: Recurring subscription for event organizers/hosts to promote eligible local events, receive a verified organizer profile badge, enhanced placement, and analytics. Promoted events are clearly labeled and quality-controlled.

---

## Branch Details
- **Active Branch**: `Jarryd` (pushed to `origin/Jarryd` and `origin/main`, commit `3a78ae2`)
- **Version**: `1.0.5`
- **Primary Focus**: Strict 50-mile geolocation confinement, security hardening, database unique constraints, RevenueCat entitlement authority.

---

## Reviewer Accounts
| Account | Email | Password | Purpose |
|---|---|---|---|
| Populated | `samevibe.review@gmail.com` | `SameVibe2024!` | Primary Apple review account |
| New user | `samevibe.newreview@gmail.com` | `SameVibe2024!` | New user onboarding flow |

---

## Next Steps
1. **Trigger Codemagic Build**:
   - Build version `1.0.5` targeting TestFlight.
2. **TestFlight Verification**:
   - Verify on device in Sunset/Utah area that upcoming events show local Utah events (*Salt Lake AI & Tech Gathering*) and do not display out-of-state/New York/San Francisco cards.
3. **Post-Release Hardening Roadmap**:
   - **Key Rotation**: Periodically rotate third-party API keys in developer dashboards.
   - **Avatar File Upload**: Transition avatar storage from raw Base64 strings to Firebase Storage URLs.
