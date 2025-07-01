/**
 * Mock Data Generation Script for Development
 * Generates realistic mock data for testing and development purposes
 */

import { devLogger } from '../utils/debug';
import mockUsers from '../data/mock-users.json';
import mockCommunities from '../data/mock-communities.json';
import mockEvents from '../data/mock-events.json';

export class MockDataGenerator {
  private users: any[] = mockUsers;
  private communities: any[] = mockCommunities;
  private events: any[] = mockEvents;

  generateUsers(count: number = 10) {
    devLogger.info(`Generating ${count} mock users...`);
    
    const generatedUsers = [];
    const names = [
      'Alex Johnson', 'Sam Smith', 'Jordan Davis', 'Casey Wilson', 'Morgan Brown',
      'Taylor Clark', 'Riley Anderson', 'Avery Martinez', 'Sage Thompson', 'Quinn Garcia'
    ];
    
    const cities = [
      { name: 'Seattle, WA', lat: 47.6062, lon: -122.3321 },
      { name: 'Denver, CO', lat: 39.7392, lon: -104.9903 },
      { name: 'Chicago, IL', lat: 41.8781, lon: -87.6298 },
      { name: 'Boston, MA', lat: 42.3601, lon: -71.0589 },
      { name: 'Miami, FL', lat: 25.7617, lon: -80.1918 }
    ];
    
    const interestCategories = [
      ['fitness', 'wellness', 'outdoor', 'sports'],
      ['tech', 'coding', 'ai', 'startups'],
      ['arts', 'music', 'creativity', 'culture'],
      ['food', 'cooking', 'travel', 'culture'],
      ['social', 'community', 'volunteering', 'environment']
    ];

    for (let i = 0; i < count; i++) {
      const city = cities[i % cities.length];
      const interests = interestCategories[i % interestCategories.length];
      
      generatedUsers.push({
        firebaseUid: `dev-gen-${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: names[i % names.length],
        interests,
        location: city.name,
        latitude: city.lat.toString(),
        longitude: city.lon.toString(),
        bio: `Generated user interested in ${interests.join(', ')}`,
        onboardingCompleted: true,
        isOnline: Math.random() > 0.3 // 70% chance of being online
      });
    }
    
    devLogger.success(`Generated ${count} mock users`);
    return generatedUsers;
  }

  generateCommunities(count: number = 8) {
    devLogger.info(`Generating ${count} mock communities...`);
    
    const generatedCommunities = [];
    const categories = ['wellness', 'tech', 'arts', 'environment', 'food', 'social', 'fitness', 'education'];
    const nameTemplates = [
      '{category} Innovation Hub',
      '{category} Community Circle',
      '{category} Enthusiasts Network',
      '{category} Collective',
      '{category} Explorers Group',
      'Local {category} Society'
    ];

    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const template = nameTemplates[i % nameTemplates.length];
      const name = template.replace('{category}', category.charAt(0).toUpperCase() + category.slice(1));
      
      generatedCommunities.push({
        name,
        description: `A vibrant community focused on ${category} interests and connections.`,
        category,
        memberCount: Math.floor(Math.random() * 50) + 10,
        location: 'Various Locations',
        isActive: true
      });
    }
    
    devLogger.success(`Generated ${count} mock communities`);
    return generatedCommunities;
  }

  generateEvents(count: number = 12) {
    devLogger.info(`Generating ${count} mock events...`);
    
    const generatedEvents = [];
    const eventTypes = [
      { category: 'wellness', titles: ['Yoga Session', 'Meditation Workshop', 'Wellness Retreat'] },
      { category: 'tech', titles: ['Coding Bootcamp', 'Tech Meetup', 'Innovation Workshop'] },
      { category: 'arts', titles: ['Art Exhibition', 'Music Concert', 'Creative Workshop'] },
      { category: 'food', titles: ['Cooking Class', 'Food Festival', 'Wine Tasting'] }
    ];

    const locations = [
      'Community Center Downtown',
      'Public Library Meeting Room',
      'Local Park Pavilion',
      'University Campus',
      'Coffee Shop Event Space'
    ];

    for (let i = 0; i < count; i++) {
      const eventType = eventTypes[i % eventTypes.length];
      const title = eventType.titles[i % eventType.titles.length];
      const futureDate = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
      
      generatedEvents.push({
        title: `${title} ${i + 1}`,
        description: `Join us for an engaging ${eventType.category} event designed to bring the community together.`,
        organizer: 'Community Organizer',
        date: futureDate.toISOString(),
        location: locations[i % locations.length],
        address: `${Math.floor(Math.random() * 9999)} Main St, City, State`,
        category: eventType.category,
        price: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 5 : 0,
        isGlobal: false
      });
    }
    
    devLogger.success(`Generated ${count} mock events`);
    return generatedEvents;
  }

  generateMockDataSet() {
    devLogger.info('Generating complete mock data set...');
    
    const dataSet = {
      users: this.generateUsers(15),
      communities: this.generateCommunities(10),
      events: this.generateEvents(20),
      timestamp: new Date().toISOString()
    };
    
    devLogger.success('Complete mock data set generated');
    return dataSet;
  }

  // Generate realistic activity data
  generateActivityData(userId: number, communityId: number) {
    return {
      userId,
      communityId,
      activityScore: Math.floor(Math.random() * 100) + 20,
      lastActivityAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
      joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Within last month
    };
  }

  // Generate realistic message data
  generateMessages(communityId: number, count: number = 10) {
    const messageTemplates = [
      "Hey everyone! Looking forward to the next meetup.",
      "Great event yesterday, thanks for organizing!",
      "Any recommendations for {category} resources?",
      "I'm new here, excited to connect with everyone!",
      "Would love to collaborate on some projects.",
      "Thanks for the warm welcome to the community!"
    ];

    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        communityId,
        senderId: Math.floor(Math.random() * 10) + 1, // Random user ID
        content: messageTemplates[i % messageTemplates.length],
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Within last day
        resonateCount: Math.floor(Math.random() * 15)
      });
    }

    return messages;
  }
}

// Export generation functions
export async function generateMockData() {
  const generator = new MockDataGenerator();
  return generator.generateMockDataSet();
}

export async function generateUsers(count: number = 10) {
  const generator = new MockDataGenerator();
  return generator.generateUsers(count);
}

export async function generateCommunities(count: number = 8) {
  const generator = new MockDataGenerator();
  return generator.generateCommunities(count);
}

export async function generateEvents(count: number = 12) {
  const generator = new MockDataGenerator();
  return generator.generateEvents(count);
}

// CLI execution
if (require.main === module) {
  const type = process.argv[2] || 'all';
  const count = parseInt(process.argv[3]) || 10;
  
  const executeGeneration = async () => {
    const generator = new MockDataGenerator();
    
    switch (type) {
      case 'users':
        await generator.generateUsers(count);
        break;
      case 'communities':
        await generator.generateCommunities(count);
        break;
      case 'events':
        await generator.generateEvents(count);
        break;
      case 'all':
      default:
        await generator.generateMockDataSet();
        break;
    }
  };
  
  executeGeneration()
    .then(() => {
      devLogger.success('Mock data generation completed');
      process.exit(0);
    })
    .catch((error) => {
      devLogger.error('Mock data generation failed', error);
      process.exit(1);
    });
}