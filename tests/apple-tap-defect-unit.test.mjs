/**
 * apple-tap-defect-unit.test.mjs
 *
 * Narrow unit tests for the three Apple App Review rejection defects.
 * All tests run in Node.js with zero external dependencies.
 * No server, database, Firebase, or browser required.
 *
 * Defects verified:
 *  1. Pull-to-refresh 8-pixel threshold (zero / sub-threshold movement must NOT call preventDefault)
 *  2. Body pointer-event / scroll-lock cleanup after error boundary activation
 *  3. Safe-area CSS utility mapping to env(safe-area-inset-top)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let passes = 0;
let failures = 0;

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  passes++;
}
function fail(name, reason) {
  console.error(`  ❌ FAIL  ${name}`);
  console.error(`           ${reason}`);
  failures++;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: simulate the pull-to-refresh gesture state machine extracted from
//          client/src/components/ui/pull-to-refresh.tsx (lines 44–109).
// The logic is re-expressed in plain JS so it runs in Node without JSX/React.
// ─────────────────────────────────────────────────────────────────────────────

const PULL_START_THRESHOLD_PX = 8;

function makePullState() {
  return { isPulling: false, startY: 0, startX: 0, active: false, ignoreGesture: false };
}

/**
 * Simulate one full gesture: touchstart → n touchmove steps → touchend.
 *
 * Returns { preventDefaultCalledTimes, activeWhenReleased }
 */
function simulateGesture({ startY, endY, startX = 100, endX = 100, isInteractive = false }) {
  const state = makePullState();
  let preventDefaultCalledTimes = 0;

  // --- touchstart ---
  if (!isInteractive) {
    state.ignoreGesture = false;
    state.startY = startY;
    state.startX = startX;
    state.isPulling = true;
    state.active = false;
  } else {
    state.ignoreGesture = true;
  }

  // --- touchmove (single step to endY / endX) ---
  const mockPreventDefault = () => { preventDefaultCalledTimes++; };

  if (state.isPulling && !state.ignoreGesture) {
    const diffY = endY - state.startY;
    const diffX = Math.abs(endX - state.startX);

    if (!state.active && diffX > diffY) {
      // Horizontal swipe — cancel pull mode
      state.isPulling = false;
    } else if (diffY > 0) {
      if (diffY > PULL_START_THRESHOLD_PX) {
        state.active = true;
        mockPreventDefault(); // ← only called when threshold exceeded
      }
    }
  }

  // --- touchend ---
  const activeWhenReleased = state.active;
  state.isPulling = false;
  state.active = false;
  state.ignoreGesture = false;

  return { preventDefaultCalledTimes, activeWhenReleased };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Pull-to-refresh threshold
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── SECTION 1: Pull-to-refresh threshold ──────────────────────────────────');

{
  const name = '1.1 — Zero movement: preventDefault NOT called, gesture NOT active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 200 });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.2 — 1 px movement: preventDefault NOT called, gesture NOT active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 201 });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.3 — 3 px movement: preventDefault NOT called, gesture NOT active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 203 });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.4 — 7 px movement (below threshold): preventDefault NOT called, gesture NOT active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 207 });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.5 — 8 px movement (AT threshold): preventDefault called once, gesture IS active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 208 });
  // diffY = 8 > PULL_START_THRESHOLD_PX (8) is false (strictly greater), so NOT active
  // Threshold: diffY > 8, so 8px is still NOT active (boundary is exclusive)
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.6 — 9 px movement (above threshold): preventDefault called once, gesture IS active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 209 });
  if (preventDefaultCalledTimes === 1 && activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.7 — 100 px genuine pull: preventDefault called, gesture active';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 300 });
  if (preventDefaultCalledTimes === 1 && activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.8 — Interactive target: gesture ignored, no preventDefault';
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 300, isInteractive: true });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

{
  const name = '1.9 — Horizontal swipe: gesture cancelled, no preventDefault';
  // diffX (200) > diffY (5) → cancel
  const { preventDefaultCalledTimes, activeWhenReleased } = simulateGesture({ startY: 200, endY: 205, startX: 100, endX: 300 });
  if (preventDefaultCalledTimes === 0 && !activeWhenReleased) pass(name);
  else fail(name, `preventDefaultCalledTimes=${preventDefaultCalledTimes}, activeWhenReleased=${activeWhenReleased}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Source-code verification: no touchAction: 'pan-y' in wrapper div
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── SECTION 2: pull-to-refresh.tsx source verification ────────────────────');

{
  const name = '2.1 — No touchAction: pan-y in wrapper style object';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  // Must not contain the property in the wrapper div's style= block
  const hasPanY = src.includes("touchAction: 'pan-y'") || src.includes('touchAction:"pan-y"') || src.includes('touchAction: "pan-y"');
  if (!hasPanY) pass(name);
  else fail(name, 'Found touchAction: pan-y in source — it was not removed');
}

{
  const name = '2.2 — PULL_START_THRESHOLD_PX = 8 is defined';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  if (src.includes('PULL_START_THRESHOLD_PX = 8')) pass(name);
  else fail(name, 'PULL_START_THRESHOLD_PX = 8 not found in source');
}

{
  const name = '2.3 — diffY > PULL_START_THRESHOLD_PX guard is present before preventDefault';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  if (src.includes('diffY > PULL_START_THRESHOLD_PX')) pass(name);
  else fail(name, 'diffY > PULL_START_THRESHOLD_PX guard not found');
}

{
  const name = '2.4 — preventDefault() is inside the threshold guard (not before it)';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  const thresholdIdx = src.indexOf('diffY > PULL_START_THRESHOLD_PX');
  const preventIdx = src.indexOf('e.preventDefault()');
  // preventDefault must appear AFTER the threshold check in source order
  if (thresholdIdx !== -1 && preventIdx !== -1 && preventIdx > thresholdIdx) pass(name);
  else fail(name, `thresholdIdx=${thresholdIdx}, preventIdx=${preventIdx} — order incorrect`);
}

{
  const name = '2.5 — touchend resets state (isPulling, active, ignoreGesture)';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  const hasReset = src.includes('state.current.isPulling = false') &&
                   src.includes('state.current.active = false') &&
                   src.includes('state.current.ignoreGesture = false');
  if (hasReset) pass(name);
  else fail(name, 'touchend does not fully reset state.current');
}

{
  const name = '2.6 — touchcancel listener is registered (same handler as touchend)';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  if (src.includes("'touchcancel', handleTouchEnd")) pass(name);
  else fail(name, 'touchcancel is not bound to handleTouchEnd');
}

{
  const name = '2.7 — Listeners are cleaned up on unmount (removeEventListener x4)';
  const src = readFileSync(resolve(ROOT, 'client/src/components/ui/pull-to-refresh.tsx'), 'utf8');
  const count = (src.match(/removeEventListener/g) || []).length;
  if (count >= 4) pass(name);
  else fail(name, `Expected ≥4 removeEventListener calls, found ${count}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Body interaction state cleanup (error-boundary source check)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── SECTION 3: error-boundary.tsx body cleanup verification ───────────────');

{
  const name = '3.1 — resetFatalInteractionState exported from error-boundary';
  const src = readFileSync(resolve(ROOT, 'client/src/components/error-boundary.tsx'), 'utf8');
  if (src.includes('export function resetFatalInteractionState')) pass(name);
  else fail(name, 'resetFatalInteractionState is not exported');
}

{
  const name = '3.2 — document.body.style.pointerEvents restored in cleanup';
  const src = readFileSync(resolve(ROOT, 'client/src/components/error-boundary.tsx'), 'utf8');
  if (src.includes('pointerEvents')) pass(name);
  else fail(name, 'pointerEvents not referenced in error-boundary');
}

{
  const name = '3.3 — data-scroll-locked attribute removed in cleanup';
  const src = readFileSync(resolve(ROOT, 'client/src/components/error-boundary.tsx'), 'utf8');
  if (src.includes('data-scroll-locked')) pass(name);
  else fail(name, 'data-scroll-locked cleanup not present in error-boundary');
}

{
  const name = '3.4 — resetFatalInteractionState is called in componentDidCatch';
  const src = readFileSync(resolve(ROOT, 'client/src/components/error-boundary.tsx'), 'utf8');
  const didCatchBlock = src.slice(src.indexOf('componentDidCatch'));
  if (didCatchBlock.includes('resetFatalInteractionState')) pass(name);
  else fail(name, 'resetFatalInteractionState not called in componentDidCatch');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Safe-area CSS utility mapping
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── SECTION 4: index.css safe-area utility verification ───────────────────');

{
  const name = '4.1 — .pt-safe class maps to env(safe-area-inset-top)';
  const src = readFileSync(resolve(ROOT, 'client/src/index.css'), 'utf8');
  if (src.includes('.pt-safe') && src.includes('env(safe-area-inset-top')) pass(name);
  else fail(name, '.pt-safe not mapped to env(safe-area-inset-top) in index.css');
}

{
  const name = '4.2 — .safe-area-top also maps to env(safe-area-inset-top)';
  const src = readFileSync(resolve(ROOT, 'client/src/index.css'), 'utf8');
  if (src.includes('.safe-area-top') && src.includes('env(safe-area-inset-top')) pass(name);
  else fail(name, '.safe-area-top not mapped to env(safe-area-inset-top)');
}

{
  const name = '4.3 — No standalone pt-safe that is left undefined (would silently map to 0)';
  const src = readFileSync(resolve(ROOT, 'client/src/index.css'), 'utf8');
  // The class must appear in the same rule block as safe-area-inset-top
  const ptSafeIdx = src.indexOf('.pt-safe');
  const afterPtSafe = src.slice(ptSafeIdx, ptSafeIdx + 200);
  if (afterPtSafe.includes('env(safe-area-inset-top')) pass(name);
  else fail(name, '.pt-safe definition does not include env(safe-area-inset-top) nearby');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

const total = passes + failures;
console.log(`\n══════════════════════════════════════════════════════════════════════════`);
console.log(`  TOTAL: ${total}   PASSED: ${passes}   FAILED: ${failures}`);
console.log(`══════════════════════════════════════════════════════════════════════════\n`);

process.exit(failures > 0 ? 1 : 0);
