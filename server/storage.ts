import { eq, and, sql, desc, asc, isNotNull, ne } from "drizzle-orm";
import { db } from "./db";
import { 
  users, communities, events, communityMembers, eventAttendees, 
  messages, kudos, activityFeed,
  type User, type Community, type Event, type CommunityMember, type EventAttendee,
  type Message, type Kudos, type ActivityFeedItem, type InsertUser, type InsertCommunity,
  type InsertEvent, type InsertMessage, type InsertKudos
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Community methods
  getCommunity(id: number): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  getCommunitiesByCategory(category: string): Promise<Community[]>;
  getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]>;
  getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles?: number): Promise<User[]>;
  getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined>;
  
  // Community membership methods
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<boolean>;
  getUserCommunities(userId: number): Promise<Community[]>;
  getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]>;
  getCommunityMembers(communityId: number): Promise<User[]>;
  updateCommunityActivity(userId: number, communityId: number): Promise<void>;
  joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }>;
  
  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  
  // Event attendance methods
  registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee>;
  unregisterFromEvent(userId: number, eventId: number): Promise<boolean>;
  getUserEvents(userId: number): Promise<Event[]>;
  getEventAttendees(eventId: number): Promise<User[]>;
  
  // Messaging methods
  getMessage(id: number): Promise<Message | undefined>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  
  // Community messaging methods
  getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]>;
  sendCommunityMessage(message: InsertMessage & { communityId: number }): Promise<Message>;
  resonateMessage(messageId: number, userId: number): Promise<boolean>;
  
  // Community events
  getCommunityEvents(communityId: number): Promise<Event[]>;
  
  // Kudos methods
  getKudos(id: number): Promise<Kudos | undefined>;
  getUserKudosReceived(userId: number): Promise<Kudos[]>;
  getUserKudosGiven(userId: number): Promise<Kudos[]>;
  giveKudos(kudos: InsertKudos): Promise<Kudos>;
  
  // Activity feed methods
  getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]>;
  addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem>;
}

export class DatabaseStorage implements IStorage {
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
    return await db.select().from(communities);
  }

  async getCommunitiesByCategory(category: string): Promise<Community[]> {
    return await db.select().from(communities).where(eq(communities.category, category));
  }

  async getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]> {
    const allCommunities = await this.getAllCommunities();
    
    // Filter out communities user is already a member of
    let filteredCommunities = allCommunities;
    if (userId) {
      const userCommunities = await this.getUserCommunities(userId);
      const userCommunityIds = userCommunities.map(c => c.id);
      filteredCommunities = allCommunities.filter(c => !userCommunityIds.includes(c.id));
    }
    
    // Score communities based on interest match
    const scoredCommunities = filteredCommunities.map(community => ({
      ...community,
      score: this.calculateInterestScore(community, interests) + this.calculateEngagementScore(community)
    }));
    
    // Sort by score and return top communities
    return scoredCommunities
      .sort((a, b) => b.score - a.score)
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
    const memberScore = Math.min((community.memberCount || 0) / 100, 1) * 50;
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
    return (result.rowCount || 0) > 0;
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    const result = await db.select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      category: communities.category,
      image: communities.image,
      memberCount: communities.memberCount,
      createdAt: communities.createdAt,
      tags: communities.tags,
      latitude: communities.latitude,
      longitude: communities.longitude,
      address: communities.address,
      website: communities.website,
      contactEmail: communities.contactEmail,
      isActive: communities.isActive
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(eq(communityMembers.userId, userId));
    
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
      createdAt: communities.createdAt,
      tags: communities.tags,
      latitude: communities.latitude,
      longitude: communities.longitude,
      address: communities.address,
      website: communities.website,
      contactEmail: communities.contactEmail,
      isActive: communities.isActive,
      activityScore: communityMembers.activityScore,
      lastActivityAt: communityMembers.lastActivityAt
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(eq(communityMembers.userId, userId))
    .orderBy(desc(communityMembers.lastActivityAt));
    
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
    const userCommunities = await this.getUserActiveCommunities(userId);
    
    let dropped: Community | undefined;
    if (userCommunities.length >= 5) {
      // Find least active community
      const leastActive = userCommunities[userCommunities.length - 1];
      await this.leaveCommunity(userId, leastActive.id);
      dropped = leastActive;
    }
    
    const joined = await this.joinCommunity(userId, communityId);
    return { joined, dropped };
  }

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles: number = 50): Promise<User[]> {
    const allUsers = await db.select().from(users)
      .where(and(
        isNotNull(users.latitude),
        isNotNull(users.longitude),
        isNotNull(users.interests)
      ));
    
    const nearbyUsers = allUsers.filter(user => {
      if (!user.latitude || !user.longitude || !user.interests) return false;
      
      const distance = this.calculateDistance(
        userLocation.lat, userLocation.lon,
        parseFloat(user.latitude), parseFloat(user.longitude)
      );
      
      if (distance > radiusMiles) return false;
      
      const interestOverlap = this.calculateInterestOverlap(userInterests, user.interests);
      return interestOverlap >= 0.7;
    });
    
    return nearbyUsers.slice(0, 20);
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
    return community.tags || [];
  }

  private calculateInterestOverlap(userInterests: string[], targetInterests: string[]): number {
    if (!userInterests.length || !targetInterests.length) return 0;
    
    const overlap = userInterests.filter(interest => 
      targetInterests.some(target => 
        target.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(target.toLowerCase())
      )
    );
    
    return overlap.length / userInterests.length;
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
    return await db.select().from(events);
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    const allEvents = await db.select().from(events);
    
    return allEvents.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      
      const distance = this.calculateDistance(
        parseFloat(latitude), parseFloat(longitude),
        parseFloat(event.latitude), parseFloat(event.longitude)
      );
      
      return distance <= radiusMiles;
    });
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.category, category));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events)
      .where(sql`${events.date} > NOW()`)
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
      maxAttendees: events.maxAttendees,
      currentAttendees: events.currentAttendees,
      price: events.price,
      tags: events.tags,
      createdAt: events.createdAt,
      creatorId: events.creatorId,
      isGlobal: events.isGlobal,
      eventType: events.eventType,
      brandPartnerName: events.brandPartnerName,
      revenueSharePercentage: events.revenueSharePercentage,
      status: events.status
    })
    .from(eventAttendees)
    .innerJoin(events, eq(eventAttendees.eventId, events.id))
    .where(eq(eventAttendees.userId, userId));
    
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
      .where(and(
        sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
      ))
      .orderBy(asc(messages.createdAt));
  }

  async getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]> {
    // Get all messages where user is sender or receiver
    const userMessages = await db.select().from(messages)
      .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
      .orderBy(desc(messages.createdAt));
    
    const conversations: { user: User, lastMessage: Message }[] = [];
    const seenUsers = new Set<number>();
    
    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!seenUsers.has(otherUserId)) {
        seenUsers.add(otherUserId);
        const otherUser = await this.getUser(otherUserId);
        if (otherUser) {
          conversations.push({ user: otherUser, lastMessage: message });
        }
      }
    }
    
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

  async getKudos(id: number): Promise<Kudos | undefined> {
    const [kudosItem] = await db.select().from(kudos).where(eq(kudos.id, id));
    return kudosItem || undefined;
  }

  async getUserKudosReceived(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos).where(eq(kudos.receiverId, userId));
  }

  async getUserKudosGiven(userId: number): Promise<Kudos[]> {
    return await db.select().from(kudos).where(eq(kudos.giverId, userId));
  }

  async giveKudos(insertKudos: InsertKudos): Promise<Kudos> {
    const [kudosItem] = await db.insert(kudos).values({
      ...insertKudos,
      createdAt: new Date()
    }).returning();
    return kudosItem;
  }

  async getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]> {
    return await db.select().from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt));
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
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderAvatar: users.avatar,
      senderEmail: users.email,
      senderFirebaseUid: users.firebaseUid,
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
    .where(eq(messages.receiverId, communityId))
    .orderBy(desc(messages.createdAt));
    
    return result.map(row => ({
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        firebaseUid: row.senderFirebaseUid,
        email: row.senderEmail,
        name: row.senderName,
        avatar: row.senderAvatar,
        bio: row.senderBio,
        location: row.senderLocation,
        latitude: row.senderLatitude,
        longitude: row.senderLongitude,
        interests: row.senderInterests,
        onboardingCompleted: row.senderOnboardingCompleted,
        quizAnswers: row.senderQuizAnswers,
        createdAt: row.senderCreatedAt
      },
      resonateCount: 0 // Placeholder since we don't have message resonance table
    }));
  }

  async sendCommunityMessage(messageData: InsertMessage & { communityId: number }): Promise<Message> {
    const [message] = await db.insert(messages).values({
      senderId: messageData.senderId,
      receiverId: messageData.communityId,
      content: messageData.content,
      createdAt: new Date()
    }).returning();
    return message;
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    // Placeholder implementation since we don't have message resonance table
    return true;
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    // Get community details to filter events by category/location
    const community = await this.getCommunity(communityId);
    if (!community) return [];
    
    return await db.select().from(events)
      .where(eq(events.category, community.category))
      .orderBy(asc(events.date));
  }
}

export const storage = new DatabaseStorage();