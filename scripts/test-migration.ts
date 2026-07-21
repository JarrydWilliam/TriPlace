import { PGlite } from "@electric-sql/pglite";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMigration() {
  console.log("Setting up standalone in-memory PostgreSQL (PGlite)...");
  const db = new PGlite();
  
  await db.exec(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      firebase_uid TEXT UNIQUE NOT NULL
    );
    CREATE TABLE communities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      creator_id INT
    );
    
    -- Legacy tables before migration
    CREATE TABLE user_reports (
      id SERIAL PRIMARY KEY,
      reporter_id INT,
      reported_user_id INT,
      reason TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE event_reports (
      id SERIAL PRIMARY KEY,
      reporter_id INT,
      event_id INT,
      reason TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
  
  // Seed data
  await db.exec(`
    INSERT INTO users (firebase_uid) VALUES ('u1'), ('u2'), ('u3');
    INSERT INTO user_reports (reporter_id, reported_user_id, reason, status) VALUES 
      (1, 2, 'spam', 'open'),
      (2, 3, 'harassment', 'resolved');
    INSERT INTO event_reports (reporter_id, event_id, reason, status) VALUES 
      (3, 1, 'inappropriate', 'open');
  `);
  
  console.log("Legacy tables seeded. User Reports: 2, Event Reports: 1.");
  
  // Load migration
  const migrationSql = fs.readFileSync(path.join(__dirname, '../migrations/0002_redundant_cerebro.sql'), 'utf-8');
  
  // Split by statement-breakpoint because PGlite exec might execute multiple, but some need to be handled sequentially
  const statements = migrationSql.split('--> statement-breakpoint');
  
  console.log("Executing migration 0002_redundant_cerebro.sql...");
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed) {
      await db.exec(trimmed);
    }
  }
  
  console.log("Migration executed successfully!");
  
  // Verify data transfer
  const res = await db.query(`SELECT * FROM reports;`);
  console.log(`Transferred Reports Count: ${res.rows.length} (Expected: 3)`);
  
  if (res.rows.length !== 3) {
    throw new Error("Data transfer failed: Count mismatch!");
  }
  
  const userReports = res.rows.filter(r => r.target_type === 'user');
  const eventReports = res.rows.filter(r => r.target_type === 'event');
  
  console.log(`User reports matched: ${userReports.length === 2}`);
  console.log(`Event reports matched: ${eventReports.length === 1}`);
  
  // Verify cleanup
  let tablesDropped = false;
  try {
    await db.query(`SELECT 1 FROM user_reports`);
  } catch (e) {
    tablesDropped = true;
  }
  
  console.log(`Legacy tables dropped: ${tablesDropped}`);
  
  if (userReports.length === 2 && eventReports.length === 1 && tablesDropped) {
    console.log("✅ Final PostgreSQL Migration Validation SUCCESSFUL!");
  } else {
    throw new Error("Validation failed");
  }
}

testMigration().catch(e => {
  console.error("❌ Migration Test Failed:", e);
  process.exit(1);
});
