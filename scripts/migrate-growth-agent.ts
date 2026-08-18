import "dotenv/config";
import pkg from "pg";
const { Client } = pkg;

async function migrateGrowthTables() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("[Migration] Running Growth Agent V1 table creation...");

  const queries = [
    `
    CREATE TABLE IF NOT EXISTS growth_recommendations (
      id SERIAL PRIMARY KEY,
      market TEXT NOT NULL,
      interest TEXT NOT NULL,
      gap_size INTEGER DEFAULT 0 NOT NULL,
      user_demand_count INTEGER DEFAULT 0 NOT NULL,
      supply_count INTEGER DEFAULT 0 NOT NULL,
      reasoning TEXT NOT NULL,
      market_status TEXT DEFAULT 'New' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS growth_content_drafts (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      market TEXT,
      source_activity_ref INTEGER REFERENCES events(id) ON DELETE SET NULL,
      source_community_ref INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      target_platform TEXT DEFAULT 'instagram' NOT NULL,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      published_at TIMESTAMP,
      published_url TEXT,
      publish_error TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS growth_outreach_drafts (
      id SERIAL PRIMARY KEY,
      target_name TEXT NOT NULL,
      target_type TEXT DEFAULT 'organizer' NOT NULL,
      market TEXT,
      draft_message TEXT NOT NULL,
      reasoning TEXT,
      status TEXT DEFAULT 'draft' NOT NULL,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS growth_platform_connections (
      id SERIAL PRIMARY KEY,
      platform_name TEXT NOT NULL UNIQUE,
      connected_account TEXT NOT NULL,
      token_reference TEXT NOT NULL,
      connected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      connected_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status TEXT DEFAULT 'connected' NOT NULL
    );
    `
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log("✅ Executed SQL successfully.");
    } catch (e: any) {
      console.log("⚠️ Migration Notice:", e.message);
    }
  }

  await client.end();
  console.log("[Migration] Growth Agent V1 table creation complete.");
}

migrateGrowthTables().catch((err) => {
  console.error("Migration Failed:", err);
  process.exit(1);
});
