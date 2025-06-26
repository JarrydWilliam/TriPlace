import { 
  users, communities, events, messages, kudos, communityMembers, eventAttendees, activityFeed,
  type User, type InsertUser, type Community, type InsertCommunity, 
  type Event, type InsertEvent, type Message, type InsertMessage,
  type Kudos, type InsertKudos, type CommunityMember, type InsertCommunityMember,
  type EventAttendee, type InsertEventAttendee, type ActivityFeedItem
} from "@shared/schema";
import { aiMatcher } from "./ai-matching";

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
  getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]>;
  getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<User[]>;
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
    // Initialize with diverse communities that match quiz interests
    const communities = [
      {
        name: "Mindful Yoga SF",
        description: "Weekly yoga sessions in Golden Gate Park. Focus on mindfulness, meditation, and inner peace.",
        category: "wellness",
        image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 248,
        location: "San Francisco, CA",
      },
      {
        name: "Bay Area Tech Innovators",
        description: "Connect with developers, entrepreneurs, and tech enthusiasts. Weekly meetups on programming and startups.",
        category: "tech",
        image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 1200,
        location: "San Francisco, CA",
      },
      {
        name: "SF Artists Collective",
        description: "Creative community for visual arts, painting, and creative expression. Monthly gallery walks and workshops.",
        category: "arts",
        image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 340,
        location: "San Francisco, CA",
      },
      {
        name: "Golden Gate Runners",
        description: "Running group for fitness enthusiasts. Weekly runs through Golden Gate Park and marathon training.",
        category: "fitness",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 580,
        location: "San Francisco, CA",
      },
      {
        name: "Bay Area Musicians Network",
        description: "Local musicians connecting for jam sessions, performances, and music collaboration.",
        category: "music",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 420,
        location: "San Francisco, CA",
      },
      {
        name: "SF Food Lovers Unite",
        description: "Explore restaurants, cooking classes, and food events. Monthly potlucks and culinary adventures.",
        category: "food",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 760,
        location: "San Francisco, CA",
      },
      {
        name: "Bay Area Hiking Adventures",
        description: "Weekly hikes exploring Mount Tam, Muir Woods, and Bay Area trails. Nature and outdoor adventures.",
        category: "outdoor",
        image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 890,
        location: "San Francisco, CA",
      },
      {
        name: "SF Volunteer Network",
        description: "Community service and volunteering opportunities. Make a difference while meeting like-minded people.",
        category: "social",
        image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 520,
        location: "San Francisco, CA",
      },
      {
        name: "Young Professionals Network",
        description: "Career networking, professional development, and business mentorship for ambitious professionals.",
        category: "business",
        image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 650,
        location: "San Francisco, CA",
      },
      {
        name: "SF Social Butterflies",
        description: "Meet new friends through social events, happy hours, and group activities. Perfect for expanding your social circle.",
        category: "social",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        memberCount: 920,
        location: "San Francisco, CA",
      }
    ];

    communities.forEach(communityData => {
      const community: Community = {
        id: this.currentCommunityId++,
        name: communityData.name,
        description: communityData.description,
        category: communityData.category,
        image: communityData.image,
        memberCount: communityData.memberCount,
        isActive: true,
        location: communityData.location,
        createdAt: new Date(),
      };
      this.communities.set(community.id, community);
    });

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
      id: this.currentUserId++,
      firebaseUid: insertUser.firebaseUid,
      email: insertUser.email,
      name: insertUser.name,
      avatar: insertUser.avatar ?? null,
      bio: insertUser.bio ?? null,
      location: insertUser.location ?? null,
      latitude: insertUser.latitude ?? null,
      longitude: insertUser.longitude ?? null,
      interests: insertUser.interests ?? null,
      onboardingCompleted: insertUser.onboardingCompleted ?? null,
      quizAnswers: insertUser.quizAnswers ?? null,
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

  async getRecommendedCommunities(interests: string[], userLocation?: { lat: number, lon: number }, userId?: number): Promise<Community[]> {
    const communities = Array.from(this.communities.values());
    console.log('Total communities available:', communities.length);
    console.log('User interests:', interests);
    
    // Try AI-powered matching if user ID is provided
    if (userId) {
      const user = await this.getUser(userId);
      if (user && user.onboardingCompleted && user.quizAnswers) {
        try {
          console.log('Using AI-powered community matching...');
          const aiRecommendations = await aiMatcher.generateCommunityRecommendations(user, communities);
          
          if (aiRecommendations.length > 0) {
            console.log(`AI found ${aiRecommendations.length} intelligent matches`);
            return aiRecommendations.map(rec => rec.community);
          }
        } catch (error) {
          console.log('AI matching failed, falling back to basic algorithm:', error);
        }
      }
    }
    
    // Fallback to basic algorithm
    const scoredCommunities = communities.map(community => {
      const interestScore = this.calculateInterestScore(community, interests);
      const engagementScore = this.calculateEngagementScore(community);
      const distanceScore = userLocation ? this.calculateDistanceScore(community, userLocation) : 0.5;
      
      const result = {
        community,
        interestScore,
        engagementScore,
        distanceScore,
        finalScore: (interestScore * 0.5) + (engagementScore * 0.3) + (distanceScore * 0.2)
      };
      
      console.log(`Community: ${community.name}, Interest Score: ${interestScore}, Final Score: ${result.finalScore}`);
      return result;
    })
    // Show communities with >= 40% interest match (more inclusive)
    .filter(item => {
      const passes = item.interestScore >= 0.4;
      if (!passes) {
        console.log(`Filtered out: ${item.community.name} (score: ${item.interestScore})`);
      }
      return passes;
    })
    // Sort by final score (prioritize engagement and new events)
    .sort((a, b) => b.finalScore - a.finalScore);

    console.log('Communities after filtering:', scoredCommunities.length);
    return scoredCommunities.map(item => item.community).slice(0, 10);
  }

  private calculateInterestScore(community: Community, userInterests: string[]): number {
    if (!userInterests.length) return 0.8; // Default high score if no interests specified
    
    const communityText = `${community.name} ${community.description} ${community.category}`.toLowerCase();
    
    // Enhanced keyword mappings that match quiz responses
    const categoryKeywords: { [key: string]: string[] } = {
      'wellness': ['fitness', 'yoga', 'meditation', 'mindfulness', 'spiritual', 'healing', 'therapy', 'health', 'wellbeing'],
      'fitness': ['fitness', 'yoga', 'running', 'exercise', 'gym', 'workout', 'health', 'training', 'sport', 'wellness'],
      'tech': ['technology', 'programming', 'coding', 'software', 'developer', 'startup', 'innovation', 'ai', 'computer'],
      'arts': ['art', 'creative', 'painting', 'drawing', 'design', 'gallery', 'artist', 'craft', 'visual'],
      'music': ['music', 'band', 'singing', 'instrument', 'concert', 'performance', 'guitar', 'piano', 'audio'],
      'food': ['cooking', 'food', 'restaurant', 'culinary', 'chef', 'recipe', 'dining', 'cuisine', 'baking'],
      'outdoor': ['hiking', 'nature', 'adventure', 'camping', 'trail', 'mountain', 'outdoor', 'park', 'environment'],
      'social': ['social', 'networking', 'friends', 'community', 'volunteer', 'service', 'people', 'connection'],
      'business': ['business', 'professional', 'career', 'networking', 'entrepreneur', 'leadership', 'work', 'corporate']
    };
    
    let totalScore = 0;
    
    for (const userInterest of userInterests) {
      const interest = userInterest.toLowerCase().trim();
      let interestMatched = false;
      
      // Direct text match in community info
      if (communityText.includes(interest)) {
        totalScore += 1.0;
        interestMatched = true;
        continue;
      }
      
      // Category-based matching
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (community.category === category) {
          // Check if user interest matches any keywords for this category
          if (keywords.some(keyword => 
            interest.includes(keyword) || 
            keyword.includes(interest) ||
            interest === keyword
          )) {
            totalScore += 0.8; // Strong category match
            interestMatched = true;
            break;
          }
        }
      }
      
      // Cross-category keyword matching (for overlapping interests)
      if (!interestMatched) {
        for (const keywords of Object.values(categoryKeywords)) {
          if (keywords.some(keyword => 
            (interest.includes(keyword) || keyword.includes(interest)) &&
            communityText.includes(keyword)
          )) {
            totalScore += 0.6; // Partial cross-category match
            interestMatched = true;
            break;
          }
        }
      }
      
      // Fallback: partial string matching
      if (!interestMatched) {
        const words = interest.split(' ');
        for (const word of words) {
          if (word.length > 3 && communityText.includes(word)) {
            totalScore += 0.3; // Weak word match
            break;
          }
        }
      }
    }
    
    return Math.min(totalScore / userInterests.length, 1.0);
  }

  private calculateEngagementScore(community: Community): number {
    const memberCount = community.memberCount || 0;
    
    // Simulate engagement metrics
    const hasNewPosts = Math.random() > 0.4; // 60% chance of recent posts
    const hasUpcomingEvents = Math.random() > 0.5; // 50% chance of events
    const hasRecentActivity = Math.random() > 0.3; // 70% chance of activity
    
    let score = 0;
    
    // Member count contribution (normalized to 0-0.4)
    score += Math.min(memberCount / 1000, 0.4);
    
    // High engagement bonuses
    if (hasNewPosts) score += 0.25; // Posts today
    if (hasUpcomingEvents) score += 0.25; // Events with RSVPs
    if (hasRecentActivity) score += 0.1; // General activity
    
    return Math.min(score, 1.0);
  }

  private calculateDistanceScore(community: Community, userLocation: { lat: number, lon: number }): number {
    if (!community.location) return 0; // No location = no proximity bonus
    
    // Mock distance calculation - in real app, use actual coordinates
    const locationDistances: { [key: string]: number } = {
      'San Francisco': 5,
      'Oakland': 15,
      'Berkeley': 20,
      'San Jose': 45,
      'Sacramento': 80
    };
    
    const distance = locationDistances[community.location] || 60;
    
    // Only communities within 50 miles get points
    if (distance > 50) return 0;
    
    // Closer = higher score
    return Math.max(0, (50 - distance) / 50);
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

  async getDynamicCommunityMembers(communityId: number, userLocation: { lat: number, lon: number }, userInterests: string[]): Promise<User[]> {
    const community = await this.getCommunity(communityId);
    if (!community) return [];

    // Add some sample users with location data for testing
    const sampleUsers = [
      {
        id: 100,
        firebaseUid: 'sample-user-1',
        email: 'alice@example.com',
        name: 'Alice Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b62555c6?w=100&h=100&fit=crop&crop=face',
        bio: 'Outdoor enthusiast and tech professional',
        location: 'Pleasant View, Utah',
        latitude: '41.315',
        longitude: '-111.992',
        interests: ['hiking', 'technology', 'outdoor adventures', 'fitness'],
        onboardingCompleted: true,
        quizAnswers: { pastActivities: ['🥾 A hiking or camping trip'] },
        createdAt: new Date(),
      },
      {
        id: 101,
        firebaseUid: 'sample-user-2',
        email: 'bob@example.com',
        name: 'Bob Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        bio: 'Yoga instructor and mindfulness coach',
        location: 'Ogden, Utah',
        latitude: '41.340',
        longitude: '-111.985',
        interests: ['yoga', 'meditation', 'wellness', 'mindfulness'],
        onboardingCompleted: true,
        quizAnswers: { pastActivities: ['🧘 A yoga or meditation retreat'] },
        createdAt: new Date(),
      },
      {
        id: 102,
        firebaseUid: 'sample-user-3',
        email: 'carol@example.com',
        name: 'Carol Martinez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        bio: 'Artist and creative professional',
        location: 'Salt Lake City, Utah',
        latitude: '40.760',
        longitude: '-111.891',
        interests: ['art', 'painting', 'creative expression', 'gallery walks'],
        onboardingCompleted: true,
        quizAnswers: { pastActivities: ['🎨 An art class or creative workshop'] },
        createdAt: new Date(),
      }
    ];

    // Get all users including samples and filter by location + interest compatibility
    const allUsers = [...Array.from(this.users.values()), ...sampleUsers];
    const eligibleMembers: User[] = [];

    for (const user of allUsers) {
      // Skip users without location data
      if (!user.latitude || !user.longitude) continue;

      // Calculate distance (50-mile radius filter)
      const distance = this.calculateDistance(
        userLocation.lat, userLocation.lon,
        parseFloat(user.latitude), parseFloat(user.longitude)
      );
      
      if (distance > 50) continue; // Outside 50-mile radius

      // Calculate interest overlap (70% minimum)
      const userTags = user.interests || [];
      
      // Create community-specific interests based on community category
      const communityInterests = this.getCommunityInterests(community);
      const interestOverlap = this.calculateInterestOverlap(userTags, [...userInterests, ...communityInterests]);
      
      if (interestOverlap >= 0.5) { // Lowered to 50% for better demonstration
        eligibleMembers.push(user);
      }
    }

    return eligibleMembers;
  }

  private getCommunityInterests(community: Community): string[] {
    const categoryMapping: { [key: string]: string[] } = {
      'wellness': ['yoga', 'meditation', 'mindfulness', 'fitness', 'health'],
      'tech': ['technology', 'programming', 'innovation', 'startup'],
      'arts': ['art', 'painting', 'creative', 'design', 'gallery'],
      'fitness': ['running', 'exercise', 'marathon', 'training'],
      'music': ['music', 'band', 'instrument', 'concert'],
      'food': ['cooking', 'restaurant', 'culinary', 'dining'],
      'outdoor': ['hiking', 'nature', 'adventure', 'camping'],
      'social': ['networking', 'friends', 'community', 'volunteer'],
      'business': ['professional', 'career', 'entrepreneur', 'networking']
    };
    
    return categoryMapping[community.category] || [];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateInterestOverlap(userInterests: string[], targetInterests: string[]): number {
    if (userInterests.length === 0 || targetInterests.length === 0) return 0;
    
    const intersection = userInterests.filter(interest => 
      targetInterests.some(target => 
        target.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(target.toLowerCase())
      )
    );
    
    return intersection.length / Math.max(userInterests.length, targetInterests.length);
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
