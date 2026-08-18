import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const allUsers = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    name: schema.users.name,
    firebaseUid: schema.users.firebaseUid,
    createdAt: schema.users.createdAt,
  }).from(schema.users);

  console.log("=========================================");
  console.log(`FOUND ${allUsers.length} REGISTERED USERS IN POSTGRESQL:`);
  console.log("=========================================");
  allUsers.forEach(u => {
    console.log(`ID: ${u.id} | Email: "${u.email}" | Name: "${u.name}" | UID: ${u.firebaseUid}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
