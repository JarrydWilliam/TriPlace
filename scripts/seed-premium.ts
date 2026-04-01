
import { db } from "../server/db";
import { users, communities, events, posts, postKudos, communityMessages } from "@shared/schema";
import { hashPassword } from "../server/auth";

async function seedPremium() {
  console.log("🌱 Starting Premium Seeding...");

  // 1. Create Premium Persona Users
  const personas = [
    { username: "alex_hikes", name: "Alex Rover", bio: "Always finding new trails. Nature is my third place.", interests: ["hiking", "photography", "outdoors"] },
    { username: "sarah_codes", name: "Sarah Dev", bio: "Building the next big thing. Coffee addict.", interests: ["tech", "startup", "coding"] },
    { username: "jay_beats", name: "Jay Music", bio: "Vinyl collector and bedroom producer.", interests: ["music", "vinyl", "jazz"] },
    { username: "yoga_mia", name: "Mia Flow", bio: "Breathe in, breathe out.", interests: ["yoga", "mindfulness", "wellness"] },
    { username: "chen_eats", name: "David Chen", bio: "Chasing the best ramen in the city.", interests: ["foodie", "cooking", "restaurants"] },
  ];

  const userIds: number[] = [];
  const passwordHash = await hashPassword("password123");

  for (const p of personas) {
    const [user] = await db.insert(users).values({
      username: p.username,
      password: passwordHash,
      displayName: p.name,
      bio: p.bio,
      interests: p.interests,
      location: "San Francisco, CA",
      onboardingCompleted: true,
      email: `${p.username}@example.com`,
      // Random coordinates around SF for realism
      latitude: (37.7749 + (Math.random() - 0.5) * 0.1).toString(),
      longitude: (-122.4194 + (Math.random() - 0.5) * 0.1).toString(),
    }).returning();
    userIds.push(user.id);
    console.log(`Created user: ${user.username}`);
  }

  // 2. Create High-End Communities (Tribes)
  const tribes = [
    { name: "Sunrise Cold Plunge", description: "We meet at 6am. We freeze. We feel alive.", tags: ["wellness", "challenge", "morning"] },
    { name: "Strictly Vinyl", description: "Audiophiles sharing rare cuts and listening sessions.", tags: ["music", "vinyl", "hifi"] },
    { name: "Startup Graveyard", description: "Celebrating failures and learning from them. No ego allowed.", tags: ["tech", "startup", "growth"] },
    { name: "Urban Sketchers", description: "Capturing the city one page at a time.", tags: ["art", "drawing", "urban"] },
    { name: "Rooftop Cinema Club", description: "Cult classics under the stars.", tags: ["movies", "social", "nightlife"] },
  ];

  const communityIds: number[] = [];
  for (const t of tribes) {
    const [comm] = await db.insert(communities).values({
      name: t.name,
      description: t.description,
      tags: t.tags,
      location: "San Francisco, CA",
      latitude: (37.7749 + (Math.random() - 0.5) * 0.05).toString(),
      longitude: (-122.4194 + (Math.random() - 0.5) * 0.05).toString(), 
      creatorId: userIds[0] // Alex owns them all for now
    }).returning();
    communityIds.push(comm.id);
    console.log(`Created community: ${comm.name}`);
  }

  // 3. Create Curated Events
  const eventsList = [
    { title: "Full Moon Silent Disco", description: "Headphones on, world off. Beach side dancing.", dateShift: 2, tags: ["music", "dance", "nature"] },
    { title: "Founders & Failures Brunch", description: "Real talk about building products. Mimosas included.", dateShift: 1, tags: ["startup", "tech", "brunch"] },
    { title: "Golden Gate Sunset Hike", description: "Photography walk across the bridge during golden hour.", dateShift: 3, tags: ["hiking", "photography", "views"] },
    { title: "Underground Jazz Jam", description: "Secret location in the Mission. Password required.", dateShift: 0, tags: ["jazz", "music", "nightlife"] },
    { title: "Sourdough Workshop", description: "Learn to bake the perfect loaf with starter provided.", dateShift: 5, tags: ["cooking", "food", "workshop"] },
  ];

  for (const e of eventsList) {
    const eventTime = new Date();
    eventTime.setDate(eventTime.getDate() + e.dateShift);
    eventTime.setHours(18, 0, 0, 0);

    const [evt] = await db.insert(events).values({
      title: e.title,
      description: e.description,
      startTime: eventTime,
      endTime: new Date(eventTime.getTime() + 3 * 60 * 60 * 1000), // 3 hours
      location: "San Francisco, CA",
      latitude: (37.7749 + (Math.random() - 0.5) * 0.05).toString(),
      longitude: (-122.4194 + (Math.random() - 0.5) * 0.05).toString(),
      creatorId: userIds[1],
      tags: e.tags
    }).returning();
    console.log(`Created event: ${evt.title}`);
  }

  // 4. Seed Social Proof (Posts & Kudos)
  // Alex posts in Strictly Vinyl
  const [post1] = await db.insert(posts).values({
    communityId: communityIds[1], // Strictly Vinyl
    authorId: userIds[0], // Alex
    content: "Just found an original press of Kind of Blue. The crackle is magical.",
  }).returning();

  // Everyone likes it
  for (const uid of userIds) {
    if (uid === userIds[0]) continue;
    await db.insert(postKudos).values({ postId: post1.id, giverId: uid });
  }

  // Mia posts in Sunrise Cold Plunge
  const [post2] = await db.insert(posts).values({
    communityId: communityIds[0], // Cold Plunge
    authorId: userIds[3], // Mia
    content: "The water was 48 degrees today! Who else is feeling electrified?",
  }).returning();

   // Jay likes it
   await db.insert(postKudos).values({ postId: post2.id, giverId: userIds[2] });

   // 5. Seed Messages
   await db.insert(communityMessages).values({
     communityId: communityIds[0],
     senderId: userIds[1],
     content: "I'll be there tomorrow! Bringing extra towels."
   });

   console.log("✅ Premium Seeding Complete.");
   process.exit(0);
}

seedPremium().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
