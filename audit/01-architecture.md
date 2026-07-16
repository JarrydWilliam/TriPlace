# Architecture & Configuration Audit

**Total Findings:** 4
**Overall Confidence Level:** 95%

## Finding 1: Production Process Manager Execution Flaw
**Target:** Both (Probable TestFlight Baseline 7a730ffd & Proposed Local Candidate b905e09)
**Exact File:** `ecosystem.config.js`
**Exact Line:** 23-24
**Code Path:** PM2 cluster/fork execution configuration.
**Affected Feature:** Server Performance & Memory footprint.
**Reviewer-Visible Path:** Background execution speed and potential memory restarts under load.
**Static Evidence:** PM2 config specifies `script: "node_modules/.bin/tsx"` and `args: "server/index.ts"` instead of using the compiled `dist/index.js` output by `npm run build`.
**Automated Runtime Evidence:** PM2 launches uncompiled TypeScript with `tsx`, leading to massive memory overhead compared to raw V8/node.
**Native Evidence:** N/A (Server-side).
**Confidence:** High
**Severity:** PROVEN DEFECT
**Smallest Proposed Correction:** Change `script` to `"node"` and `args` to `"dist/index.js"`.

## Finding 2: iOS Capacitor Safe Area Inset Conflict
**Target:** Both (Probable TestFlight Baseline 7a730ffd & Proposed Local Candidate b905e09)
**Exact File:** `capacitor.config.ts`
**Exact Line:** 36
**Code Path:** iOS Capacitor WebView Initialization (`ios` block).
**Affected Feature:** Edge-to-edge UI / Notch avoidance.
**Reviewer-Visible Path:** Any screen on an iPhone with a notch/dynamic island; background gradients won't reach the edges of the device display.
**Static Evidence:** `capacitor.config.ts` forces `contentInset: "always"`. Meanwhile, `index.css` relies on `env(safe-area-inset-top)` for utility classes (`.pt-safe`) and sets `min-height: 100dvh` to achieve a full-bleed layout. `contentInset: "always"` shrinks the WKWebView bounds, rendering `env()` CSS variables to 0 and leaving solid-color letterboxing at the top/bottom.
**Automated Runtime Evidence:** N/A
**Native Evidence:** WKWebView bounds will be strictly smaller than the device bounds, breaking the intended immersive design.
**Confidence:** High
**Severity:** PROVEN UX DEFECT
**Smallest Proposed Correction:** Change `contentInset` to `"automatic"` or remove it to allow CSS to manage safe areas natively.

## Finding 3: CI/CD Build Bloat (Codemagic YAML)
**Target:** Both (Probable TestFlight Baseline 7a730ffd & Proposed Local Candidate b905e09)
**Exact File:** `codemagic.yaml`
**Exact Line:** 34, 123
**Code Path:** iOS & Android Native Build Pipelines.
**Affected Feature:** CI/CD Pipeline Duration & Resource Usage.
**Reviewer-Visible Path:** N/A (Developer CI/CD visible).
**Static Evidence:** The build scripts call `npm run build`, which maps to `vite build && esbuild server/index.ts --platform=node...`. The `esbuild` server compilation step is entirely unused by Capacitor native clients.
**Automated Runtime Evidence:** Codemagic builds a Node.js server binary during the iOS and Android pipelines.
**Native Evidence:** N/A
**Confidence:** High
**Severity:** STRONGLY SUPPORTED RISK
**Smallest Proposed Correction:** Replace `npm run build` with `npx vite build` in `codemagic.yaml`.

## Finding 4: Dead & Duplicate Administrative Scripts
**Target:** Proposed Local Candidate (b905e09)
**Exact File:** `verify-db.ts`, `patch-db.ts`, `patch-db-2.ts`, `scripts/verify-db.ts`
**Exact Line:** N/A
**Code Path:** Root project directory.
**Affected Feature:** Project maintainability.
**Reviewer-Visible Path:** N/A
**Static Evidence:** Multiple duplicate and ad-hoc scratch scripts exist in the root directory (e.g., `verify-db.ts` vs `scripts/verify-db.ts`), creating ambiguity regarding the correct operations runbook.
**Automated Runtime Evidence:** N/A
**Native Evidence:** N/A
**Confidence:** High
**Severity:** POSSIBLE RISK
**Smallest Proposed Correction:** Delete root-level copies of scripts and move all ad-hoc administrative tools to the `scripts/` directory.
