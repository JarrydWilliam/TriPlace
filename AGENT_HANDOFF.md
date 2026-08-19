# SameVibe - Agent Handoff

## Current Status (August 19, 2026)
**Active Branch**: `Jarryd` (Authoritative SHA: `732e3f3` synced with `main`)  
**Application Release Version**: `1.1.4`  
**Growth Agent Status**: 🟢 **GROWTH AGENT V1 DEPLOYED. FOUNDER DASHBOARD LIVE.**  
**Executive Status**: 🟢 **PRODUCTION VERSION 1.1.4 LIVE ON VERCEL & PUSHED TO GITHUB (`732e3f3`). ADMIN ACCESS GATED STRICTLY TO `support@samevibeapp.com`.**

---

## Authentication & Apple Sign-In Deep Dive (August 19, 2026)

1. **Native iOS Apple Sign-In Entitlement (`App.entitlements`)**:
   - Created [`ios/App/App/App.entitlements`](file:///C:/Users/Greenline/MYSTUFF/TriPlace/ios/App/App/App.entitlements) with native `com.apple.developer.applesignin` capability.
   - Updated Xcode project [`ios/App/App.xcodeproj/project.pbxproj`](file:///C:/Users/Greenline/MYSTUFF/TriPlace/ios/App/App.xcodeproj/project.pbxproj) to link `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;` across both Debug and Release build configurations. This enables native iOS `AuthenticationServices` when compiled into the `.ipa` binary for TestFlight / App Store.
2. **Double-Layer Native-to-Web OAuth Fallback (`client/src/lib/firebase.ts`)**:
   - Native Capacitor SDK detection (`isNativePlatform()`).
   - If native authentication throws or is unconfigured, automatically falls back to `signInWithPopup(auth, appleProvider)`.
   - If browser popup is blocked on mobile browsers, falls back to `signInWithRedirect(auth, appleProvider)`.
   - Exported `appleProvider` at module scope with explicit `email` and `name` scopes.
3. **Login & Signup Page UI/State Resilience (`client/src/pages/login.tsx` & `signup.tsx`)**:
   - Disentangled shared `loading` state into isolated `appleLoading` and `googleLoading`.
   - Rendered error alert banner `(error || authError)` at the **very top of card containers** above social buttons.
   - Added `pointer-events-none` to absolute backdrop glow wrapper to prevent click event hijacking.
   - Added explicit `type="button"`, `cursor-pointer`, and click event logging.
   - Added 30-second `Promise.race` safety timeout to prevent permanent UI freezes if native sheets hang.
4. **Vercel Serverless Function Routing (`vercel.json` & `api/index.ts`)**:
   - Fixed Vercel routing rules in `vercel.json` (`/((?!api/).*)` rewrite to `/index.html`) so Vercel Serverless Functions natively route all `/api/*` requests directly to `api/index.ts` without stripping endpoint sub-paths.
   - Live verified at `https://samevibe-sandy.vercel.app/api/health` returning `{"status":"ok","ts":...,"version":"1.1.4"}`.

---

## Authentication & Master Connector Sentinel (August 19, 2026)

1. **Master Connector & App Sentinel Agent (`server/agent/watchdog/connector-sentinel.ts`)**:
   - Continuous 5-minute automated audit monitoring all 10 core connectors & app flows:
     - Google OAuth JWKS Connector (`https://www.googleapis.com/oauth2/v3/certs`)
     - Apple OAuth JWKS Connector (`https://appleid.apple.com/auth/keys`)
     - Firebase Auth Project & Identity Toolkit Connector
     - PostgreSQL Database Pool & Query Latency
     - Ticketmaster Event Scraper API Connector
     - Eventbrite Event Scraper API Connector
     - SeatGeek Event Scraper API Connector
     - RevenueCat Entitlement Webhook Authority (`POST /api/revenuecat/webhook`)
     - OTA Mobile App Version Pipeline (`/api/app/version`)
     - Core App Feature Pipeline (Communities, Events, Messaging, Telemetry)
   - Exposes real-time connector telemetry at `GET /api/connectors/status`.
2. **Backend Auth Watchdog Agent (`server/agent/watchdog/auth-watchdog.ts`)**:
   - Automated probes monitoring Google & Apple OAuth key rotation and user DB lookup latency.
   - Exposes live health status at `GET /api/health/auth-status`.
3. **Apple Services ID Configuration**:
   - Registered Domains: `samevibe.app,samevibe-sandy.vercel.app,triplace-v2.firebaseapp.com`
   - Return URL: `https://triplace-v2.firebaseapp.com/__/auth/handler` under Apple Developer Services ID `com.samevibe.app.service`.

---

## Monetization & Entitlement Webhook Authority (2026-07-31)
1. **Free Account**: 3 active community slots.
2. **Paid Entitlement**: Expands active allowance up to 5 slots.
3. **Absolute Ceiling**: 5 active communities.
4. **Free Replacement**: Free user at 3 slots can swap/replace one of their 3 communities for free without paying (`isReplacement: true`).
5. **Entitlement Protection**: Free user attempting to add a 4th slot without payment or swap is rejected by server with `HTTP 402 Payment Required` (`code: 'ENTITLEMENT_REQUIRED'`).
6. **Deliberate 6th Community Replacement**: Joining a 6th community returns `HTTP 409 Conflict` (`code: 'COMMUNITY_LIMIT_REACHED'`) with candidate active community list.
7. **RevenueCat Webhook Authority (`POST /api/revenuecat/webhook`)**: Verified via signature headers & unique DB transaction constraint on `slot_grants.txn_key`.

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

---

## Event Geolocation Pipeline & Radius Confinement (2026-08-07 Overhaul)

All 7 identified event leakage vectors have been systematically resolved:

1. **Scraper Precision**: `TicketmasterScraper`, `EventbriteScraper`, and `SeatGeekScraper` query using exact GPS `latitude` and `longitude`.
2. **Orchestrator Coordination**: `EventScraperOrchestrator` passes live user GPS coordinates directly to scraper modules.
3. **Distance Filter Integrity**: `CommunityMatcher.filterByLocation` and `calculateEventDistance` evaluate venue coordinates.
4. **City Coordinate Resolution**: `storage.ts` includes `resolveEventCoords` for missing venue lat/lng mappings.
5. **Storage Fallback Protection**: `storage.getEventsByLocation` returns `[]` on missing coordinates to prevent global leakage.
6. **Route-Level Geo Enforcement**: All event endpoints filter strictly within 50 miles.

---

## Founder Decision — Reviewer Account (2026-07-31, LOCKED)

**The reviewer/developer account (`samevibe.review@gmail.com`) is a normal live user. It receives no special treatment in production code.**

- No automatic community joins on any read or login event
- No protected memberships, fixed slots, or fallback content
- No bypasses around onboarding, auth, age eligibility, or community limits

---

## Founder Decision Lock: Monetization Model
1. **Core Social Experience**: 100% Free.
2. **3 Free Monthly Active Communities**: Free users get 3 active community slots per month.
3. **$0.99 / Month Community Slot Expansion**: +1 extra active community slot ($0.99/mo) up to 5 max.
4. **$4.99 / Month Organizer Promotion Subscription**: Recurring subscription for event organizers/hosts.

---

## Branch & Release Details
- **Active Branch**: `Jarryd` (pushed to `origin/Jarryd` and `origin/main`, commit `732e3f3`)
- **Version**: `1.1.4`
- **Target Domain**: `https://samevibe-sandy.vercel.app`
- **Desktop Archive**: `C:\Users\Greenline\Desktop\SameVibe_v1.1.4_Updated.zip`

---

## Reviewer & Admin Accounts
| Account | Email | Password | Purpose |
|---|---|---|---|
| Founder Admin | `support@samevibeapp.com` | `SameVibe2024!` | Founder & Growth Agent Admin Account |
| Populated | `samevibe.review@gmail.com` | `SameVibe2024!` | Primary Apple review account |
| New user | `samevibe.newreview@gmail.com` | `SameVibe2024!` | New user onboarding flow |

---

## Next Steps
1. **App Store Connect / TestFlight Submission**:
   - Codemagic builds candidate `.ipa` `1.1.4` (Build #178+) with native `App.entitlements`.
   - Submit candidate build `1.1.4` for App Store review on [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. **Google Play Console Status**:
   - Monitor approval status for Android release train `1.1.4`.
