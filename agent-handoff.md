# SameVibe - Agent Handoff

## Current Status (July 25, 2026)
The profile-completion 403 bug blocking Apple reviewer accounts has been fixed and pushed to `main`. Codemagic will auto-trigger an iOS build on this commit. The repository is ready for TestFlight validation and App Store Review resubmission.

### Authoritative Candidate
- **Branch**: `main`
- **Authoritative Commit**: `cec45a1da915841b775eaf76a3078ec872d03046`
- **Marketing Version**: `1.0.3`
- **Native Build Tracking**: Local `.pbxproj` is configured at `CURRENT_PROJECT_VERSION = 94`. Codemagic dynamically queries App Store Connect for the highest 1.0.3 build and increments via `agvtool new-version`.

### Completed Work (Recent):
- **Apple Review Profile Completion Bug (July 25, 2026)**:
  - Fixed a strict type-checking mismatch in `PATCH /api/users/:id` where the database `id` (returned as a string by the `neon-http` serverless driver) failed strict `!==` equality against the parsed `parseInt` number from `req.params.id`.
  - This caused a `403 Forbidden: You can only update your own profile` error for ALL existing users hitting the compliance gate (`/complete-profile`), including Apple reviewer accounts.
  - Fix: wrapped `req.user.id` in `Number()` before comparison. TypeScript check and build both pass clean.
- **Apple iPad Tap Responsiveness Fix**:
  - Removed remaining `touchAction: 'pan-y'` CSS conflict on `PullToRefresh` wrapper that caused tap interception on native WKWebView.
  - Preserved existing `> 8px` pull-to-refresh threshold, Radix body-lock cleanup in `ErrorBoundary`, and iOS safe-area top padding (`.pt-safe`).
  - Added 23 narrow client unit tests (`tests/apple-tap-defect-unit.test.mjs`) covering all tap thresholds, body-lock cleanups, and safe-area utilities (23/23 pass, exit code 0).
- **Codemagic CI Configuration (`codemagic.yaml`)**:
  - Scoped TestFlight build-number lookup to version `1.0.3` iOS train using `--pre-release-version 1.0.3 --platform IOS`.
  - Resolved Xcode build settings validation using `xcodebuild -showBuildSettings` to correctly extract `MARKETING_VERSION` (`1.0.3`) and `CURRENT_PROJECT_VERSION`.
  - Disabled automatic push triggering for `android-release` on `main` so merges trigger `ios-release` exclusively while leaving Android manually runnable.
  - Build number auto-incremented via numeric `APP_STORE_APP_ID` (not bundle ID) against App Store Connect API.
- **Age Gating (18+) & EULA**:
  - Implemented strict 18+ Age Gating in `shared/schema.ts` (`dateOfBirth`) and `server/routes.ts` (`POST /api/users`).
  - Required explicit End-User License Agreement (EULA) and Terms of Service acceptance during sign-up to comply with Apple App Review Guidelines.
  - `termsAcceptedAt` timestamp is injected server-side (not trusted from client).

### Reviewer Accounts:
1. **Populated account**: `samevibe.review@gmail.com` / `SameVibe2024!` (Populated dashboard, communities, events, messaging, profile, settings).
2. **New-user account**: `samevibe.newreview@gmail.com` / `SameVibe2024!` (Clean account for onboarding/quiz testing).

## Immediate Next Steps:
1. **Monitor Codemagic iOS Build**: Verify the `ios-release` workflow completes on SHA `cec45a1da915841b775eaf76a3078ec872d03046` and uploads the candidate IPA to TestFlight under Version `1.0.3`.
2. **Test Reviewer Account on Physical iPhone**: Sign in as `samevibe.review@gmail.com`, submit DOB + Terms on `/complete-profile` — should now pass through to the dashboard without a 403 error.
3. **Resubmit to App Store Review**: After native verification passes, select the verified TestFlight build for App Store Connect Submission `ac924509-78b8-44ba-87d3-9e35f5609f7c`.
