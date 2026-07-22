# SameVibe - Agent Handoff

## Current Status (July 22, 2026)
We have merged the narrow Apple iPad tap hotfix into `main` and applied the direct CI validation fix. The repository is awaiting the automated Codemagic iOS TestFlight build for physical device validation and App Store Review resubmission.

### Authoritative Candidate
- **Branch**: `main`
- **Authoritative Commit**: `30e54c0c2cefd2658e9877570a97e03983bdcf2e`
- **Marketing Version**: `1.0.3`
- **Native Build Tracking**: Local `.pbxproj` is configured at `CURRENT_PROJECT_VERSION = 94`. Codemagic dynamically queries App Store Connect for the highest 1.0.3 build and increments via `agvtool new-version`.

### Completed Work (Recent):
- **Apple iPad Tap Responsiveness Fix**:
  - Removed remaining `touchAction: 'pan-y'` CSS conflict on `PullToRefresh` wrapper that caused tap interception on native WKWebView.
  - Preserved existing `> 8px` pull-to-refresh threshold, Radix body-lock cleanup in `ErrorBoundary`, and iOS safe-area top padding (`.pt-safe`).
  - Added 23 narrow client unit tests (`tests/apple-tap-defect-unit.test.mjs`) covering all tap thresholds, body-lock cleanups, and safe-area utilities (23/23 pass, exit code 0).
- **Codemagic CI Configuration (`codemagic.yaml`)**:
  - Scoped TestFlight build-number lookup to version `1.0.3` iOS train using `--pre-release-version 1.0.3 --platform IOS`.
  - Resolved Xcode build settings validation using `xcodebuild -showBuildSettings` to correctly extract `MARKETING_VERSION` (`1.0.3`) and `CURRENT_PROJECT_VERSION`.
  - Disabled automatic push triggering for `android-release` on `main` so merges trigger `ios-release` exclusively while leaving Android manually runnable.
- **Age Gating (18+) & EULA**:
  - Implemented strict 18+ Age Gating in `shared/schema.ts` (`dateOfBirth`) and `server/routes.ts` (`POST /api/users`).
  - Required explicit End-User License Agreement (EULA) and Terms of Service acceptance during sign-up to comply with Apple App Review Guidelines.

### Reviewer Accounts:
1. **Populated account**: `samevibe.review@gmail.com` (Populated dashboard, communities, events, messaging, profile, settings).
2. **New-user account**: `samevibe.newreview@gmail.com` (Clean account for onboarding/quiz testing).

## Immediate Next Steps:
1. **Monitor Codemagic iOS Build**: Verify the `ios-release` workflow completes on SHA `30e54c0c2cefd2658e9877570a97e03983bdcf2e` and uploads the candidate IPA to TestFlight under Version `1.0.3`.
2. **Perform Physical iPad & iPhone Validation**: Test the TestFlight binary on iPad Air 11-inch (or equivalent M-series iPad on iPadOS 26.5.2) and iPhone to verify tap responsiveness, scrolling, modal interaction, and error recovery.
3. **Resubmit to App Store Review**: After native verification passes, select the verified TestFlight build for App Store Connect Submission `ac924509-78b8-44ba-87d3-9e35f5609f7c`.
