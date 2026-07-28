# SameVibe - Agent Handoff

## Current Status (July 28, 2026)
Age verification / DOB blocking has been disabled per founder request to eliminate login friction for Apple App Review. The wheel-scroll auto-reset bug on `/complete-profile` has been resolved, and server compliance endpoints have been hardened.

### Authoritative Candidate
- **Branch**: `main`
- **Authoritative Commit**: Run `git rev-parse HEAD` for full SHA
- **Marketing Version**: `1.0.3`
- **Native Build Tracking**: Codemagic auto-increments via App Store Connect API.

---

### Completed Work (July 28, 2026):

- **Age Verification Gate Disabled**:
  - Removed mandatory DOB / age-verification route redirect in `App.tsx` (`needsCompliance = false`). Users now proceed directly to Onboarding/Dashboard.
  - Made `dateOfBirth` optional in `POST /api/users`, `PATCH /api/users/me/compliance`, and `PATCH /api/users/:id`.
  - Removed strict 18+ route blocking in `requireAuth` middleware.

- **WheelColumn Scroll Bug & Error Parsing Fixed**:
  - Fixed `WheelColumn` smooth-scroll bug on mount where initial smooth-scroll triggered `onScroll` and automatically set the year wheel to `2025` (making users 1 year old). Added programmatic scroll tracking flag.
  - Hardened `PATCH /api/users/me/compliance` to auto-create PostgreSQL user row if Firebase user is authenticated but DB row does not exist yet.
  - Improved error message extraction in `complete-profile.tsx` to surface clean human-readable server messages instead of generic fallbacks.

---

### Reviewer Accounts:
1. **Populated account**: `samevibe.review@gmail.com` / `SameVibe2024!`
2. **New-user account**: `samevibe.newreview@gmail.com` / `SameVibe2024!`

---

## ⚠️ FOUNDER MANUAL ACTIONS REQUIRED BEFORE RESUBMISSION

### ACTION 1 — Update App Store Connect Reviewer Credentials (CRITICAL)
Apple's reviewer used `samevibe.demo@gmail.com` which does not exist.
Go to: **App Store Connect → Your App → App Review Information → Demo Account**
- **Update username to**: `samevibe.review@gmail.com`
- **Update password to**: `SameVibe2024!`
- Add these reviewer notes:
  > "This is an existing user account with a populated profile. Upon sign-in, you will be taken to the full dashboard with communities, events, messaging, and settings pre-loaded."

### ACTION 2 — Fix Google OAuth Consent Screen Showing "TriPlace" (IMPORTANT)
Go to: **Google Cloud Console → APIs & Services → OAuth Consent Screen**
- Change the **App name** from "TriPlace" to "SameVibe"
- Save and verify

---

## Immediate Next Steps:
1. ✅ Wait for Codemagic build to complete and upload to TestFlight.
2. ✅ **Founder**: Update App Store Connect demo account credentials & Google OAuth consent screen.
3. ✅ Test TestFlight build: sign in as `samevibe.review@gmail.com` → goes straight to dashboard.
4. ✅ Resubmit to App Store Review (Submission ID: `ac924509-78b8-44ba-87d3-9e35f5609f7c`).
