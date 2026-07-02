# Developer Notes & Project Context

*Note: This document tracks the project's current state, recent fixes, and immediate priorities across different development environments.*

## Project Overview
**Name**: SameVibe (formerly TriPlace)
**Description**: A community-building app that uses AI and behavioral learning to match users into dynamic, interest-based local communities.
**Stack**:
- **Frontend**: React (Vite), Wouter, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, Drizzle ORM, Neon Postgres (Production), Vercel
- **Mobile**: Capacitor (iOS/Android native wrapper)

## Current Status (As of July 1, 2026)

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

## Architecture Notes
- **AI Matching Engine (`server/ai-matching.ts`)**: Uses an LLM (OpenAI) to generate exactly 3 communities based on aggregate user behavior. Enforces generic names to prevent duplicate geographic communities.
- **Behavioral Learner (`server/agent/interest-learner.ts`)**: An algorithmic agent that runs silently, dynamically weighting user actions (RSVPs, Kudos, Reviews) with a time decay to build a true "Identity Vector" rather than relying purely on what users say they like.
- **Match Optimizer (`server/agent/match-optimizer.ts`)**: An algorithmic agent that calculates a 0-100 "Match Force" score between users based on explicit quiz answers and inferred behavioral tags.
- **RevenueCat**: Set via `VITE_REVENUECAT_API_KEY` env var. Currently using test key. Before launching to production, configure a live key in Vercel + Codemagic env vars.

## Immediate Next Steps
1. Add `VITE_REVENUECAT_API_KEY` to Vercel environment variables (Settings → Environment Variables).
2. Build the iOS app in Xcode and push to TestFlight.
3. Test native app on a physical iPhone: verify Apple Sign-In, GPS permission prompt, and Apple IAP sheet all trigger correctly.
4. When ready for launch, swap the RevenueCat test key for the production key.

---
*Keep this document updated whenever major milestones are completed or architecture changes are made to ensure seamless cross-machine context.*
