import { 
  users, communities, events, messages, kudos, communityMessages, communityMembers, eventAttendees, activityFeed,
  type User, type InsertUser, type Community, type InsertCommunity, 
  type Event, type InsertEvent, type Message, type InsertMessage,
  type CommunityMessage, type InsertCommunityMessage,
  type Kudos, type InsertKudos, type CommunityMember, type InsertCommunityMember,
  type EventAttendee, type InsertEventAttendee, type ActivityFeedItem
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, asc, ne } from "drizzle-orm";
import { aiMatcher } from "./ai-matching";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  setUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  updateUserActivity(userId: number): Promise<void>;
  getOnlineUsers(): Promise<User[]>;
  getCommunityMembersWithStatus(communityId: number, requestingUserId?: number): Promise<(User & { isOnline: boolean, lastActiveAt: Date })[]>;
  
  getCommunity(id: number): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  getCommunitiesByCategory(category: string): Promise<Community[]>;
  getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]>;
  generateDynamicCommunities(userId: number): Promise<Community[]>;
  updateCommunityActivityTimestamp(communityId: number): Promise<void>;
  cleanupInactiveCommunities(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles?: number): Promise<User[]>;
  getDynamicCommunityMembersWithExpansion(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<{ members: User[], radiusUsed: number }>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined>;
  
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<boolean>;
  clearUserCommunities(userId: number): Promise<void>;
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
  
  getCommunityMessages(communityId: number): Promise<(CommunityMessage & { sender: User, resonateCount: number })[]>;
  sendCommunityMessage(message: InsertCommunityMessage): Promise<CommunityMessage>;
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
    // Production: All communities and events are dynamically generated based on user inputs
    // No sample data - fresh start for every user
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
    try {
      if (!userId) {
        return [];
      }
      
      const user = await this.getUser(userId);
      if (!user) {
        return [];
      }

      // First generate dynamic communities using ChatGPT based on collective user data
      const dynamicCommunities = await this.generateDynamicCommunities(userId);
      
      // Get user's current communities to exclude them from recommendations
      const userCommunities = await this.getUserCommunities(userId);
      const userCommunityIds = userCommunities.map(c => c.id);
      
      // Filter out communities user has already joined
      const availableCommunities = dynamicCommunities.filter(community => 
        !userCommunityIds.includes(community.id)
      );
      
      // Use ChatGPT AI matching for location-aware communities
      try {
        const recommendations = await aiMatcher.generateCommunityRecommendations(user, availableCommunities, userLocation);
        
        // Only return communities with 70%+ compatibility
        const filteredRecommendations = recommendations
          .filter((rec: any) => rec.matchScore >= 70)
          .map((rec: any) => rec.community);
        return filteredRecommendations;
        
      } catch (error) {
        console.log(`Discovery: ChatGPT error, using fallback matching`);
        
        // Fallback to interest-based matching
        const userInterests = user.interests || [];
        const recommendedCommunities = availableCommunities
          .map(community => {
            const communityInterests = this.getCommunityInterests(community);
            const overlapScore = this.calculateInterestOverlap(userInterests, communityInterests);
            return { community, score: overlapScore };
          })
          .filter(item => item.score >= 70)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(item => item.community);
        
        console.log(`Discovery: Returning ${recommendedCommunities.length} communities with 70%+ compatibility from fallback matching`);
        return recommendedCommunities;
      }
        
    } catch (error) {
      console.error('Error getting recommended communities:', error);
      return [];
    }
  }

  async generateDynamicCommunities(userId: number): Promise<Community[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // First, check for existing communities where this user would have 70%+ compatibility
      const compatibleCommunities = await this.findCompatibleExistingCommunities(user);
      
      if (compatibleCommunities.length >= 5) {
        console.log(`Discovery: Found ${compatibleCommunities.length} compatible existing communities for user ${user.id}`);
        return compatibleCommunities.slice(0, 5);
      }

      // Get all users to analyze collective patterns for remaining slots
      const allUsers = await db.select().from(users);
      
      // Get user's location
      const userLocation = user.latitude && user.longitude ? 
        { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) } : 
        undefined;

      console.log(`Discovery: User location data - lat: ${user.latitude}, lon: ${user.longitude}, parsed: ${JSON.stringify(userLocation)}`);
      
      // Generate dynamic communities based on collective user data for remaining slots
      const needed = 5 - compatibleCommunities.length;
      const generatedCommunities = await aiMatcher.generateDynamicCommunities(allUsers, userLocation);
      
      // Combine existing compatible communities with new ones
      const finalCommunities: Community[] = [...compatibleCommunities];
      
      for (let i = 0; i < Math.min(needed, generatedCommunities.length); i++) {
        const genCommunity = generatedCommunities[i];
        
        // Check if similar community already exists
        const existing = await db.select()
          .from(communities)
          .where(eq(communities.name, genCommunity.name))
          .limit(1);
          
        if (existing.length === 0) {
          // Create new dynamic community
          const newCommunity = await this.createCommunity({
            name: genCommunity.name,
            description: genCommunity.description,
            category: genCommunity.category,
            location: genCommunity.suggestedLocation
          });
          
          finalCommunities.push(newCommunity);
        } else {
          finalCommunities.push(existing[0]);
        }
      }
      
      return finalCommunities.slice(0, 5);
      
    } catch (error) {
      console.error('Error generating dynamic communities:', error);
      return [];
    }
  }

  private async findCompatibleExistingCommunities(user: User): Promise<Community[]> {
    try {
      // Get all existing communities
      const allCommunities = await this.getAllCommunities();
      const userInterests = user.interests || [];
      const compatibleCommunities: Array<{ community: Community, score: number }> = [];
      
      for (const community of allCommunities) {
        // Calculate interest compatibility
        const communityInterests = this.getCommunityInterests(community);
        const overlapScore = this.calculateInterestOverlap(userInterests, communityInterests);
        
        // Check geographic compatibility if user has location
        let locationCompatible = true;
        if (user.latitude && user.longitude) {
          // Check if community has members within acceptable radius
          const userLocation = { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) };
          const nearbyMembers = await this.getDynamicCommunityMembers(
            community.id, 
            userLocation, 
            userInterests, 
            100 // Use 100-mile radius for compatibility check
          );
          
          // Community is location-compatible if it has nearby members or if user would be first in area
          locationCompatible = nearbyMembers.length > 0 || !community.location || community.location === 'Virtual';
        }
        
        // Community is compatible if 70%+ interest overlap and location compatibility
        if (overlapScore >= 0.7 && locationCompatible) {
          compatibleCommunities.push({ community, score: overlapScore });
          console.log(`Discovery: Found compatible community "${community.name}" with ${(overlapScore * 100).toFixed(1)}% match for user ${user.id}`);
        }
      }
      
      // Sort by compatibility score and return top matches
      return compatibleCommunities
        .sort((a, b) => b.score - a.score)
        .map(item => item.community);
        
    } catch (error) {
      console.error('Error finding compatible communities:', error);
      return [];
    }
  }

  async updateCommunityActivityTimestamp(communityId: number): Promise<void> {
    try {
      await db.update(communities)
        .set({ lastActivityAt: new Date() })
        .where(eq(communities.id, communityId));
    } catch (error) {
      console.error('Error updating community activity timestamp:', error);
    }
  }

  async cleanupInactiveCommunities(): Promise<number> {
    try {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get communities with no activity for 30+ days
      const inactiveCommunities = await db.select()
        .from(communities)
        .where(and(
          eq(communities.isActive, true),
          sql`last_activity_at < ${thirtyDaysAgo}`
        ));

      let deletedCount = 0;

      for (const community of inactiveCommunities) {
        // Delete associated data first
        await db.delete(communityMembers).where(eq(communityMembers.communityId, community.id));
        
        // Delete the community
        await db.delete(communities).where(eq(communities.id, community.id));
        
        deletedCount++;
        console.log(`Deleted inactive community: ${community.name} (inactive since ${community.lastActivityAt})`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up inactive communities:', error);
      return 0;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
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

  async clearUserCommunities(userId: number): Promise<void> {
    try {
      await db.delete(communityMembers)
        .where(eq(communityMembers.userId, userId));
    } catch (error) {
      console.error('Error clearing user communities:', error);
      throw error;
    }
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
    
    const userInterestsLower = userInterests.map(i => i.toLowerCase());
    const targetInterestsLower = targetInterests.map(i => i.toLowerCase());
    
    let matches = 0;
    for (let i = 0; i < userInterestsLower.length; i++) {
      if (targetInterestsLower.includes(userInterestsLower[i])) {
        matches++;
      }
    }
    
    return matches / Math.max(userInterests.length, targetInterests.length);
  }

  private calculateDistance(location1: { lat: number, lon: number }, location2: { lat: number, lon: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (location2.lat - location1.lat) * Math.PI / 180;
    const dLon = (location2.lon - location1.lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(location1.lat * Math.PI / 180) * Math.cos(location2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in miles
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

  async getCommunityMessages(communityId: number): Promise<(CommunityMessage & { sender: User, resonateCount: number })[]> {
    // Get messages for specific community only
    const result = await db
      .select({
        // Community message fields
        messageId: communityMessages.id,
        communityId: communityMessages.communityId,
        senderId: communityMessages.senderId,
        content: communityMessages.content,
        createdAt: communityMessages.createdAt,
        // User fields
        userId: users.id,
        firebaseUid: users.firebaseUid,
        userName: users.name,
        userAvatar: users.avatar,
        userEmail: users.email,
        userInterests: users.interests,
        userBio: users.bio,
        userLocation: users.location,
        userLatitude: users.latitude,
        userLongitude: users.longitude,
        onboardingCompleted: users.onboardingCompleted
      })
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.senderId, users.id))
      .where(eq(communityMessages.communityId, communityId))
      .orderBy(desc(communityMessages.createdAt))
      .limit(50);

    return result.map(row => ({
      id: row.messageId,
      communityId: row.communityId,
      senderId: row.senderId,
      content: row.content,
      createdAt: row.createdAt,
      sender: {
        id: row.userId,
        firebaseUid: row.firebaseUid,
        name: row.userName,
        avatar: row.userAvatar,
        email: row.userEmail,
        interests: row.userInterests,
        bio: row.userBio,
        location: row.userLocation,
        latitude: row.userLatitude,
        longitude: row.userLongitude,
        onboardingCompleted: row.onboardingCompleted,
        createdAt: new Date()
      } as User,
      resonateCount: 0
    }));
  }

  async sendCommunityMessage(messageData: InsertCommunityMessage): Promise<CommunityMessage> {
    // Insert into dedicated community messages table for proper isolation
    const [message] = await db.insert(communityMessages).values({
      communityId: messageData.communityId,
      senderId: messageData.senderId,
      content: messageData.content,
      createdAt: new Date()
    }).returning();
    return message;
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    return true;
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    try {
      const communityEvents = await db.select()
        .from(events)
        .where(eq(events.communityId, communityId))
        .orderBy(asc(events.date));
      return communityEvents;
    } catch (error) {
      console.error('Error getting community events:', error);
      return [];
    }
  }

  async setUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    await db.update(users).set({
      isOnline,
      lastActiveAt: new Date()
    }).where(eq(users.id, userId));
  }

  async updateUserActivity(userId: number): Promise<void> {
    await db.update(users).set({
      lastActiveAt: new Date(),
      isOnline: true
    }).where(eq(users.id, userId));
  }

  async getOnlineUsers(): Promise<User[]> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return await db.select().from(users).where(
      and(
        eq(users.isOnline, true),
        sql`${users.lastActiveAt} > ${fifteenMinutesAgo}`
      )
    );
  }

  async getCommunityMembersWithStatus(communityId: number, requestingUserId?: number): Promise<(User & { isOnline: boolean, lastActiveAt: Date })[]> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Get the community to access its category for interest matching
    const community = await this.getCommunity(communityId);
    if (!community) return [];
    
    // Get requesting user's location for geolocation filtering
    let requestingUserLocation: { lat: number, lon: number } | null = null;
    if (requestingUserId) {
      const requestingUser = await this.getUser(requestingUserId);
      if (requestingUser?.latitude && requestingUser?.longitude) {
        requestingUserLocation = {
          lat: parseFloat(requestingUser.latitude),
          lon: parseFloat(requestingUser.longitude)
        };
      }
    }
    
    const result = await db
      .select()
      .from(users)
      .innerJoin(communityMembers, eq(users.id, communityMembers.userId))
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.isActive, true), // Only active community members
        eq(users.onboardingCompleted, true) // Must have completed onboarding (real app users)
      ))
      .orderBy(
        desc(users.isOnline),
        desc(users.lastActiveAt)
      );

    let filteredMembers = result.map(({ users: user }) => {
      const lastActive = user.lastActiveAt || new Date();
      const isCurrentlyOnline = Boolean(user.isOnline) && lastActive > fifteenMinutesAgo;
      
      return {
        ...user,
        isOnline: isCurrentlyOnline,
        lastActiveAt: lastActive
      };
    });

    // Filter out users without location data (must have app with location)
    filteredMembers = filteredMembers.filter(member => 
      member.latitude && member.longitude
    );

    // Apply geolocation filtering if requesting user location is available
    if (requestingUserLocation) {
      filteredMembers = filteredMembers.filter(member => {
        const memberLocation = {
          lat: parseFloat(member.latitude!),
          lon: parseFloat(member.longitude!)
        };
        
        // Check if member is within 50-100 mile radius
        const distance = this.calculateDistance(requestingUserLocation!, memberLocation);
        return distance <= 100; // 100 mile max radius
      });
    }

    // Apply 70% interest compatibility requirement
    const communityInterests = this.getCommunityInterests(community);
    filteredMembers = filteredMembers.filter(member => {
      const memberInterests = member.interests || [];
      const overlapPercentage = this.calculateInterestOverlap(memberInterests, communityInterests);
      return overlapPercentage >= 70; // 70% minimum compatibility
    });

    return filteredMembers;
  }
}

const databaseStorage = new DatabaseStorage();
databaseStorage.initializeData();

export const storage = databaseStorage;