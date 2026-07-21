import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function runTest() {
  console.log("Starting Disposable PostgreSQL Migration Test...");
  const db = new PGlite();
  
  try {
    console.log("Locating migration files...");
    const files = fs.readdirSync("migrations");
    const m0002 = files.find(f => f.startsWith("0002_") && f.endsWith(".sql"));
    
    console.log("Setting up pre-0002 schema...");
    await db.exec(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY, 
        username TEXT, 
        display_name TEXT, 
        apple_user_id TEXT,
        created_at TIMESTAMP
      );
      CREATE TABLE events (
        id SERIAL PRIMARY KEY, 
        title TEXT, 
        description TEXT, 
        location TEXT, 
        date TEXT, 
        max_attendees INT, 
        current_attendees INT, 
        category TEXT, 
        created_by INT, 
        is_private BOOLEAN, 
        is_live BOOLEAN, 
        creator_id INT
      );
      CREATE TABLE communities (
        id SERIAL PRIMARY KEY, 
        name TEXT, 
        description TEXT, 
        category TEXT, 
        created_by INT
      );
      CREATE TABLE user_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INT,
        reported_user_id INT,
        reason TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE event_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INT,
        event_id INT,
        reason TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Inserting baseline data...");
    await db.exec(`
      INSERT INTO users (id, username, display_name, apple_user_id) VALUES (1, 'creator1', 'Creator', 'apple1');
      INSERT INTO users (id, username, display_name, apple_user_id) VALUES (2, 'reporter1', 'Reporter', 'apple2');
      INSERT INTO users (id, username, display_name, apple_user_id) VALUES (3, 'target1', 'Target', 'apple3');
      
      INSERT INTO events (id, title, description, location, date, max_attendees, current_attendees, category, created_by, is_private, is_live, creator_id)
      VALUES (1, 'Event 1', 'Desc', 'Loc', 'Date', 10, 1, 'sports', 1, false, false, 1);
      
      INSERT INTO communities (id, name, description, category, created_by)
      VALUES (1, 'Comm 1', 'Desc', 'sports', 1);
      
      INSERT INTO user_reports (reporter_id, reported_user_id, reason, status)
      VALUES (2, 3, 'Spam', 'open');
      
      INSERT INTO event_reports (reporter_id, event_id, reason, status)
      VALUES (2, 1, 'Inappropriate', 'open');
    `);
    
    console.log("Applying 0002 (Transfer & Schema)...");
    await db.exec(fs.readFileSync(`migrations/${m0002}`, "utf-8"));
    
    console.log("Verifying migration outcomes...");
    
    // Check reports
    const reports = await db.query(`SELECT * FROM reports`);
    console.log("Reports count:", reports.rows.length);
    if (reports.rows.length !== 2) throw new Error("Missing reports!");
    
    // Check legacy tables dropped
    let hasUserReports = false;
    try { await db.query(`SELECT 1 FROM user_reports`); hasUserReports = true; } catch (e) {}
    if (hasUserReports) throw new Error("user_reports not dropped!");
    
    // Delete creator
    await db.exec(`DELETE FROM users WHERE id = 1`);
    
    // Check creator_id cascade null
    const ev = await db.query(`SELECT creator_id FROM events WHERE id = 1`);
    if (ev.rows[0].creator_id !== null) throw new Error("events.creator_id did not set null!");
    
    const comm = await db.query(`SELECT creator_id FROM communities WHERE id = 1`);
    if (comm.rows[0].creator_id !== null) throw new Error("communities.creator_id did not set null!");
    
    console.log("Disposable PostgreSQL migration test passed.");
  } catch (e) {
    console.error("Test Failed:", e);
  }
}

runTest();
