# Agent Handoff Document

## Current Status
**Project Phase:** Priority 1 (Apple App Review Readiness)
**Status:** `BLOCKED — Awaiting iPhone-only Build 97 TestFlight validation`

## Current Release Candidate
*   **Full Git SHA:** `6b60eb9e359055877f08bfd7bb0e9b4bd8a4369e` (Product Candidate before documentation commit)
*   **Branch:** `main` (Merged from `build-97-apple`)
*   **Marketing version:** 1.0.3
*   **Build number:** pending Codemagic
*   **Device family:** iPhone only (TARGETED_DEVICE_FAMILY = 1)
*   **Bundle ID:** `com.samevibe.app`

## Proven History
*   **Build 95** worked on the physical iPhone.
*   **Build 96** failed with the global error boundary and became completely untappable on the physical device.
*   **Same-device rollback** to Build 95 worked successfully.
*   **Build 97** is based on Build 95, plus ONLY the strictly approved later fixes.

## Included Fixes
*   Curated reviewer events
*   Valid event-to-community mapping
*   Native API URL fixes
*   Package metadata synchronization
*   New-reviewer reset script

## Explicitly Excluded Changes
*   Build 96 global `App.tsx` pointer-lock cleanup
*   `use-safe-navigate.ts`
*   Experimental route teardown changes
*   Universal iPad MobileNav changes

## Reviewer Accounts
*(Do not place passwords in this document)*
1.  **Populated account:** `samevibe.review@gmail.com`
    *   *Purpose:* Populated dashboard, communities, events, messaging, profile, and settings.
2.  **New-user account:** `samevibe.newreview@gmail.com`
    *   *Purpose:* Onboarding quiz and manual-location fallback.

---

## Required TestFlight Checks
*   Clean install
*   Upgrade from Build 95 where possible
*   Populated reviewer login
*   Five joined communities
*   Five Discover Communities
*   Five curated events
*   Event-to-community navigation
*   No 404
*   All five bottom tabs
*   Messaging
*   Profile
*   Settings
*   Privacy
*   Terms
*   Support
*   Logout and login
*   Session restoration
*   New-user login
*   Full onboarding quiz
*   Location denied
*   Manual city entry
*   Onboarding persistence
*   No global error boundary
*   No untappable screen

---

## Strict Stop Instruction
Do **not** begin Priority 2 or make additional source changes until the owner reports the Build 97 TestFlight results.
