/**
 * migrate-avatars-to-firebase.ts
 *
 * One-time migration: finds every user whose avatar column contains a Base64
 * data URI, uploads the image to Firebase Storage under avatars/{userId}/,
 * then replaces the DB value with the permanent HTTPS download URL.
 *
 * Architecture rule enforced here:
 *   DB avatar column = HTTPS URL   (never raw Base64)
 *
 * Safe to re-run — users with an HTTPS URL are skipped automatically.
 *
 * Usage:
 *   npx tsx scripts/migrate-avatars-to-firebase.ts
 *
 * Prerequisites:
 *   - DATABASE_URL in your .env
 *   - Firebase Admin SDK credentials (Application Default Credentials or
 *     GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON)
 *   - firebase-admin installed: npm install --save-dev firebase-admin
 */

import * as dotenv from "dotenv";
dotenv.config();

import * as admin from "firebase-admin";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { sql } from "drizzle-orm";

// ─── Firebase Admin initialisation ────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    // Resolves the bucket name — accepts "project-id" or "project-id.appspot.com"
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
      ? `${process.env.VITE_FIREBASE_STORAGE_BUCKET}.appspot.com`
      : undefined,
  });
}

const bucket = admin.storage().bucket();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the value is a Base64 data URI (data:image/...) */
function isBase64DataUri(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

/**
 * Decodes a Base64 data URI into a Buffer plus metadata.
 */
function decodeBase64Avatar(dataUri: string): {
  buffer: Buffer;
  mimeType: string;
  extension: string;
} {
  const match = dataUri.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid Base64 data URI format");

  const mimeType  = match[1];
  const base64    = match[2];
  const buffer    = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";

  return { buffer, mimeType, extension };
}

// ─── Migration ────────────────────────────────────────────────────────────────

async function migrateAvatars(): Promise<void> {
  console.log("🚀 SameVibe avatar migration: Base64 → Firebase Storage");
  console.log("─".repeat(60));

  const allUsers = await db.select({
    id:     users.id,
    email:  users.email,
    avatar: users.avatar,
  }).from(users);

  const toMigrate  = allUsers.filter((u) => isBase64DataUri(u.avatar));
  const alreadyUrl = allUsers.filter((u) => u.avatar && !isBase64DataUri(u.avatar));

  console.log(`Total users:         ${allUsers.length}`);
  console.log(`Already HTTPS URLs:  ${alreadyUrl.length}  (skipped)`);
  console.log(`Need migration:      ${toMigrate.length}`);
  console.log("─".repeat(60));

  if (toMigrate.length === 0) {
    console.log("✅ Nothing to migrate. All avatars are already HTTPS URLs.");
    return;
  }

  let succeeded = 0;
  let failed    = 0;

  for (const u of toMigrate) {
    try {
      const { buffer, mimeType, extension } = decodeBase64Avatar(u.avatar!);

      const storagePath = `avatars/${u.id}/${Date.now()}_avatar.${extension}`;
      const storageFile = bucket.file(storagePath);

      await storageFile.save(buffer, {
        metadata: { contentType: mimeType },
      });

      // Make public so the URL is directly accessible without signing
      await storageFile.makePublic();
      const downloadUrl = storageFile.publicUrl();

      // Replace Base64 with HTTPS URL in the DB
      await db
        .update(users)
        .set({ avatar: downloadUrl })
        .where(sql`${users.id} = ${u.id}`);

      console.log(`  ✓ user ${u.id} (${u.email})`);
      succeeded++;
    } catch (err) {
      console.error(`  ✗ user ${u.id} (${u.email}) FAILED:`, err);
      failed++;
    }
  }

  console.log("─".repeat(60));
  console.log(`Migration complete.  Succeeded: ${succeeded}  Failed: ${failed}`);

  if (failed > 0) {
    console.warn("⚠️  Some avatars failed. Re-run to retry (already-migrated users are skipped).");
    process.exit(1);
  } else {
    console.log("✅ All avatars successfully migrated to Firebase Storage.");
  }
}

migrateAvatars().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
