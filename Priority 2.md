# SameVibe Priority 2 — Post-App Review Roadmap

This document contains all findings, technical debt, legacy code, and non-blocking issues discovered during the Production Readiness Audit. None of these items block Apple App Store approval, so they are deferred until **after** the final release.

---

## 1. Security Enhancements & Hardening
*Recommended Order: Immediate (Post-Launch)*

- **Remove Exposed Secrets from Git History:** The `.env` file containing live OpenAI, Groq, and Neon DB credentials was historically tracked. Keys must be rotated in external dashboards and git history scrubbed.
- **Implement Real Authentication (Firebase Admin):** 
  - Add `firebase-admin` to the backend.
  - Create `requireAuth` middleware using `verifyIdToken()` on the `Authorization` header.
  - Apply `requireAuth` to all state-mutating endpoints (`POST /api/users`, `POST /api/messages`, etc.).
- **Secure Admin Routes:** Update `requireAdmin` middleware to check against a real `process.env.ADMIN_SECRET_KEY`.
- **Remove Test/Fake Routes in Prod:** Delete `GET /api/communities/seed` and `POST /api/communities/:id/populate-sample-events`.
- **Secure Agent Endpoints:** Auth-gate all AI/agent endpoints (`/api/agent/run/:userId`, etc.).
- **Fix RevenueCat Verification:** Ensure `POST /api/checkout/verify-revenuecat` securely validates the receipt via server-side Apple/Google API checks.
- **CORS Restrictions:** Restrict CORS in `vercel.json` from `*` to the production domain.

## 2. Database Cleanup & Schema Optimization
*Recommended Order: High*

- **Drop Unused Schema Tables/Columns:**
  - Drop the unused `feature_flags` table entirely.
  - Drop unused monetization columns in `users` (`subscription_status`, `subscription_start`, `subscription_end`).
  - Drop unused columns in `events` (`is_premium`, `is_promoted`, `is_online_fallback`, `affiliate_url`).
- **Clean Up One-Off Migration Scripts:** Delete lingering manual patch scripts (`manual-migrate.js`, `patch-db.ts`, `patch-db-2.ts`) from the root directory as they have already been executed.
- **Fix Avatar Storage (Base64):** Stop saving avatar photos as raw Base64 strings in the database. Migrate to proper cloud storage (e.g., Firebase Storage) to prevent DB bloat.

## 3. Legacy Code & Architecture Cleanup
*Recommended Order: Medium*

- **Delete Root `storage.ts` Duplicate:** An abandoned, broken duplicate of `server/storage.ts` exists in the root directory. Delete it to prevent developer confusion.
- **Delete Unused Shadcn UI Primitives:** Delete unused components in `client/src/components/ui/` (accordion, aspect-ratio, drawer, etc.).
- **Delete Duplicate PWA Checker:** `client/src/components/ui/pwa-update-checker.tsx` conflicts with `app-updater.tsx` and should be removed.
- **Delete Legacy UI/Layout Components:** Remove the unused `client/src/components/ui/sidebar.tsx` (superseded by `layout/sidebar.tsx`) and `location-prompt.tsx`.
- **Clean Up Disconnected Services:** Delete `client/src/lib/deployment-checks.ts` and the unused feature flags config in `production-config.ts`.
- **Remove Server Watchdog:** Delete `scripts/server-watchdog.js` (PM2 or Vercel handles this now).
- **Remove Redundant Endpoints:** Remove `/api/communities/:id/dynamic-members` (duplicated by `dynamic-info`) and `/api/events/feed` (aliased to `upcoming`).
- **Remove Scraper Admin Endpoints:** Delete `/api/web-scrape/*` and `/api/admin/refresh-all-communities` from `server/routes.ts` unless the separate admin dashboard is being actively maintained.

## 4. AI Cleanup
*Recommended Order: Medium*

- **Remove Legacy OpenAI Matching Logic:** OpenAI dependencies were removed from `package.json`, but `server/ai-matching.ts` still contains the branching logic hardcoded to `const llm: any = null`. Safely extract the fallback engine and delete the unreachable AI code.
- **Remove Dead Agent Generators:** Delete the standalone tools in `server/agent/` (`bug-analyzer.ts`, `store-metadata-generator.ts`, `feature-idea-generator.ts`) if they are no longer in use.

## 5. Technical Debt & Performance
*Recommended Order: Low*

- **Replace Raw Fetches for Capacitor:** Change raw fetch calls like `/api/admin/metrics` to use `getApiUrl()` to prevent native iOS WebView networking failures.
- **Optimize Geocoding:** Add an `AbortController` timeout to the BigDataCloud fetch in `ai-matching.ts`.
- **Dashboard Debounce:** Add debounce to `autoPopulateEvents` on the dashboard to prevent backend spamming.

## 6. UX Improvements & Feature Completion
*Recommended Order: Low*

- **Fix Hardcoded City Locations:** Remove the hardcoded 3-city location lookup table in `communities.tsx` and dynamically render the user's actual location name.
- **Fix Category Icon Matching:** Improve category string matching in `communities.tsx`.
- **Persist Settings:** Ensure `notifications.tsx`, `profile.tsx`, and `community.tsx` settings actually persist to the backend rather than just showing a success toast.
- **Fix Dead Links in Settings:** Fix broken Guidelines, Privacy, Terms, Safety, and Star Rating links in `settings/support.tsx`.
- **Fix Bottom Padding / Navigation:** Ensure proper bottom padding (`pb-24`) on `profile.tsx` and `community.tsx` and restore `<MobileNav />` where users get stranded.
- **Fix Duplicate Messages:** Fix optimistic message deduplication logic in `community.tsx`.
- **Clean Up Dashboard Widgets:** Remove or fully implement the empty "Local Kudos Leaders" and "Send messages" challenge widgets.
- **Update Reveal Score:** The `reveal.tsx` page hardcodes a "94% Match" score. Wire this up to a real calculation based on user interests.

## 7. Future Roadmap

- Standardize end-to-end testing (replace the disjointed `verify-*.ts` scripts with Cypress/Playwright).
- Expand push notifications and real-time event updates.
- Re-introduce AI personalization using a lightweight, latency-optimized provider if needed for scaling.
