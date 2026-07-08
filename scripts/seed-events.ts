import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const reviewerEmail = 'samevibe.review@gmail.com';
  let users = await db.select().from(schema.users).where(eq(schema.users.email, reviewerEmail));
  let reviewer = users[0];

  if (!reviewer) {
    console.log("Creating reviewer account...");
    const [newUser] = await db.insert(schema.users).values({
      username: 'apple_reviewer',
      email: reviewerEmail,
      password: 'hash', 
      firebaseUid: 'KZF2qV18HsRAx8PhMzHaEC5oVGk1',
      displayName: 'Apple Reviewer',
      onboardingCompleted: true,
      latitude: '37.7749',
      longitude: '-122.4194'
    }).returning();
    reviewer = newUser;
  } else {
    console.log("Updating reviewer account...");
    await db.update(schema.users).set({
      onboardingCompleted: true,
      latitude: '37.7749',
      longitude: '-122.4194'
    }).where(eq(schema.users.id, reviewer.id));
  }

  const eventsList = [
    { title: "Full Moon Silent Disco", description: "Headphones on, world off. Beach side dancing.", dateShift: 2, tags: ["music", "dance", "nature"], category: "music" },
    { title: "Founders & Failures Brunch", description: "Real talk about building products. Mimosas included.", dateShift: 1, tags: ["startup", "tech", "brunch"], category: "tech" },
    { title: "Golden Gate Sunset Hike", description: "Photography walk across the bridge during golden hour.", dateShift: 3, tags: ["hiking", "photography", "views"], category: "outdoor" },
    { title: "Underground Jazz Jam", description: "Secret location in the Mission. Password required.", dateShift: 0, tags: ["jazz", "music", "nightlife"], category: "music" },
    { title: "Sourdough Workshop", description: "Learn to bake the perfect loaf with starter provided.", dateShift: 5, tags: ["cooking", "food", "workshop"], category: "food" },
  ];

  for (const e of eventsList) {
    const eventTime = new Date();
    eventTime.setDate(eventTime.getDate() + e.dateShift);
    
    await db.insert(schema.events).values({
      title: e.title,
      description: e.description,
      date: eventTime,
      location: "San Francisco, CA",
      address: "San Francisco, CA",
      latitude: (37.7749 + (Math.random() - 0.5) * 0.05).toString(),
      longitude: (-122.4194 + (Math.random() - 0.5) * 0.05).toString(),
      creatorId: reviewer.id,
      category: e.category,
      tags: e.tags,
      status: "active"
    });
    console.log(`Created event: ${e.title}`);
  }

  console.log("Done.");
}
run();
