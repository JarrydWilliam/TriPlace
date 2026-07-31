import { 
  users, communities, events, messages, kudos, communityMessages, communityMembers, eventAttendees, activityFeed,
  telemetryEvents, userBlocks, userReports, eventReports, eventReviews,
  type User, type InsertUser, type Community, type InsertCommunity, 
  type Event, type InsertEvent, type Message, type InsertMessage,
  type CommunityMessage, type InsertCommunityMessage,
  type Kudos, type InsertKudos, type CommunityMember, type InsertCommunityMember,
  type EventAttendee, type InsertEventAttendee, type ActivityFeedItem,
  type TelemetryEvent, type InsertTelemetryEvent,
  type UserBlock, type UserReport, type InsertUserReport,
  type EventReport, type InsertEventReport
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, sql, or, asc, ne, gte, lt, inArray, like } from "drizzle-orm";
import { aiMatcher } from "./ai-matching.js";

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
  joinCommunityWithRotation(userId: number, communityId: number, options?: { isReplacement?: boolean, replaceCommunityId?: number }): Promise<{ joined: CommunityMember, dropped?: Community }>;
  /**
   * Founder decision (2026-07-08, confirmed 2026-07-31):
   * Every new user starts with exactly 3 communities matched to their questionnaire.
   * Existing communities are reused; missing ones are created once with a canonical key.
   * This is ADDITIVE-ONLY — it never removes existing memberships.
   * Called exclusively from POST /api/onboarding/complete.
   */
  assignOnboardingCommunities(userId: number): Promise<Community[]>;
  
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

  refreshUserRecommendations(userId: number): Promise<void>;
  deleteUser(userId: number): Promise<boolean>;

  createTelemetryEvent(event: InsertTelemetryEvent): Promise<TelemetryEvent>;
  getTelemetryEvents(filters?: { userId?: number, eventType?: string, eventId?: number }): Promise<TelemetryEvent[]>;

  // Safety & Moderation
  blockUser(blockerId: number, blockedId: number, reason?: string): Promise<UserBlock>;
  isUserBlocked(viewerId: number, targetId: number): Promise<boolean>;
  reportUser(reporterId: number, targetUserId: number, reason: string, details?: string): Promise<UserReport>;
  reportEvent(reporterId: number, eventId: number, reason: string, details?: string): Promise<EventReport>;
  createEventReview(userId: number, eventId: number, rating: number, feltSafe: boolean, feedback?: string): Promise<any>;
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
      const allCommunities = await this.getAllCommunities();
      if (!userId) {
        // No user context — return all, sorted by member count desc
        return allCommunities.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      }

      // Use active communities (same set shown in "Vibe with My Communities") for exclusion
      // This matches what the client filters against, preventing the suggestion list from appearing empty
      const activeResult = await db.select({ communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)));
      const activeCommunityIds = new Set(activeResult.map(r => r.communityId));

      // Unjoined = not in the user's active set
      const unjoined = allCommunities.filter(c => !activeCommunityIds.has(c.id));

      if (unjoined.length === 0) {
        // User is in every community — still return all so the section never reads empty
        return allCommunities.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      }

      // Score by interest overlap so most relevant communities surface first
      const userInterests = interests || [];
      if (userInterests.length === 0) {
        // No interests on file — sort by member count (popularity)
        return unjoined.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      }

      const scored = unjoined.map(c => ({
        community: c,
        score: this.calculateInterestScore(c, userInterests) + this.calculateEngagementScore(c)
      }));

      return scored
        .sort((a, b) => b.score - a.score)
        .map(s => s.community);

    } catch (error) {
      console.error('SameVibe: Error getting recommended communities:', error);
      return await this.getAllCommunities();
    }
  }

  async generateDynamicCommunities(userId: number): Promise<Community[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // First, check for existing communities where this user would have 70%+ compatibility
      const compatibleCommunities = await this.findCompatibleExistingCommunities(user);
      
      if (compatibleCommunities.length >= 5) {
        return compatibleCommunities;
      }

      // Get all users to analyze collective patterns for remaining slots
      const allUsers = await db.select().from(users);
      
      // Get user's location
      const userLocation = user.latitude && user.longitude ? 
        { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) } : 
        undefined;

      
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
        
        // Community is location-compatible if:
        // 1. It has no members yet (new/empty community — always show to first user)
        // 2. OR the user would find nearby members
        // 3. OR the community has no location constraint
        const totalMembers = await this.getCommunityMembers(community.id);
        const isEmptyCommunity = totalMembers.length === 0;
        
        let locationCompatible = true;
        if (user.latitude && user.longitude) {
          const userLocation = { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) };
          const nearbyMembers = await this.getDynamicCommunityMembers(
            community.id, 
            userLocation, 
            userInterests, 
            100
          );
          // Compatible if empty (first user wins), has nearby members, or is location-agnostic
          locationCompatible = isEmptyCommunity || nearbyMembers.length > 0 || !community.location || community.location === 'Virtual';
        } else {
          // No user location — show everything
          locationCompatible = true;
        }
        
        // Community is compatible if 70%+ interest overlap and location compatibility
        if (overlapScore >= 0.7 && locationCompatible) {
          compatibleCommunities.push({ community, score: overlapScore });
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

  // ── Onboarding Community Assignment ────────────────────────────────────────
  //
  // Founder decision (2026-07-08, confirmed 2026-07-31):
  //   • Every new user starts with exactly 3 shared communities.
  //   • "Shared" means: if a community matching the user's interests already
  //     exists in their area, they JOIN it — the system never creates a copy.
  //   • If no match exists, one canonical community is created. Future users
  //     with the same interests in the same area join that same community.
  //   • This method is ADDITIVE-ONLY and IDEMPOTENT:
  //       - It never removes existing memberships.
  //       - Retrying after a network failure returns the same result.
  //   • Called ONLY from POST /api/onboarding/complete — never from a read path.

  /**
   * Assign exactly 3 questionnaire-matched communities to a newly onboarded user.
   *
   * Algorithm:
   *   1. Load the user's current active memberships.
   *   2. If they already have ≥ 3, return the existing set (idempotent retry).
   *   3. Determine how many slots remain (needed = 3 − current.length).
   *   4. Resolve the user's geographic market slug from their coordinates.
   *   5. Select the top archetype tuples from the user's questionnaire + interests.
   *   6. For each archetype:
   *      a. Build canonical key: "{market}|{category}|{interest}"
   *      b. Find or create the single canonical community for that key (race-safe).
   *      c. Join the user to that community (idempotent via onConflictDoUpdate).
   *   7. Return all 3 communities.
   */
  async assignOnboardingCommunities(userId: number): Promise<Community[]> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`assignOnboardingCommunities: user ${userId} not found`);

    // Step 1 — Load existing active memberships
    const existingRows = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)));
    const existingIds = new Set(existingRows.map(r => r.communityId));

    // Step 2 — Already has 3+ communities: idempotent, return existing
    if (existingIds.size >= 3) {
      const rows = await db
        .select({ community: communities })
        .from(communityMembers)
        .innerJoin(communities, eq(communityMembers.communityId, communities.id))
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)))
        .limit(5);
      return rows.map(r => r.community);
    }

    const needed = 3 - existingIds.size;

    // Step 3 — Resolve geographic market slug
    const market = await this.resolveMarket(user.latitude, user.longitude);

    // Step 4 — Select the top archetypes from questionnaire + interests
    const archetypes = this.selectTopThreeArchetypes(user, needed);

    // Step 5 — For each archetype, find or create the canonical community, then join
    const assigned: Community[] = [];
    for (const arch of archetypes) {
      if (assigned.length >= needed) break;
      try {
        const key = this.buildCanonicalKey(market, arch.category, arch.interest);
        const community = await this.findOrCreateCanonicalCommunity(key, arch, market, user);
        // Skip if already a member (handles partial-retry scenarios)
        if (!existingIds.has(community.id)) {
          await this.joinCommunity(userId, community.id);
          existingIds.add(community.id);
        }
        assigned.push(community);
      } catch (err) {
        console.error(`[assignOnboardingCommunities] Failed for archetype ${arch.interest}:`, err);
      }
    }

    // Return all active communities (original + newly assigned)
    const allRows = await db
      .select({ community: communities })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)))
      .limit(5);
    return allRows.map(r => r.community);
  }

  /**
   * Build a normalised canonical key.
   * Inputs are lower-cased, stripped of special characters, and space-joined with hyphens.
   * Format: "{market}|{category}|{interest}"
   * Example: buildCanonicalKey("Ogden, UT", "outdoor", "Mountain Biking")
   *          → "ogden-ut|outdoor|mountain-biking"
   */
  private buildCanonicalKey(market: string, category: string, interest: string): string {
    const slug = (s: string) =>
      s.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    return `${slug(market)}|${slug(category)}|${slug(interest)}`;
  }

  /**
   * Resolve a short geographic market slug from lat/lon.
   * Uses the same BigDataCloud reverse-geocode endpoint already used in ai-matching.ts.
   * Falls back to "virtual" if location is missing or the call fails.
   * Example: 41.22, -111.97 → "ogden-ut"
   */
  private async resolveMarket(latitude: string | null | undefined, longitude: string | null | undefined): Promise<string> {
    if (!latitude || !longitude) return 'virtual';
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (!res.ok) return 'virtual';
      const geo = await res.json();
      const city = (geo.city || geo.locality || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const state = (geo.principalSubdivisionCode || geo.principalSubdivision || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
      if (!city) return 'virtual';
      return state ? `${city}-${state}` : city;
    } catch {
      return 'virtual';
    }
  }

  /**
   * Select the top community archetypes for a user based on their questionnaire
   * answers and explicit interest tags.
   *
   * Returns up to `needed` archetype objects, deduplicated by category.
   * Each archetype has: { category, interest, displayName, description, intensity }
   */
  private selectTopThreeArchetypes(
    user: User,
    needed: number
  ): Array<{ category: string; interest: string; displayName: string; description: string; intensity: string }> {
    // Pull interests from quiz answers (priorityInterestIds / interestSpaces) + user.interests
    const quizAnswers = (user.quizAnswers as Record<string, any>) || {};
    const quizInterests: string[] = [
      ...(Array.isArray(quizAnswers.interestSpaces) ? quizAnswers.interestSpaces : []),
      ...(Array.isArray(quizAnswers.priorityInterestIds) ? quizAnswers.priorityInterestIds : []),
      ...(Array.isArray(quizAnswers.goals) ? quizAnswers.goals : []),
    ];
    const allInterests = [...new Set([...quizInterests, ...(user.interests || [])])].map(i => i.toLowerCase());

    // Master template library: each entry has a canonical key stub and UI data
    const TEMPLATES: Record<string, { category: string; interest: string; displayName: (city: string) => string; description: string; intensity: string }> = {
      'mountain-biking':   { category: 'outdoor',   interest: 'mountain-biking',   displayName: (c) => `${c} Mountain Bikers`,         description: 'Hit the trails and ride together — from beginner singletracks to expert descents.',               intensity: 'active' },
      'hiking':            { category: 'outdoor',   interest: 'hiking',             displayName: (c) => `${c} Trail Hikers`,             description: 'Explore local trails, national parks, and weekend overnight hikes with great people.',              intensity: 'active' },
      'outdoor':           { category: 'outdoor',   interest: 'outdoor',            displayName: (c) => `${c} Outdoor Adventurers`,      description: 'Camping, hiking, climbing, kayaking — if it\'s outside, we\'re in.',                              intensity: 'active' },
      'outdoors-adventure':{ category: 'outdoor',   interest: 'outdoors-adventure', displayName: (c) => `${c} Outdoor Adventurers`,      description: 'Camping, hiking, climbing, kayaking — if it\'s outside, we\'re in.',                              intensity: 'active' },
      'running':           { category: 'fitness',   interest: 'running',            displayName: (c) => `${c} Runners`,                  description: 'Group runs, training plans, and race prep — for all paces and distances.',                        intensity: 'active' },
      'fitness':           { category: 'fitness',   interest: 'fitness',            displayName: (c) => `${c} Fitness Crew`,             description: 'Workouts, accountability partners, and healthy habits — together.',                               intensity: 'active' },
      'yoga':              { category: 'wellness',  interest: 'yoga',               displayName: (c) => `${c} Yoga Community`,           description: 'Connect with local yogis for classes, outdoor sessions, and mindful movement.',                    intensity: 'gentle' },
      'wellness':          { category: 'wellness',  interest: 'wellness',           displayName: (c) => `${c} Wellness Circle`,          description: 'Mental health, healthy habits, and self-care — a supportive space to grow together.',              intensity: 'gentle' },
      'mindfulness':       { category: 'wellness',  interest: 'mindfulness',        displayName: (c) => `${c} Mindfulness Group`,        description: 'Guided sessions, silent sits, and mindful living practices together.',                            intensity: 'gentle' },
      'music':             { category: 'arts',      interest: 'music',              displayName: (c) => `${c} Music Lovers`,             description: 'Live shows, jam sessions, listening parties — for people who live for music.',                      intensity: 'social' },
      'music-scenes':      { category: 'arts',      interest: 'music-scenes',       displayName: (c) => `${c} Music Scene Collective`,   description: 'Live shows, jam sessions, listening parties — for people who live for music.',                      intensity: 'social' },
      'arts':              { category: 'arts',      interest: 'arts',               displayName: (c) => `${c} Creative Collective`,      description: 'Artists, makers, writers, and dreamers creating and collaborating together.',                       intensity: 'social' },
      'art-design':        { category: 'arts',      interest: 'art-design',         displayName: (c) => `${c} Art & Design Studio`,      description: 'Designers, artists, and creators building visual and physical art together.',                      intensity: 'social' },
      'photography':       { category: 'arts',      interest: 'photography',        displayName: (c) => `${c} Photography Club`,         description: 'Photo walks, critiques, and creative shoots — for all skill levels.',                             intensity: 'social' },
      'tech':              { category: 'tech',      interest: 'tech',               displayName: (c) => `${c} Tech Builders`,            description: 'Builders, hackers, and tech enthusiasts solving real problems together.',                           intensity: 'intellectual' },
      'ai-tech':           { category: 'tech',      interest: 'ai-tech',            displayName: (c) => `${c} AI & Tech Builders`,       description: 'Building AI tools, exploring modern technology, and hacking side-projects together.',             intensity: 'intellectual' },
      'coding':            { category: 'tech',      interest: 'coding',             displayName: (c) => `${c} Developers`,               description: 'Pair programming, side projects, and code reviews — for all languages and levels.',                intensity: 'intellectual' },
      'startup-builders':  { category: 'business',  interest: 'startup-builders',   displayName: (c) => `${c} Startup Builders`,         description: 'Founders, builders, and early-stage creators helping each other launch.',                           intensity: 'intellectual' },
      'gaming':            { category: 'gaming',    interest: 'gaming',             displayName: (c) => `${c} Gamers`,                   description: 'Board games, video games, and tabletop RPGs — for every type of player.',                         intensity: 'social' },
      'food':              { category: 'food',      interest: 'food',               displayName: (c) => `${c} Foodies`,                  description: 'Restaurant discoveries, cooking nights, food markets, and culinary adventures.',                  intensity: 'social' },
      'cooking':           { category: 'food',      interest: 'cooking',            displayName: (c) => `${c} Home Cooks`,               description: 'Recipe swaps, cooking classes, dinner parties, and farmers market runs.',                          intensity: 'social' },
      'social':            { category: 'social',    interest: 'social',             displayName: (c) => `${c} Social Connectors`,        description: 'Making your city feel smaller — meetups, events, and genuine connections.',                        intensity: 'social' },
      'social-impact':     { category: 'community', interest: 'social-impact',      displayName: (c) => `${c} Social Impact Circle`,     description: 'Volunteering, community advocacy, and local positive impact projects.',                            intensity: 'social' },
      'volunteering':      { category: 'community', interest: 'volunteering',       displayName: (c) => `${c} Community Builders`,       description: 'Volunteering, neighbourhood projects, and civic engagement in your city.',                          intensity: 'social' },
      'reading':           { category: 'learning',  interest: 'reading',            displayName: (c) => `${c} Book Club`,                description: 'Monthly reads, author talks, and literary conversations for serious bookworms.',                    intensity: 'intellectual' },
      'bookworms':         { category: 'learning',  interest: 'bookworms',          displayName: (c) => `${c} Bookworms & Literature`,   description: 'Monthly reads, author talks, and literary conversations for serious bookworms.',                    intensity: 'intellectual' },
      'languages':         { category: 'learning',  interest: 'languages',          displayName: (c) => `${c} Language Exchange`,        description: 'Practise conversation, share culture, and make multilingual friends.',                             intensity: 'intellectual' },
      'travel':            { category: 'social',    interest: 'travel',             displayName: (c) => `${c} Travellers`,               description: 'Trip planning, travel stories, and finding adventure partners near and far.',                      intensity: 'social' },
      'dance':             { category: 'arts',      interest: 'dance',              displayName: (c) => `${c} Dancers`,                  description: 'Salsa, hip-hop, ballet, or just moving freely — everyone is welcome.',                            intensity: 'active' },
      'cycling':           { category: 'outdoor',   interest: 'cycling',            displayName: (c) => `${c} Cyclists`,                 description: 'Road rides, gravel adventures, and bike commuters who love two wheels.',                          intensity: 'active' },
      'climbing':          { category: 'outdoor',   interest: 'climbing',           displayName: (c) => `${c} Climbers`,                 description: 'Bouldering, sport, and trad — indoors and out, all abilities welcome.',                           intensity: 'active' },
      'meditation':        { category: 'wellness',  interest: 'meditation',         displayName: (c) => `${c} Mindfulness Group`,        description: 'Guided sessions, silent sits, and mindful living practices together.',                            intensity: 'gentle' },
      'entrepreneurship':  { category: 'business',  interest: 'entrepreneurship',   displayName: (c) => `${c} Founders & Builders`,      description: 'Founders, freelancers, and side-project builders helping each other grow.',                        intensity: 'intellectual' },
    };

    // Default fallback order when no interests match
    const FALLBACK_ORDER = ['outdoor', 'social', 'wellness', 'food', 'arts', 'tech', 'fitness'];

    const selected: typeof TEMPLATES[string][] = [];
    const usedCategories = new Set<string>();

    // Priority 1: interests that have a direct template match
    for (const interest of allInterests) {
      if (selected.length >= needed) break;
      const tmpl = TEMPLATES[interest];
      if (tmpl && !usedCategories.has(tmpl.category)) {
        selected.push(tmpl);
        usedCategories.add(tmpl.category);
      } else if (!tmpl) {
        console.warn(`[QuestionnaireMapping] Unmapped interest tag encountered: "${interest}" for user ${user.id}`);
      }
    }

    // Priority 2: partial-match (interest is a substring of a template key)
    if (selected.length < needed) {
      for (const interest of allInterests) {
        if (selected.length >= needed) break;
        for (const [key, tmpl] of Object.entries(TEMPLATES)) {
          if (!usedCategories.has(tmpl.category) && key.includes(interest.replace(/\s+/g, '-'))) {
            selected.push(tmpl);
            usedCategories.add(tmpl.category);
            break;
          }
        }
      }
    }

    // Priority 3: fallback by popularity
    if (selected.length < needed) {
      for (const fallbackKey of FALLBACK_ORDER) {
        if (selected.length >= needed) break;
        const tmpl = TEMPLATES[fallbackKey];
        if (tmpl && !usedCategories.has(tmpl.category)) {
          selected.push(tmpl);
          usedCategories.add(tmpl.category);
        }
      }
    }

    // Map to archetype objects with the city placeholder as 'Local' (resolved later)
    return selected.slice(0, needed).map(t => ({
      category: t.category,
      interest: t.interest,
      displayName: t.displayName('Local'),
      description: t.description,
      intensity: t.intensity,
    }));
  }

  /**
   * Find or create the single canonical community for a given key.
   * Race-safe: two concurrent onboarding requests with the same key will both
   * resolve to the same community row via INSERT ON CONFLICT DO NOTHING.
   *
   * The community is created with isDeveloping=true (honest: new, no history).
   * The city name is injected from the market slug for a legible display name.
   */
  private async findOrCreateCanonicalCommunity(
    canonicalKey: string,
    archetype: { category: string; interest: string; displayName: string; description: string },
    market: string,
    user: User
  ): Promise<Community> {
    // Step 1 — check for existing community
    const existing = await db
      .select()
      .from(communities)
      .where(eq(communities.canonicalKey, canonicalKey))
      .limit(1);
    if (existing[0]) return existing[0];

    // Step 2 — build a human-readable city name from the market slug for the display name
    // "ogden-ut" → "Ogden"
    const cityName = market
      .split('-')
      .filter(p => p.length > 2 && !/^[a-z]{2}$/.test(p)) // exclude 2-letter state codes
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || 'Local';

    // Derive the display name using the city
    // We stored 'Local' as placeholder; replace it with the real city
    const communityName = archetype.displayName.replace('Local', cityName);

    const locationLabel = user.location || cityName;

    // Step 3 — race-safe insert: ON CONFLICT DO NOTHING
    // If two requests race here, only one INSERT wins; both then read the winner below.
    await db
      .insert(communities)
      .values({
        name: communityName,
        description: archetype.description,
        category: archetype.category,
        location: locationLabel,
        canonicalKey,
        isDeveloping: true,
        memberCount: 0,
        isActive: true,
      })
      .onConflictDoNothing();

    // Step 4 — fetch the winner (whether we created it or a concurrent request did)
    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.canonicalKey, canonicalKey))
      .limit(1);

    if (!community) {
      throw new Error(`findOrCreateCanonicalCommunity: failed to resolve community for key "${canonicalKey}"`);
    }
    return community;
  }

  // ── End Onboarding Community Assignment ────────────────────────────────────

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
    // F12: Idempotent — if membership row already exists (active or inactive),
    // reactivate it rather than inserting a duplicate.
    const [member] = await db
      .insert(communityMembers)
      .values({
        userId,
        communityId,
        joinedAt: new Date(),
        lastActivityAt: new Date(),
        activityScore: 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [communityMembers.userId, communityMembers.communityId],
        set: {
          isActive: true,
          lastActivityAt: new Date(),
        },
      })
      .returning();
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
    // F15: Pure read — does NOT auto-join communities.
    // Use seedMinimumCommunities() explicitly when seeding is required (e.g. first login).
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

  /**
   * Founder decision (2026-07-31): No automatic seeding of communities in production.
   * The reviewer/developer account behaves identically to a normal live user.
   * Community membership is earned only through explicit user actions.
   * Use the admin-only script scripts/join-reviewer-communities.ts for manual QA resets.
   * This method is intentionally removed from production code.
   */

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

  async joinCommunityWithRotation(
    userId: number,
    communityId: number,
    options: { isReplacement?: boolean; replaceCommunityId?: number } = {}
  ): Promise<{ joined: CommunityMember; dropped?: Community }> {
    const executeLogic = async (executor: typeof db | any) => {
      const activeRows = await executor
        .select({
          communityId: communityMembers.communityId,
          community: communities,
          activityScore: communityMembers.activityScore,
          lastActivityAt: communityMembers.lastActivityAt,
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communityMembers.communityId, communities.id))
        .where(and(eq(communityMembers.userId, userId), eq(communityMembers.isActive, true)))
        .orderBy(desc(communityMembers.lastActivityAt));

      // Check if user is already an active member of this community — idempotent success
      const existingMembership = activeRows.find((r: any) => r.communityId === communityId);
      if (existingMembership) {
        const [member] = await executor
          .select()
          .from(communityMembers)
          .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)))
          .limit(1);
        return { joined: member };
      }

      // Determine the slot cap strictly from the user's server-side record
      const userRow = await executor
        .select({ paymentTier: users.paymentTier, subscriptionStatus: users.subscriptionStatus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const userRec = userRow[0];
      const paymentTier = userRec?.paymentTier ?? 0;
      const isSubscriptionActive = userRec?.subscriptionStatus === 'active' || userRec?.subscriptionStatus === 'trialing';

      // Free user = 3 base. Paid entitlement = 3 + paymentTier (or 5 if active subscription). Capped at absolute max 5.
      const allowedSlots = isSubscriptionActive ? 5 : Math.min(5, 3 + paymentTier);

      let dropped: Community | undefined;

      // If user has reached or exceeded their allowed slots:
      if (activeRows.length >= allowedSlots) {
        // Case 0: Account is over-limit due to expired subscription/downgrade (e.g. holds 5, allowed 3)
        if (activeRows.length > allowedSlots) {
          const err: any = new Error(`COMMUNITY_DOWNGRADE_REQUIRED: Your subscription has expired. You hold ${activeRows.length} communities, but your free allowance is ${allowedSlots}. Please select communities to deactivate or renew your subscription.`);
          err.code = 'COMMUNITY_DOWNGRADE_REQUIRED';
          err.allowedSlots = allowedSlots;
          err.currentCount = activeRows.length;
          err.activeCommunities = activeRows.map((r: any) => r.community);
          throw err;
        }

        // Case A: Free user at 3 slots requesting a 4th slot without swap -> ENTITLEMENT_REQUIRED
        if (!options.isReplacement && !options.replaceCommunityId && allowedSlots < 5) {
          const err: any = new Error(`ENTITLEMENT_REQUIRED: You have used all ${allowedSlots} free active community slots.`);
          err.code = 'ENTITLEMENT_REQUIRED';
          err.allowedSlots = allowedSlots;
          err.currentCount = activeRows.length;
          throw err;
        }

        // Case B: Paid user at 5 slots requesting a 6th community without explicit swap -> COMMUNITY_LIMIT_REACHED
        if (!options.isReplacement && !options.replaceCommunityId && allowedSlots >= 5) {
          const err: any = new Error(`COMMUNITY_LIMIT_REACHED: You have reached the maximum limit of 5 active communities. Choose a community to replace.`);
          err.code = 'COMMUNITY_LIMIT_REACHED';
          err.allowedSlots = allowedSlots;
          err.currentCount = activeRows.length;
          err.activeCommunities = activeRows.map((r: any) => r.community);
          throw err;
        }

        // Case C: User explicitly requested replacement -> drop target or least active
        let targetToDrop = options.replaceCommunityId
          ? activeRows.find((r: any) => r.communityId === options.replaceCommunityId)
          : null;

        if (!targetToDrop) {
          targetToDrop = activeRows.reduce((least: any, current: any) => {
            const cs = current.activityScore ?? 0;
            const ls = least.activityScore ?? 0;
            if (cs < ls) return current;
            if (cs > ls) return least;
            const currentTime = current.lastActivityAt ? current.lastActivityAt.getTime() : 0;
            const leastTime = least.lastActivityAt ? least.lastActivityAt.getTime() : 0;
            if (currentTime < leastTime) return current;
            if (currentTime > leastTime) return least;
            return current.communityId < least.communityId ? current : least;
          });
        }

        await executor
          .delete(communityMembers)
          .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, targetToDrop.communityId)));

        dropped = targetToDrop.community;
      }

      // F12: Idempotent insert
      const [joined] = await executor
        .insert(communityMembers)
        .values({
          userId,
          communityId,
          joinedAt: new Date(),
          lastActivityAt: new Date(),
          activityScore: 1,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [communityMembers.userId, communityMembers.communityId],
          set: {
            isActive: true,
            lastActivityAt: new Date(),
          },
        })
        .returning();

      return { joined, dropped };
    };

    try {
      return await db.transaction(async (tx) => executeLogic(tx));
    } catch (err: any) {
      if (err.code === 'ENTITLEMENT_REQUIRED') throw err;
      // Fallback for neon-http driver which does not support db.transaction
      return await executeLogic(db);
    }
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

  async getEventsByLocation(latitude: string, longitude: string, radiusMiles: number, userId?: number): Promise<Event[]> {
    let allEvents = await this.getAllEvents();
    
    if (userId) {
      const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerId, userId));
      const blockedIds = new Set(blocks.map(b => b.blockedId));
      if (blockedIds.size > 0) {
        allEvents = allEvents.filter(e => !e.creatorId || !blockedIds.has(e.creatorId));
      }
    }
    
    return allEvents;
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.category, category));
  }

  async getUpcomingEvents(userId?: number): Promise<Event[]> {
    let allEvents = await db.select().from(events)
      .where(sql`${events.date} >= NOW()`)
      .orderBy(asc(events.date));
      
    if (userId) {
      const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerId, userId));
      const blockedIds = new Set(blocks.map(b => b.blockedId));
      if (blockedIds.size > 0) {
        allEvents = allEvents.filter(e => !e.creatorId || !blockedIds.has(e.creatorId));
      }
    }
    
    return allEvents;
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
    // F13: Idempotent — update status if the row already exists (e.g. double-tap or
    // status upgrade from 'interested' → 'attended').
    const [attendee] = await db
      .insert(eventAttendees)
      .values({
        userId,
        eventId,
        status,
        registeredAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [eventAttendees.userId, eventAttendees.eventId],
        set: {
          status,
          registeredAt: new Date(),
        },
      })
      .returning();
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

  async getEventAttendees(eventId: number, currentUserId?: number): Promise<User[]> {
    const result = await db.select({
      user: users
    })
    .from(eventAttendees)
    .innerJoin(users, eq(eventAttendees.userId, users.id))
    .where(eq(eventAttendees.eventId, eventId));
    
    let attendees = result.map(r => r.user);
    
    if (currentUserId) {
      const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerId, currentUserId));
      const blockedIds = new Set(blocks.map(b => b.blockedId));
      if (blockedIds.size > 0) {
        attendees = attendees.filter(u => !blockedIds.has(u.id));
      }
    }
    
    return attendees;
  }

  /**
   * F16: Batch attendee fetch — loads all attendees for multiple events in 2 DB queries
   * (one for attendees, one for block-list) instead of 1 per event.
   * Returns a Map<eventId, User[]> for O(1) lookup per event.
   */
  async getEventAttendeesForEvents(eventIds: number[], currentUserId?: number): Promise<Map<number, { id: number; name: string; avatar: string | null }[]>> {
    if (eventIds.length === 0) return new Map();

    const result = await db.select({
      eventId: eventAttendees.eventId,
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
    })
    .from(eventAttendees)
    .innerJoin(users, eq(eventAttendees.userId, users.id))
    .where(inArray(eventAttendees.eventId, eventIds));

    // Fetch blocker's block list once
    let blockedIds = new Set<number>();
    if (currentUserId) {
      const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerId, currentUserId));
      blockedIds = new Set(blocks.map(b => b.blockedId));
    }

    const map = new Map<number, { id: number; name: string; avatar: string | null }[]>();
    for (const row of result) {
      if (blockedIds.has(row.userId)) continue;
      if (!map.has(row.eventId)) map.set(row.eventId, []);
      map.get(row.eventId)!.push({ id: row.userId, name: row.name, avatar: row.avatar });
    }
    return map;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    const blocks = await db.select().from(userBlocks)
      .where(or(
        and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
        and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
      ));
      
    if (blocks.length > 0) return [];

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

  async getTrendingEventsByLocation(userLocation: { lat: number, lon: number }, radiusMiles: number = 50): Promise<any[]> {
    try {
      const allEvents = await db
        .select({
          event: events,
          joinCount: sql<number>`count(${eventAttendees.userId})`.as('joinCount')
        })
        .from(events)
        .leftJoin(eventAttendees, eq(events.id, eventAttendees.eventId))
        .where(gte(events.date, new Date()))
        .groupBy(events.id)
        .orderBy(desc(sql`count(${eventAttendees.userId})`))
        .limit(10);

      return allEvents.map(({ event, joinCount }) => ({
        ...event,
        joinCount: joinCount || 0,
        isTrending: (joinCount || 0) > 0
      }));
    } catch (error) {
      console.error('Error getting trending events:', error);
      return [];
    }
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  async getCommunityPosts(communityId: number): Promise<any[]> {
    const { posts, postKudos, users } = await import("@shared/schema");
    const result = await db
      .select({
        id: posts.id,
        communityId: posts.communityId,
        content: posts.content,
        kudosCount: posts.kudosCount,
        replyCount: posts.replyCount,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorAvatar: users.avatar,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.communityId, communityId))
      .orderBy(desc(posts.createdAt))
      .limit(50);
    return result;
  }

  async createPost(communityId: number, authorId: number, content: string): Promise<any> {
    const { posts } = await import("@shared/schema");
    const [post] = await db
      .insert(posts)
      .values({ communityId, authorId, content })
      .returning();
    return post;
  }

  async givePostKudos(postId: number, giverId: number): Promise<{ success: boolean; newCount: number; alreadyGiven: boolean }> {
    const { postKudos, posts } = await import("@shared/schema");

    // Idempotency check
    const existing = await db
      .select()
      .from(postKudos)
      .where(and(eq(postKudos.postId, postId), eq(postKudos.giverId, giverId)))
      .limit(1);

    if (existing.length > 0) {
      const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      return { success: false, alreadyGiven: true, newCount: post?.kudosCount ?? 0 };
    }

    // Insert kudos record
    await db.insert(postKudos).values({ postId, giverId });

    // Increment counter
    const [updated] = await db
      .update(posts)
      .set({ kudosCount: sql`${posts.kudosCount} + 1` })
      .where(eq(posts.id, postId))
      .returning();

    return { success: true, alreadyGiven: false, newCount: updated.kudosCount ?? 0 };
  }

  // ── Streaks ────────────────────────────────────────────────────────────────

  async getStreak(userId: number): Promise<any> {
    const { streaks } = await import("@shared/schema");
    const [streak] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
    return streak ?? { userId, currentStreak: 0, bestStreak: 0, totalCheckins: 0, lastCheckinDate: null };
  }

  async checkin(userId: number): Promise<any> {
    const { streaks } = await import("@shared/schema");
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

    if (!existing) {
      // First ever check-in
      const [created] = await db
        .insert(streaks)
        .values({ userId, currentStreak: 1, bestStreak: 1, lastCheckinDate: today, totalCheckins: 1 })
        .returning();
      return created;
    }

    if (existing.lastCheckinDate === today) {
      // Already checked in today
      return existing;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const isConsecutive = existing.lastCheckinDate === yesterday;

    const newStreak = isConsecutive ? (existing.currentStreak ?? 0) + 1 : 1;
    const newBest = Math.max(existing.bestStreak ?? 0, newStreak);

    const [updated] = await db
      .update(streaks)
      .set({
        currentStreak: newStreak,
        bestStreak: newBest,
        lastCheckinDate: today,
        totalCheckins: sql`${streaks.totalCheckins} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(streaks.userId, userId))
      .returning();

    return updated;
  }

  // ── Agent Runs ─────────────────────────────────────────────────────────────

  async getLatestAgentRun(userId: number): Promise<any> {
    const { agentRuns } = await import("@shared/schema");
    const [run] = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.userId, userId))
      .orderBy(desc(agentRuns.runAt))
      .limit(1);
    return run ?? null;
  }

  async getAgentInsights(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    const agentRun = await this.getLatestAgentRun(userId);
    return {
      inferred: (user?.agentInferredInterests as any)?.tags ?? [],
      lastRunAt: agentRun?.runAt ?? null,
      trending: agentRun?.trendingTopics ?? [],
      recommendedEvents: agentRun?.recommendedEvents ?? [],
      interestsDelta: agentRun?.interestsDelta ?? { added: [], removed: [] },
    };
  }

  // ── Recommendation Refresh ───────────────────────────────────────────────────

  async refreshUserRecommendations(userId: number): Promise<void> {
    try {
      // Invalidate agent-inferred interests so next fetch regenerates communities
      await db.update(users)
        .set({ agentInferredInterests: null })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error refreshing user recommendations:', error);
    }
  }

  // ── Account Deletion (required by Apple & Google) ────────────────────────────

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // Delete in dependency order to avoid FK violations
      const { agentRuns, streaks, posts, postKudos, postReplies } = await import("@shared/schema");

      await db.delete(activityFeed).where(eq(activityFeed.userId, userId));
      await db.delete(communityMembers).where(eq(communityMembers.userId, userId));
      await db.delete(eventAttendees).where(eq(eventAttendees.userId, userId));
      await db.delete(messages).where(
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      );
      await db.delete(kudos).where(
        or(eq(kudos.giverId, userId), eq(kudos.receiverId, userId))
      );
      await db.delete(communityMessages).where(eq(communityMessages.senderId, userId));

      // Optional tables (may not exist if schema not fully migrated)
      try { await db.delete(postKudos).where(eq(postKudos.giverId, userId)); } catch {}
      try { await db.delete(postReplies).where(eq(postReplies.authorId, userId)); } catch {}
      try { await db.delete(posts).where(eq(posts.authorId, userId)); } catch {}
      try { await db.delete(streaks).where(eq(streaks.userId, userId)); } catch {}
      try { await db.delete(agentRuns).where(eq(agentRuns.userId, userId)); } catch {}

      // Safety table cleanup (new tables — wrapped in try/catch for schema migration safety)
      try {
        await db.delete(userBlocks).where(
          or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId))
        );
      } catch {}
      try {
        await db.delete(userReports).where(
          or(eq(userReports.reporterId, userId), eq(userReports.targetUserId, userId))
        );
      } catch {}
      try {
        await db.delete(eventReports).where(eq(eventReports.reporterId, userId));
      } catch {}
      try {
        await db.delete(eventReviews).where(eq(eventReviews.userId, userId));
      } catch {}

      const result = await db.delete(users).where(eq(users.id, userId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async createTelemetryEvent(insertEvent: InsertTelemetryEvent): Promise<TelemetryEvent> {
    const [event] = await db.insert(telemetryEvents).values(insertEvent).returning();
    return event;
  }

  async getTelemetryEvents(filters?: { userId?: number, eventType?: string, eventId?: number }): Promise<TelemetryEvent[]> {
    let query = db.select().from(telemetryEvents);
    const conditions = [];

    if (filters?.userId) conditions.push(eq(telemetryEvents.userId, filters.userId));
    if (filters?.eventType) conditions.push(eq(telemetryEvents.eventType, filters.eventType));
    if (filters?.eventId) conditions.push(eq(telemetryEvents.eventId, filters.eventId));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(telemetryEvents.createdAt));
    }
    
    return await query.orderBy(desc(telemetryEvents.createdAt));
  }

  // ── Safety & Moderation ───────────────────────────────────────────────────

  async blockUser(blockerId: number, blockedId: number, reason?: string): Promise<UserBlock> {
    // Idempotency: return existing block if already blocked
    const [existing] = await db
      .select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
      .limit(1);
    if (existing) return existing;

    const [block] = await db
      .insert(userBlocks)
      .values({ blockerId, blockedId, reason: reason ?? null })
      .returning();
    return block;
  }

  async isUserBlocked(viewerId: number, targetId: number): Promise<boolean> {
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, targetId)),
          and(eq(userBlocks.blockerId, targetId), eq(userBlocks.blockedId, viewerId))
        )
      )
      .limit(1);
    return !!block;
  }

  async reportUser(reporterId: number, targetUserId: number, reason: string, details?: string): Promise<UserReport> {
    const [report] = await db
      .insert(userReports)
      .values({ reporterId, targetUserId, reason, details: details ?? null, status: 'pending' })
      .returning();
    return report;
  }

  async reportEvent(reporterId: number, eventId: number, reason: string, details?: string): Promise<EventReport> {
    const [report] = await db
      .insert(eventReports)
      .values({ reporterId, eventId, reason, details: details ?? null, status: 'pending' })
      .returning();
    return report;
  }

  async createEventReview(userId: number, eventId: number, rating: number, feltSafe: boolean, feedback?: string): Promise<any> {
    const [review] = await db
      .insert(eventReviews)
      .values({ userId, eventId, rating, feltSafe, feedback: feedback ?? null })
      .returning();
    return review;
  }
}

const databaseStorage = new DatabaseStorage();
databaseStorage.initializeData();

export const storage = databaseStorage;