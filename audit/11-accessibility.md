# Accessibility Audit Report

**Total Row Count:** 6 findings
**Confidence Level:** High (Static Analysis)
**Candidate Scope:** Local Candidate (git HEAD: b905e09c73519d5c417241f1862fb2afbc946203)

## Finding 1
* **Exact File:** `client/src/components/community/community-card.tsx`
* **Exact Line:** 86
* **Code Path:** `CommunityCard` component
* **Affected Feature:** Communities List / Discovery
* **Reviewer-Visible Path:** Communities Feed
* **Static Evidence:** `onClick` handler on a non-interactive `<Card>` component without `role="button"` or `tabIndex`.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** High
* **Severity:** High (Blocks keyboard and screen reader access)
* **Applies To:** Both (Probable TestFlight Baseline 7a730ffd and Proposed Local Candidate b905e09)
* **Classification:** PROVEN UX DEFECT
* **Smallest Proposed Correction:** Add `role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onView()}` to the Card.

## Finding 2
* **Exact File:** `client/src/components/auth/login-form.tsx`
* **Exact Line:** 206
* **Code Path:** `LoginForm -> Password Input -> Toggle Button`
* **Affected Feature:** Authentication
* **Reviewer-Visible Path:** Login / Signup screens
* **Static Evidence:** `<button>` element with `onClick` contains only SVG icons (`<Eye>` / `<EyeOff>`) and has no text content or `aria-label`.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** High
* **Severity:** High (Screen readers will announce "button" with no context)
* **Applies To:** Both
* **Classification:** PROVEN UX DEFECT
* **Smallest Proposed Correction:** Add `aria-label={showPassword ? "Hide password" : "Show password"}` to the button.

## Finding 3
* **Exact File:** `client/src/components/layout/top-bar.tsx`
* **Exact Line:** 25
* **Code Path:** `TopBar -> form -> Input`
* **Affected Feature:** Global Search
* **Reviewer-Visible Path:** Top navigation bar across the app
* **Static Evidence:** `<Input>` element used for search lacks an associated `<Label>` and does not have an `aria-label` attribute.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** High
* **Severity:** High (Screen readers will not properly announce the input's purpose)
* **Applies To:** Both
* **Classification:** PROVEN UX DEFECT
* **Smallest Proposed Correction:** Add `aria-label="Search events and communities"` to the Input.

## Finding 4
* **Exact File:** `client/src/components/events/event-card.tsx`
* **Exact Line:** 154
* **Code Path:** `EventCard -> Interested Button`
* **Affected Feature:** Event Favoriting
* **Reviewer-Visible Path:** Event feeds (Discover / Home)
* **Static Evidence:** `<Button>` component contains only a `<Heart>` icon without an `aria-label` or visually hidden text.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** High
* **Severity:** High (Screen readers will announce "button" with no context)
* **Applies To:** Both
* **Classification:** PROVEN UX DEFECT
* **Smallest Proposed Correction:** Add `aria-label={isInterested ? "Remove interest" : "Mark as interested"}` to the button.

## Finding 5
* **Exact File:** `client/src/components/community/community-card.tsx`
* **Exact Line:** 124
* **Code Path:** `CommunityCard -> Description text`
* **Affected Feature:** Communities List
* **Reviewer-Visible Path:** Communities Feed
* **Static Evidence:** `text-gray-400` utility class on small text (`text-xs`) against a dark background (`bg-gray-800`), which may fail the WCAG minimum 4.5:1 contrast ratio for small text.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** Medium
* **Severity:** Medium
* **Applies To:** Both
* **Classification:** STRONGLY SUPPORTED RISK
* **Smallest Proposed Correction:** Update text color to `text-gray-300` or a higher contrast shade.

## Finding 6
* **Exact File:** `client/src/components/events/event-card.tsx`
* **Exact Line:** 161
* **Code Path:** `EventCard -> Interested Button`
* **Affected Feature:** Event Favoriting
* **Reviewer-Visible Path:** Event feeds
* **Static Evidence:** Button has classes `p-1` and icon inside is `h-5 w-5` (20px). Total interactive area is likely under the recommended 44x44px minimum for touch targets on iOS native.
* **Automated Runtime Evidence:** None
* **Native Evidence:** None
* **Confidence:** Medium
* **Severity:** Medium
* **Applies To:** Both
* **Classification:** STRONGLY SUPPORTED RISK
* **Smallest Proposed Correction:** Increase padding (e.g., `p-2` or remove `p-1` to use default button size padding).
