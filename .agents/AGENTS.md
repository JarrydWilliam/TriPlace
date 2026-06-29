# SameVibe Product & Engineering Principles

## 1. Premium, Resilient User Experience
- **Never Fail Silently:** Infinite loading screens, unresponsive buttons, and blank screens are unacceptable. Every network request, async operation, and third-party SDK call MUST have a strict timeout, a fallback state, and clear, user-friendly error UI.
- **Graceful Degradation:** Anticipate edge cases like network drops, iOS WKWebView quirks, CORS issues, and missing storage access. Always provide a path forward for the user (e.g., dropping them to a login screen instead of freezing).
- **Instant Feedback:** Use optimistic UI updates, micro-animations, and loading skeletons. The app should feel instantaneous and alive.

## 2. Agent Mindset
- **Be Better Than Competitors:** Do not settle for "good enough" or Minimum Viable Product standards. Proactively suggest and implement 5-star polish, robust error handling, and premium design aesthetics in every task you execute.
- **Think Before Coding:** Before writing an implementation, explicitly consider the failure modes. What happens if the backend times out? What happens if it runs natively on an iPhone instead of a browser? Fix these edge cases *before* they become bugs.
