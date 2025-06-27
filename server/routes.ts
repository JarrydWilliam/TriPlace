import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { eventScraper } from "./event-scraper";
import { insertUserSchema, insertCommunitySchema, insertEventSchema, insertMessageSchema, insertKudosSchema, insertCommunityMemberSchema, insertEventAttendeeSchema } from "@shared/schema";
import { z } from "zod";
import { healthCheckHandler } from "./health-check";

export async function registerRoutes(app: Express): Promise<Server> {
  // Safari cache control middleware to prevent blank screen on reload
  app.use((req, res, next) => {
    // Set cache control headers for Safari compatibility
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.sendStatus(200);
    }
    
    next();
  });

  // Health check endpoint for production monitoring
  app.get("/health", healthCheckHandler);
  app.get("/api/health", healthCheckHandler);
  
  // Version endpoint for deployment updates
  app.get("/api/version", (req, res) => {
    res.send(Date.now().toString());
  });
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/firebase/:uid", async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user location for community filtering
  app.put("/api/users/:id/location", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const user = await storage.updateUser(id, { 
        latitude: latitude.toString(), 
        longitude: longitude.toString() 
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, message: "Location updated successfully" });
    } catch (error) {
      console.error('Error updating user location:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Community routes
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/recommended", async (req, res) => {
    try {
      const interests = req.query.interests as string;
      const userId = req.query.userId as string;
      const latitude = req.query.latitude as string;
      const longitude = req.query.longitude as string;
      
      const interestsArray = interests ? interests.split(',').filter(i => i.trim()) : [];
      const userLocation = latitude && longitude ? { lat: parseFloat(latitude), lon: parseFloat(longitude) } : undefined;
      const userIdNum = userId ? parseInt(userId) : undefined;
      
      console.log('Recommended communities request - interests:', interestsArray, 'userId:', userIdNum, 'location:', userLocation);
      
      const communities = await storage.getRecommendedCommunities(interestsArray, userLocation, userIdNum);
      console.log('Recommended communities found:', communities.length);
      
      res.json(communities);
    } catch (error) {
      console.error('Error getting recommended communities:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const community = await storage.getCommunity(id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities", async (req, res) => {
    try {
      const communityData = insertCommunitySchema.parse(req.body);
      const community = await storage.createCommunity(communityData);
      res.status(201).json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid community data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/join", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const result = await storage.joinCommunityWithRotation(userId, communityId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's active communities with activity scores
  app.get("/api/users/:id/active-communities", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const activeCommunities = await storage.getUserActiveCommunities(userId);
      res.json(activeCommunities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update community activity when user interacts
  app.post("/api/communities/:id/activity", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      await storage.updateCommunityActivity(userId, communityId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's monthly kudos count
  app.get("/api/users/:id/kudos/monthly", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const kudos = await storage.getUserKudosReceived(userId);
      const monthlyKudos = kudos.filter(k => k.createdAt && new Date(k.createdAt) >= currentMonth);
      
      res.json({ count: monthlyKudos.length });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's active challenges
  app.get("/api/users/:id/challenges", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Generate dynamic challenges based on user activity
      const userCommunities = await storage.getUserCommunities(userId);
      const userEvents = await storage.getUserEvents(userId);
      const userKudos = await storage.getUserKudosReceived(userId);
      
      const challenges = [];
      
      // Challenge 1: Community engagement
      if (userCommunities.length > 0) {
        challenges.push({
          id: "community-engagement",
          title: "🎯 Join 3 community discussions this week",
          progress: Math.min((userCommunities.length / 3) * 100, 100),
          target: 3,
          current: userCommunities.length
        });
      }
      
      // Challenge 2: Event participation
      challenges.push({
        id: "event-participation", 
        title: "📅 Attend 2 events this week",
        progress: Math.min((userEvents.length / 2) * 100, 100),
        target: 2,
        current: userEvents.length
      });
      
      // Challenge 3: Community building
      challenges.push({
        id: "community-building",
        title: "🤝 Earn 5 kudos from community members", 
        progress: Math.min((userKudos.length / 5) * 100, 100),
        target: 5,
        current: userKudos.length
      });
      
      res.json(challenges);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update current user's location
  app.patch("/api/users/current/location", async (req, res) => {
    try {
      const { latitude, longitude, location } = req.body;
      
      // In a real app, get user ID from session/auth
      // For now, assume user ID 1 (the logged-in user)
      const userId = 1;
      
      const updatedUser = await storage.updateUser(userId, { 
        location,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Get dynamic community members based on location and interests
  app.get("/api/communities/:id/dynamic-members", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { latitude, longitude, userId } = req.query;
      
      if (isNaN(id) || !latitude || !longitude || !userId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userLocation = { 
        lat: parseFloat(latitude as string), 
        lon: parseFloat(longitude as string) 
      };
      
      const userInterests = user.interests || [];
      const members = await storage.getDynamicCommunityMembers(id, userLocation, userInterests);
      
      res.json(members);
    } catch (error) {
      console.error("Error fetching dynamic community members:", error);
      res.status(500).json({ message: "Failed to fetch dynamic community members" });
    }
  });

  app.post("/api/communities/:id/leave", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const success = await storage.leaveCommunity(userId, communityId);
      if (!success) {
        return res.status(404).json({ message: "Membership not found" });
      }
      res.json({ message: "Successfully left community" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/communities", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const communities = await storage.getUserCommunities(userId);
      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/nearby", async (req, res) => {
    try {
      const { latitude, longitude, radius = 50 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const events = await storage.getEventsByLocation(
        latitude as string, 
        longitude as string, 
        parseInt(radius as string)
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/register", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId, status = "interested" } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const registration = await storage.registerForEvent(userId, eventId, status);
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create global revenue-generating event
  app.post("/api/events/create-global", async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        time,
        location,
        category,
        price,
        maxAttendees,
        eventType,
        brandPartnerName,
        revenueSharePercentage,
        creatorId,
        isGlobal,
        isPaid
      } = req.body;

      if (!title || !description || !date || !time || !location || !category || !creatorId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Combine date and time into full datetime
      const eventDateTime = new Date(`${date}T${time}`);
      
      const eventData = {
        title,
        description,
        organizer: eventType === "brand-partnership" ? brandPartnerName || "Brand Partner" : "Community Coordinator",
        date: eventDateTime,
        location,
        address: location, // Use location as address for global events
        category,
        price: price ? price.toString() : "0",
        maxAttendees: maxAttendees || 50,
        creatorId,
        isGlobal: true,
        eventType,
        brandPartnerName: eventType === "brand-partnership" ? brandPartnerName : null,
        revenueSharePercentage: revenueSharePercentage || 7,
        status: "pending_review" // Global events require review
      };

      const event = await storage.createEvent(eventData);
      
      // Add activity feed item for event creation
      await storage.addActivityItem(creatorId, "event_created", {
        eventId: event.id,
        eventTitle: title,
        eventType,
        isGlobal: true
      });

      res.status(201).json({
        ...event,
        message: "Global event created successfully and submitted for review"
      });
    } catch (error: any) {
      console.error('Global event creation error:', error);
      res.status(500).json({ message: "Failed to create global event: " + error.message });
    }
  });

  app.get("/api/users/:id/events", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message routes
  app.get("/api/conversations/:userId1/:userId2", async (req, res) => {
    try {
      const userId1 = parseInt(req.params.userId1);
      const userId2 = parseInt(req.params.userId2);
      const messages = await storage.getConversation(userId1, userId2);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/conversations", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.sendMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markMessageAsRead(id);
      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json({ message: "Message marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Kudos routes
  app.get("/api/users/:id/kudos/received", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const kudos = await storage.getUserKudosReceived(userId);
      res.json(kudos);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/kudos", async (req, res) => {
    try {
      const kudosData = insertKudosSchema.parse(req.body);
      const kudos = await storage.giveKudos(kudosData);
      res.status(201).json(kudos);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid kudos data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activity feed routes
  app.get("/api/users/:id/activity", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const activities = await storage.getUserActivityFeed(userId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Automatic event population for all user communities
  app.post("/api/auto-populate-events", async (req, res) => {
    try {
      const { userId, latitude, longitude } = req.body;
      
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ message: "User ID and location required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userCommunities = await storage.getUserCommunities(userId);
      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      
      let totalEventsAdded = 0;
      
      // Automatically populate events for all user's communities
      for (const community of userCommunities) {
        try {
          const events = await eventScraper.populateCommunityEvents(community, userLocation);
          totalEventsAdded += events.length;
        } catch (error) {
          console.error(`Error populating events for community ${community.name}:`, error);
        }
      }
      
      res.json({ 
        message: `Auto-populated ${totalEventsAdded} events across ${userCommunities.length} communities`,
        eventsAdded: totalEventsAdded,
        communitiesProcessed: userCommunities.length
      });
    } catch (error) {
      console.error('Error auto-populating events:', error);
      res.status(500).json({ message: "Failed to auto-populate events" });
    }
  });

  // Event scraping routes
  app.post("/api/communities/:id/scrape-events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { latitude, longitude } = req.body;
      
      if (isNaN(communityId) || !latitude || !longitude) {
        return res.status(400).json({ message: "Invalid community ID or location data" });
      }
      
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      const scrapedEvents = await eventScraper.populateCommunityEvents(community, userLocation);
      
      res.json({ 
        message: `Successfully scraped ${scrapedEvents.length} events for ${community.name}`,
        events: scrapedEvents 
      });
    } catch (error) {
      console.error('Event scraping error:', error);
      res.status(500).json({ message: "Failed to scrape events" });
    }
  });

  app.get("/api/communities/:id/scraped-events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: "Invalid community ID" });
      }
      
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Get events that match this community's category and are recent
      const events = await storage.getEventsByCategory(community.category);
      const recentEvents = events.filter(event => 
        new Date(event.date) >= new Date() && // Future events only
        new Date(event.date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Within 30 days
      );
      
      res.json(recentEvents);
    } catch (error) {
      console.error('Error fetching scraped events:', error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Create community event
  app.post("/api/communities/:id/events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { title, description, date, location, price, organizerId } = req.body;
      
      if (isNaN(communityId) || !title || !date || !organizerId) {
        return res.status(400).json({ message: "Missing required fields: title, date, and organizerId" });
      }
      
      // Verify the community exists
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Get organizer details
      const organizer = await storage.getUser(parseInt(organizerId));
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      // Create the event
      const eventData = {
        title: title.trim(),
        description: description?.trim() || "",
        organizer: organizer.name || "Unknown Organizer",
        date: new Date(date),
        location: location?.trim() || "Location TBD",
        address: location?.trim() || "Location TBD", // Using location as address for now
        category: community.category,
        price: price ? price.toString() : null,
        tags: [community.category.toLowerCase()],
        attendeeCount: 0
      };
      
      const newEvent = await storage.createEvent(eventData);
      
      // Add activity to organizer's feed
      await storage.addActivityItem(parseInt(organizerId), 'event_created', {
        eventId: newEvent.id,
        eventTitle: newEvent.title,
        communityName: community.name
      });
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating community event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Event attendance tracking
  app.post("/api/events/:id/mark-attended", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (isNaN(eventId) || !userId) {
        return res.status(400).json({ message: "Event ID and user ID required" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if event date has passed
      const eventDate = new Date(event.date);
      const now = new Date();
      if (eventDate > now) {
        return res.status(400).json({ message: "Cannot mark attendance for future events" });
      }
      
      // Register/update attendance status
      const attendance = await storage.registerForEvent(parseInt(userId), eventId, "attended");
      
      // Add to activity feed for algorithm learning
      await storage.addActivityItem(parseInt(userId), 'event_attended', {
        eventId: eventId,
        eventTitle: event.title,
        eventCategory: event.category,
        eventDate: event.date,
        attendanceConfirmed: new Date().toISOString()
      });
      
      res.json({ 
        message: "Attendance marked successfully",
        attendance: attendance
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ message: "Failed to mark attendance" });
    }
  });

  // Get user's attended events for algorithm
  app.get("/api/users/:id/attended-events", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all events where user has "attended" status
      const attendedEvents = await storage.getUserEvents(userId);
      const confirmedAttended = attendedEvents.filter(event => {
        // This would need to be implemented in storage to check attendance status
        return true; // Placeholder - would check actual attendance records
      });
      
      res.json(confirmedAttended);
    } catch (error) {
      console.error("Error fetching attended events:", error);
      res.status(500).json({ message: "Failed to fetch attended events" });
    }
  });

  // Community messaging routes
  app.get("/api/communities/:id/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: "Invalid community ID" });
      }
      
      const messages = await storage.getCommunityMessages(communityId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching community messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/communities/:id/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { content, senderId } = req.body;
      
      if (!content || !senderId) {
        return res.status(400).json({ message: "Content and senderId are required" });
      }
      
      const messageData = {
        content: content.trim(),
        senderId: parseInt(senderId),
        communityId: communityId,
        receiverId: parseInt(senderId), // Use sender as receiver for community messages
        isRead: false,
        createdAt: new Date()
      };
      
      const message = await storage.sendCommunityMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending community message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get community with dynamic member count based on user location and interests
  app.get("/api/communities/:id/dynamic-info", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { latitude, longitude, userId } = req.query;
      
      if (!latitude || !longitude || !userId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userLocation = { 
        lat: parseFloat(latitude as string), 
        lon: parseFloat(longitude as string) 
      };
      
      const userInterests = user.interests || [];
      const dynamicMembers = await storage.getDynamicCommunityMembers(communityId, userLocation, userInterests);
      
      res.json({
        ...community,
        onlineMembers: dynamicMembers.length,
        dynamicMembers: dynamicMembers
      });
    } catch (error) {
      console.error("Error fetching dynamic community info:", error);
      res.status(500).json({ message: "Failed to fetch dynamic community info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
