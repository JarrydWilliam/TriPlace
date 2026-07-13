import { db } from '../server/db.js';
import { users, communities, events, communityMembers } from '../shared/schema.js';
import { eq, isNull, and } from 'drizzle-orm';

async function run() {
  console.log('--- Starting Reviewer Events Setup ---');

  // 1. Locate Reviewer Account
  const reviewer = await db.query.users.findFirst({
    where: eq(users.email, 'samevibe.review@gmail.com')
  });

  if (!reviewer) {
    console.log('Error: Reviewer account not found.');
    process.exit(1);
  }
  console.log(`Reviewer found: ${reviewer.id} (${reviewer.email})`);

  // 2. Remove broken events (communityId: null)
  // These cause the 404 issue because there is no isolated Event Detail page
  const brokenEvents = await db.query.events.findMany({
    where: isNull(events.communityId)
  });

  if (brokenEvents.length > 0) {
    console.log(`Found ${brokenEvents.length} broken events (communityId is null). Deleting them...`);
    for (const ev of brokenEvents) {
      await db.delete(events).where(eq(events.id, ev.id));
    }
    console.log('Deleted broken events.');
  }

  // 3. Define curated events
  // We use dates 7 days in the future
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const curatedEvents = [
    {
      communityName: 'Local Adventurers',
      title: 'Sunset Trail Walk',
      category: 'outdoor',
      description: 'A relaxed group hike followed by sunset views and casual conversation.',
      location: 'San Francisco, CA',
      address: 'Presidio Trails, SF',
    },
    {
      communityName: 'Creative Collaborators',
      title: 'Creative Coffee & Project Swap',
      category: 'tech',
      description: 'Members bring a current project, exchange ideas, and meet local creatives.',
      location: 'San Francisco, CA',
      address: 'Verve Coffee Roasters, Market St',
    },
    {
      communityName: 'Wellness & Mindfulness Circle',
      title: 'Sunday Reset: Guided Breathwork',
      category: 'wellness',
      description: 'A beginner-friendly guided mindfulness and breathwork session.',
      location: 'San Francisco, CA',
      address: 'Dolores Park, SF',
    },
    {
      communityName: 'New in Town',
      title: 'New in Town Social Mixer',
      category: 'social',
      description: 'A welcoming meetup for people looking to make new local connections.',
      location: 'San Francisco, CA',
      address: 'Spark Social SF',
    },
    {
      communityName: 'Weekend Plans',
      title: 'Saturday Food Hall Meetup',
      category: 'food',
      description: 'A casual weekend gathering to explore local food vendors together.',
      location: 'San Francisco, CA',
      address: 'Ferry Building Marketplace',
    }
  ];

  // 4. Upsert events
  let createdCount = 0;
  let updatedCount = 0;

  for (const data of curatedEvents) {
    const community = await db.query.communities.findFirst({
      where: eq(communities.name, data.communityName)
    });

    if (!community) {
      console.log(`Warning: Community '${data.communityName}' not found. Skipping event.`);
      continue;
    }

    // Check if event already exists
    const existingEvent = await db.query.events.findFirst({
      where: and(
        eq(events.title, data.title),
        eq(events.communityId, community.id)
      )
    });

    if (existingEvent) {
      // Update
      await db.update(events)
        .set({
          description: data.description,
          category: data.category,
          date: futureDate,
          location: data.location,
          address: data.address,
        })
        .where(eq(events.id, existingEvent.id));
      updatedCount++;
      console.log(`Updated event: ${data.title} (Community: ${community.name})`);
    } else {
      // Create
      await db.insert(events).values({
        title: data.title,
        description: data.description,
        category: data.category,
        date: futureDate,
        location: data.location,
        address: data.address,
        communityId: community.id,
        creatorId: reviewer.id,
        latitude: community.latitude || "37.7749",
        longitude: community.longitude || "-122.4194",
        status: 'active',
        isGlobal: false,
      });
      createdCount++;
      console.log(`Created event: ${data.title} (Community: ${community.name})`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Events Created: ${createdCount}`);
  console.log(`Events Updated: ${updatedCount}`);
  console.log(`Broken events removed: ${brokenEvents.length}`);
  console.log(`Reviewer Account: Ready for TestFlight validation.`);

  process.exit(0);
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
