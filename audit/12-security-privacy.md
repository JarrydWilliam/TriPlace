# Security and Privacy Audit Report

**Total Findings**: 9
**Overall Confidence Level**: High (100% on Static Analysis)
**Candidate Inspected**: Proposed Local Candidate (b905e09)

---

## 1. Firebase Admin Auth Bypass
- **Exact File**: `server/routes.ts`
- **Exact Line**: 58-61
- **Code Path**: `requireAuth` middleware
- **Affected Feature**: Global Authentication
- **Reviewer-Visible Path**: Any authenticated action
- **Static Evidence**: `if (!adminApp) { return next(); }` — If the Firebase admin app is not configured or fails to load, it trusts the client and calls `next()` instead of rejecting the request securely.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: Critical
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Change `return next();` to `return res.status(500).json({ message: "Server auth configuration error." });`.
- **Applies To**: Both

## 2. Exposed Endpoints / IDOR on Conversations
- **Exact File**: `server/routes.ts`
- **Exact Line**: 784
- **Code Path**: `app.get("/api/conversations/:userId1/:userId2")`
- **Affected Feature**: Messaging
- **Reviewer-Visible Path**: Chat View
- **Static Evidence**: The route lacks the `requireAuth` middleware entirely, allowing unauthenticated read access to any private conversation between any two users.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: Critical
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Add `requireAuth` middleware and verify that the authenticated `req.firebaseUser` corresponds to either `userId1` or `userId2`.
- **Applies To**: Both

## 3. IDOR on User Location Update
- **Exact File**: `server/routes.ts`
- **Exact Line**: 431
- **Code Path**: `app.patch("/api/users/current/location")`
- **Affected Feature**: User Location Update
- **Reviewer-Visible Path**: Background Location Sync
- **Static Evidence**: Uses `userId` from `req.body` directly: `const updatedUser = await storage.updateUser(userId, { ... });`. There is no check to ensure `userId` belongs to `req.firebaseUser`.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: High
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Retrieve the `userId` directly from the database using `req.firebaseUser.uid` rather than accepting it from the request body.
- **Applies To**: Both

## 4. IDOR on General Profile Updates
- **Exact File**: `server/routes.ts`
- **Exact Line**: 195
- **Code Path**: `app.patch("/api/users/:id")`
- **Affected Feature**: Profile Updates
- **Reviewer-Visible Path**: Profile Edit
- **Static Evidence**: Route calls `storage.updateUser(id, updates)` using `id` parsed from `req.params.id` without checking if `id` corresponds to the authenticated `req.firebaseUser`.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: High
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Fetch the target user by `id` and assert their `firebaseUid` matches `req.firebaseUser.uid` before applying updates.
- **Applies To**: Both

## 5. IDOR on Community Posts and Messages
- **Exact File**: `server/routes.ts`
- **Exact Line**: 1234, 1561
- **Code Path**: `app.post("/api/communities/:id/messages")`, `app.post("/api/communities/:id/posts")`
- **Affected Feature**: Community Posting and Messaging
- **Reviewer-Visible Path**: New Post / New Message creation
- **Static Evidence**: Extracts `senderId` and `authorId` from `req.body` and inserts them into the database without verifying ownership against `req.firebaseUser`.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: High
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Resolve the user's DB ID securely from `req.firebaseUser.uid` and ignore body parameters for `senderId`/`authorId`.
- **Applies To**: Both

## 6. Exposed Endpoints / Public User Profiles
- **Exact File**: `server/routes.ts`
- **Exact Line**: 150
- **Code Path**: `app.get("/api/users/:id")`
- **Affected Feature**: User Profiles
- **Reviewer-Visible Path**: Profile View
- **Static Evidence**: Lacks `requireAuth` middleware. Allows any unauthenticated API caller to dump user profile data.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: High
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Add `requireAuth` middleware and restrict private field visibility based on authorization.
- **Applies To**: Both

## 7. Community Join Denial of Service
- **Exact File**: `server/routes.ts`
- **Exact Line**: 381
- **Code Path**: `app.post("/api/communities/:id/join")`
- **Affected Feature**: Community Joining
- **Reviewer-Visible Path**: Join Community Button
- **Static Evidence**: Uses `const authUserId = (req as any).user?.id;` but the `requireAuth` middleware populates `req.firebaseUser`, leaving `req.user` undefined. This results in a guaranteed 401 Unauthorized for all users.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: High
- **Classification**: PROVEN UX DEFECT
- **Smallest Proposed Correction**: Retrieve the DB user ID via `await storage.getUserByFirebaseUid(req.firebaseUser.uid)` instead.
- **Applies To**: Both

## 8. Unauthenticated Access to Attended Events
- **Exact File**: `server/routes.ts`
- **Exact Line**: 1155
- **Code Path**: `app.get("/api/users/:id/attended-events")`
- **Affected Feature**: Event History
- **Reviewer-Visible Path**: Profile Event History
- **Static Evidence**: Route lacks `requireAuth` middleware. Exposes historical attendance data to unauthenticated callers.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: Medium
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Apply `requireAuth` middleware and verify ownership or visibility permissions.
- **Applies To**: Both

## 9. IDOR on Connection Signals
- **Exact File**: `server/routes.ts`
- **Exact Line**: 242
- **Code Path**: `app.post("/api/users/:id/connection-signal")`
- **Affected Feature**: Connection Signals (AI Learning)
- **Reviewer-Visible Path**: Swipe / Like Interaction
- **Static Evidence**: Uses `sourceUserId` from `req.body` without validating against the authenticated session `req.firebaseUser`.
- **Automated Runtime Evidence**: None
- **Native Evidence**: None
- **Confidence**: 100%
- **Severity**: Medium
- **Classification**: PROVEN SECURITY DEFECT
- **Smallest Proposed Correction**: Enforce that `sourceUserId` corresponds to the authenticated user's DB ID.
- **Applies To**: Both
