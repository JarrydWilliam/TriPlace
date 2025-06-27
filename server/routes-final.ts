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

  // Community routes
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error getting communities:", error);
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

  app.get("/api/users/:userId/recommended-communities", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { interests, lat, lon } = req.query;
      
      const userInterests = Array.isArray(interests) ? interests as string[] : (interests as string)?.split(',') || [];
      const userLocation = lat && lon ? { lat: parseFloat(lat as string), lon: parseFloat(lon as string) } : undefined;
      
      const communities = await storage.getRecommendedCommunities(userInterests, userLocation, userId);
      res.json(communities);
    } catch (error) {
      console.error("Error getting recommended communities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Community membership routes
  app.post("/api/communities/:communityId/join", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
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

  app.get("/api/users/:userId/communities", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const communities = await storage.getUserActiveCommunities(userId);
      res.json(communities);
    } catch (error) {
      console.error("Error getting user communities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/communities/:communityId/members", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const { lat, lon, interests } = req.query;
      
      if (lat && lon && interests) {
        const userLocation = { lat: parseFloat(lat as string), lon: parseFloat(lon as string) };
        const userInterests = (interests as string).split(',');
        const members = await storage.getDynamicCommunityMembers(communityId, userLocation, userInterests);
        res.json(members);
      } else {
        const members = await storage.getCommunityMembers(communityId);
        res.json(members);
      }
    } catch (error) {
      console.error("Error getting community members:", error);
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

  app.get("/api/communities/:communityId/events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const events = await storage.getCommunityEvents(communityId);
      res.json(events);
    } catch (error) {
      console.error("Error getting community events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/communities/:communityId/events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const eventData = { ...req.body, communityId };
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating community event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Event attendance routes
  app.post("/api/events/:eventId/register", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { userId, status = "going" } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const attendee = await storage.registerForEvent(userId, eventId, status);
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/:userId/events", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error getting user events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Messaging routes
  app.get("/api/communities/:communityId/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const messages = await storage.getCommunityMessages(communityId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting community messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/communities/:communityId/messages", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const messageData = { ...req.body, communityId };
      const message = await storage.sendCommunityMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending community message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/messages/:messageId/resonate", async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const resonated = await storage.resonateMessage(messageId, userId);
      res.json({ resonated });
    } catch (error) {
      console.error("Error resonating message:", error);
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

  app.get("/api/users/:userId/kudos/received", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const kudos = await storage.getUserKudosReceived(userId);
      res.json(kudos);
    } catch (error) {
      console.error("Error getting user kudos received:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}