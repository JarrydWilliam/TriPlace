import { db } from "./db";
import { 
  users, communities, communityMembers, events, eventAttendees, 
  messages, kudos, activityFeed,
  User, InsertUser, Community, InsertCommunity, Event, InsertEvent,
  Message, InsertMessage, Kudos, InsertKudos, CommunityMember, InsertCommunityMember,
  EventAttendee, ActivityFeedItem
} from "@shared/schema";
import { eq, desc, asc, sql, and, or, count, ne, inArray } from "drizzle-orm";
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
      // Check if communities already exist
      const existingCommunities = await db.select().from(communities);
      if (existingCommunities.length > 0) {
        return;
      }

      // No preset communities - all communities will be AI-generated based on collective user inputs

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
    if (userId && userLocation) {
      try {
        const user = await this.getUser(userId);
        if (user) {
          // Get all users for collective pattern analysis
          const allUsers = await db.select().from(users);
          
          // Generate dynamic communities based on collective user inputs
          const generatedCommunities = await aiMatcher.generateDynamicCommunities(
            allUsers,
            user,
            userLocation
          );
          
          // Create communities that meet requirements
          const createdCommunities: Community[] = [];
          
          for (const genCommunity of generatedCommunities) {
            // Check if community already exists
            const existing = await db.select().from(communities)
              .where(eq(communities.name, genCommunity.name));
            
            if (existing.length === 0) {
              // Create new dynamic community
              const newCommunity = await this.createCommunity({
                name: genCommunity.name,
                description: genCommunity.description,
                category: genCommunity.category,
                location: genCommunity.suggestedLocation,
                isActive: true,
                image: this.getDefaultCommunityImage(genCommunity.category)
              });
              
              createdCommunities.push(newCommunity);
            } else {
              createdCommunities.push(existing[0]);
            }
          }
          
          // Filter by 70%+ interest match and geographic requirements
          const compatibleCommunities = this.filterCommunitiesByCompatibility(
            createdCommunities, 
            user, 
            userLocation, 
            interests
          );
          
          return compatibleCommunities;
        }
      } catch (error) {
        console.error('Dynamic community generation failed:', error);
      }
    }

    // Return empty array if no dynamic communities can be generated - no preset communities
    return [];
  }

  private getDefaultCommunityImage(category: string): string {
    const images: Record<string, string> = {
      'tech': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300',
      'creative': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300',
      'wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300',
      'outdoor': 'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300',
      'food': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300',
      'professional': 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'
    };
    return images[category] || images['tech'];
  }

  private filterCommunitiesByCompatibility(
    communities: Community[], 
    user: User, 
    userLocation: { lat: number, lon: number }, 
    interests: string[]
  ): Community[] {
    return communities.filter(community => {
      // Calculate interest match score
      const communityInterests = this.getCommunityInterests(community);
      const interestOverlap = this.calculateInterestOverlap(interests, communityInterests);
      
      // Require 70%+ interest match
      if (interestOverlap < 0.7) return false;
      
      // Check geographic requirements (50-100 mile radius)
      if (community.location && userLocation) {
        const distance = this.calculateDistance(
          userLocation.lat, userLocation.lon,
          this.parseLocationCoordinates(community.location)
        );
        if (distance > 100) return false; // Max 100 miles
      }
      
      return true;
    });
  }

  private calculateDistance(lat1: number, lon1: number, coords: { lat: number, lon: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coords.lat - lat1);
    const dLon = this.toRadians(coords.lon - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(coords.lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private parseLocationCoordinates(location: string): { lat: number, lon: number } {
    // Default to San Francisco coordinates if parsing fails
    return { lat: 37.7749, lon: -122.4194 };
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

  // Continue with all other methods...
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
    .where(eq(communityMembers.userId, userId))
    .orderBy(desc(communityMembers.activityScore));
    
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
      .where(and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, communityId)
      ));
  }

  async joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }> {
    // Get user's current communities
    const userCommunities = await this.getUserActiveCommunities(userId);
    
    let dropped: Community | undefined;
    
    // If user already has 5 communities, drop the least active one
    if (userCommunities.length >= 5) {
      const leastActive = userCommunities[userCommunities.length - 1];
      await this.leaveCommunity(userId, leastActive.id);
      dropped = leastActive;
    }
    
    // Join the new community
    const joined = await this.joinCommunity(userId, communityId);
    
    return { joined, dropped };
  }

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles: number = 50): Promise<User[]> {
    // Get all users
    const allUsers = await db.select().from(users).where(ne(users.latitude, null));
    
    return allUsers.filter(user => {
      if (!user.latitude || !user.longitude) return false;
      
      // Calculate distance
      const distance = this.calculateDistance(
        userLocation.lat, userLocation.lon,
        { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) }
      );
      
      if (distance > radiusMiles) return false;
      
      // Calculate interest overlap
      const userInterestsList = user.interests || [];
      const overlap = this.calculateInterestOverlap(userInterests, userInterestsList);
      
      // Require 70%+ interest match
      return overlap >= 0.7;
    });
  }

  async getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }> {
    // Try 50 miles first
    let members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 50);
    
    if (members.length === 0) {
      // Expand to 100 miles
      members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 100);
      return { members, radiusUsed: 100 };
    }
    
    return { members, radiusUsed: 50 };
  }

  private getCommunityInterests(community: Community): string[] {
    return [community.category, ...community.description.toLowerCase().split(' ')];
  }

  private calculateInterestOverlap(userInterests: string[], targetInterests: string[]): number {
    if (userInterests.length === 0 || targetInterests.length === 0) return 0;
    
    const userSet = new Set(userInterests.map(i => i.toLowerCase()));
    const targetSet = new Set(targetInterests.map(i => i.toLowerCase()));
    
    const intersection = new Set([...userSet].filter(x => targetSet.has(x)));
    return intersection.size / Math.max(userSet.size, targetSet.size);
  }

  // Implement remaining methods (getEvent, createEvent, etc.)
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(asc(events.date));
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    const allEvents = await this.getAllEvents();
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    
    return allEvents.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      
      const distance = this.calculateDistance(
        userLat, userLon,
        { lat: parseFloat(event.latitude), lon: parseFloat(event.longitude) }
      );
      
      return distance <= radiusMiles;
    });
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.category, category))
      .orderBy(asc(events.date));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events)
      .where(sql`${events.date} > ${new Date()}`)
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
    const conversations: { user: User, lastMessage: Message }[] = [];
    return conversations;
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      createdAt: new Date()
    }).returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const result = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]> {
    const result = await db.select({
      message: messages,
      sender: users
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.receiverId, communityId))
    .orderBy(desc(messages.createdAt));
    
    return result.map(r => ({
      ...r.message,
      sender: r.sender,
      resonateCount: 0
    }));
  }

  async sendCommunityMessage(messageData: InsertMessage & { communityId: number }): Promise<Message> {
    const message = await this.sendMessage({
      senderId: messageData.senderId,
      receiverId: messageData.communityId,
      content: messageData.content
    });
    
    // Update community activity
    await this.updateCommunityActivity(messageData.senderId, messageData.communityId);
    
    return message;
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    // Implementation for message resonance
    return true;
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.id, communityId))
      .orderBy(asc(events.date));
  }

  async getKudos(id: number): Promise<Kudos | undefined> {
    const [kudos] = await db.select().from(kudos).where(eq(kudos.id, id));
    return kudos || undefined;
  }

  async getUserKudosReceived(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos)
      .where(eq(kudos.receiverId, userId))
      .orderBy(desc(kudos.createdAt));
  }

  async getUserKudosGiven(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos)
      .where(eq(kudos.giverId, userId))
      .orderBy(desc(kudos.createdAt));
  }

  async giveKudos(insertKudos: InsertKudos): Promise<Kudos> {
    const [kudos] = await db.insert(kudos).values({
      ...insertKudos,
      createdAt: new Date()
    }).returning();
    return kudos;
  }

  async getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]> {
    return await db.select().from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(50);
  }

  async addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem> {
    const [item] = await db.insert(activityFeed).values({
      userId,
      type,
      content,
      createdAt: new Date()
    }).returning();
    return item;
  }
}

const databaseStorage = new DatabaseStorage();
export const storage = databaseStorage;