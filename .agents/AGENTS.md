# SameVibe Product & Engineering Principles

## 1. Premium, Resilient User Experience
- **Never Fail Silently:** Infinite loading screens, unresponsive buttons, and blank screens are unacceptable. Every network request, async operation, and third-party SDK call MUST have a strict timeout, a fallback state, and clear, user-friendly error UI.
- **Graceful Degradation:** Anticipate edge cases like network drops, iOS WKWebView quirks, CORS issues, and missing storage access. Always provide a path forward for the user (e.g., dropping them to a login screen instead of freezing).
- **Instant Feedback:** Use optimistic UI updates, micro-animations, and loading skeletons. The app should feel instantaneous and alive.

## 2. Agent Mindset
- **Be Better Than Competitors:** Do not settle for "good enough" or Minimum Viable Product standards. Proactively suggest and implement 5-star polish, robust error handling, and premium design aesthetics in every task you execute.
- **Think Before Coding:** Before writing an implementation, explicitly consider the failure modes. What happens if the backend times out? What happens if it runs natively on an iPhone instead of a browser? Fix these edge cases *before* they become bugs.

## 3. iOS & Mobile Web Standards
- **Viewport Sizing:** Never use raw `100vh` or Tailwind's default `h-screen` for full-height containers, as iOS Safari and Capacitor WebViews will clip content under the virtual keyboard or bottom address bar. Always use `100dvh` (Dynamic Viewport Height).
- **Safe Areas & Padding:** Always include padding at the bottom of scrollable containers (e.g., `pb-24`) if there is a fixed bottom navigation bar (`MobileNav`). Always respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to prevent content from rendering underneath the iPhone notch (Dynamic Island) or home indicator.
- **Scrolling Behavior:** Never force `overflow-y: auto` or strict `height: 100%` via CSS or inline JavaScript on the `document.documentElement` or `body`. Let the native iOS WebView handle root scrolling, and use standard Tailwind `flex-col min-h-screen` wrappers.

## 4. App Store Review Readiness
- **Seed Data Quality:** When setting up a demo account for App Store Review, ensure the initial database state is fully realistic. Do not over-seed memberships (e.g., limit joined communities to 5 so the "New / Discover" feeds remain populated with fresh unjoined content).
- **End-to-End Validation:** Never declare a feature "ready" based solely on API simulations. It must be proven to work seamlessly in the actual TestFlight / Capacitor environment.
