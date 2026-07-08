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
      name: "New in Town",
      description: "Just moved here? Join us to explore the city, meet new people, and find your footing. Weekly meetups at local spots.",
      category: "social",
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 120,
      isActive: true,
    },
    {
      name: "Weekend Plans",
      description: "Don't spend your weekend alone! We organize group activities from brunch to movie nights and spontaneous road trips.",
      category: "social",
      image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 245,
      isActive: true,
    },
    {
      name: "Live Music",
      description: "For concert goers and local band enthusiasts. We check out small venues, dive bars, and outdoor festivals.",
      category: "music",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 189,
      isActive: true,
    },
    {
      name: "Food & Drinks",
      description: "Foodies unite! Exploring the best local restaurants, hidden gems, and cocktail bars. Food comas guaranteed.",
      category: "food",
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 312,
      isActive: true,
    },
    {
      name: "Outdoor Adventures",
      description: "Hiking, kayaking, and everything outdoors. Let's disconnect from screens and connect with nature together.",
      category: "outdoor",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 420,
      isActive: true,
    },
    {
      name: "Fitness & Wellness",
      description: "Run clubs, yoga in the park, and accountability partners. Let's reach our fitness goals together.",
      category: "wellness",
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 156,
      isActive: true,
    },
    {
      name: "Tech & Creatives",
      description: "Founders, designers, coders, and makers. Networking, co-working, and sharing what we're building.",
      category: "tech",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      location: "37.7749,-122.4194",
      memberCount: 278,
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
