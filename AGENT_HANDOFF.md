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
2. **AI Community Generation Verified**: 
   - Solved the "Cold Start / No Communities" bug. The production database is now seeded with sample users. 
   - The AI accurately analyzes user overlaps, generates dynamic communities, and drops users directly into 3 personalized communities on the cinematic `/reveal` screen after the quiz.
3. **UI & Mobile Permissions Polish**:
   - Added a toast notification for quiz selection limits to prevent silent failures.
   - Fixed location permissions on native mobile by implementing `@capacitor/geolocation` in `use-geolocation.ts`, forcing the native iOS OS-level permission prompt during onboarding.

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
