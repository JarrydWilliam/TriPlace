# Developer Notes & Project Context

*Note: This document tracks the project's current state, recent fixes, and immediate priorities across different development environments.*

## Project Overview
**Name**: SameVibe (formerly TriPlace)
**Description**: A community-building app that uses AI and behavioral learning to match users into dynamic, interest-based local communities.
**Stack**:
- **Frontend**: React (Vite), Wouter, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, Drizzle ORM, Neon Postgres (Production), Vercel
- **Mobile**: Capacitor (iOS/Android native wrapper)

## Current Status (As of July 2, 2026)

### Recently Completed Milestones
1. **iOS Native Login Loop Resolved**: 
   - Fixed a silent backend crash on iOS by routing the native network wrapper to the healthy `samevibe-sandy.vercel.app` endpoint instead of the broken `tri-place` deployment. 
   - Added a robust error boundary to the authentication context so backend outages display visible UI errors instead of causing infinite loading screens.
2. **AI Community Generation Verified & Fixed**: 
   - Solved the "Cold Start / No Communities" bug. The production database is now seeded with sample users. 
   - Fixed a frontend API query bug on the `/reveal` screen where the User ID wasn't being passed to the recommendations endpoint, causing users to see 0 communities even after they were successfully generated in the backend.
3. **Monetization Architecture Overhaul (App Store Compliance)**:
   - Completely ripped out Stripe, as it violates Apple's App Store Review Guideline 3.1.1 for selling digital goods.
   - Implemented native `RevenueCat` (via `@revenuecat/purchases-capacitor`) for Apple In-App Purchases and Google Play Billing.
   - Created a new secure backend route (`/api/checkout/verify-revenuecat`) to handle unlocking community slots upon successful StoreKit transactions.
   - Downgraded `@revenuecat/purchases-capacitor` to v9 to match the project's Capacitor 6 dependency.
4. **Full Production Polish Pass**:
   - Replaced the dev-facing 404 page ("Did you forget to add the page to the router?") with a fully branded, animated SameVibe 404 experience.
   - Fixed old "TriPlace" branding in the paywall modal → now says "SameVibe".
   - Fixed mobile viewport on `/reveal` screen using `100dvh` so content is never cut off on iOS Safari.
   - Upgraded all empty states (Dashboard, Discover, Communities) to use premium glassmorphic cards.
   - Added App Store mandatory "Zero Tolerance" clause to the Terms of Service.
   - Moved the RevenueCat API key to `VITE_REVENUECAT_API_KEY` env var (with test key as fallback).
5. **Responsive Sizing & Cold Start Matching**:
   - Overhauled Tailwind config to use `100dvh` for `h-screen` and `min-h-screen` classes.
   - Fixed the AI Matching engine cold-start fallback to serve top-3 communities if threshold returns 0 results.
6. **Security Hardening (Pre-Launch Deep Dive)**:
   - Gated `/api/communities/seed` behind `requireAdmin` middleware — was previously open to the public internet.
   - Gated `/api/test-openai` behind `requireAdmin` middleware — was previously callable by anyone.
   - Error boundary now hides internal stack traces in production (`import.meta.env.DEV` guard) to prevent leaking code structure.
   - `@revenuecat/purchases-capacitor` kept at v9 for Capacitor 6 compatibility — upgrade to v10 when Capacitor is bumped to v7.
7. **Critical Mobile Bug Fixes**:
   - **Scrolling fixed**: Added explicit `overflow-y: auto` and `height: 100%` to `html` in `index.css`. Fixed `GlobalScrollWrapper` to use inline styles (bypassing Tailwind purge) and set `overflowY: 'auto'` on both `documentElement` and `body`. Removed `overflow-hidden` from `reveal.tsx` root which was trapping scroll.
   - **Real logo on loading screen**: The loading state in `App.tsx` was showing a placeholder dollar-sign SVG. Replaced with the actual `/logo.png` asset inside the pulsing ring animation.
   - **First user cold-start**: Fixed `findCompatibleExistingCommunities` in `storage.ts` — communities with 0 total members are now always location-compatible (previously excluded if they had a non-"Virtual" location string, which blocked all seeded communities). Added emergency fallback in `getRecommendedCommunities` to return all active communities if `generateDynamicCommunities` returns nothing.
8. **Production Launch Audit & Remediation (July 2-3, 2026)**:
   - **Backend Route Hardening**: Completely rebuilt `requireAdmin` to enforce a strict `ADMIN_SECRET_KEY` environment check. Gated all heavy compute endpoints (e.g., AI refresh, event population, web scraping). Fixed broken SQL `OR` filters in global events endpoint.
   - **CORS Restricted**: Locked down `vercel.json` wildcard CORS (`*`) to only allow `https://samevibe.app`.
   - **App Store/Play Console Compliance**: Rebuilt the `security.tsx` page to remove the fake 2FA mock (violates "no placeholder UI" rules). Hooked up genuine active sign-in provider status via Firebase. Updated Account Deletion URLs to match production domain.
   - **Environment Secrets Guarded**: Cleaned `cert_key.pem` out of git history. Updated `.env.example` with strict instructions on required secrets (RevenueCat, Admin, Database, Firebase).
   - **Native API Routing**: Unified all raw `fetch()` calls in the frontend to correctly use `getApiUrl()` (resolving native iOS/Android CORS network failures), and deleted the conflicting `window.fetch` override in `main.tsx`.

## Architecture Notes
- **AI Matching Engine (`server/ai-matching.ts`)**: Uses an LLM (OpenAI) to generate exactly 3 communities based on aggregate user behavior. Enforces generic names to prevent duplicate geographic communities.
- **Behavioral Learner (`server/agent/interest-learner.ts`)**: An algorithmic agent that runs silently, dynamically weighting user actions (RSVPs, Kudos, Reviews) with a time decay to build a true "Identity Vector" rather than relying purely on what users say they like.
- **Match Optimizer (`server/agent/match-optimizer.ts`)**: An algorithmic agent that calculates a 0-100 "Match Force" score between users based on explicit quiz answers and inferred behavioral tags.

## Immediate Next Steps
1. Add `VITE_REVENUECAT_API_KEY`, `ADMIN_SECRET_KEY`, and `VITE_ADMIN_EMAIL` to Vercel environment variables (Settings → Environment Variables).
2. Build the iOS app in Xcode and push to TestFlight.
3. Test native app on a physical iPhone: verify Apple Sign-In, GPS permission prompt, and Apple IAP sheet all trigger correctly.

---
*Keep this document updated whenever major milestones are completed or architecture changes are made to ensure seamless cross-machine context.*
