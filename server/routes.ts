import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCommunitySchema, insertEventSchema, insertMessageSchema, insertKudosSchema, insertCommunityMemberSchema, insertEventAttendeeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Community messaging routes
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
        receiverId: 0, // Community messages use 0 for community-wide messages
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
