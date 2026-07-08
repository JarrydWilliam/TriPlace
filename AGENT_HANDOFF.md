# SameVibe - Agent Handoff

## Current Status (July 8, 2026)
We have successfully resolved the primary blockers for the Apple App Store resubmission.

### Completed Work:
- **App Completeness (Guideline 2.1) Blockers Fixed:**
  - Removed faulty `<Link>` wrappers around interactive Radix UI `DropdownMenuItem` elements that broke dashboard navigation and settings.
  - Successfully seeded a dedicated production reviewer account:
    - **Email:** `samevibe.review@gmail.com`
    - **Password:** `SameVibe2024!`
  - The reviewer account has been manually injected with `onboardingCompleted: true` in the Neon PostgreSQL database via a custom seed script (`scripts/seed-reviewer.ts`) to ensure Apple Reviewers can instantly access the home screen upon login, completely bypassing any initial setup latency.
  - Removed legacy, unused `useTheme` hooks across the UI components to resolve linter warnings.
- **Windows Local Development Fix:**
  - Updated `package.json` to include `cross-env` in `devDependencies` and wrapped both the `dev` and `start` scripts to support Windows environment variable syntax (`NODE_ENV=development tsx server/index.ts`).

## Immediate Next Steps for the User:
1. **App Store Resubmission:** 
   - Compile a fresh TestFlight build containing the latest navigation fixes (Build 54+).
   - Provide the exact reviewer credentials to Apple via the App Store Connect Resolution Center / App Review Information section and hit "Submit for Review".
2. **Google Cloud Console Update:**
   - The user needs to manually log into their Google Cloud Console, navigate to `APIs & Services > OAuth consent screen`, and update the App Name from "TriPlace" to "SameVibe". This is a server-side configuration that cannot be fixed within the codebase.

## Agent Guidelines for Next Session:
- Do not attempt to fix Google OAuth naming issues in the client codebase; this is purely a Google Cloud Platform configuration step for the user.
- The app relies on `@capacitor-firebase/authentication` for native auth, with a graceful fallback to standard Firebase JS SDK for the web browser.
- Any future App Review feedback should be prioritized strictly as "Release Blockers".
