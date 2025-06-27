import { eq, and, sql, desc, asc, ne, inArray } from "drizzle-orm";
import { db } from "./db";
import { 
  users, communities, events, communityMembers, eventAttendees, 
  messages, kudos, activityFeed, messageResonance,
  type User, type Community, type Event, type CommunityMember, type EventAttendee,
  type Message, type Kudos, type ActivityFeedItem, type InsertUser, type InsertCommunity,
  type InsertEvent, type InsertMessage, type InsertKudos
} from "@shared/schema";

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
    // Live app - no demo data initialization
    // Communities are created through AI recommendations based on user quiz responses
    // Events are populated through real-time scraping from external APIs
    console.log('Live app initialized - using real user-generated content only');
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
    // Get all active communities
    let allCommunities = await db.select().from(communities)
      .where(eq(communities.isActive, true));

    // Filter out communities user is already a member of
    if (userId) {
      const userCommunityIds = await db.select({ communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(eq(communityMembers.userId, userId));
      
      const userCommunityIdSet = new Set(userCommunityIds.map(uc => uc.communityId));
      allCommunities = allCommunities.filter(c => !userCommunityIdSet.has(c.id));
    }

    // Calculate scores for each community
    const scoredCommunities = allCommunities.map(community => {
      const interestScore = this.calculateInterestScore(community, interests);
      const engagementScore = this.calculateEngagementScore(community);
      
      return {
        ...community,
        totalScore: interestScore * 0.7 + engagementScore * 0.3
      };
    });

    // Sort by score and return top matches
    return scoredCommunities
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);
  }

  private calculateInterestScore(community: Community, userInterests: string[]): number {
    if (!userInterests || userInterests.length === 0) return 0;
    
    const communityText = `${community.name} ${community.description}`.toLowerCase();
    const matches = userInterests.filter(interest => 
      communityText.includes(interest.toLowerCase())
    );
    
    return (matches.length / userInterests.length) * 100;
  }

  private calculateEngagementScore(community: Community): number {
    // Base score on member count with diminishing returns
    const memberScore = Math.min(community.memberCount / 100, 1) * 50;
    return memberScore;
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
      activityScore: 1,
      lastActivityAt: new Date()
    }).returning();
    return member;
  }

  async leaveCommunity(userId: number, communityId: number): Promise<boolean> {
    const result = await db.delete(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
    return result.rowCount > 0;
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    const result = await db.select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      category: communities.category,
      image: communities.image,
      memberCount: communities.memberCount,
      location: communities.location,
      isActive: communities.isActive,
      createdAt: communities.createdAt
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(and(eq(communityMembers.userId, userId), eq(communities.isActive, true)));

    return result;
  }

  async getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]> {
    const result = await db.select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      category: communities.category,
      image: communities.image,
      memberCount: communities.memberCount,
      location: communities.location,
      isActive: communities.isActive,
      createdAt: communities.createdAt,
      activityScore: communityMembers.activityScore,
      lastActivityAt: communityMembers.lastActivityAt
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(and(eq(communityMembers.userId, userId), eq(communities.isActive, true)))
    .orderBy(desc(communityMembers.activityScore));

    return result.map(r => ({
      ...r,
      activityScore: r.activityScore || 0,
      lastActivityAt: r.lastActivityAt || new Date()
    }));
  }

  async getCommunityMembers(communityId: number): Promise<User[]> {
    const result = await db.select({
      id: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      bio: users.bio,
      location: users.location,
      latitude: users.latitude,
      longitude: users.longitude,
      interests: users.interests,
      onboardingCompleted: users.onboardingCompleted,
      quizAnswers: users.quizAnswers,
      createdAt: users.createdAt
    })
    .from(communityMembers)
    .innerJoin(users, eq(communityMembers.userId, users.id))
    .where(eq(communityMembers.communityId, communityId));

    return result;
  }

  async updateCommunityActivity(userId: number, communityId: number): Promise<void> {
    await db.update(communityMembers)
      .set({
        activityScore: sql`${communityMembers.activityScore} + 1`,
        lastActivityAt: new Date()
      })
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
  }

  async joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }> {
    // Check current community count
    const currentCommunities = await this.getUserActiveCommunities(userId);
    
    let dropped: Community | undefined;
    
    if (currentCommunities.length >= 5) {
      // Find least active community to drop
      const leastActive = currentCommunities[currentCommunities.length - 1];
      await this.leaveCommunity(userId, leastActive.id);
      dropped = leastActive;
    }
    
    // Join new community
    const joined = await this.joinCommunity(userId, communityId);
    
    return { joined, dropped };
  }

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles: number = 50): Promise<User[]> {
    const community = await this.getCommunity(communityId);
    if (!community) return [];

    const communityInterests = this.getCommunityInterests(community);
    
    // Get all users with location data
    const allUsers = await db.select().from(users)
      .where(and(
        ne(users.latitude, null),
        ne(users.longitude, null),
        ne(users.interests, null)
      ));

    const matchingUsers = allUsers.filter(user => {
      if (!user.latitude || !user.longitude || !user.interests) return false;

      // Calculate distance
      const userLat = parseFloat(user.latitude);
      const userLon = parseFloat(user.longitude);
      const distance = this.calculateDistance(userLocation.lat, userLocation.lon, userLat, userLon);
      
      if (distance > radiusMiles) return false;

      // Calculate interest overlap
      const userInterestsList = Array.isArray(user.interests) ? user.interests : [];
      const overlapScore = this.calculateInterestOverlap(userInterestsList, communityInterests);
      
      return overlapScore >= 0.7; // 70% interest match required
    });

    return matchingUsers.slice(0, 50); // Limit to 50 members for performance
  }

  async getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }> {
    // Try 50-mile radius first
    let members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 50);
    
    if (members.length === 0) {
      // Expand to 100-mile radius
      members = await this.getDynamicCommunityMembers(communityId, userLocation, userInterests, 100);
      return { members, radiusUsed: 100 };
    }
    
    return { members, radiusUsed: 50 };
  }

  private getCommunityInterests(community: Community): string[] {
    const interestKeywords = {
      wellness: ['yoga', 'meditation', 'fitness', 'health', 'mindfulness'],
      tech: ['programming', 'coding', 'software', 'technology', 'AI'],
      creative: ['art', 'design', 'music', 'writing', 'photography'],
      outdoor: ['hiking', 'nature', 'adventure', 'camping', 'sports'],
      food: ['cooking', 'culinary', 'restaurants', 'baking', 'wine']
    };
    
    return interestKeywords[community.category as keyof typeof interestKeywords] || [];
  }

  private calculateInterestOverlap(userInterests: string[], targetInterests: string[]): number {
    if (userInterests.length === 0 || targetInterests.length === 0) return 0;
    
    const matches = userInterests.filter(interest => 
      targetInterests.some(target => 
        interest.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    return matches.length / Math.max(userInterests.length, targetInterests.length);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.date));
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    // For now, return all events (can be enhanced with spatial queries)
    return await db.select().from(events)
      .where(sql`date >= ${new Date()}`)
      .orderBy(asc(events.date));
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(and(eq(events.category, category), sql`date >= ${new Date()}`))
      .orderBy(asc(events.date));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events)
      .where(sql`date >= ${new Date()}`)
      .orderBy(asc(events.date))
      .limit(20);
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
    return result.rowCount > 0;
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    const result = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      date: events.date,
      location: events.location,
      address: events.address,
      organizer: events.organizer,
      category: events.category,
      latitude: events.latitude,
      longitude: events.longitude,
      attendeeCount: events.attendeeCount,
      maxAttendees: events.maxAttendees,
      image: events.image,
      isGlobal: events.isGlobal,
      eventType: events.eventType,
      brandPartnerName: events.brandPartnerName,
      revenueSharePercentage: events.revenueSharePercentage,
      status: events.status,
      createdAt: events.createdAt
    })
    .from(eventAttendees)
    .innerJoin(events, eq(eventAttendees.eventId, events.id))
    .where(eq(eventAttendees.userId, userId))
    .orderBy(asc(events.date));

    return result;
  }

  async getEventAttendees(eventId: number): Promise<User[]> {
    const result = await db.select({
      id: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      bio: users.bio,
      location: users.location,
      latitude: users.latitude,
      longitude: users.longitude,
      interests: users.interests,
      onboardingCompleted: users.onboardingCompleted,
      quizAnswers: users.quizAnswers,
      createdAt: users.createdAt
    })
    .from(eventAttendees)
    .innerJoin(users, eq(eventAttendees.userId, users.id))
    .where(eq(eventAttendees.eventId, eventId));

    return result;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        and(
          sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]> {
    // Get unique conversation partners
    const conversationPartners = await db.execute(sql`
      SELECT DISTINCT 
        CASE 
          WHEN sender_id = ${userId} THEN receiver_id 
          ELSE sender_id 
        END as partner_id
      FROM messages 
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
    `);

    const conversations: { user: User, lastMessage: Message }[] = [];

    for (const partner of conversationPartners) {
      const partnerId = (partner as any).partner_id;
      const user = await this.getUser(partnerId);
      if (!user) continue;

      const [lastMessage] = await db.select().from(messages)
        .where(
          and(
            sql`(${messages.senderId} = ${userId} AND ${messages.receiverId} = ${partnerId}) OR (${messages.senderId} = ${partnerId} AND ${messages.receiverId} = ${userId})`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (lastMessage) {
        conversations.push({ user, lastMessage });
      }
    }

    return conversations.sort((a, b) => 
      new Date(b.lastMessage.createdAt || 0).getTime() - new Date(a.lastMessage.createdAt || 0).getTime()
    );
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
    return result.rowCount > 0;
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
    const [kudosRecord] = await db.insert(kudos).values({
      ...insertKudos,
      createdAt: new Date()
    }).returning();
    return kudosRecord;
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

  async getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]> {
    const result = await db.select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      isRead: messages.isRead,
      senderName: users.name,
      senderAvatar: users.avatar,
      senderFirebaseUid: users.firebaseUid,
      senderEmail: users.email,
      senderBio: users.bio,
      senderLocation: users.location,
      senderLatitude: users.latitude,
      senderLongitude: users.longitude,
      senderInterests: users.interests,
      senderOnboardingCompleted: users.onboardingCompleted,
      senderQuizAnswers: users.quizAnswers,
      senderCreatedAt: users.createdAt
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.receiverId, communityId)) // Using receiverId as communityId for community messages
    .orderBy(desc(messages.createdAt));

    // Get resonance counts for each message
    const messagesWithResonance = await Promise.all(
      result.map(async (msg) => {
        const resonanceCount = await db.select({ count: sql<number>`count(*)` })
          .from(messageResonance)
          .where(eq(messageResonance.messageId, msg.id));

        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          isRead: msg.isRead,
          sender: {
            id: msg.senderId,
            name: msg.senderName,
            avatar: msg.senderAvatar,
            firebaseUid: msg.senderFirebaseUid,
            email: msg.senderEmail,
            bio: msg.senderBio,
            location: msg.senderLocation,
            latitude: msg.senderLatitude,
            longitude: msg.senderLongitude,
            interests: msg.senderInterests,
            onboardingCompleted: msg.senderOnboardingCompleted,
            quizAnswers: msg.senderQuizAnswers,
            createdAt: msg.senderCreatedAt
          },
          resonateCount: resonanceCount[0]?.count || 0
        };
      })
    );

    return messagesWithResonance;
  }

  async sendCommunityMessage(messageData: InsertMessage & { communityId: number }): Promise<Message> {
    const [message] = await db.insert(messages).values({
      senderId: messageData.senderId,
      receiverId: messageData.communityId, // Store community ID in receiverId field
      content: messageData.content,
      createdAt: new Date()
    }).returning();
    return message;
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      await db.insert(messageResonance).values({
        messageId,
        userId,
        createdAt: new Date()
      });
      return true;
    } catch (error) {
      // Handle duplicate resonance (user already resonated)
      return false;
    }
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    // For now, return events by category matching the community
    const community = await this.getCommunity(communityId);
    if (!community) return [];
    
    return await this.getEventsByCategory(community.category);
  }
}

const databaseStorage = new DatabaseStorage();

// Initialize database with live data only (no demo content)
databaseStorage.initializeData().catch(console.error);

export const storage = databaseStorage;