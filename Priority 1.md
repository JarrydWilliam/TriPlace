# Apple App Review — Priority 1 Validation

## 13. Final Decision
`CONDITIONALLY READY — Build is complete but owner/device/App Store actions remain`

## 11. App Review Notes (Draft)
**Email:** `samevibe.review@gmail.com`
**Password:** `[PLACEHOLDER - OWNER TO ENTER]`

**Description:**
SameVibe is a platform for discovering local events that match your interests and connecting with the communities hosting them.

**Reviewer Instructions:**
*   You will see five pre-joined communities on your dashboard (Local Adventurers, Creative Collaborators, Wellness & Mindfulness Circle, New in Town, Weekend Plans).
*   Scroll down to the "New Communities" section to explore and join 5 other distinct communities.
*   Tapping an event card will open the event details. For this 1.0 release, event tickets/RSVPs open externally via the Safari in-app browser.
*   You may deny Location permissions during onboarding. If you do, a manual location prompt will allow you to proceed seamlessly.

## 12. Required Evidence

**General Build Information**
*   **Version and Build Number:** Verified in code (`1.0.2` in `package.json`)
*   **Commit Tested:** Verified in code (`e3a4a7b479feb04424c75a3f8259c0b40b31420b`)
*   **Production Deployment Tested:** Verified in code (`https://samevibe-sandy.vercel.app` mapped in `capacitor.config.ts` and `queryClient.ts`)

**Reviewer Data Integrity**
*   **Reviewer login result:** Verified in production (DB is active, `discovery_settings` schema patch applied successfully)
*   **Exact five joined communities:** Verified in production (Local Adventurers, Creative Collaborators, Wellness & Mindfulness Circle, New in Town, Weekend Plans)
*   **Exact five New Communities:** Verified in production (Live Music, Food & Drinks, Outdoor Adventures, Fitness & Wellness, Tech & Creatives)

**AI Removal Verification**
*   **Fallback Verified:** Verified in code. (`generateFromBehavioralData` is active. It maps deterministic clusters — outdoor, arts, wellness, tech, food, social, music — to templates and guarantees an array of 5 communities using a fallback pool if user history is sparse). No API keys are required.

**Physical Device Requirements (Not Yet Verified)**
*   **Results for all ten community pages:** Not yet verified (Requires physical device)
*   **Event-flow results:** Not yet verified (Requires physical device)
*   **Messaging results:** Not yet verified (Requires physical device)
*   **Profile and settings results:** Not yet verified (Requires physical device)
*   **Location-denied results:** Not yet verified (Requires physical device)
*   **Supported-device layout results:** Not yet verified (Requires physical device layout/safe-areas)
*   **Scroll and touch results:** Not yet verified (Requires physical touch device)
*   **Failure-state results:** Not yet verified (Requires physical network throttling)

**Metadata & Rebranding**
*   **Metadata mismatches:** Verified in code. (No "TriPlace" strings remain in user-facing code. The only remnant is the internal Firebase project ID `triplace-v2` in the `GoogleService-Info.plist`, which is invisible to users and acceptable for App Review).

**Remaining Actions**
*   **Owner Actions:** Provide password in App Store connect. Test build on physical iOS device using TestFlight.
*   **Apple Review Blockers:** None currently identified in codebase. Pending physical layout audit.
