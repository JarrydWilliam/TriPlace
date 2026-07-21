import { config } from 'dotenv';
config();
import pg from 'pg';
const { Pool } = pg;
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const schemaName = `test_schema_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    console.log(`Creating isolated test schema: ${schemaName}`);
    await pool.query(`CREATE SCHEMA ${schemaName}`);
    await pool.query(`SET search_path TO ${schemaName}`);

    // Create the required tables
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        apple_refresh_token_encrypted TEXT,
        date_of_birth TIMESTAMP,
        terms_version INTEGER,
        terms_accepted_at TIMESTAMP,
        firebase_uid TEXT
      );
      CREATE TABLE communities (
        id SERIAL PRIMARY KEY
      );
      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER
      );
      CREATE TABLE event_attendees (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id),
        user_id INTEGER REFERENCES users(id),
        status TEXT,
        UNIQUE (event_id, user_id)
      );
      CREATE TABLE user_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER,
        reported_user_id INTEGER,
        reason TEXT,
        details TEXT,
        status TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by INTEGER
      );
      CREATE TABLE event_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER,
        event_id INTEGER,
        reason TEXT,
        details TEXT,
        status TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by INTEGER
      );
      
      INSERT INTO users (id, apple_refresh_token_encrypted) VALUES (1, 'token1'), (2, 'token2'), (3, 'token3');
      INSERT INTO communities (id) VALUES (1);
      INSERT INTO events (id) VALUES (1);
      INSERT INTO event_attendees (event_id, user_id, status) VALUES (1, 1, 'going'), (1, 2, 'going');
      INSERT INTO user_reports (reporter_id, reported_user_id, reason, status) VALUES (1, 2, 'spam', 'open'), (2, 3, 'harassment', 'resolved');
      INSERT INTO event_reports (reporter_id, event_id, reason, status) VALUES (1, 1, 'fake event', 'open'), (2, 1, 'spam', 'open');
    `);
    
    console.log('Seeded data successfully.');

    // Execute exact migration SQL
    const migrationPath = path.join(process.cwd(), 'migrations', '0002_redundant_cerebro.sql');
    let migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    await pool.query(migrationSql);

    // Verify
    const reportsRes = await pool.query('SELECT * FROM reports');
    console.log(`Migrated Row Count: ${reportsRes.rows.length}`);
    if (reportsRes.rows.length !== 4) {
      throw new Error('Migration failed to unify all reports');
    }

    // Verify users table
    const usersRes = await pool.query('SELECT * FROM users');
    if (!usersRes.rows[0].apple_refresh_token_encrypted) {
      throw new Error('Apple tokens missing after migration');
    }
    
    const userReportsRes = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename = $2', [schemaName, 'user_reports']);
    if (userReportsRes.rows.length > 0) {
      throw new Error('Legacy user_reports table was not dropped');
    }

    console.log('Final Assertions Verified: All requirements met.');

  } catch (err: any) {
    console.error('Migration test failed:', err);
    process.exitCode = 1;
  } finally {
    console.log(`Dropping schema ${schemaName}`);
    await pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await pool.end();
  }
}

runTest();
