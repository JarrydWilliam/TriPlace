import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-clean";
import { insertUserSchema, insertCommunitySchema, insertEventSchema, insertMessageSchema, insertKudosSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User routes
  app.get("/api/users/firebase/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByFirebaseUid(uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Location update endpoint with 50-mile radius community filtering
  app.patch("/api/users/current/location", async (req, res) => {
    try {
      const { latitude, longitude, userId } = req.body;
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required location data" });
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        latitude: latitude.toString(), 
        longitude: longitude.toString() 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's active communities with activity scores
  app.get("/api/users/:id/active-communities", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activeCommunities = await storage.getUserActiveCommunities(id);
      res.json(activeCommunities);
    } catch (error) {
      console.error("Error getting user active communities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's joined events
  app.get("/api/users/:id/events", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const events = await storage.getUserEvents(id);
      res.json(events);
    } catch (error) {
      console.error("Error getting user events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Community routes with geolocation filtering
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error getting communities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/communities/recommended", async (req, res) => {
    try {
      const { interests, latitude, longitude, userId } = req.query;
      const userInterests = interests ? (interests as string).split(',') : [];
      const userLocation = latitude && longitude ? 
        { lat: parseFloat(latitude as string), lon: parseFloat(longitude as string) } : undefined;
      
      const recommendedCommunities = await storage.getRecommendedCommunities(
        userInterests, 
        userLocation, 
        userId ? parseInt(userId as string) : undefined
      );
      res.json(recommendedCommunities);
    } catch (error) {
      console.error("Error getting recommended communities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const community = await storage.getCommunity(id);
      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      console.error("Error getting community:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/communities", async (req, res) => {
    try {
      const communityData = insertCommunitySchema.parse(req.body);
      const community = await storage.createCommunity(communityData);
      res.status(201).json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid community data", details: error.errors });
      }
      console.error("Error creating community:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Community membership routes with activity-based rotation
  app.post("/api/communities/:id/join", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const result = await storage.joinCommunityWithRotation(userId, communityId);
      res.json(result);
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/communities/:id/leave", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const success = await storage.leaveCommunity(userId, communityId);
      if (!success) {
        return res.status(404).json({ error: "Membership not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving community:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get dynamic community members based on location and interests
  app.get("/api/communities/:id/members", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { latitude, longitude, interests, radius } = req.query;
      
      if (!latitude || !longitude || !interests) {
        return res.status(400).json({ error: "Location and interests are required" });
      }
      
      const userLocation = { lat: parseFloat(latitude as string), lon: parseFloat(longitude as string) };
      const userInterests = (interests as string).split(',');
      const radiusMiles = radius ? parseInt(radius as string) : 50;
      
      const members = await storage.getDynamicCommunityMembers(
        communityId, 
        userLocation, 
        userInterests, 
        radiusMiles
      );
      res.json(members);
    } catch (error) {
      console.error("Error getting community members:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Community messaging routes
  app.get("/api/communities/:id/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const messages = await storage.getCommunityMessages(communityId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting community messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { senderId, content } = req.body;
      
      if (!senderId || !content) {
        return res.status(400).json({ error: "Sender ID and content are required" });
      }
      
      const messageData = {
        senderId,
        content,
        communityId
      };
      
      const message = await storage.sendCommunityMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending community message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.json(events);
    } catch (error) {
      console.error("Error getting upcoming events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid event data", details: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Event registration routes
  app.post("/api/events/:id/register", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const attendance = await storage.registerForEvent(userId, eventId, "registered");
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/events/:id/mark-attended", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const attendance = await storage.registerForEvent(userId, eventId, "attended");
      res.json(attendance);
    } catch (error) {
      console.error("Error marking event attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Messaging routes
  app.get("/api/messages/conversation", async (req, res) => {
    try {
      const { user1Id, user2Id } = req.query;
      
      if (!user1Id || !user2Id) {
        return res.status(400).json({ error: "Both user IDs are required" });
      }
      
      const conversation = await storage.getConversation(
        parseInt(user1Id as string), 
        parseInt(user2Id as string)
      );
      res.json(conversation);
    } catch (error) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.sendMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Kudos routes
  app.post("/api/kudos", async (req, res) => {
    try {
      const kudosData = insertKudosSchema.parse(req.body);
      const kudos = await storage.giveKudos(kudosData);
      res.status(201).json(kudos);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid kudos data", details: error.errors });
      }
      console.error("Error giving kudos:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:id/kudos/received", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const kudos = await storage.getUserKudosReceived(userId);
      res.json(kudos);
    } catch (error) {
      console.error("Error getting user kudos received:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check and version endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/version", (req, res) => {
    res.send(Date.now().toString());
  });

  const httpServer = createServer(app);
  return httpServer;
}