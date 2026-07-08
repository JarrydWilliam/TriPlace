import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("Connecting to Neon Postgres...");

  const demoCommunities = [
    {
      name: "Local Run Club",
      description: "Morning runs, weekend long runs, and post-run coffees! All paces welcome. Let's hit the pavement together.",
      category: "Sports & Fitness",
      image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 142,
      isActive: true,
    },
    {
      name: "Tech Founders Hub",
      description: "A community for early-stage startup founders. Network, share ideas, and find co-founders. Weekly coffee meetups.",
      category: "Professional",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 89,
      isActive: true,
    },
    {
      name: "Weekend Hikers",
      description: "Exploring the best trails around the city every weekend. Disconnect from screens and connect with nature.",
      category: "Outdoors",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 315,
      isActive: true,
    },
    {
      name: "Board Game Geeks",
      description: "From Catan to complex strategy games. We meet Thursday nights at local breweries to play and hang out.",
      category: "Hobbies",
      image: "https://images.unsplash.com/photo-1611891487122-207578367d98?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 64,
      isActive: true,
    }
  ];

  console.log("Seeding demo communities...");

  for (const comm of demoCommunities) {
    const existing = await db.select().from(schema.communities).where(eq(schema.communities.name, comm.name));
    if (existing.length === 0) {
      await db.insert(schema.communities).values(comm);
      console.log(`✅ Created: ${comm.name}`);
    } else {
      console.log(`⏭️ Skipped: ${comm.name} (already exists)`);
    }
  }

  console.log("Community seeding complete!");
}

run().catch(console.error);
