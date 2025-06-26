import { 
  users, communities, events, messages, kudos, communityMembers, eventAttendees, activityFeed,
  type User, type InsertUser, type Community, type InsertCommunity, 
  type Event, type InsertEvent, type Message, type InsertMessage,
  type Kudos, type InsertKudos, type CommunityMember, type InsertCommunityMember,
  type EventAttendee, type InsertEventAttendee, type ActivityFeedItem
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, asc } from "drizzle-orm";
import { aiMatcher } from "./ai-matching";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getCommunity(id: number): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  getCommunitiesByCategory(category: string): Promise<Community[]>;
  getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]>;
  getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles?: number): Promise<User[]>;
  getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined>;
  
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<boolean>;
  getUserCommunities(userId: number): Promise<Community[]>;
  getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]>;
  getCommunityMembers(communityId: number): Promise<User[]>;
  updateCommunityActivity(userId: number, communityId: number): Promise<void>;
  joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }>;
  
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  
  registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee>;
  unregisterFromEvent(userId: number, eventId: number): Promise<boolean>;
  getUserEvents(userId: number): Promise<Event[]>;
  getEventAttendees(eventId: number): Promise<User[]>;
  
  getMessage(id: number): Promise<Message | undefined>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  
  getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]>;
  sendCommunityMessage(message: InsertMessage & { communityId: number }): Promise<Message>;
  resonateMessage(messageId: number, userId: number): Promise<boolean>;
  
  getCommunityEvents(communityId: number): Promise<Event[]>;
  
  getKudos(id: number): Promise<Kudos | undefined>;
  getUserKudosReceived(userId: number): Promise<Kudos[]>;
  getUserKudosGiven(userId: number): Promise<Kudos[]>;
  giveKudos(kudos: InsertKudos): Promise<Kudos>;
  
  getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]>;
  addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem>;
}

export class DatabaseStorage implements IStorage {
  
  async initializeData() {
    try {
      const existingCommunities = await db.select().from(communities).limit(1);
      if (existingCommunities.length > 0) {
        return;
      }

      const communityData = [
        {
          name: "Mindful Yoga SF",
          description: "Weekly yoga sessions in Golden Gate Park. Focus on mindfulness, meditation, and inner peace.",
          category: "wellness",
          image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          memberCount: 248,
          location: "San Francisco, CA",
          isActive: true
        },
        {
          name: "Bay Area Tech Innovators",
          description: "Connect with developers, entrepreneurs, and tech enthusiasts. Weekly meetups on programming and startups.",
          category: "tech",
          image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          memberCount: 156,
          location: "San Francisco, CA",
          isActive: true
        },
        {
          name: "Urban Sketchers Collective",
          description: "Explore the city with fellow artists. Weekly drawing sessions at iconic locations across the Bay Area.",
          category: "creative",
          image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          memberCount: 89,
          location: "San Francisco, CA",
          isActive: true
        },
        {
          name: "Weekend Warriors Hiking Club",
          description: "Adventure seekers unite! Explore trails, peaks, and hidden gems in Northern California.",
          category: "outdoor",
          image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          memberCount: 312,
          location: "San Francisco, CA",
          isActive: true
        },
        {
          name: "Culinary Explorers Society",
          description: "Discover new flavors and cooking techniques. Monthly potlucks and restaurant adventures.",
          category: "food",
          image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          memberCount: 203,
          location: "San Francisco, CA",
          isActive: true
        }
      ];

      await db.insert(communities).values(communityData);

      const eventData = [
        {
          title: "Morning Yoga in the Park",
          description: "Start your day with peaceful yoga in Golden Gate Park",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          location: "Golden Gate Park",
          address: "Golden Gate Park, San Francisco, CA",
          organizer: "Sarah Chen",
          category: "wellness",
          latitude: "37.7694",
          longitude: "-122.4862",
          attendeeCount: 12,
          maxAttendees: 20,
          image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
        },
        {
          title: "Tech Talk: AI in Web Development",
          description: "Join us for an insightful discussion on AI tools for developers",
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          location: "SF Tech Hub",
          address: "123 Market St, San Francisco, CA",
          organizer: "Alex Rodriguez",
          category: "tech",
          latitude: "37.7749",
          longitude: "-122.4194",
          attendeeCount: 25,
          maxAttendees: 50,
          image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
        }
      ];

      await db.insert(events).values(eventData);
    } catch (error) {
      console.error('Failed to initialize data:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community || undefined;
  }

  async getAllCommunities(): Promise<Community[]> {
    return await db.select().from(communities).where(eq(communities.isActive, true));
  }

  async getCommunitiesByCategory(category: string): Promise<Community[]> {
    return await db.select().from(communities)
      .where(and(eq(communities.category, category), eq(communities.isActive, true)));
  }

  async getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]> {
    const allCommunities = await this.getAllCommunities();
    
    if (userId && interests.length > 0) {
      try {
        const user = await this.getUser(userId);
        if (user) {
          const userEvents = await this.getUserEvents(userId);
          const recommendations = await aiMatcher.generateCommunityRecommendations(user, allCommunities, userLocation);
          
          if (userEvents.length > 0) {
            const newCommunities = await aiMatcher.generateMissingCommunities(user);
          }
          
          return recommendations.map(r => r.community);
        }
      } catch (error) {
        console.error('AI matching failed, using fallback:', error);
      }
    }

    return allCommunities
      .map(community => ({
        community,
        score: this.calculateInterestScore(community, interests) + 
               this.calculateEngagementScore(community) +
               (userLocation ? 20 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.community);
  }

  private calculateInterestScore(community: Community, userInterests: string[]): number {
    const communityInterests = this.getCommunityInterests(community);
    const overlap = this.calculateInterestOverlap(userInterests, communityInterests);
    return overlap * 40;
  }

  private calculateEngagementScore(community: Community): number {
    const memberCount = community.memberCount || 0;
    if (memberCount < 10) return 5;
    if (memberCount < 50) return 15;
    if (memberCount < 100) return 25;
    if (memberCount < 200) return 30;
    return 35;
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const [community] = await db.insert(communities).values(insertCommunity).returning();
    return community;
  }

  async updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined> {
    const [community] = await db.update(communities).set(updates).where(eq(communities.id, id)).returning();
    return community || undefined;
  }

  async joinCommunity(userId: number, communityId: number): Promise<CommunityMember> {
    const [member] = await db.insert(communityMembers).values({
      userId,
      communityId,
      joinedAt: new Date(),
      lastActivityAt: new Date(),
      activityScore: 1,
      isActive: true
    }).returning();
    return member;
  }

  async leaveCommunity(userId: number, communityId: number): Promise<boolean> {
    const result = await db.delete(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
    return (result.rowCount || 0) > 0;
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    const result = await db.select({
      community: communities
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(eq(communityMembers.userId, userId));
    
    return result.map(r => r.community);
  }

  async getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]> {
    const result = await db.select({
      community: communities,
      activityScore: communityMembers.activityScore,
      lastActivityAt: communityMembers.lastActivityAt
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)))
    .orderBy(desc(communityMembers.lastActivityAt));
    
    return result.map(r => ({
      ...r.community,
      activityScore: r.activityScore || 0,
      lastActivityAt: r.lastActivityAt || new Date()
    }));
  }

  async getCommunityMembers(communityId: number): Promise<User[]> {
    const result = await db.select({
      user: users
    })
    .from(communityMembers)
    .innerJoin(users, eq(communityMembers.userId, users.id))
    .where(eq(communityMembers.communityId, communityId));
    
    return result.map(r => r.user);
  }

  async updateCommunityActivity(userId: number, communityId: number): Promise<void> {
    await db.update(communityMembers)
      .set({
        lastActivityAt: new Date(),
        activityScore: sql`${communityMembers.activityScore} + 1`
      })
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
  }

  async joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }> {
    const userCommunities = await this.getUserActiveCommunities(userId);
    
    let dropped: Community | undefined;
    
    if (userCommunities.length >= 5) {
      const leastActive = userCommunities.reduce((least, current) => 
        current.activityScore < least.activityScore ? current : least
      );
      
      await this.leaveCommunity(userId, leastActive.id);
      dropped = leastActive;
    }
    
    const joined = await this.joinCommunity(userId, communityId);
    return { joined, dropped };
  }

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles: number = 50): Promise<User[]> {
    return await this.getCommunityMembers(communityId);
  }

  async getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }> {
    let members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 50);
    let radiusUsed = 50;
    
    if (members.length === 0) {
      members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 100);
      radiusUsed = 100;
    }
    
    return { members, radiusUsed };
  }

  private getCommunityInterests(community: Community): string[] {
    const categoryInterests: { [key: string]: string[] } = {
      wellness: ['yoga', 'meditation', 'mindfulness', 'health', 'fitness'],
      tech: ['programming', 'technology', 'innovation', 'startups', 'ai'],
      creative: ['art', 'drawing', 'design', 'creativity', 'sketching'],
      outdoor: ['hiking', 'adventure', 'nature', 'outdoors', 'trails'],
      food: ['cooking', 'culinary', 'restaurants', 'food', 'recipes']
    };
    
    return categoryInterests[community.category] || [];
  }

  private calculateInterestOverlap(userInterests: string[], targetInterests: string[]): number {
    if (userInterests.length === 0 || targetInterests.length === 0) return 0;
    
    const userSet = new Set(userInterests.map(i => i.toLowerCase()));
    const targetSet = new Set(targetInterests.map(i => i.toLowerCase()));
    
    let matches = 0;
    for (const interest of userSet) {
      if (targetSet.has(interest)) matches++;
    }
    
    return matches / Math.max(userInterests.length, targetInterests.length);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(asc(events.date));
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    return await this.getAllEvents();
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.category, category));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events)
      .where(sql`${events.date} >= NOW()`)
      .orderBy(asc(events.date));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee> {
    const [attendee] = await db.insert(eventAttendees).values({
      userId,
      eventId,
      status,
      registeredAt: new Date()
    }).returning();
    return attendee;
  }

  async unregisterFromEvent(userId: number, eventId: number): Promise<boolean> {
    const result = await db.delete(eventAttendees)
      .where(and(eq(eventAttendees.userId, userId), eq(eventAttendees.eventId, eventId)));
    return (result.rowCount || 0) > 0;
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    const result = await db.select({
      event: events
    })
    .from(eventAttendees)
    .innerJoin(events, eq(eventAttendees.eventId, events.id))
    .where(eq(eventAttendees.userId, userId));
    
    return result.map(r => r.event);
  }

  async getEventAttendees(eventId: number): Promise<User[]> {
    const result = await db.select({
      user: users
    })
    .from(eventAttendees)
    .innerJoin(users, eq(eventAttendees.userId, users.id))
    .where(eq(eventAttendees.eventId, eventId));
    
    return result.map(r => r.user);
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]> {
    const userMessages = await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    const conversations: { user: User, lastMessage: Message }[] = [];
    const seenUsers = new Set<number>();
    
    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!seenUsers.has(otherUserId)) {
        const otherUser = await this.getUser(otherUserId);
        if (otherUser) {
          conversations.push({ user: otherUser, lastMessage: message });
          seenUsers.add(otherUserId);
        }
      }
    }
    
    return conversations;
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      createdAt: new Date(),
      isRead: false
    }).returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const result = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getKudos(id: number): Promise<Kudos | undefined> {
    const [kudosRecord] = await db.select().from(kudos).where(eq(kudos.id, id));
    return kudosRecord || undefined;
  }

  async getUserKudosReceived(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos).where(eq(kudos.receiverId, userId));
  }

  async getUserKudosGiven(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos).where(eq(kudos.giverId, userId));
  }

  async giveKudos(insertKudos: InsertKudos): Promise<Kudos> {
    const [kudosRecord] = await db.insert(kudos).values({
      ...insertKudos,
      createdAt: new Date()
    }).returning();
    return kudosRecord;
  }

  async getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]> {
    return await db.select().from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt));
  }

  async addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem> {
    const [activity] = await db.insert(activityFeed).values({
      userId,
      type,
      content: JSON.stringify(content),
      createdAt: new Date()
    }).returning();
    return activity;
  }

  async getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]> {
    return [];
  }

  async sendCommunityMessage(messageData: InsertMessage & { communityId: number }): Promise<Message> {
    const [message] = await db.insert(messages).values({
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      createdAt: new Date(),
      isRead: false
    }).returning();
    return message;
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    return true;
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    return await this.getAllEvents();
  }
}

const databaseStorage = new DatabaseStorage();
databaseStorage.initializeData();

export const storage = databaseStorage;