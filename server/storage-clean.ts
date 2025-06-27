import { users, communities, communityMembers, events, eventAttendees, messages, kudos, activityFeed, messageResonance } from "@shared/schema";
import type { User, InsertUser, Community, InsertCommunity, Event, InsertEvent, Message, InsertMessage, Kudos, InsertKudos, CommunityMember, InsertCommunityMember, EventAttendee, InsertEventAttendee, ActivityFeedItem, MessageResonance, InsertMessageResonance } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, gte, lte, ne, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Community operations
  getCommunity(id: number): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  getCommunitiesByCategory(category: string): Promise<Community[]>;
  getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined>;
  
  // Community membership operations
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<boolean>;
  getUserCommunities(userId: number): Promise<Community[]>;
  getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]>;
  getCommunityMembers(communityId: number): Promise<User[]>;
  getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles?: number): Promise<User[]>;
  updateCommunityActivity(userId: number, communityId: number): Promise<void>;
  joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  getCommunityEvents(communityId: number): Promise<Event[]>;
  
  // Event attendance operations
  registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee>;
  unregisterFromEvent(userId: number, eventId: number): Promise<boolean>;
  getUserEvents(userId: number): Promise<Event[]>;
  getEventAttendees(eventId: number): Promise<User[]>;
  
  // Messaging operations
  getMessage(id: number): Promise<Message | undefined>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]>;
  sendCommunityMessage(message: InsertMessage & { communityId: number }): Promise<Message>;
  resonateMessage(messageId: number, userId: number): Promise<boolean>;
  
  // Kudos operations
  getKudos(id: number): Promise<Kudos | undefined>;
  getUserKudosReceived(userId: number): Promise<Kudos[]>;
  getUserKudosGiven(userId: number): Promise<Kudos[]>;
  giveKudos(kudos: InsertKudos): Promise<Kudos>;
  
  // Activity feed operations
  getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]>;
  addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
      return user;
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    try {
      const [community] = await db.select().from(communities).where(eq(communities.id, id));
      return community;
    } catch (error) {
      console.error('Error getting community:', error);
      return undefined;
    }
  }

  async getAllCommunities(): Promise<Community[]> {
    try {
      return await db.select().from(communities).where(eq(communities.isActive, true));
    } catch (error) {
      console.error('Error getting all communities:', error);
      return [];
    }
  }

  async getCommunitiesByCategory(category: string): Promise<Community[]> {
    try {
      return await db.select().from(communities)
        .where(and(eq(communities.category, category), eq(communities.isActive, true)));
    } catch (error) {
      console.error('Error getting communities by category:', error);
      return [];
    }
  }

  async getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]> {
    try {
      let allCommunities = await this.getAllCommunities();
      
      // Filter out communities user is already in
      if (userId) {
        const userCommunities = await this.getUserCommunities(userId);
        const userCommunityIds = userCommunities.map(c => c.id);
        allCommunities = allCommunities.filter(c => !userCommunityIds.includes(c.id));
      }

      // Score communities based on interest match
      const scoredCommunities = allCommunities.map(community => {
        const interestScore = this.calculateInterestScore(community, interests);
        return { ...community, score: interestScore };
      });

      // Sort by score and return top recommendations
      return scoredCommunities
        .filter(c => c.score > 0.3) // 30% minimum match
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recommended communities:', error);
      return [];
    }
  }

  private calculateInterestScore(community: Community, userInterests: string[]): number {
    if (!userInterests.length) return 0;
    
    const communityKeywords = [
      community.name.toLowerCase(),
      community.description.toLowerCase(),
      community.category.toLowerCase()
    ].join(' ');

    const matches = userInterests.filter(interest => 
      communityKeywords.includes(interest.toLowerCase())
    );

    return matches.length / userInterests.length;
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    try {
      const [community] = await db.insert(communities).values(insertCommunity).returning();
      return community;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  }

  async updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined> {
    try {
      const [community] = await db.update(communities).set(updates).where(eq(communities.id, id)).returning();
      return community;
    } catch (error) {
      console.error('Error updating community:', error);
      return undefined;
    }
  }

  async joinCommunity(userId: number, communityId: number): Promise<CommunityMember> {
    try {
      const [member] = await db.insert(communityMembers).values({
        userId,
        communityId,
        joinedAt: new Date(),
        lastActivityAt: new Date(),
        activityScore: 1,
        isActive: true
      }).returning();

      // Update community member count
      await db.update(communities)
        .set({ memberCount: sql`member_count + 1` })
        .where(eq(communities.id, communityId));

      return member;
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  async leaveCommunity(userId: number, communityId: number): Promise<boolean> {
    try {
      await db.delete(communityMembers)
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));

      // Update community member count
      await db.update(communities)
        .set({ memberCount: sql`member_count - 1` })
        .where(eq(communities.id, communityId));

      return true;
    } catch (error) {
      console.error('Error leaving community:', error);
      return false;
    }
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    try {
      const result = await db
        .select({ community: communities })
        .from(communityMembers)
        .innerJoin(communities, eq(communityMembers.communityId, communities.id))
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)));

      return result.map(r => r.community);
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  }

  async getUserActiveCommunities(userId: number): Promise<(Community & { activityScore: number, lastActivityAt: Date })[]> {
    try {
      const result = await db
        .select({
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
    } catch (error) {
      console.error('Error getting user active communities:', error);
      return [];
    }
  }

  async getCommunityMembers(communityId: number): Promise<User[]> {
    try {
      const result = await db
        .select({ user: users })
        .from(communityMembers)
        .innerJoin(users, eq(communityMembers.userId, users.id))
        .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.isActive, true)));

      return result.map(r => r.user);
    } catch (error) {
      console.error('Error getting community members:', error);
      return [];
    }
  }

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[], radiusMiles: number = 50): Promise<User[]> {
    try {
      // Get all users with location data
      const allUsers = await db.select().from(users);

      // Filter by location and interests
      const nearbyUsers = allUsers.filter(user => {
        if (!user.latitude || !user.longitude) return false;
        
        const distance = this.calculateDistance(
          userLocation.lat, userLocation.lon,
          parseFloat(user.latitude), parseFloat(user.longitude)
        );

        if (distance > radiusMiles) return false;

        // Check interest overlap
        const userInterestArray = user.interests || [];
        const overlapScore = this.calculateInterestOverlap(userInterests, userInterestArray);
        
        return overlapScore >= 0.7; // 70% overlap required
      });

      return nearbyUsers.slice(0, 20); // Limit to 20 members
    } catch (error) {
      console.error('Error getting dynamic community members:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private calculateInterestOverlap(interests1: string[], interests2: string[]): number {
    if (!interests1.length || !interests2.length) return 0;
    
    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    const intersection = new Set(Array.from(set1).filter(i => set2.has(i)));
    
    return intersection.size / Math.min(set1.size, set2.size);
  }

  async updateCommunityActivity(userId: number, communityId: number): Promise<void> {
    try {
      await db.update(communityMembers)
        .set({
          lastActivityAt: new Date(),
          activityScore: sql`activity_score + 1`
        })
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
    } catch (error) {
      console.error('Error updating community activity:', error);
    }
  }

  async joinCommunityWithRotation(userId: number, communityId: number): Promise<{ joined: CommunityMember, dropped?: Community }> {
    try {
      const userCommunities = await this.getUserActiveCommunities(userId);
      
      let droppedCommunity: Community | undefined;
      
      // If user has 5 communities, drop the least active one
      if (userCommunities.length >= 5) {
        const leastActive = userCommunities[userCommunities.length - 1];
        await this.leaveCommunity(userId, leastActive.id);
        droppedCommunity = leastActive;
      }

      const joined = await this.joinCommunity(userId, communityId);
      
      return { joined, dropped: droppedCommunity };
    } catch (error) {
      console.error('Error joining community with rotation:', error);
      throw error;
    }
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, id));
      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      return undefined;
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      return await db.select().from(events).orderBy(desc(events.date));
    } catch (error) {
      console.error('Error getting all events:', error);
      return [];
    }
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    try {
      // For now, return all events - would need PostGIS for proper geo queries
      return await db.select().from(events).orderBy(desc(events.date));
    } catch (error) {
      console.error('Error getting events by location:', error);
      return [];
    }
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    try {
      return await db.select().from(events)
        .where(eq(events.category, category))
        .orderBy(desc(events.date));
    } catch (error) {
      console.error('Error getting events by category:', error);
      return [];
    }
  }

  async getUpcomingEvents(): Promise<Event[]> {
    try {
      return await db.select().from(events)
        .where(gte(events.date, new Date()))
        .orderBy(asc(events.date));
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    try {
      const [event] = await db.insert(events).values(insertEvent).returning();
      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
      return event;
    } catch (error) {
      console.error('Error updating event:', error);
      return undefined;
    }
  }

  async getCommunityEvents(communityId: number): Promise<Event[]> {
    try {
      return await db.select().from(events)
        .where(eq(events.communityId, communityId))
        .orderBy(desc(events.date));
    } catch (error) {
      console.error('Error getting community events:', error);
      return [];
    }
  }

  // Event attendance operations
  async registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee> {
    try {
      const [attendee] = await db.insert(eventAttendees).values({
        userId,
        eventId,
        status,
        registeredAt: new Date()
      }).returning();

      return attendee;
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  async unregisterFromEvent(userId: number, eventId: number): Promise<boolean> {
    try {
      await db.delete(eventAttendees)
        .where(and(eq(eventAttendees.userId, userId), eq(eventAttendees.eventId, eventId)));
      return true;
    } catch (error) {
      console.error('Error unregistering from event:', error);
      return false;
    }
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    try {
      const result = await db
        .select({ event: events })
        .from(eventAttendees)
        .innerJoin(events, eq(eventAttendees.eventId, events.id))
        .where(eq(eventAttendees.userId, userId))
        .orderBy(desc(events.date));

      return result.map(r => r.event);
    } catch (error) {
      console.error('Error getting user events:', error);
      return [];
    }
  }

  async getEventAttendees(eventId: number): Promise<User[]> {
    try {
      const result = await db
        .select({ user: users })
        .from(eventAttendees)
        .innerJoin(users, eq(eventAttendees.userId, users.id))
        .where(eq(eventAttendees.eventId, eventId));

      return result.map(r => r.user);
    } catch (error) {
      console.error('Error getting event attendees:', error);
      return [];
    }
  }

  // Messaging operations
  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const [message] = await db.select().from(messages).where(eq(messages.id, id));
      return message;
    } catch (error) {
      console.error('Error getting message:', error);
      return undefined;
    }
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    try {
      return await db.select().from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        )
        .orderBy(asc(messages.createdAt));
    } catch (error) {
      console.error('Error getting conversation:', error);
      return [];
    }
  }

  async getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]> {
    try {
      // This is a simplified implementation - would need more complex query for production
      const userMessages = await db.select().from(messages)
        .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
        .orderBy(desc(messages.createdAt));

      const conversations: { user: User, lastMessage: Message }[] = [];
      const seenUsers = new Set<number>();

      for (const message of userMessages) {
        const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
        if (otherUserId && !seenUsers.has(otherUserId)) {
          const otherUser = await this.getUser(otherUserId);
          if (otherUser) {
            conversations.push({ user: otherUser, lastMessage: message });
            seenUsers.add(otherUserId);
          }
        }
      }

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const [message] = await db.insert(messages).values({
        ...insertMessage,
        createdAt: new Date()
      }).returning();
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    try {
      await db.update(messages)
        .set({ isRead: true })
        .where(eq(messages.id, id));
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  async getCommunityMessages(communityId: number): Promise<(Message & { sender: User, resonateCount: number })[]> {
    try {
      const result = await db
        .select({
          message: messages,
          sender: users,
          resonateCount: sql<number>`count(${messageResonance.id})::int`
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .leftJoin(messageResonance, eq(messages.id, messageResonance.messageId))
        .where(eq(messages.communityId, communityId))
        .groupBy(messages.id, users.id)
        .orderBy(desc(messages.createdAt));

      return result.map(r => ({
        ...r.message,
        sender: r.sender,
        resonateCount: r.resonateCount || 0
      }));
    } catch (error) {
      console.error('Error getting community messages:', error);
      return [];
    }
  }

  async sendCommunityMessage(messageData: InsertMessage & { communityId: number }): Promise<Message> {
    try {
      const [message] = await db.insert(messages).values({
        ...messageData,
        createdAt: new Date()
      }).returning();
      
      // Update community activity for sender
      if (messageData.senderId && messageData.communityId) {
        await this.updateCommunityActivity(messageData.senderId, messageData.communityId);
      }
      
      return message;
    } catch (error) {
      console.error('Error sending community message:', error);
      throw error;
    }
  }

  async resonateMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // Check if user already resonated
      const [existing] = await db.select().from(messageResonance)
        .where(and(eq(messageResonance.messageId, messageId), eq(messageResonance.userId, userId)));

      if (existing) {
        // Un-resonate
        await db.delete(messageResonance)
          .where(and(eq(messageResonance.messageId, messageId), eq(messageResonance.userId, userId)));
        return false;
      } else {
        // Resonate
        await db.insert(messageResonance).values({
          messageId,
          userId,
          createdAt: new Date()
        });
        return true;
      }
    } catch (error) {
      console.error('Error resonating message:', error);
      return false;
    }
  }

  // Kudos operations
  async getKudos(id: number): Promise<Kudos | undefined> {
    try {
      const [kudos] = await db.select().from(kudos).where(eq(kudos.id, id));
      return kudos;
    } catch (error) {
      console.error('Error getting kudos:', error);
      return undefined;
    }
  }

  async getUserKudosReceived(userId: number): Promise<Kudos[]> {
    try {
      return await db.select().from(kudos)
        .where(eq(kudos.receiverId, userId))
        .orderBy(desc(kudos.createdAt));
    } catch (error) {
      console.error('Error getting user kudos received:', error);
      return [];
    }
  }

  async getUserKudosGiven(userId: number): Promise<Kudos[]> {
    try {
      return await db.select().from(kudos)
        .where(eq(kudos.giverId, userId))
        .orderBy(desc(kudos.createdAt));
    } catch (error) {
      console.error('Error getting user kudos given:', error);
      return [];
    }
  }

  async giveKudos(insertKudos: InsertKudos): Promise<Kudos> {
    try {
      const [kudosRecord] = await db.insert(kudos).values({
        ...insertKudos,
        createdAt: new Date()
      }).returning();
      return kudosRecord;
    } catch (error) {
      console.error('Error giving kudos:', error);
      throw error;
    }
  }

  // Activity feed operations
  async getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]> {
    try {
      return await db.select().from(activityFeed)
        .where(eq(activityFeed.userId, userId))
        .orderBy(desc(activityFeed.createdAt))
        .limit(50);
    } catch (error) {
      console.error('Error getting user activity feed:', error);
      return [];
    }
  }

  async addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem> {
    try {
      const [item] = await db.insert(activityFeed).values({
        userId,
        type,
        content,
        createdAt: new Date()
      }).returning();
      return item;
    } catch (error) {
      console.error('Error adding activity item:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();