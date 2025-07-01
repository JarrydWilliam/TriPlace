/**
 * Database Seeding Script for Development
 * Populates database with realistic test data for development and testing
 */

import { db } from '../../server/db';
import { users, communities, events, communityMembers } from '../../shared/schema';
import { devLogger } from '../utils/debug';

interface SeedUser {
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  interests: string[];
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
}

interface SeedCommunity {
  name: string;
  description: string;
  category: string;
  memberCount: number;
  location?: string;
}

interface SeedEvent {
  title: string;
  description: string;
  date: Date;
  location: string;
  category: string;
  price?: number;
}

const SEED_USERS: SeedUser[] = [
  {
    firebaseUid: 'dev-user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Johnson',
    interests: ['fitness', 'wellness', 'outdoor', 'mindfulness'],
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    state: 'NY'
  },
  {
    firebaseUid: 'dev-user-2',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Smith',
    interests: ['tech', 'coding', 'ai', 'entrepreneurship'],
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    state: 'CA'
  },
  {
    firebaseUid: 'dev-user-3',
    email: 'carol@example.com', 
    firstName: 'Carol',
    lastName: 'Davis',
    interests: ['arts', 'music', 'creativity', 'culture'],
    latitude: 34.0522,
    longitude: -118.2437,
    city: 'Los Angeles',
    state: 'CA'
  },
];

const SEED_COMMUNITIES: SeedCommunity[] = [
  {
    name: 'Fitness and Wellness Collective',
    description: 'A supportive community focused on holistic health, fitness routines, and mental wellness practices.',
    category: 'wellness',
    memberCount: 25,
    location: 'New York, NY'
  },
  {
    name: 'Tech Innovation Hub',
    description: 'Connect with developers, entrepreneurs, and tech enthusiasts building the future.',
    category: 'tech',
    memberCount: 42,
    location: 'San Francisco, CA'
  },
  {
    name: 'Creative Arts Circle',
    description: 'Artists, musicians, and creative minds sharing inspiration and collaboration opportunities.',
    category: 'arts',
    memberCount: 18,
    location: 'Los Angeles, CA'
  },
];

const SEED_EVENTS: SeedEvent[] = [
  {
    title: 'Morning Yoga & Mindfulness',
    description: 'Start your day with gentle yoga and meditation practice',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    location: 'Central Park, New York',
    category: 'wellness',
    price: 0
  },
  {
    title: 'AI & Machine Learning Meetup',
    description: 'Explore the latest developments in artificial intelligence and ML applications',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: 'Tech Hub, San Francisco',
    category: 'tech',
    price: 15
  },
  {
    title: 'Local Artist Showcase',
    description: 'Discover emerging talent and connect with the local art community',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: 'Gallery District, Los Angeles',
    category: 'arts',
    price: 10
  },
];

export class DatabaseSeeder {
  async seedAll() {
    devLogger.info('Starting database seeding...');
    
    try {
      await this.clearExistingData();
      const createdUsers = await this.seedUsers();
      const createdCommunities = await this.seedCommunities();
      await this.seedCommunityMemberships(createdUsers, createdCommunities);
      await this.seedEvents(createdCommunities);
      
      devLogger.success('Database seeding completed successfully');
    } catch (error) {
      devLogger.error('Database seeding failed', error);
      throw error;
    }
  }

  private async clearExistingData() {
    devLogger.info('Clearing existing test data...');
    
    // Clear in reverse dependency order
    await db.delete(communityMembers);
    await db.delete(events);
    await db.delete(communities);
    await db.delete(users);
    
    devLogger.info('Test data cleared');
  }

  private async seedUsers() {
    devLogger.info('Seeding users...');
    
    const createdUsers = [];
    for (const userData of SEED_USERS) {
      const user = await db.insert(users).values({
        firebaseUid: userData.firebaseUid,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        interests: userData.interests,
        latitude: userData.latitude?.toString(),
        longitude: userData.longitude?.toString(),
        location: `${userData.city}, ${userData.state}`,
        isOnline: Math.random() > 0.5, // Random online status
        lastActiveAt: new Date(),
        onboardingCompleted: true
      }).returning();
      
      createdUsers.push(user[0]);
    }
    
    devLogger.success(`Created ${createdUsers.length} test users`);
    return createdUsers;
  }

  private async seedCommunities() {
    devLogger.info('Seeding communities...');
    
    const createdCommunities = [];
    for (const communityData of SEED_COMMUNITIES) {
      const community = await db.insert(communities).values({
        name: communityData.name,
        description: communityData.description,
        category: communityData.category,
        memberCount: communityData.memberCount,
        location: communityData.location,
        lastActivityAt: new Date()
      }).returning();
      
      createdCommunities.push(community[0]);
    }
    
    devLogger.success(`Created ${createdCommunities.length} test communities`);
    return createdCommunities;
  }

  private async seedCommunityMemberships(users: any[], communities: any[]) {
    devLogger.info('Seeding community memberships...');
    
    let membershipCount = 0;
    for (const user of users) {
      // Each user joins 2-3 random communities
      const numCommunities = Math.floor(Math.random() * 2) + 2;
      const shuffledCommunities = [...communities].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numCommunities && i < shuffledCommunities.length; i++) {
        await db.insert(communityMembers).values({
          userId: user.id,
          communityId: shuffledCommunities[i].id,
          joinedAt: new Date(),
          activityScore: Math.floor(Math.random() * 100),
          lastActivityAt: new Date()
        });
        membershipCount++;
      }
    }
    
    devLogger.success(`Created ${membershipCount} community memberships`);
  }

  private async seedEvents(communities: any[]) {
    devLogger.info('Seeding events...');
    
    const createdEvents = [];
    for (const eventData of SEED_EVENTS) {
      // Associate each event with a random community
      const randomCommunity = communities[Math.floor(Math.random() * communities.length)];
      
      const event = await db.insert(events).values({
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        location: eventData.location,
        category: eventData.category,
        price: eventData.price,
        communityId: randomCommunity.id,
        isGlobal: false,
        createdAt: new Date()
      }).returning();
      
      createdEvents.push(event[0]);
    }
    
    devLogger.success(`Created ${createdEvents.length} test events`);
    return createdEvents;
  }
}

// Export seeding function for use in scripts
export async function seedDatabase() {
  const seeder = new DatabaseSeeder();
  await seeder.seedAll();
}

// CLI execution
if (require.main === module) {
  seedDatabase()
    .then(() => {
      devLogger.success('Database seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      devLogger.error('Database seeding script failed', error);
      process.exit(1);
    });
}