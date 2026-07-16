# Routing & Navigation Audit Report

**Total Rows Inspected**: ~50 routing-related configurations across `App.tsx`, back button implementations, and push notifications.
**Confidence Level**: High

## Findings

### 1. Push Notification Deep Link Reloads WebView
- **File**: `client/src/lib/push-notifications.ts`
- **Line**: 52
- **Code Path**: `PushNotifications.addListener('pushNotificationActionPerformed')`
- **Affected Feature**: Push Notification Navigation
- **Reviewer-Visible Path**: Tapping a push notification while the app is in the background or foreground.
- **Static Evidence**: `window.location.href = data.url;` is used for internal routing.
- **Native Evidence**: In a Capacitor WebView, modifying `window.location.href` forces the entire WebView to reload `index.html` from disk. This drops all SPA memory state, causes a blank white screen during reload, forces Firebase Auth to re-initialize, and breaks the seamless app experience.
- **Confidence**: High
- **Severity**: High
- **Classification**: PROVEN UX DEFECT
- **Applies To**: Both (7a730ffd and b905e09)
- **Smallest Proposed Correction**: Change to `window.dispatchEvent(new CustomEvent('app-navigate', { detail: data.url }))` and listen for it inside the `Router` component in `App.tsx` to call `setLocation()`.

### 2. Missing App Scheme/Universal Link Handler
- **File**: `client/src/App.tsx`
- **Line**: 61 (Router component)
- **Code Path**: Capacitor Native Deep Linking
- **Affected Feature**: Deep Links (Universal Links & Custom Schemes)
- **Reviewer-Visible Path**: Tapping a `samevibe.app` link or `SameVibe://` scheme outside the app.
- **Static Evidence**: The App plugin `appUrlOpen` event is never listened to.
- **Native Evidence**: Capacitor requires `App.addListener('appUrlOpen', (event) => setLocation(event.url))` to route users when the app is brought to the foreground via a deep link. Without it, the app opens but remains on the current screen (or loads the default root).
- **Confidence**: High
- **Severity**: Medium
- **Classification**: PROVEN UX DEFECT
- **Applies To**: Both
- **Smallest Proposed Correction**: Import `App` from `@capacitor/app` and add `App.addListener('appUrlOpen', (data) => { const path = new URL(data.url).pathname; setLocation(path); });` inside a `useEffect` in the `Router`.

### 3. Public Support Route Mismatch
- **File**: `client/src/App.tsx`
- **Line**: 95 & 179
- **Code Path**: `const publicLegalPages = ['/terms', '/privacy', '/support', '/delete-account'];` vs `<Route path="/settings/support" component={SupportSettings} />`
- **Affected Feature**: Public Legal Pages / Support Page
- **Reviewer-Visible Path**: Visiting `/support` while logged out.
- **Static Evidence**: `publicLegalPages` whitelists `/support` as a public route, but the Router does not register `<Route path="/support" />`. It only registers `/settings/support`, which is protected.
- **Automated Runtime Evidence**: Unauthenticated users visiting `/support` bypass the `/login` redirect but hit the `NotFound` fallback component.
- **Confidence**: High
- **Severity**: Low
- **Classification**: PROVEN UX DEFECT
- **Applies To**: Both
- **Smallest Proposed Correction**: Change the whitelist entry to `'/settings/support'` or add an explicit `<Route path="/support" component={SupportSettings} />` for unauthenticated users.

### 4. Direct Loading / Reload Behavior
- **File**: `client/src/App.tsx`
- **Line**: 112
- **Code Path**: `useEffect` auth redirection logic
- **Affected Feature**: Deep page reloads and direct links (e.g., `/community/1`)
- **Reviewer-Visible Path**: Reloading a nested page in the browser.
- **Static Evidence**: Redirection only occurs if `requiresProfile`, `needsOnboarding`, or `publicAuthPages.includes(location)` is true. Normal nested paths are correctly preserved upon Auth load.
- **Confidence**: High
- **Severity**: None
- **Classification**: SAFE
- **Applies To**: Both

### 5. Back Navigation Controls
- **File**: `client/src/pages/community.tsx`, `client/src/pages/create-event.tsx`, etc.
- **Line**: Multiple (e.g., `community.tsx:451`)
- **Code Path**: `<Link href="/dashboard">` containing an `ArrowLeft` icon
- **Affected Feature**: In-App Back Buttons
- **Reviewer-Visible Path**: Tapping the back button on deeply nested pages after a direct load (e.g., push notification entry).
- **Static Evidence**: Replaces brittle `navigate(-1)` with robust absolute paths (`href="/dashboard"`). This guarantees users won't exit the app or hit a blank screen if there is no browser history stack.
- **Confidence**: High
- **Severity**: None
- **Classification**: SAFE
- **Applies To**: Both
