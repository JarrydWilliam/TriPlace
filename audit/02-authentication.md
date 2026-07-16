# Authentication and Identity Audit

**Total Row Count Audited:** ~500 lines across `auth-context.tsx`, `App.tsx`, `firebase.ts`, `server/routes.ts`
**Confidence Level:** High

## Findings

### 1. `requireAuth` Bypass When Firebase Admin is Unconfigured
- **Exact File:** `server/routes.ts`
- **Exact Line:** 61
- **Code Path:** `requireAuth` middleware
- **Affected Feature:** All authenticated routes
- **Reviewer-Visible Path:** Server-side API endpoints
- **Static Evidence:** `if (!adminApp) { return next(); }` allows bypassing auth completely if the server environment misses Firebase Admin config.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** PROVEN SECURITY DEFECT
- **Severity:** CRITICAL
- **Applies To:** Both
- **Smallest proposed correction:** Replace `return next();` with `return res.status(401).json({ message: "Auth not configured" });`

### 2. IDOR (Insecure Direct Object Reference) in User Profile Update
- **Exact File:** `server/routes.ts`
- **Exact Line:** 195-210
- **Code Path:** `app.patch("/api/users/:id")`
- **Affected Feature:** User profile updating
- **Reviewer-Visible Path:** Settings / Profile Edit
- **Static Evidence:** The route updates any user ID provided in the URL without verifying that it matches the authenticated user's ID.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** PROVEN SECURITY DEFECT
- **Severity:** CRITICAL
- **Applies To:** Both
- **Smallest proposed correction:** Fetch `dbUser` using `req.firebaseUser.uid` and enforce `dbUser.id === id` before updating.

### 3. Missing Validation in User Profile Creation
- **Exact File:** `server/routes.ts`
- **Exact Line:** 182-193
- **Code Path:** `app.post("/api/users")`
- **Affected Feature:** Signup
- **Reviewer-Visible Path:** Signup flow
- **Static Evidence:** The route does not enforce that the provided `firebaseUid` matches the authenticated `req.firebaseUser.uid`.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** PROVEN SECURITY DEFECT
- **Severity:** HIGH
- **Applies To:** Both
- **Smallest proposed correction:** Force `userData.firebaseUid = req.firebaseUser.uid` before `storage.createUser(userData)`.

### 4. Apple/Google Login Skips Profile Setup Incorrectly
- **Exact File:** `client/src/App.tsx`
- **Exact Line:** 108-110
- **Code Path:** Auth Routing Guard
- **Affected Feature:** Onboarding / Profile Setup
- **Reviewer-Visible Path:** Google Sign In -> Dashboard (skipping profile)
- **Static Evidence:** `const requiresProfile = !isGoogleUser && needsProfileSetup;` exempts Google users from setting a profile, even if their profile name is just an email prefix.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** PROVEN UX DEFECT
- **Severity:** MEDIUM
- **Applies To:** Both
- **Smallest proposed correction:** Remove the `!isGoogleUser` exemption: `const requiresProfile = needsProfileSetup;`

### 5. Infinite Loading Spinner Prevention
- **Exact File:** `client/src/lib/firebase.ts`
- **Exact Line:** 49-55
- **Code Path:** Firebase Initialization
- **Affected Feature:** Session Restoration
- **Reviewer-Visible Path:** App Launch
- **Static Evidence:** The initialization is explicitly configured with `browserLocalPersistence` to avoid iOS WKWebView indexedDBLocalCache hanging issues.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** SAFE
- **Severity:** LOW
- **Applies To:** Both
- **Smallest proposed correction:** None required.

### 6. Account Deletion Enforces Authentication
- **Exact File:** `server/routes.ts`
- **Exact Line:** 213-236
- **Code Path:** `app.delete("/api/users/:id")`
- **Affected Feature:** Account Deletion
- **Reviewer-Visible Path:** Settings / Delete Account
- **Static Evidence:** Explicitly checks `if (dbUser.id !== id)` ensuring users can only delete their own accounts.
- **Automated Runtime Evidence:** N/A
- **Native Evidence:** N/A
- **Confidence:** SAFE
- **Severity:** LOW
- **Applies To:** Both
- **Smallest proposed correction:** None required.
