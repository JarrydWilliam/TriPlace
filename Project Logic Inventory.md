# SameVibe Project Logic Inventory

This document represents a comprehensive read-only architectural audit of the SameVibe codebase, identifying disconnected logic, duplicate implementations, dead code, and unused features. **These findings are deferred until after Apple App Store Review.**

---

## 1. Frontend Pages & Utilities

### 1.1 Hidden Admin Telemetry Dashboard
* **Feature:** Hidden Admin Dashboard
* **Files involved:** `client/src/App.tsx`, `client/src/pages/admin/metrics.tsx`
* **Current status:** Active and hidden.
* **Why it is disconnected:** Purposefully hidden from standard navigation. Validates `VITE_ADMIN_EMAIL`.
* **Safe to remove:** No (Critical for monitoring Apple App Store Review).
* **Estimated effort:** N/A
* **Risk:** Low
* **Priority:** Low (Leave as-is).

### 1.2 Legacy Server Watchdog
* **Feature:** Legacy Monitor Script
* **Files involved:** `scripts/server-watchdog.js`
* **Current status:** Unused/Deprecated.
* **Why it is disconnected:** Custom child-process spawner superseded by standard hosting practices.
* **Safe to remove:** Yes
* **Estimated effort:** Trivial
* **Risk:** Low
* **Priority:** Medium

### 1.3 Legacy End-to-End Test Tools
* **Feature:** Local Verification Tools
* **Files involved:** `scripts/verify-frontend.ts`, `scripts/verify-all.ts`, `scripts/verify-production.ts`, `scripts/test-agent-architect.ts`
* **Current status:** Functional but disjointed.
* **Why it is disconnected:** Used for local pre-flight checks.
* **Safe to remove:** Yes (if replaced by Cypress/Playwright).
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Low

### 1.4 Database Seeders & App Store Review Tooling
* **Feature:** Apple Tester Fixes & DB Scaffolding
* **Files involved:** `scripts/fix-reviewer.ts`, `scripts/join-reviewer-communities.ts`, `scripts/seed-*.ts`
* **Current status:** Active developer tools.
* **Why it is disconnected:** Run independently via CLI.
* **Safe to remove:** No. Essential for managing the reviewer account and seeding environments.
* **Estimated effort:** N/A
* **Risk:** High if misused.
* **Priority:** Critical (Keep).

### 1.5 The `/kudos` Alias
* **Feature:** Deep-link Route Alias
* **Files involved:** `client/src/App.tsx`, `client/src/pages/dashboard.tsx`
* **Current status:** Alias routing.
* **Why it is disconnected:** Intercepts `/kudos` to render the Dashboard.
* **Safe to remove:** Yes (unless actively used for marketing).
* **Estimated effort:** Trivial
* **Risk:** Low
* **Priority:** Low

---

## 2. Frontend Components & Services

### 2.1 Unused UI Components
* **Feature:** Basic UI Shadcn Primitives
* **Files involved:** `client/src/components/ui/` (accordion, aspect-ratio, breadcrumb, context-menu, drawer, hover-card, menubar, navigation-menu, pagination, resizable, toggle-group)
* **Current status:** Dead code.
* **Why it is disconnected:** Generated during initial library setup but never adopted.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Low

### 2.2 Unused Custom Component: LocationPrompt
* **Feature:** Fallback UI prompt for location services
* **Files involved:** `client/src/components/ui/location-prompt.tsx`
* **Current status:** Unreferenced and unrendered.
* **Why it is disconnected:** Replaced by transparent `useGeolocation` handling.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Medium

### 2.3 Duplicate App Update Checkers
* **Feature:** PWA App Update Checkers
* **Files involved:** `client/src/components/ui/app-updater.tsx`, `client/src/components/ui/pwa-update-checker.tsx`, `client/src/App.tsx`
* **Current status:** Both imported and rendered.
* **Why it is disconnected:** Duplicate logic doing the same job in conflicting ways.
* **Safe to remove:** Yes, remove `pwa-update-checker.tsx`.
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** High (Critical UX polish).

### 2.4 Duplicate / Unused Sidebar Primitive
* **Feature:** Application Sidebar
* **Files involved:** `client/src/components/ui/sidebar.tsx`
* **Current status:** Dead code.
* **Why it is disconnected:** Replaced by `client/src/components/layout/sidebar.tsx`.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Medium

### 2.5 Disconnected Deployment Checks
* **Feature:** Pre-deployment Environment Validation
* **Files involved:** `client/src/lib/deployment-checks.ts`
* **Current status:** Dead code.
* **Why it is disconnected:** Never hooked into the build process.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Low

### 2.6 Disconnected Feature Flags
* **Feature:** Application Feature Flags Config
* **Files involved:** `client/src/lib/production-config.ts`
* **Current status:** Unused object definition.
* **Why it is disconnected:** The `FEATURES` dictionary is never evaluated.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Low

---

## 3. Backend Logic & Database

### 3.1 Disconnected Admin / Scraper Routes
* **Feature:** Web Scraping & Community Refresh APIs
* **Files involved:** `server/routes.ts`
* **Current status:** Endpoints exist but are never called.
* **Why it is disconnected:** Likely built for an abandoned admin dashboard.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** Medium

### 3.2 Duplicate Endpoints & Logic
* **Feature:** Dynamic Community Members & Event Feeds
* **Files involved:** `server/routes.ts`, `/storage.ts` (root duplicate)
* **Current status:** Duplicate endpoints and root files.
* **Why it is disconnected:** `/api/events/feed` aliases `/api/events/upcoming`. `/api/communities/:id/dynamic-members` duplicates `/api/communities/:id/dynamic-info`. Root `storage.ts` is an abandoned backup.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** Low
* **Priority:** High

### 3.3 Legacy AI (OpenAI) Logic
* **Feature:** AI Community Matching Engine
* **Files involved:** `server/routes.ts`, `server/ai-matching.ts`
* **Current status:** OpenAI dependency removed; scaffolding remains.
* **Why it is disconnected:** LLM implementation is hardcoded to `null` to bypass OpenAI logic for App Store review.
* **Safe to remove:** Yes
* **Estimated effort:** Medium (Requires careful behavioral-engine extraction).
* **Risk:** Medium
* **Priority:** Medium

### 3.4 Unused Database Tables & Columns
* **Feature:** Feature Flags & Subscription Monetization
* **Files involved:** `shared/schema.ts`
* **Current status:** Defined in schema, never used.
* **Why it is disconnected:** Forward-looking architecture never implemented.
* **Safe to remove:** Yes
* **Estimated effort:** Medium (Requires Drizzle migration).
* **Risk:** Low
* **Priority:** High (Schema bloat).

### 3.5 Old Unused Migrations
* **Feature:** Database Schema Patches
* **Files involved:** `manual-migrate.js`, `patch-db.ts`, `patch-db-2.ts`
* **Current status:** Standalone scripts in root.
* **Why it is disconnected:** One-off manual migrations already applied.
* **Safe to remove:** Yes
* **Estimated effort:** Low
* **Risk:** None
* **Priority:** Low
