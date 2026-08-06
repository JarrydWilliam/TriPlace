/**
 * migrate-slot-grants.ts
 *
 * Creates the slot_grants table required for RevenueCat idempotency.
 * Safe to run multiple times — uses IF NOT EXISTS throughout.
 *
 * Usage:
 *   npx tsx scripts/migrate-slot-grants.ts
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log("Creating slot_grants table...");

  await sql`
    CREATE TABLE IF NOT EXISTS slot_grants (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      txn_key     TEXT    NOT NULL,
      product_id  TEXT,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS slot_grants_txn_key_unique
      ON slot_grants (txn_key)
  `;

  console.log("✅ slot_grants table ready.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
