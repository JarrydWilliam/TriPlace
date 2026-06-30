import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const queries = [
    "ALTER TABLE events ADD COLUMN tags TEXT[] DEFAULT '{}';",
    "ALTER TABLE events ADD COLUMN attendee_count INTEGER DEFAULT 0;",
    "ALTER TABLE events ADD COLUMN max_attendees INTEGER;",
    "ALTER TABLE events ADD COLUMN latitude TEXT;",
    "ALTER TABLE events ADD COLUMN longitude TEXT;",
    "ALTER TABLE events ADD COLUMN creator_id INTEGER;",
    "ALTER TABLE events ADD COLUMN community_id INTEGER;",
    "ALTER TABLE events ADD COLUMN is_global BOOLEAN DEFAULT false;"
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('Success:', q);
    } catch (e) {
      console.log('Error for', q, ':', e.message);
    }
  }

  await client.end();
}

migrate();
