import { 
  users, communities, events, messages, kudos, communityMembers, eventAttendees, activityFeed,
  type User, type InsertUser, type Community, type InsertCommunity, 
  type Event, type InsertEvent, type Message, type InsertMessage,
  type Kudos, type InsertKudos, type CommunityMember, type InsertCommunityMember,
  type EventAttendee, type InsertEventAttendee, type ActivityFeedItem
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Communities
  getCommunity(id: number): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  getCommunitiesByCategory(category: string): Promise<Community[]>;
  getRecommendedCommunities(interests: string[]): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined>;
  
  // Community Members
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<boolean>;
  getUserCommunities(userId: number): Promise<Community[]>;
  getCommunityMembers(communityId: number): Promise<User[]>;
  
  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  
  // Event Attendees
  registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee>;
  unregisterFromEvent(userId: number, eventId: number): Promise<boolean>;
  getUserEvents(userId: number): Promise<Event[]>;
  getEventAttendees(eventId: number): Promise<User[]>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  
  // Kudos
  getKudos(id: number): Promise<Kudos | undefined>;
  getUserKudosReceived(userId: number): Promise<Kudos[]>;
  getUserKudosGiven(userId: number): Promise<Kudos[]>;
  giveKudos(kudos: InsertKudos): Promise<Kudos>;
  
  // Activity Feed
  getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]>;
  addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private communities: Map<number, Community> = new Map();
  private events: Map<number, Event> = new Map();
  private messages: Map<number, Message> = new Map();
  private kudos: Map<number, Kudos> = new Map();
  private communityMembers: Map<number, CommunityMember> = new Map();
  private eventAttendees: Map<number, EventAttendee> = new Map();
  private activityFeed: Map<number, ActivityFeedItem> = new Map();
  
  private currentUserId = 1;
  private currentCommunityId = 1;
  private currentEventId = 1;
  private currentMessageId = 1;
  private currentKudosId = 1;
  private currentCommunityMemberId = 1;
  private currentEventAttendeeId = 1;
  private currentActivityId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with some sample communities
    const yogaCommunity: Community = {
      id: this.currentCommunityId++,
      name: "Mindful Yoga SF",
      description: "Weekly yoga sessions in Golden Gate Park",
      category: "fitness",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      memberCount: 248,
      isActive: true,
      location: "San Francisco, CA",
      createdAt: new Date(),
    };

    const techCommunity: Community = {
      id: this.currentCommunityId++,
      name: "SF Tech Meetup",
      description: "Connect with fellow developers and entrepreneurs",
      category: "technology",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      memberCount: 1200,
      isActive: true,
      location: "San Francisco, CA",
      createdAt: new Date(),
    };

    this.communities.set(yogaCommunity.id, yogaCommunity);
    this.communities.set(techCommunity.id, techCommunity);

    // Initialize with some sample events
    const musicEvent: Event = {
      id: this.currentEventId++,
      title: "Summer Music Festival",
      description: "Join us for an amazing evening of live music in the park",
      organizer: "Golden Gate Park Events",
      date: new Date("2024-08-12T18:00:00"),
      location: "Golden Gate Park",
      address: "Golden Gate Park, San Francisco, CA",
      price: "$25",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      category: "music",
      tags: ["music", "outdoor", "festival"],
      attendeeCount: 127,
      maxAttendees: 500,
      latitude: "37.7694",
      longitude: "-122.4862",
      createdAt: new Date(),
    };

    const hikingEvent: Event = {
      id: this.currentEventId++,
      title: "Weekly Hiking Group",
      description: "Explore the beautiful trails of Mount Tamalpais",
      organizer: "Bay Area Hikers",
      date: new Date("2024-08-13T08:00:00"),
      location: "Mount Tamalpais",
      address: "Mount Tamalpais State Park, Mill Valley, CA",
      price: "Free",
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      category: "outdoor",
      tags: ["hiking", "nature", "outdoor"],
      attendeeCount: 23,
      maxAttendees: 30,
      latitude: "37.9235",
      longitude: "-122.5965",
      createdAt: new Date(),
    };

    this.events.set(musicEvent.id, musicEvent);
    this.events.set(hikingEvent.id, hikingEvent);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Communities
  async getCommunity(id: number): Promise<Community | undefined> {
    return this.communities.get(id);
  }

  async getAllCommunities(): Promise<Community[]> {
    return Array.from(this.communities.values());
  }

  async getCommunitiesByCategory(category: string): Promise<Community[]> {
    return Array.from(this.communities.values()).filter(community => community.category === category);
  }

  async getRecommendedCommunities(interests: string[]): Promise<Community[]> {
    return Array.from(this.communities.values()).filter(community => 
      interests.some(interest => 
        community.category.toLowerCase().includes(interest.toLowerCase()) ||
        community.name.toLowerCase().includes(interest.toLowerCase()) ||
        community.description.toLowerCase().includes(interest.toLowerCase())
      )
    ).slice(0, 10);
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const community: Community = {
      ...insertCommunity,
      id: this.currentCommunityId++,
      memberCount: 0,
      createdAt: new Date(),
    };
    this.communities.set(community.id, community);
    return community;
  }

  async updateCommunity(id: number, updates: Partial<InsertCommunity>): Promise<Community | undefined> {
    const community = this.communities.get(id);
    if (!community) return undefined;
    
    const updatedCommunity = { ...community, ...updates };
    this.communities.set(id, updatedCommunity);
    return updatedCommunity;
  }

  // Community Members
  async joinCommunity(userId: number, communityId: number): Promise<CommunityMember> {
    const member: CommunityMember = {
      id: this.currentCommunityMemberId++,
      userId,
      communityId,
      joinedAt: new Date(),
    };
    this.communityMembers.set(member.id, member);
    
    // Update member count
    const community = this.communities.get(communityId);
    if (community) {
      community.memberCount = (community.memberCount || 0) + 1;
      this.communities.set(communityId, community);
    }
    
    return member;
  }

  async leaveCommunity(userId: number, communityId: number): Promise<boolean> {
    const memberToRemove = Array.from(this.communityMembers.values()).find(
      member => member.userId === userId && member.communityId === communityId
    );
    
    if (memberToRemove) {
      this.communityMembers.delete(memberToRemove.id);
      
      // Update member count
      const community = this.communities.get(communityId);
      if (community && community.memberCount > 0) {
        community.memberCount = community.memberCount - 1;
        this.communities.set(communityId, community);
      }
      
      return true;
    }
    return false;
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    const userMemberships = Array.from(this.communityMembers.values()).filter(
      member => member.userId === userId
    );
    
    const communities: Community[] = [];
    for (const membership of userMemberships) {
      const community = this.communities.get(membership.communityId);
      if (community) communities.push(community);
    }
    
    return communities;
  }

  async getCommunityMembers(communityId: number): Promise<User[]> {
    const memberships = Array.from(this.communityMembers.values()).filter(
      member => member.communityId === communityId
    );
    
    const users: User[] = [];
    for (const membership of memberships) {
      const user = this.users.get(membership.userId);
      if (user) users.push(user);
    }
    
    return users;
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number): Promise<Event[]> {
    // Simple implementation - in production, use proper geo-distance calculation
    return Array.from(this.events.values()).filter(event => {
      if (!event.latitude || !event.longitude) return false;
      
      const lat1 = parseFloat(latitude);
      const lon1 = parseFloat(longitude);
      const lat2 = parseFloat(event.latitude);
      const lon2 = parseFloat(event.longitude);
      
      // Simplified distance calculation
      const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 69; // rough miles conversion
      return distance <= radiusMiles;
    });
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.category === category);
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => new Date(event.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const event: Event = {
      ...insertEvent,
      id: this.currentEventId++,
      attendeeCount: 0,
      createdAt: new Date(),
    };
    this.events.set(event.id, event);
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Event Attendees
  async registerForEvent(userId: number, eventId: number, status: string): Promise<EventAttendee> {
    const attendee: EventAttendee = {
      id: this.currentEventAttendeeId++,
      userId,
      eventId,
      status,
      registeredAt: new Date(),
    };
    this.eventAttendees.set(attendee.id, attendee);
    
    // Update attendee count
    const event = this.events.get(eventId);
    if (event) {
      event.attendeeCount = (event.attendeeCount || 0) + 1;
      this.events.set(eventId, event);
    }
    
    return attendee;
  }

  async unregisterFromEvent(userId: number, eventId: number): Promise<boolean> {
    const attendeeToRemove = Array.from(this.eventAttendees.values()).find(
      attendee => attendee.userId === userId && attendee.eventId === eventId
    );
    
    if (attendeeToRemove) {
      this.eventAttendees.delete(attendeeToRemove.id);
      
      // Update attendee count
      const event = this.events.get(eventId);
      if (event && event.attendeeCount > 0) {
        event.attendeeCount = event.attendeeCount - 1;
        this.events.set(eventId, event);
      }
      
      return true;
    }
    return false;
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    const userAttendances = Array.from(this.eventAttendees.values()).filter(
      attendee => attendee.userId === userId
    );
    
    const events: Event[] = [];
    for (const attendance of userAttendances) {
      const event = this.events.get(attendance.eventId);
      if (event) events.push(event);
    }
    
    return events;
  }

  async getEventAttendees(eventId: number): Promise<User[]> {
    const attendances = Array.from(this.eventAttendees.values()).filter(
      attendee => attendee.eventId === eventId
    );
    
    const users: User[] = [];
    for (const attendance of attendances) {
      const user = this.users.get(attendance.userId);
      if (user) users.push(user);
    }
    
    return users;
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async getUserConversations(userId: number): Promise<{ user: User, lastMessage: Message }[]> {
    const userMessages = Array.from(this.messages.values()).filter(
      message => message.senderId === userId || message.receiverId === userId
    );
    
    const conversations = new Map<number, Message>();
    
    userMessages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const existing = conversations.get(otherUserId);
      
      if (!existing || new Date(message.createdAt!) > new Date(existing.createdAt!)) {
        conversations.set(otherUserId, message);
      }
    });
    
    const result: { user: User, lastMessage: Message }[] = [];
    for (const [otherUserId, lastMessage] of conversations) {
      const user = this.users.get(otherUserId);
      if (user) {
        result.push({ user, lastMessage });
      }
    }
    
    return result.sort((a, b) => 
      new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime()
    );
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      isRead: false,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (message) {
      message.isRead = true;
      this.messages.set(id, message);
      return true;
    }
    return false;
  }

  // Kudos
  async getKudos(id: number): Promise<Kudos | undefined> {
    return this.kudos.get(id);
  }

  async getUserKudosReceived(userId: number): Promise<Kudos[]> {
    return Array.from(this.kudos.values()).filter(kudos => kudos.receiverId === userId);
  }

  async getUserKudosGiven(userId: number): Promise<Kudos[]> {
    return Array.from(this.kudos.values()).filter(kudos => kudos.giverId === userId);
  }

  async giveKudos(insertKudos: InsertKudos): Promise<Kudos> {
    const kudos: Kudos = {
      ...insertKudos,
      id: this.currentKudosId++,
      createdAt: new Date(),
    };
    this.kudos.set(kudos.id, kudos);
    
    // Add to activity feed
    await this.addActivityItem(kudos.receiverId, 'kudos_received', {
      giverId: kudos.giverId,
      message: kudos.message,
      type: kudos.type,
    });
    
    return kudos;
  }

  // Activity Feed
  async getUserActivityFeed(userId: number): Promise<ActivityFeedItem[]> {
    return Array.from(this.activityFeed.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 50);
  }

  async addActivityItem(userId: number, type: string, content: any): Promise<ActivityFeedItem> {
    const activity: ActivityFeedItem = {
      id: this.currentActivityId++,
      userId,
      type,
      content,
      createdAt: new Date(),
    };
    this.activityFeed.set(activity.id, activity);
    return activity;
  }
}

export const storage = new MemStorage();
