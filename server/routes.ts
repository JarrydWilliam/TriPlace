import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { aiMatcher } from "./ai-matching.js";
import { communityRefreshService } from "./community-refresh.js";
import { communityUpdateNotifier } from "./community-update-notifier.js";
import { eventScrapingScheduler } from "./schedulers/eventScrapingScheduler.js";
import { eventScraperOrchestrator } from "./scrapers/eventScraperOrchestrator.js";
import { insertUserSchema, insertCommunitySchema, insertEventSchema, insertMessageSchema, insertKudosSchema, insertCommunityMemberSchema, insertEventAttendeeSchema, insertTelemetryEventSchema, CURRENT_TERMS_VERSION } from "../shared/schema.js";
import { z } from "zod";
import express from "express";
import { filterUGC } from "./utils/content-filter.js";

// Track active WebSocket connections for real-time member detection
const activeConnections = new Map<number, { ws: WebSocket, lastActivity: Date }>();

// Broadcast member status updates to all connected clients
function broadcastMemberUpdate(userId: number, isOnline: boolean) {
  const message = JSON.stringify({
    type: 'member_status_update',
    userId,
    isOnline,
    timestamp: Date.now()
  });

  Array.from(activeConnections.values()).forEach(connection => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(message);
    }
  });
}

export interface RouteOptions {
  authMiddleware?: any;
  storage?: any;
  appleAuthService?: any;
  adminApp?: any;
}

export async function registerRoutes(app: Express, options?: RouteOptions): Promise<Server> {
  const appStorage = options?.storage || (await import("./storage.js")).storage;
  const appAppleAuthService = options?.appleAuthService || (await import("./services/apple-auth-service.js")).appleAuthService;
  let appAdminApp = options?.adminApp;
  if (!appAdminApp) {
    try {
      const { getAdminApp } = await import("./utils/firebase-admin.js");
      appAdminApp = getAdminApp();
    } catch(e) {}
  }
  const requireAuth = options?.authMiddleware || (async (req: any, res: any, next: any) => {
    let adminApp = appAdminApp;
    if (!adminApp) {
      console.error('[SameVibe] Auth failed: Firebase Admin is not configured.');
      return res.status(401).json({ message: "Firebase Admin is not configured." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminApp.auth().verifyIdToken(idToken);
      req.firebaseUser = decodedToken;
      
      // Enforce Adult Eligibility / Profile Completion Gate for existing users
      
      const dbUser = await appStorage.getUserByFirebaseUid(decodedToken.uid);
      req.user = dbUser;
      
      let isCompliant = true;
      if (dbUser) {
        if (!dbUser.dateOfBirth || dbUser.termsVersion !== CURRENT_TERMS_VERSION || !dbUser.termsAcceptedAt) {
          isCompliant = false;
        }
      }

      if (dbUser && !isCompliant) {
        // Strict allowlist for incomplete profiles
        const isAllowedUserRoute = req.path === `/api/users/${dbUser.id}` && 
          (req.method === 'GET' || req.method === 'PATCH' || req.method === 'DELETE');
        
        if (!isAllowedUserRoute) {
          return res.status(403).json({ 
            message: "Action restricted: You must complete your profile setup (18+ Date of Birth and Terms of Service).",
            requiresCompletion: true 
          });
        }
      }

      next();
    } catch (error) {
      console.error('[SameVibe] verifyIdToken error:', error);
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }
  });

  // --- Admin Security Middleware ---
  const requireAdmin = (req: any, res: any, next: any) => {
    // Authenticate the user first
    requireAuth(req, res, async () => {
      const allowedUidsStr = process.env.ADMIN_FIREBASE_UIDS;
      if (!allowedUidsStr) {
        console.error('[SameVibe] ADMIN_FIREBASE_UIDS is not set — all admin routes are locked.');
        return res.status(403).json({ message: "Admin routes are not configured on this server." });
      }

      const allowedUids = allowedUidsStr.split(',').map(s => s.trim()).filter(Boolean);
      if (allowedUids.length === 0) {
        return res.status(403).json({ message: "Admin routes are not configured on this server." });
      }

      const userUid = req.user?.firebaseUid || req.firebaseUser?.uid;
      
      // Exact membership required. Substring does not match implicitly because we use strict array includes.
      if (!userUid || !allowedUids.includes(userUid)) {
        return res.status(403).json({ message: "Forbidden: Not an authorized admin." });
      }

      next();
    });
  };

  // Telemetry routes
  app.post("/api/telemetry", async (req, res) => {
    try {
      const eventData = insertTelemetryEventSchema.parse(req.body);
      const event = await appStorage.createTelemetryEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid telemetry data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
    try {
      const allEvents = await appStorage.getTelemetryEvents();
      
      // Calculate Funnel Metrics
      const counts = {
        quiz_complete: 0,
        event_view: 0,
        rsvp_intent: 0,
        verification_start: 0,
        verification_success: 0,
        rsvp_complete: 0,
        external_source_click: 0,
      };

      allEvents.forEach((e: any) => {
        if (counts.hasOwnProperty(e.eventType)) {
          (counts as any)[e.eventType]++;
        }
      });

      // Calculate conversion rates
      const verificationConversion = counts.verification_start > 0 
        ? (counts.verification_success / counts.verification_start) * 100 
        : 0;
      
      const rsvpCompletionRate = counts.rsvp_intent > 0
        ? (counts.rsvp_complete / counts.rsvp_intent) * 100
        : 0;

      // Average "Would You Go?" Score (mocked if no metadata)
      const intentScores = allEvents
        .filter((e: any) => e.eventType === 'rsvp_intent' && e.metadata && (e.metadata as any).score)
        .map((e: any) => (e.metadata as any).score as number);
      
      const avgWouldYouGo = intentScores.length > 0
        ? intentScores.reduce((a: any, b: any) => a + b, 0) / intentScores.length
        : 0;

      res.json({
        funnel: counts,
        conversions: {
          verification: verificationConversion.toFixed(1),
          rsvp: rsvpCompletionRate.toFixed(1),
        },
        avgWouldYouGo: avgWouldYouGo.toFixed(1),
        totalEvents: allEvents.length
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes


  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await appStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Block enforcement
      if ((req as any).user) {
        const isBlocked = await appStorage.isEitherUserBlocked((req as any).user.id, userId);
        if (isBlocked) {
          return res.status(404).json({ message: "User not found" });
        }
      }
      
      const {
        firebaseUid,
        email,
        dateOfBirth,
        termsVersion,
        termsAcceptedAt,
        subscriptionStatus,
        subscriptionStart,
        subscriptionEnd,
        paymentTier,
        trustLevel,
        notificationSettings,
        discoverySettings,
        quizAnswers,
        ...publicUser
      } = user;
      
      res.json(publicUser);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/firebase/:uid", requireAuth, async (req, res) => {
    try {
      if ((req as any).firebaseUser?.uid !== req.params.uid) {
        return res.status(403).json({ message: "Unauthorized profile access" });
      }
      const user = await appStorage.getUserByFirebaseUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Enforce 18+ Age Gate (Strict compliance)
      if (!userData.dateOfBirth) {
        return res.status(400).json({ message: "Date of birth is required to join SameVibe." });
      }
      
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(userData.dateOfBirth)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      }

      const [year, month, day] = userData.dateOfBirth.split('-').map(Number);
      const today = new Date();
      let age = today.getFullYear() - year;
      const m = today.getMonth() + 1 - month;
      if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
      }

      if (age < 18) {
        return res.status(403).json({ message: "You must be at least 18 years old to join SameVibe." });
      }

      if (!userData.termsVersion || userData.termsVersion !== CURRENT_TERMS_VERSION) {
        return res.status(400).json({ message: "You must accept the current Terms of Service." });
      }
      
      // Enforce EULA timestamp
      userData.termsAcceptedAt = new Date();

      const user = await appStorage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", requireAuth, filterUGC(['bio', 'displayName', 'interests']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (!(req as any).user || (req as any).user.id !== id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile." });
      }

      // Strictly allowlist acceptable update fields to prevent mass-assignment
      const allowedFields = [
        'name', 'bio', 'avatar', 'location', 'latitude', 'longitude', 
        'interests', 'discoverySettings', 'notificationSettings', 
        'dateOfBirth', 'termsVersion'
      ];
      
      const filteredUpdates: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredUpdates[key] = req.body[key];
        }
      }

      const updates = insertUserSchema.partial().parse(filteredUpdates);

      // Enforce 18+ Age Gate for existing users completing their profile
      if (updates.dateOfBirth) {
        const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dobRegex.test(updates.dateOfBirth)) {
          return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }

        const [year, month, day] = updates.dateOfBirth.split('-').map(Number);
        const today = new Date();
        let age = today.getFullYear() - year;
        const m = today.getMonth() + 1 - month;
        if (m < 0 || (m === 0 && today.getDate() < day)) {
          age--;
        }

        if (age < 18) {
          return res.status(403).json({ message: "You must be at least 18 years old to use SameVibe." });
        }
      }

      if (updates.termsVersion) {
        if (updates.termsVersion !== CURRENT_TERMS_VERSION) {
          return res.status(400).json({ message: "You must accept the current Terms of Service." });
        }
        updates.termsAcceptedAt = new Date();
      }

      const user = await appStorage.updateUser(id, updates);
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

  // Account deletion — required by Apple App Store and Google Play (since 2023)
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const authUser = (req as any).user;
      if (!authUser || authUser.id !== id) {
        return res.status(403).json({ message: "Unauthorized deletion attempt" });
      }

      // 1. Fetch user to get Firebase UID and Apple Token
      const dbUser = await appStorage.getUser(id);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let adminApp = appAdminApp;
      
      let appleRevocationStatus = "not_apple";
      let firebaseDeletionSuccess = false;

      // 2. Determine if Apple Account via Firebase
      if (adminApp && dbUser.firebaseUid) {
        try {
          const fbUser = await adminApp.auth().getUser(dbUser.firebaseUid);
          const isApple = fbUser.providerData.some((p: any) => p.providerId === 'apple.com');
          
          if (isApple) {
            // 3. Revoke Apple Token if available
            if (dbUser.appleRefreshTokenEncrypted) {
              const revoked = await appAppleAuthService.revokeToken(dbUser.appleRefreshTokenEncrypted, process.env.APPLE_CLIENT_ID || 'com.samevibe.app');
              appleRevocationStatus = revoked ? "revoked" : "apple_revocation_failed_account_deleted";
            } else {
              // Legacy Apple account
              appleRevocationStatus = "legacy_no_token";
            }
          }
          
          // 4. Delete Firebase Identity
          await adminApp.auth().deleteUser(dbUser.firebaseUid);
          firebaseDeletionSuccess = true;
        } catch (e: any) {
          console.error("Firebase/Apple Deletion Error:", e.message || e);
          // Do not block SameVibe DB deletion if Firebase fails, but log it.
        }
      }

      // 5. Delete from SameVibe Database
      const success = await appStorage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found during database deletion" });
      }
      
      // 6. Invalidate server session
      (req as any).logout((err: any) => {
        if (err) console.error("Error destroying session", err);
        res.json({ 
          message: "Account and all associated data deleted successfully", 
          appleRevocationStatus,
          firebaseDeletionSuccess
        });
      });
    } catch (error) {
      console.error("Error deleting user account");
      res.status(500).json({ message: "Failed to delete account. Please try again." });
    }
  });

  const appleExchangeRateLimits = new Map<number, { count: number; resetAt: number }>();

  // Store Apple authorization code and exchange for refresh token
  app.post("/api/auth/apple/exchange", requireAuth, async (req, res) => {
    try {
      const authUser = (req as any).user;
      if (!authUser || !authUser.id) return res.status(403).json({ message: "Unauthorized" });

      const now = Date.now();
      const limit = appleExchangeRateLimits.get(authUser.id);
      
      if (limit) {
        if (now > limit.resetAt) {
          appleExchangeRateLimits.set(authUser.id, { count: 1, resetAt: now + 15 * 60 * 1000 });
        } else if (limit.count >= 5) {
          return res.status(429).json({ message: "Too many requests, please try again later" });
        } else {
          limit.count += 1;
        }
      } else {
        appleExchangeRateLimits.set(authUser.id, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }

      const { authorizationCode, identityToken, nonce } = req.body;
      if (!authorizationCode || !identityToken) return res.status(400).json({ message: "Missing required Apple credentials" });
      if (authorizationCode.length > 2000 || identityToken.length > 4000) return res.status(400).json({ message: "Invalid token length" });

      
      const clientId = process.env.APPLE_CLIENT_ID || 'com.samevibe.app';
      
      // Ensure the user actually has an Apple provider in Firebase
      const admin = appAdminApp || (await import('firebase-admin'));
      const userRecord = await admin.auth().getUser(authUser.firebaseUid);
      const appleProvider = userRecord.providerData.find((p: any) => p.providerId === 'apple.com');
      if (!appleProvider || !appleProvider.uid) {
        return res.status(403).json({ message: "No Apple provider linked to this account" });
      }

      // Validate the identity token
      const isValid = await appAppleAuthService.validateIdentityToken(identityToken, clientId, appleProvider.uid, nonce);
      if (!isValid) return res.status(403).json({ message: "Invalid Apple identity token" });
      
      const refreshTokenEncrypted = await appAppleAuthService.exchangeAuthorizationCode(authorizationCode, clientId);
      if (refreshTokenEncrypted) {
        await appStorage.updateUser(authUser.id, { appleRefreshTokenEncrypted: refreshTokenEncrypted });
        return res.json({ success: true, message: "Apple credentials secured" });
      } else {
        return res.status(500).json({ message: "Failed to exchange Apple authorization code" });
      }
    } catch (error: any) {
      // Do not log the raw authorizationCode or token
      console.error("Error securing Apple credentials:", error.message || error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Learning Loop Signals Rate Limiter
  const signalRateLimits = new Map<string, { count: number; resetAt: number }>();

  // AI Learning Loop Signals
  app.post("/api/users/:id/connection-signal", requireAuth, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const { sourceUserId, signalType, detail, dwellTimeMs } = req.body;
      
      if (!sourceUserId) {
        return res.status(400).json({ message: "Missing sourceUserId" });
      }

      // Rate limit check: max 10 signals per minute per user
      const limitKey = `user_${sourceUserId}`;
      const now = Date.now();
      const limit = signalRateLimits.get(limitKey);
      
      if (limit && limit.resetAt > now) {
        if (limit.count >= 10) {
          return res.status(429).json({ message: "Too many signals sent. Please wait a moment." });
        }
        limit.count++;
      } else {
        signalRateLimits.set(limitKey, { count: 1, resetAt: now + 60000 });
      }
      
      // We only register a signal if it was an explicit request OR valid dwell time
      if (signalType === 'explicit_interest' || signalType === 'explicit' || (signalType === 'view' && dwellTimeMs > 10000)) {
        // Log the interaction for the agent
        await appStorage.addActivityItem(sourceUserId, "connection_signal", {
          targetUserId,
          signalType,
          detail,
          dwellTimeMs
        });
        return res.status(200).json({ success: true, message: "Signal registered" });
      }
      
      // Ignore weak signals (accidental clicks)
      res.status(200).json({ success: true, message: "Signal ignored (too weak)" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process connection signal" });
    }
  });

  // Community routes
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await appStorage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Temporary route to seed production database — admin only
  
  // [REMOVED TEST ROUTE IN PROD]


  app.get("/api/communities/recommended", async (req, res) => {
    try {
      const interests = req.query.interests as string;
      const userId = req.query.userId as string;
      const latitude = req.query.latitude as string;
      const longitude = req.query.longitude as string;
      
      const interestsArray = interests ? interests.split(',').filter(i => i.trim()) : [];
      const userLocation = latitude && longitude ? { lat: parseFloat(latitude), lon: parseFloat(longitude) } : undefined;
      const authUserId = (req as any).user ? (req as any).user.id : undefined;
      const userIdNum = userId ? parseInt(userId) : authUserId;
      
      
      const communities = await appStorage.getRecommendedCommunities(interestsArray, userLocation, userIdNum);
      
      // Add cache headers to ensure fresh data for PWA users
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(communities);
    } catch (error) {
      console.error('SameVibe: Error getting recommended communities:', error);
      res.status(500).json({ message: "Community discovery temporarily unavailable" });
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const community = await appStorage.getCommunity(id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Monetization Routes ──────────────────────────────────────────────────
  app.post("/api/checkout/verify-revenuecat", requireAuth, async (req, res) => {
    try {
      const { userId, tier } = req.body;
      if (!userId || tier === undefined) {
        return res.status(400).json({ message: "Missing userId or tier" });
      }
      
      const user = await appStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // In a production environment, we should verify the receipt with RevenueCat's REST API here
      // For now, we trust the native Capacitor client that just completed the StoreKit transaction
      const currentLimit = user.paymentTier ?? 0;
      await appStorage.updateUser(userId, { paymentTier: currentLimit + 1 });
      console.log(`Successfully upgraded user ${userId} capacity by 1 (total extra: ${currentLimit + 1}) via RevenueCat`);

      res.status(200).json({ success: true, newTier: currentLimit + 1 });
    } catch (error) {
      console.error("RevenueCat verification error:", error);
      res.status(500).json({ message: "Internal server error during verification" });
    }
  });

  app.post("/api/communities", requireAuth, filterUGC(['name', 'description']), async (req, res) => {
    try {
      const communityData = insertCommunitySchema.parse(req.body);
      const community = await appStorage.createCommunity(communityData);
      res.status(201).json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid community data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/communities/:id/join", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const authUserId = (req as any).user?.id;
      
      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await appStorage.getUser(authUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Implement 5-community rotation limit
      const result = await appStorage.joinCommunityWithRotation(authUserId, communityId);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's active communities with activity scores
  app.get("/api/users/:id/active-communities", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const activeCommunities = await appStorage.getUserActiveCommunities(userId);
      res.json(activeCommunities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update community activity when user interacts
  app.post("/api/communities/:id/activity", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      await appStorage.updateCommunityActivity(userId, communityId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update current user's location
  app.patch("/api/users/current/location", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, location, userId } = req.body;
      
      // Use the provided userId from the request
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const updatedUser = await appStorage.updateUser(userId, { 
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
  app.get("/api/communities/:id/dynamic-members", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { latitude, longitude } = req.query;
      const userId = (req as any).user?.id;
      
      if (isNaN(id) || !latitude || !longitude || !userId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const user = await appStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userLocation = { 
        lat: parseFloat(latitude as string), 
        lon: parseFloat(longitude as string) 
      };
      
      const userInterests = user.interests || [];
      const members = await appStorage.getDynamicCommunityMembers(id, userLocation, userInterests);
      
      res.json(members);
    } catch (error) {
      console.error("Error fetching dynamic community members:", error);
      res.status(500).json({ message: "Failed to fetch dynamic community members" });
    }
  });

  app.post("/api/communities/:id/leave", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const success = await appStorage.leaveCommunity(userId, communityId);
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
      const communities = await appStorage.getUserCommunities(userId);
      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const events = await appStorage.getAllEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const events = await appStorage.getUpcomingEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/nearby", async (req, res) => {
    try {
      const { latitude, longitude, radius = 50, userId } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const events = await appStorage.getEventsByLocation(
        latitude as string, 
        longitude as string, 
        parseInt(radius as string),
        userId ? parseInt(userId as string) : undefined
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await appStorage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", requireAuth, filterUGC(['title', 'description', 'location', 'address'], { allowAddresses: true, allowLinks: true }), async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await appStorage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (!(req as any).user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const userId = (req as any).user.id;
      const { status = "interested", userId: bodyUserId } = req.body;
      
      if (bodyUserId && parseInt(bodyUserId) !== userId) {
        return res.status(403).json({ message: "Cannot RSVP for another user" });
      }
      
      const registration = await appStorage.registerForEvent(userId, eventId, status);
      res.status(201).json(registration);
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'event_attendees_event_user_unique') {
        return res.status(409).json({ message: "Already registered" });
      }
      if (error.message.includes('capacity')) {
        return res.status(409).json({ message: "Event is at capacity" });
      }
      if (error.message.includes('unavailable') || error.message.includes('not exist')) {
        return res.status(404).json({ message: "Event not found or unavailable" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (!(req as any).user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const userId = (req as any).user.id;
      
      const event = await appStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const success = await appStorage.unregisterFromEvent(userId, eventId);
      if (success) {
        res.status(200).json({ message: "Successfully unregistered" });
      } else {
        res.status(404).json({ message: "Registration not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/review", requireAuth, filterUGC(['reviewText']), async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId, rating, feltSafe, feedback } = req.body;

      if (!userId || rating === undefined) {
        return res.status(400).json({ message: "userId and rating are required" });
      }

      const numRating = parseInt(rating);
      if (numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: "rating must be between 1 and 5" });
      }

      const review = await appStorage.createEventReview(
        parseInt(userId),
        eventId,
        numRating,
        feltSafe !== false, // default true unless explicitly false
        feedback
      );

      // Safety guard: if user did not feel safe, auto-file a safety report
      if (feltSafe === false && feedback) {
        await appStorage.createReport({ reporterId: parseInt(userId), targetType: 'event', targetId: eventId, reason: 'safety_concern', details: feedback });
      }

      res.status(201).json({ success: true, review, message: "Review submitted" });
    } catch (error) {
      console.error("Event review error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Safety Routes (required by Apple and Google store policies) ─────────────

  // Block a user
  app.post("/api/users/block", requireAuth, async (req, res) => {
    try {
      const { blockedId, reason } = req.body;
      const blockerId = (req as any).user.id; 
      if (!blockedId) {
        return res.status(400).json({ message: "blockedId is required" });
      }
      if (blockerId === parseInt(blockedId)) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }
      const block = await appStorage.blockUser(blockerId, parseInt(blockedId), reason);
      res.status(201).json({ success: true, block });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  // Unblock a user
  app.post("/api/users/unblock", requireAuth, async (req, res) => {
    try {
      const { blockedId } = req.body;
      const blockerId = (req as any).user.id;
      if (!blockedId) return res.status(400).json({ message: "blockedId is required" });
      
      const success = await appStorage.unblockUser(blockerId, parseInt(blockedId));
      res.status(200).json({ success });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  // Unified reporting endpoint
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const reporterId = (req as any).user.id; 
      const { targetType, targetId, reason, details } = req.body;
      
      if (!targetType || !targetId || !reason) {
        return res.status(400).json({ message: "targetType, targetId, and reason are required" });
      }
      
      // Fetch evidence snapshot depending on targetType
      let evidenceSnapshot = null;
      if (targetType === 'event') {
        const event = await appStorage.getEvent(parseInt(targetId));
        if (event) evidenceSnapshot = { title: event.title, description: event.description };
      } else if (targetType === 'user') {
        const user = await appStorage.getUser(parseInt(targetId));
        if (user) evidenceSnapshot = { name: user.name, bio: user.bio };
      } else if (targetType === 'post') {
        // assuming community post
        // mock evidence fetch
        evidenceSnapshot = { type: 'post' };
      }

      const report = await appStorage.createReport({
        reporterId,
        targetType,
        targetId: parseInt(targetId),
        reason,
        details,
        evidenceSnapshot
      });
      res.status(201).json({ success: true, report, message: "Report submitted for review" });
    } catch (error) {
      console.error("Unified report error:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Legacy wrappers for native app backward compatibility
  app.post("/api/users/:id/report", requireAuth, async (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const reporterId = (req as any).user.id; 
      const { reason, details } = req.body;
      if (!reason) return res.status(400).json({ message: "reason is required" });
      
      const report = await appStorage.createReport({ reporterId, targetType: 'user', targetId, reason, details });
      res.status(201).json({ success: true, report, message: "Report submitted for review" });
    } catch (error) {
      console.error("Report user error:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  app.post("/api/events/:id/report", requireAuth, async (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const reporterId = (req as any).user.id; 
      const { reason, details } = req.body;
      if (!reason) return res.status(400).json({ message: "reason is required" });
      
      const report = await appStorage.createReport({ reporterId, targetType: 'event', targetId, reason, details });
      res.status(201).json({ success: true, report, message: "Report submitted for review" });
    } catch (error) {
      console.error("Report event error:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Admin Reporting Workflow (using the existing requireAdmin middleware)

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    try {
      const result = await appStorage.getReports(page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const report = await appStorage.getReportById(parseInt(req.params.id));
      if (!report) return res.status(404).json({ message: "Not found" });
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.get("/api/admin/reports/:id/evidence", requireAdmin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await appStorage.getReportById(reportId);
      if (!report) return res.status(404).json({ message: "Not found" });
      
      let evidence: any = { report };
      if (report.targetType === 'message') {
        const message = await appStorage.getMessage(report.targetId);
        if (message) {
          evidence.message = message;
          // Bounded context to minimize exposure (e.g. 50 messages around target)
          const convo = await appStorage.getConversation(message.senderId, message.receiverId || report.reporterId);
          evidence.boundedContext = convo.filter((m: any) => Math.abs(m.id - message.id) <= 25);
        }
      } else if (report.targetType === 'user') {
        // Do not return entire account history or all conversations
        evidence.priorReports = [];
        evidence.explicitEvidence = report.details ? [{ type: 'reference', content: report.details }] : [];
      } else {
        // For events, communities, posts
        evidence.targetObject = report.targetId;
      }
      
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  app.patch("/api/admin/reports/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, details } = req.body;
      if (!status) return res.status(400).json({ message: "status required" });
      const updated = await appStorage.updateReportStatus(parseInt(req.params.id), status, (req as any).user.id, details);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report status" });
    }
  });

  // /api/events/feed alias for /api/events/upcoming (required by live check spec)
  app.get("/api/events/feed", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const events = await appStorage.getUpcomingEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create global revenue-generating event
  app.post("/api/events/create-global", requireAuth, filterUGC(['title', 'description', 'location', 'address'], { allowAddresses: true, allowLinks: true }), async (req, res) => {
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

      const event = await appStorage.createEvent(eventData);
      
      // Add activity feed item for event creation
      await appStorage.addActivityItem(creatorId, "event_created", {
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

  // Test OpenAI integration — admin only (removed for app store readiness)
  app.post("/api/test-openai", requireAdmin, async (req, res) => {
    res.json({ success: false, message: "OpenAI integration has been removed." });
  });

  app.get("/api/users/:id/events", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const events = await appStorage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message routes
  app.get("/api/conversations/:userId1/:userId2", requireAuth, async (req, res) => {
    return res.status(403).json({ error: "Direct messaging is not available at launch. Use a shared community, activity, or event group." });
  });

  app.get("/api/users/:id/conversations", requireAuth, async (req, res) => {
    return res.json([]);
  });

  app.post("/api/messages", requireAuth, filterUGC(['content']), async (req, res) => {
    return res.status(403).json({ error: "Direct messaging is not available at launch. Use a shared community, activity, or event group." });
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const authUser = (req as any).user!;

      // Check community messages
      const commMsg = await appStorage.getCommunityMessage(id);
      if (commMsg) {
        const userCommunities = await appStorage.getUserCommunities(authUser.id);
        const isMember = userCommunities.some((c: any) => c.communityId === commMsg.communityId || c.id === commMsg.communityId);
        if (!isMember) return res.status(403).json({ message: "Not a community member." });
        return res.json({ message: "Community message marked as read" });
      }

      // Check event messages
      const evtMsg = await appStorage.getEventMessage(id);
      if (evtMsg) {
        const attendees = await appStorage.getEventAttendees(evtMsg.eventId);
        const isAttendee = attendees.some((a: any) => a.userId === authUser.id && (a.status === 'going' || a.status === 'interested' || a.status === 'attended'));
        if (!isAttendee) return res.status(403).json({ message: "Not an event attendee." });
        return res.json({ message: "Event message marked as read" });
      }

      const message = await appStorage.getMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Historical direct message -> 403 for ordinary users
      return res.status(403).json({ message: "Historical direct messages cannot be marked as read." });

    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Kudos routes
  app.get("/api/users/:id/kudos/received", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const kudos = await appStorage.getUserKudosReceived(userId);
      res.json(kudos);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/kudos", requireAuth, filterUGC(['message']), async (req, res) => {
    try {
      const kudosData = insertKudosSchema.parse(req.body);
      const kudos = await appStorage.giveKudos(kudosData);
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
      const activities = await appStorage.getUserActivityFeed(userId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Automatic event population for all user communities
  // ADMIN ONLY: triggers web scraping — must not be publicly accessible
  app.post("/api/auto-populate-events", requireAdmin, async (req, res) => {
    try {
      const { userId, latitude, longitude } = req.body;
      
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ message: "User ID and location required" });
      }

      const user = await appStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      
      // Use new web scraper system for comprehensive event discovery
      const result = await eventScraperOrchestrator.scrapeEventsForAllCommunities(userLocation);
      
      res.json({ 
        message: `Auto-populated ${result.totalEvents} events across ${result.communitiesUpdated} communities using web scraping`,
        eventsAdded: result.totalEvents,
        communitiesProcessed: result.communitiesUpdated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error auto-populating events:', error);
      res.status(500).json({ message: "Failed to auto-populate events" });
    }
  });

  app.post("/api/communities/:id/scrape-events", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { latitude, longitude } = req.body;
      
      if (isNaN(communityId) || !latitude || !longitude) {
        return res.status(400).json({ message: "Invalid community ID or location data" });
      }
      
      const community = await appStorage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      const savedCount = await eventScraperOrchestrator.triggerManualScrape(community.id, userLocation);
      
      res.json({ 
        message: `Successfully scraped ${savedCount} events for ${community.name}`,
        eventsAdded: savedCount 
      });
    } catch (error) {
      console.error('Event scraping error:', error);
      res.status(500).json({ message: "Failed to scrape events" });
    }
  });

  // Get community events (primary endpoint)
  app.get("/api/communities/:id/events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: "Invalid community ID" });
      }
      
      const community = await appStorage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Get all events for this community
      const events = await appStorage.getCommunityEvents(communityId);
      const upcomingEvents = events.filter((event: any) => 
        new Date(event.date) >= new Date() // Future events only
      );
      
      res.json(upcomingEvents);
    } catch (error) {
      console.error('Error fetching community events:', error);
      res.status(500).json({ message: "Failed to fetch community events" });
    }
  });

  app.get("/api/communities/:id/scraped-events", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: "Invalid community ID" });
      }
      
      const community = await appStorage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Get events specifically associated with this community
      const events = await appStorage.getCommunityEvents(communityId);
      const recentEvents = events.filter((event: any) => 
        new Date(event.date) >= new Date() && // Future events only
        new Date(event.date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Within 30 days
      );
      
      res.json(recentEvents);
    } catch (error) {
      console.error('Error fetching scraped events:', error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // New comprehensive web scraping endpoints
  app.post("/api/web-scrape/trigger-all", requireAdmin, async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "User location required" });
      }

      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      const result = await eventScrapingScheduler.triggerManualScraping(userLocation);

      res.json({
        message: "Web scraping completed successfully",
        ...result
      });
    } catch (error) {
      console.error('Manual web scraping error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to trigger web scraping" });
    }
  });

  app.get("/api/web-scrape/status", requireAdmin, async (req, res) => {
    try {
      const status = await eventScrapingScheduler.getScrapingStatus();
      res.json(status);
    } catch (error) {
      console.error('Web scraping status error:', error);
      res.status(500).json({ message: "Failed to get scraping status" });
    }
  });

  app.post("/api/web-scrape/community/:id", requireAdmin, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "User location required" });
      }

      const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };
      const eventCount = await eventScraperOrchestrator.triggerManualScrape(communityId, userLocation);

      res.json({
        message: `Successfully scraped ${eventCount} events for community`,
        eventCount
      });
    } catch (error) {
      console.error('Community web scraping error:', error);
      res.status(500).json({ message: "Failed to scrape events for community" });
    }
  });

  // ADMIN ONLY: creates sample events — never expose to public users
  
  // [REMOVED TEST ROUTE IN PROD]


  // Create community event
  app.post("/api/communities/:id/events", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { title, description, date, location, price, organizerId } = req.body;
      
      if (isNaN(communityId) || !title || !date || !organizerId) {
        return res.status(400).json({ message: "Missing required fields: title, date, and organizerId" });
      }
      
      // Verify the community exists
      const community = await appStorage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Get organizer details
      const organizer = await appStorage.getUser(parseInt(organizerId));
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
      
      const newEvent = await appStorage.createEvent(eventData);
      
      // Add activity to organizer's feed
      await appStorage.addActivityItem(parseInt(organizerId), 'event_created', {
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

  app.get("/api/events/:id/attendees", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const authUser = (req as any).user;
      
      const attendees = await appStorage.getEventAttendees(eventId);
      
      // Enforce attendance-identity suppression
      const uniqueUserIds = [...new Set(attendees.map((a: any) => a.userId))];
      const allowedUserIds = new Set(await appStorage.filterBlockedUsers(authUser.id, uniqueUserIds));
      const filtered = attendees.filter((a: any) => allowedUserIds.has(a.userId));
      
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.get("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const authUser = (req as any).user;
      
      // Verify SameVibe attendance-group membership
      const attendees = await appStorage.getEventAttendees(eventId);
      const isMember = attendees.some((a: any) => a.userId === authUser.id);
      if (!isMember) {
        return res.status(403).json({ message: "Join the SameVibe group attending this event to participate in the conversation." });
      }

      let messages = await appStorage.getEventMessages(eventId);
      
      // Enforce block suppression
      if (messages.length > 0) {
        const uniqueSenderIds = [...new Set(messages.map((m: any) => m.senderId))];
        const allowedSenderIds = new Set(await appStorage.filterBlockedUsers(authUser.id, uniqueSenderIds));
        messages = messages.filter((m: any) => allowedSenderIds.has(m.senderId));
      }

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/events/:id/messages", requireAuth, filterUGC(['content']), async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { content } = req.body;
      const authUser = (req as any).user;
      
      if (!content) return res.status(400).json({ message: "Content is required" });
      
      // Verify SameVibe attendance-group membership
      const attendees = await appStorage.getEventAttendees(eventId);
      const isMember = attendees.some((a: any) => a.userId === authUser.id);
      if (!isMember) {
        return res.status(403).json({ message: "Join the SameVibe group attending this event to participate in the conversation." });
      }

      const messageData = {
        content: content.trim(),
        senderId: authUser.id,
        eventId: eventId
      };
      
      const message = await appStorage.sendEventMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/mark-attended", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = req.body;
      if (isNaN(eventId) || !userId) {
        return res.status(400).json({ message: "Event ID and user ID required" });
      }
      
      const event = await appStorage.getEvent(eventId);
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
      const attendance = await appStorage.registerForEvent(parseInt(userId), eventId, "attended");
      
      // Add to activity feed for algorithm learning
      await appStorage.addActivityItem(parseInt(userId), 'event_attended', {
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

      // Trigger AI learning
      import("./agent/agent-runner").then(({ agentRunner }) => {
        agentRunner.runAgentForUser(parseInt(userId)).catch(err => console.error("[Agent] Trigger failed:", err));
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
      
      const user = await appStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all events where user has "attended" status
      const attendedEvents = await appStorage.getUserEvents(userId);
      // Filter to only events that have actually passed (cannot attend future events)
      const confirmedAttended = attendedEvents.filter((event: any) => 
        new Date(event.date) < new Date()
      );
      
      res.json(confirmedAttended);
    } catch (error) {
      console.error("Error fetching attended events:", error);
      res.status(500).json({ message: "Failed to fetch attended events" });
    }
  });

  // Global events route for communities page
  app.get("/api/events/global", async (req, res) => {
    try {
      // Get partner/global events only — events explicitly marked isGlobal or type=partner.
      // The previous implementation had an OR clause that matched ALL future events.
      const allEvents = await appStorage.getAllEvents();
      const globalEvents = allEvents.filter((event: any) => 
        (event.isGlobal === true || event.eventType === "partner") &&
        new Date(event.date) >= new Date()
      ).slice(0, 10);
      
      res.json(globalEvents);
    } catch (error) {
      console.error("Error fetching global events:", error);
      res.status(500).json({ message: "Failed to fetch global events" });
    }
  });

  // Trending events based on user joins in area
  app.get("/api/events/trending", async (req, res) => {
    try {
      const { latitude, longitude, radius = 50 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "User location required for trending events" });
      }
      
      const userLocation = { lat: parseFloat(latitude as string), lon: parseFloat(longitude as string) };
      const trendingEvents = await appStorage.getTrendingEventsByLocation(userLocation, parseInt(radius as string));
      
      res.json(trendingEvents);
    } catch (error) {
      console.error("Error fetching trending events:", error);
      res.status(500).json({ message: "Failed to fetch trending events" });
    }
  });

  // Community messaging routes
  app.get("/api/communities/:id/messages", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) return res.status(400).json({ message: "Invalid community ID" });
      
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });
      
      // Verify membership server-side
      const userCommunities = await appStorage.getUserCommunities(authUser.id);
      const isMember = userCommunities.some((c: any) => c.communityId === communityId || c.id === communityId);
      if (!isMember) {
        return res.status(403).json({ message: "Only members can view community messages" });
      }

      let messages = await appStorage.getCommunityMessages(communityId);
      
      // Enforce block suppression
      if (messages.length > 0) {
        const uniqueSenderIds = [...new Set(messages.map((m: any) => m.senderId))];
        const allowedSenderIds = new Set(await appStorage.filterBlockedUsers(authUser.id, uniqueSenderIds));
        messages = messages.filter((m: any) => allowedSenderIds.has(m.senderId));
      }

      res.json(messages);
    } catch (error) {
      console.error("Error fetching community messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/communities/:id/messages", requireAuth, filterUGC(['content']), async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { content } = req.body;
      const authUser = (req as any).user;
      
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });
      if (!content) return res.status(400).json({ message: "Content is required" });
      
      // Verify membership server-side
      const userCommunities = await appStorage.getUserCommunities(authUser.id);
      const isMember = userCommunities.some((c: any) => c.communityId === communityId || c.id === communityId);
      if (!isMember) {
        return res.status(403).json({ message: "Only members can post community messages" });
      }

      const messageData = {
        content: content.trim(),
        senderId: authUser.id, // Enforce sender identity from auth token
        communityId: communityId
      };
      
      const message = await appStorage.sendCommunityMessage(messageData);
      res.status(201).json(message);

      // Trigger AI learning
      import("./agent/agent-runner").then(({ agentRunner }) => {
        agentRunner.runAgentForUser(authUser.id).catch(err => console.error("[Agent] Trigger failed:", err));
      });
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
      
      if (!userId) {
        return res.status(400).json({ message: "Missing required parameter: userId" });
      }

      const community = await appStorage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const user = await appStorage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Location is optional — skip dynamic member enrichment if not provided
      if (latitude && longitude) {
        const userLocation = { 
          lat: parseFloat(latitude as string), 
          lon: parseFloat(longitude as string) 
        };
        
        const userInterests = user.interests || [];
        const dynamicMembers = await appStorage.getDynamicCommunityMembers(communityId, userLocation, userInterests);
        
        return res.json({
          ...community,
          onlineMembers: dynamicMembers.length,
          dynamicMembers: dynamicMembers
        });
      }

      // Return community with basic info when no location provided
      return res.json({
        ...community,
        onlineMembers: community.memberCount || 0,
        dynamicMembers: []
      });
    } catch (error) {
      console.error("Error fetching dynamic community info:", error);
      res.status(500).json({ message: "Failed to fetch dynamic community info" });
    }
  });


  // ADMIN ONLY: triggers heavy AI regeneration for all users
  app.post("/api/admin/refresh-all-communities", requireAdmin, async (req, res) => {
    try {
      await communityRefreshService.regenerateAllUserCommunities();
      
      res.json({ 
        success: true, 
        message: "All user communities refreshed with location-aware data"
      });
    } catch (error) {
      console.error("Error refreshing all communities:", error);
      res.status(500).json({ message: "Failed to refresh communities" });
    }
  });

  app.post("/api/admin/refresh-user-communities/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      await communityRefreshService.refreshUserCommunities(userId);
      
      res.json({ 
        success: true, 
        message: `Communities refreshed for user ${userId}`
      });
    } catch (error) {
      console.error("Error refreshing user communities:", error);
      res.status(500).json({ message: "Failed to refresh user communities" });
    }
  });

  // Community update status endpoint for PWA polling
  app.get("/api/community-updates/status", async (req, res) => {
    try {
      const clientTimestamp = parseInt(req.query.timestamp as string) || 0;
      const lastUpdate = communityUpdateNotifier.getLastUpdateTimestamp();
      const hasUpdates = communityUpdateNotifier.hasUpdatesFor(clientTimestamp);
      
      res.json({
        lastUpdate,
        hasUpdates,
        message: hasUpdates ? "New location-aware communities available" : "Communities up to date"
      });
    } catch (error) {
      console.error("Error checking community update status:", error);
      res.status(500).json({ message: "Failed to check update status" });
    }
  });

  // ADMIN ONLY: triggers global community refresh
  app.post("/api/community-updates/refresh", requireAdmin, async (req, res) => {
    try {
      await communityUpdateNotifier.triggerGlobalCommunityRefresh();
      
      res.json({ 
        success: true, 
        timestamp: communityUpdateNotifier.getLastUpdateTimestamp(),
        message: "Global community refresh completed with location-aware data"
      });
    } catch (error) {
      console.error("Error triggering community refresh:", error);
      res.status(500).json({ message: "Failed to trigger community refresh" });
    }
  });

  // API routes for real-time member detection
  app.get("/api/communities/:id/members/live", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { userId } = req.query;
      
      // Pass the requesting user ID for geolocation filtering
      const requestingUserId = userId ? parseInt(userId as string) : undefined;
      const membersWithStatus = await appStorage.getCommunityMembersWithStatus(communityId, requestingUserId);
      
      // Only return live members (online within last 15 minutes)
      const liveMembers = membersWithStatus.filter((member: any) => member.isOnline);
      
      res.json({
        online: liveMembers,
        offline: membersWithStatus.filter((member: any) => !member.isOnline),
        totalLive: liveMembers.length
      });
    } catch (error) {
      console.error("Error fetching live community members:", error);
      res.status(500).json({ message: "Failed to fetch live members" });
    }
  });

  // Update user activity (heartbeat)
  app.post("/api/users/:id/activity", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await appStorage.updateUserActivity(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Set user online/offline status
  app.post("/api/users/:id/status", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isOnline } = req.body;
      await appStorage.setUserOnlineStatus(userId, Boolean(isOnline));
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting user status:", error);
      res.status(500).json({ message: "Failed to set status" });
    }
  });

  // Onboarding completion route for new quiz structure
  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const {
        hopingToFind,
        communityFeel,
        personalityVibe,
        interestSpaces,
        activityLevel,
        availability,
        location,
        digitalOnly,
        resonateStatement,
        latitude,
        longitude,
        userId
      } = req.body;

      // Validate required fields
      if (!hopingToFind || !interestSpaces || !activityLevel || !userId) {
        return res.status(400).json({ message: "Missing required quiz responses or user ID" });
      }

      // Update user with new quiz structure data
      const interests = Array.isArray(interestSpaces) ? interestSpaces : [interestSpaces];
      const goals = Array.isArray(hopingToFind) ? hopingToFind : [hopingToFind];
      const personalityTraits = [personalityVibe, communityFeel, activityLevel, resonateStatement].filter(Boolean);
      
      const updatedUser = await appStorage.updateUser(parseInt(userId), {
        interests,
        quizAnswers: {
          goals,
          personalityTraits,
          availability: Array.isArray(availability) ? availability : [availability]
        },
        location: location || "",
        latitude: latitude ? parseFloat(latitude).toString() : null,
        longitude: longitude ? parseFloat(longitude).toString() : null,
        onboardingCompleted: true
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Trigger AI-powered community generation based on new quiz responses
      try {
        await communityRefreshService.refreshUserCommunities(parseInt(userId));
      } catch (error) {
        console.error("Failed to refresh communities after onboarding:", error);
      }

      res.json({
        message: "Onboarding completed successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time member detection
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          userId = parseInt(data.userId);
          activeConnections.set(userId, { ws, lastActivity: new Date() });
          await appStorage.setUserOnlineStatus(userId, true);
          
          // Broadcast online status update to all clients
          broadcastMemberUpdate(userId, true);
        }
        
        if (data.type === 'heartbeat' && userId) {
          activeConnections.set(userId, { ws, lastActivity: new Date() });
          await appStorage.updateUserActivity(userId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      if (userId) {
        activeConnections.delete(userId);
        await appStorage.setUserOnlineStatus(userId, false);
        broadcastMemberUpdate(userId, false);
      }
    });
  });

  // Cleanup inactive connections every 5 minutes
  if (process.env.VERCEL !== "1") {
    setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      activeConnections.forEach(async (connection, userId) => {
        if (connection.lastActivity < fiveMinutesAgo) {
          connection.ws.close();
          activeConnections.delete(userId);
          await appStorage.setUserOnlineStatus(userId, false);
          broadcastMemberUpdate(userId, false);
        }
      });
    }, 5 * 60 * 1000);

    // Initialize event scraping scheduler
    eventScrapingScheduler.startScheduling();
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  app.get("/api/communities/:id/posts", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const posts = await appStorage.getCommunityPosts(communityId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  app.post("/api/communities/:id/posts", requireAuth, filterUGC(['content']), async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { authorId, content } = req.body;
      if (!authorId || !content) {
        return res.status(400).json({ message: "authorId and content required" });
      }

      // Simple Rate Limit (Bot Defense)
      const now = Date.now();
      const lastPostKey = `post_cooldown_${authorId}`;
      // @ts-ignore global map for simplicity in this file scope
      if (!global.rateLimits) global.rateLimits = new Map();
      // @ts-ignore
      const lastPost = global.rateLimits.get(lastPostKey) || 0;
      
      if (now - lastPost < 5000) { // 5 seconds
        return res.status(429).json({ message: "You are posting too fast. Chill for a sec." });
      }
      // @ts-ignore
      global.rateLimits.set(lastPostKey, now);

      // AI Moderation Check
      const { moderator } = await import("./agent/moderator");
      const safetyCheck = await moderator.checkContentSafety(String(content));
      
      if (!safetyCheck.safe) {
        return res.status(400).json({ 
          message: "Post rejected entirely for safety reasons.",
          reason: safetyCheck.reason 
        });
      }

      const post = await appStorage.createPost(communityId, parseInt(authorId), String(content));
      res.status(201).json(post);

      // Trigger AI learning
      import("./agent/agent-runner.js").then(({ agentRunner }) => {
        agentRunner.runAgentForUser(parseInt(authorId)).catch(err => console.error("[Agent] Trigger failed:", err));
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.post("/api/posts/:id/kudos", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { giverId } = req.body;
      if (!giverId) return res.status(400).json({ message: "giverId required" });
      if (parseInt(giverId) !== (req as any).user.id) {
        return res.status(403).json({ message: "Cannot give kudos as another user" });
      }
      const result = await appStorage.givePostKudos(postId, parseInt(giverId));
      res.json(result);

      // Trigger AI learning
      import("./agent/agent-runner.js").then(({ agentRunner }) => {
        agentRunner.runAgentForUser(parseInt(giverId)).catch(err => console.error("[Agent] Trigger failed:", err));
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to give post kudos" });
    }
  });

  // ── Streaks ────────────────────────────────────────────────────────────────

  app.get("/api/users/:id/streak", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const streak = await appStorage.getStreak(userId);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.post("/api/users/:id/checkin", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const streak = await appStorage.checkin(userId);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to checkin" });
    }
  });

  // ── Agent ──────────────────────────────────────────────────────────────────

  app.get("/api/users/:id/agent-insights", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const insights = await appStorage.getAgentInsights(userId);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent insights" });
    }
  });

  // ADMIN ONLY: run AI agent pipeline for a specific user
  app.post("/api/agent/run/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { runAgentForUser } = await import("./agent/agent-runner.js");
      const result = await runAgentForUser(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Agent run failed" });
    }
  });

  app.get("/api/agent/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const run = await appStorage.getLatestAgentRun(userId);
      res.json(run ?? { status: "never_run" });
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent status" });
    }
  });

  return httpServer;
}
