# Priority 1: Apple App Review Readiness

## Current Status
`CONDITIONALLY READY — TestFlight reviewer validation remains`

## Release Candidate Details
- **Git Commit:** 038b869091a54bbb68ce1fc25ae412d7c4625fe5
- **App Version (Marketing):** 1.0.3
- **Build Number:** Controlled by Codemagic pipeline `$BUILD_NUMBER` (auto-incrementing integer)
- **Production Deployment:** Release Candidate build ready for TestFlight pipeline
- **Build Environment:** production (NODE_ENV=production)

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
`BLOCKED — Reviewer event data requires refreshed TestFlight validation`
