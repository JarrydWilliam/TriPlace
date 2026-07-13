import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";

async function run() {
  const storage = new DatabaseStorage();
  const reviewer = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });
  
  const recommended = await storage.getRecommendedCommunities([], undefined, reviewer!.id);
  console.log(`Final returned: ${recommended.length}`);
  recommended.forEach(c => console.log(` - ${c.name}`));
  process.exit(0);
}
run().catch(console.error);
