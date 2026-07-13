# SameVibe Read-Only Community Logic Audit

## Existing Logic

### Is there a 5-community limit?
**Yes, but it is partially disconnected and enforced differently depending on the function.**
*   **Enforcement at Join:** `server/routes.ts` (Lines 381-390) enforces a limit when calling `POST /api/communities/:id/join`. However, the limit is not strictly 5. It is calculated as `const limit = 3 + userTier;`. If the user is on a free tier, they are limited to 3. If they are upgraded, the limit increases. 
*   **Enforcement in Rotation:** `server/storage.ts` (Lines 481-497) contains a function `joinCommunityWithRotation` which strictly checks `if (userCommunities.length >= 5)`. 

### Does replacement ("least used") logic exist?
**Yes, but it is entirely DISCONNECTED.**
*   `server/storage.ts` contains `joinCommunityWithRotation` which explicitly finds the community with the lowest `activityScore` (`current.activityScore < least.activityScore`), removes it via `leaveCommunity(userId, leastActive.id)`, and then adds the new one.
*   **The Disconnect:** In `server/routes.ts` (Line 392), the `POST /api/communities/:id/join` endpoint directly calls `storage.joinCommunity`, **not** `joinCommunityWithRotation`. Therefore, if a user hits their limit, they simply get a `403 Forbidden` error ("You have reached your limit... Please upgrade") instead of silently swapping out their least-used community.

### Is usage tracked?
**Yes.** `server/storage.ts` (Lines 472-479) contains `updateCommunityActivity`, which increments `activityScore` and updates `lastActivityAt` on the `communityMembers` table. This allows the backend to accurately identify the "least used" community. 

## New Communities Logic

### Why is "New Communities" empty for the reviewer?
The "New Communities" section is populated by fetching `GET /api/communities/recommended`. This endpoint calls `getRecommendedCommunities` in `server/storage.ts`.

Here is the exact flow that causes the bug:
1.  **Generate Pool:** `getRecommendedCommunities` calls `generateDynamicCommunities` to build a pool of eligible communities.
2.  **The Fatal Slice:** Inside `generateDynamicCommunities` (Line 223), if the user is compatible with existing communities, the backend immediately chops the list: `return compatibleCommunities.slice(0, 5);`.
3.  **The Exclusion Filter:** Back in `getRecommendedCommunities` (Line 167), it takes that pool of 5 and filters out the communities the user has already joined: `communityPool.filter(community => !userCommunityIds.includes(community.id))`.

**The Root Cause:** Because the reviewer account has already joined the exact top 5 compatible communities, the backend slices the pool to 5, and then the exclusion filter removes all 5 of them. The resulting array is `[]`. The backend slices the list *before* filtering out what the user already has, rather than generating a large pool (e.g., 20) and slicing *after* filtering.

## Final Classification
`LOGIC EXISTS BUT IS DISCONNECTED`

### 1. Root Cause
The `generateDynamicCommunities` function artificially truncates the recommendation pool to `slice(0, 5)` **before** `getRecommendedCommunities` filters out the communities the user has already joined. For users who have joined their top 5 recommendations, the available pool becomes 0.

### 2. Smallest Safe Correction
In `server/storage.ts` inside `generateDynamicCommunities`, change:
```typescript
if (compatibleCommunities.length >= 5) {
  return compatibleCommunities.slice(0, 5);
}
```
to return a larger pool (e.g., `slice(0, 20)`) or simply remove the slice entirely, since the final slicing to 5 is safely handled on the frontend in `dashboard.tsx` (Line 779: `recommendations.slice(0, 5).map(...)`).

### 3. Risk of Changing
**Very Low.** Modifying the integer in the slice operation inside `generateDynamicCommunities` carries near-zero architectural risk. It simply allows the downstream filter to process more communities, ensuring that exactly 5 unjoined communities reach the frontend. 
**Note:** Activating `joinCommunityWithRotation` is slightly higher risk as it alters the join flow and might bypass the `userTier` monetization logic currently in `routes.ts`.

### 4. Proposed Fix Plan
1.  **Fix the empty New Communities:** Increase the slice limit in `generateDynamicCommunities` from `5` to `20` so the exclusion filter has enough communities to evaluate.
2.  **Leave the disconnected rotation alone (Optional):** Since Apple App Review is Priority 1, we can either leave `joinCommunityWithRotation` disconnected and let the reviewer hit the 5-limit wall (or increase the `userTier` limit), OR we can wire up `joinCommunityWithRotation` in `routes.ts` so the reviewer experiences the seamless "swapping" behavior.

Please explicitly approve whether you want to implement only Fix #1 (New Communities truncation), or both Fix #1 and Fix #2 (Wiring up the disconnected Rotation logic).
