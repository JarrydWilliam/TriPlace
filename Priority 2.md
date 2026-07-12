# SameVibe Production Readiness Audit & Remediation Plan (Post-App Review Roadmap)

## AI Dependency Cleanup
- **Remove Dead Agent Code:** The `openai` dependency has been completely stripped from the production build and `package.json`. However, there are three internal standalone tools in `server/agent/` (`bug-analyzer.ts`, `store-metadata-generator.ts`, `feature-idea-generator.ts`) that were bypassed but not deleted to avoid expanding the scope of the App Store Review sprint. These files (and potentially the entire `server/agent/` folder) should be deleted.

The initial parallel audit encountered rate-limit interruptions, but successfully identified 45 frontend-related issues across Critical, High, Medium, and Low severities. 

I will systematically fix the identified issues and complete the remaining audits for the backend and components to deliver a true production-ready app.

## Proposed Changes

### Phase 1: Critical Bug Remediation
These bugs break the app or result in data loss.
- **[MODIFY] [admin/metrics.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/admin/metrics.tsx):** Change raw `/api/admin/metrics` fetch to use `getApiUrl()` to fix native Capacitor networking.
- **[MODIFY] [discover.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/discover.tsx):** Add missing `Compass` import (already completed).
- **[MODIFY] [settings/*.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/settings):** Update `notifications.tsx`, `profile.tsx`, and `community.tsx` to actually persist changes to the backend via `apiRequest` instead of just showing a success toast.
- **[MODIFY] [profile-setup.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/profile-setup.tsx):** Remove base64 data URI storage for avatars. Implement proper file upload or disable it safely with a coming soon message to prevent DB bloat/crashes.
- **[MODIFY] [community.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/community.tsx):** Fix optimistic message deduplication logic and remove redundant `!response.ok` check.

### Phase 2: High/Medium UX & Navigation Remediation
These bugs severely impact user experience and navigation flow.
- **[MODIFY] [dashboard.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/dashboard.tsx):** Add debounce to `autoPopulateEvents` to prevent spamming the backend. Remove or implement the empty "Local Kudos Leaders" and "Send messages" challenge widgets.
- **[MODIFY] [communities.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/communities.tsx):** Remove the hardcoded 3-city location lookup table and use the actual location name. Fix category icon string matching logic.
- **[MODIFY] [App.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/App.tsx):** Move the admin check from purely client-side routing to properly rely on an API verification, or hide the route completely from non-admins.
- **[MODIFY] [settings/support.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/settings/support.tsx):** Fix dead links for Guidelines, Privacy, Terms, Safety, and Star Rating widgets.
- **[MODIFY] [profile.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/profile.tsx) & [community.tsx](file:///Users/jarrydburke/Desktop/TriPlace/client/src/pages/community.tsx):** Ensure proper bottom padding (`pb-24`) and restore `<MobileNav />` where users get stranded.

### Phase 3: Backend Security & API Hardening
The subagent audit discovered multiple critical security vulnerabilities that must be fixed before launch. I will:
1. **Remove Exposed Secrets:** Delete `.env` containing live OpenAI, Groq, and Neon DB credentials from git history (recommend rotating keys immediately), and remove Vercel OIDC tokens from `.env.production` / `.env.local`.
2. **Implement Real Authentication:** 
   - Add Firebase Admin SDK (`firebase-admin`) to the backend.
   - Create a `requireAuth` middleware that calls `verifyIdToken()` on the `Authorization: Bearer <token>` header.
   - Apply `requireAuth` to all state-mutating endpoints (`POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `POST /api/messages`, `POST /api/events/:id/register`, etc.).
3. **Secure Admin Routes:** Update the `requireAdmin` middleware to check against a real `process.env.ADMIN_SECRET_KEY` instead of accepting any truthy header, and apply it strictly to telemetry, scraping, and admin functions.
4. **Remove Test/Fake Routes in Prod:** Delete `GET /api/communities/seed` and `POST /api/communities/:id/populate-sample-events` which currently allow unauthenticated callers to inject fake data with hardcoded passwords into the production database.
5. **Secure Agent Endpoints:** Auth-gate all AI/agent endpoints (`/api/agent/run/:userId`, `/api/agents/features/run`, `/api/auto-populate-events`, etc.) to prevent unauthenticated token burning.
6. **Fix RevenueCat Verification:** Ensure `POST /api/checkout/verify-revenuecat` securely validates the receipt instead of trusting client-provided payment tiers.
7. **Fix CORS & Geocoding:** Restrict CORS in `vercel.json` from `*` to the production domain, and add an `AbortController` timeout to the BigDataCloud geocoding fetch in `ai-matching.ts`.

## User Review Required

> [!CAUTION]  
> **LIVE SECRETS EXPOSED:** Your `.env` file containing live OpenAI, Groq, and Neon DB credentials has been tracked in git. You **must rotate these keys immediately** in your external dashboards (OpenAI, Neon). I will delete the `.env` file from git tracking, but the historical commits are compromised.

> [!WARNING]  
> **Firebase Admin Setup:** To implement real backend authentication (preventing any user from deleting or modifying other users' accounts), I need to add `firebase-admin`. You will need to generate a Firebase Admin Service Account JSON key from your Firebase Console and set it as `FIREBASE_SERVICE_ACCOUNT` in your Vercel environment variables. **Do you approve adding Firebase Admin middleware?**

> [!IMPORTANT]  
> **Avatar Uploads:** The app currently attempts to save avatar photos as raw Base64 strings directly into the database. This will quickly exceed database limits and slow down the app. Do you want me to (A) implement a proper cloud storage upload (e.g., Firebase Storage) or (B) temporarily disable custom photo uploads and use initials/default avatars for launch?

> [!IMPORTANT]  
> **Fake AI Data:** The `reveal.tsx` page hardcodes a "94% Match" score. Do you want this wired up to a real calculation based on user interests, or temporarily hidden until the AI matching system is fully built?

## Verification Plan

### Manual Verification
After all phases are complete, I will generate a final **SameVibe Production Readiness Score (0-100)** broken down by UX, Performance, App Store Readiness, Security, and Accessibility, listing all remaining launch blockers (if any).
