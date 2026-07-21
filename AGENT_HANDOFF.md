# SameVibe - Agent Handoff

## Current Status (July 18, 2026)
We are preparing **Build 97** for TestFlight physical device validation and subsequent Apple App Store Review submission. 

### Authoritative Candidate
- **Branch**: `release-set-a-current`
- **Authoritative Commit**: `851e600ae269622891c62242282b5a6d040f7975`
- **Native Build Tracking**: Local `project.pbxproj` is currently at `57`. Codemagic handles the increment dynamically using App Store Connect.

### Completed Work (Recent):
- **Age Gating (18+) & EULA**:
  - Implemented strict 18+ Age Gating in `shared/schema.ts` (`dateOfBirth`) and `server/routes.ts` (`POST /api/users`).
  - Required explicit End-User License Agreement (EULA) and Terms of Service acceptance during sign-up to comply with Apple App Review Guidelines.
  - Bridged `sessionStorage` for Apple/Google native sign-in to securely capture Age and EULA acceptance before backend account creation.
- **Reviewer Accounts**:
  - Validated that `samevibe.review@gmail.com` exists and perfectly maps to its database equivalent.
  - The secondary `samevibe.newreview@gmail.com` account is missing from the database, meaning it must be physically tested and registered during the TestFlight Validation step to prove the new-user onboarding flow.

## Immediate Next Steps for the User:
1. **Approve Production Database Migration**: We are ready to `drizzle-kit push` the new schema containing `dateOfBirth`, `termsAcceptedAt`, and `termsVersion`.
2. **Perform TestFlight Physical Validation**: You must deploy this candidate via Codemagic and perform the physical validation matrix (outlined in the preflight document) on an actual iPhone, particularly proving that the Apple and Google auth bridges work flawlessly.
3. **App Store Metadata**: Update the App Privacy labels and App Review Information with the new 18+ requirement and EULA disclosures.
