# Agent Handoff & Project Context

*Note to AI Agent: When starting a new session or running on a new machine, read this document to understand the project's current state, recent fixes, and immediate priorities.*

## Project Overview
**Name**: SameVibe (formerly TriPlace)
**Description**: A community-building app that uses AI and behavioral learning to match users into dynamic, interest-based local communities.
**Stack**:
- **Frontend**: React (Vite), Wouter, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, Drizzle ORM, Neon Postgres (Production), Vercel
- **Mobile**: Capacitor (iOS/Android native wrapper)

## Current Status (As of June 30, 2026)

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
4. **UI & Mobile Permissions Polish**:
   - Added a toast notification for quiz selection limits to prevent silent failures.
   - Fixed location permissions on native mobile by implementing `@capacitor/geolocation` in `use-geolocation.ts`, forcing the native iOS OS-level permission prompt during onboarding.
5. **Responsive Sizing & Cold Start Matching**:
   - Overhauled Tailwind config to use `100dvh` for `h-screen` and `min-h-screen` classes to fix mobile browser sizing issues where the bottom of the app was cut off.
   - Fixed the AI Matching engine so that if the strict 70% compatibility threshold leaves the first user with 0 community recommendations, it falls back to serving their top 3 highest-scoring communities.

## Architecture Notes
- **AI Matching Engine (`server/ai-matching.ts`)**: Uses an LLM (OpenAI) to generate exactly 3 communities based on aggregate user behavior. Enforces generic names to prevent duplicate geographic communities.
- **Behavioral Learner (`server/agent/interest-learner.ts`)**: An algorithmic agent that runs silently, dynamically weighting user actions (RSVPs, Kudos, Reviews) with a time decay to build a true "Identity Vector" rather than relying purely on what users say they like.
- **Match Optimizer (`server/agent/match-optimizer.ts`)**: An algorithmic agent that calculates a 0-100 "Match Force" score between users based on explicit quiz answers and inferred behavioral tags.

## Immediate Next Steps
1. Wait for Vercel production deployment of recent fixes.
2. Build the iOS app and push to TestFlight.
3. Test the native app to verify that Google/Apple sign-ins instantly route to the Dashboard/Communities.
4. Verify the native iOS location permission prompt triggers correctly during the quiz.

---
*Keep this document updated whenever major milestones are completed or architecture changes are made to ensure seamless cross-machine context.*
