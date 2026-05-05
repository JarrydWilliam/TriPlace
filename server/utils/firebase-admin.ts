/**
 * firebase-admin.ts — Server-side Firebase Admin SDK
 *
 * The SameVibe production backend uses Neon (PostgreSQL via Drizzle) for all
 * data storage. Firebase Auth is handled entirely client-side using the
 * Firebase client SDK. Firebase Admin is only needed for:
 *   - Server-side token verification (future)
 *   - Sending FCM push notifications (future)
 *
 * For now, this module is a safe stub. It will only initialize if a valid
 * GOOGLE_APPLICATION_CREDENTIALS env var (pointing to a service account JSON)
 * is present. On Vercel production, it skips initialization gracefully.
 */
import * as admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App | null {
  if (adminApp) return adminApp;

  // Only initialize if service account credentials are available
  const hasCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!hasCredentials) {
    // Running on Vercel without service account — safe to skip Admin SDK
    // All auth is handled client-side via Firebase client SDK
    return null;
  }

  try {
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
    } else {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (err) {
    console.warn("[Firebase Admin] Initialization skipped:", err);
  }

  return adminApp;
}

// Export a lazy-initialized admin reference (null-safe)
export { getAdminApp };

// Legacy export for any code that imports `db` from this file
// Returns null — callers should use Drizzle (server/db.ts) instead
export const db = null;