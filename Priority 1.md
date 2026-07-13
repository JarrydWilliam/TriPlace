# Priority 1: Apple App Review Readiness

## Current Status
`CONDITIONALLY READY — TestFlight reviewer validation remains`

## Release Candidate Details
- **Mobile Application Source Commit:** (Latest frozen commit pushed to main)
- **App Version (Marketing):** 1.0.3
- **Build Number:** Controlled natively by Codemagic pipeline (`$BUILD_NUMBER`)
- **Production Backend Deployment Commit:** Syncs automatically to Vercel production branch
- **Production Database Reviewer-Data:** Perfect (5 realistic events mapped to 5 approved communities)

## Completed Checks
- [x] Run TypeScript checks (passed)
- [x] Run the production build (completed successfully)
- [x] Validate the join and rotation API behavior logic (Read-only verified earlier)
- [x] Confirm no stale `3 + userTier` limit remains in the active production flow (Audited and confirmed removed)
- [x] Confirm no reviewer-facing code still produces the old `403 You have reached your limit` behavior (Removed)
- [x] Restore the reviewer account to the approved original five communities (Completed)
- [x] Freeze iOS configurations and prepare for TestFlight upload (MARKETING_VERSION bumped to 1.0.3)
- [x] Set up and validate 5 realistic curated events for the reviewer account (`scripts/setup-reviewer-events.ts`)
- [x] Purge any invalid seeded events (`communityId: null`) that cause the Dashboard 404 issue.

## Next Steps
- Push the freeze commit to `main` to trigger the Codemagic pipeline upload to TestFlight.
- Wait for TestFlight processing to complete.
- Execute the manual TestFlight validation checklist documented in `walkthrough.md` to ensure the Dashboard 404 is resolved natively.
- After successful validation, update status to: `READY FOR APPLE REVIEW — Exact TestFlight reviewer path proven`

## Status
`CONDITIONALLY READY — TestFlight validation remains`
