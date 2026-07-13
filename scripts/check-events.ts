import { db } from '../server/db.js';
import { events } from '../shared/schema.js';

async function run() {
  const evs = await db.query.events.findMany({ limit: 5 });
  console.log(JSON.stringify(evs, null, 2));
  process.exit(0);
}
run();
