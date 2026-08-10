import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, calculateDistanceMiles, resolveEventCoords } from "./storage.js";
import { aiMatcher } from "./ai-matching.js";
import { communityRefreshService } from "./community-refresh.js";
import { communityUpdateNotifier } from "./community-update-notifier.js";
import { eventScrapingScheduler } from "./schedulers/eventScrapingScheduler.js";
import { eventScraperOrchestrator } from "./scrapers/eventScraperOrchestrator.js";
import { insertUserSchema, insertCommunitySchema, insertEventSchema, insertMessageSchema, insertKudosSchema, insertCommunityMemberSchema, insertEventAttendeeSchema, insertTelemetryEventSchema, CURRENT_TERMS_VERSION, slotGrants, communityMembers, type Community } from "../shared/schema.js";
import { generateCommunityImage } from "./utils/community-image-gen.js";
import { db } from "./db.js";
import { sql as drizzleSql, eq } from "drizzle-orm";
import { ContentSafetyAgent } from "./agents/content-safety-agent.js";
import { HobbyTrendAgent } from "./agents/hobby-trend-agent.js";
import { AutoFixAgent } from "./agents/auto-fix-agent.js";
import { SupportFeedbackAgent } from "./agents/support-feedback-agent.js";
import { z } from "zod";

import express from "express";

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

export function checkIs18OrOlder(dateOfBirthStr: string): boolean {
  const dob = new Date(dateOfBirthStr);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Admin Security Middleware ---
  // All admin routes require a real secret key set via ADMIN_SECRET_KEY env var.
  // Any non-empty header is NOT sufficient — the value must match the secret exactly.
  const requireAdmin = (req: any, res: any, next: any) => {
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

    // If ADMIN_SECRET_KEY is not configured, lock down all admin routes completely.
    if (!ADMIN_SECRET) {
      console.error('[SameVibe] ADMIN_SECRET_KEY is not set — all admin routes are locked.');
      return res.status(503).json({ message: "Admin routes are not configured on this server." });
    }

    const providedKey = req.headers['x-admin-key'] || req.body?.adminKey;

    if (!providedKey || providedKey !== ADMIN_SECRET) {
      return res.status(403).json({ message: "Forbidden: Invalid or missing admin key." });
    }

    next();
  };

  const requireAuth = async (req: any, res: any, next: any) => {
    // Approved Staging Load Test Bypass for synthetic test traffic
    if (process.env.SAMEVIBE_LOAD_TEST_APPROVED === 'true' && req.headers['x-test-firebase-uid']) {
      const mockUid = req.headers['x-test-firebase-uid'] as string;
      req.firebaseUser = { uid: mockUid, email: `${mockUid}@staging.samevibe.internal` };
      const { storage } = await import("./storage.js");
      req.user = await storage.getUserByFirebaseUid(mockUid);
      return next();
    }

    const { getAdminApp } = await import("./utils/firebase-admin.js");
    const adminApp = getAdminApp();
    if (!adminApp) {
      // F1: Fail closed — never open-gate protected endpoints when Firebase Admin is absent.
      // A misconfigured production deployment must never silently trust every caller.
      console.error('[SameVibe] FATAL: Firebase Admin is not configured. All auth-protected endpoints are locked.');
      return res.status(503).json({ message: "Authentication service is not configured. Contact support." });
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
      const { storage } = await import("./storage.js");
      const dbUser = await storage.getUserByFirebaseUid(decodedToken.uid);
      req.user = dbUser;

      next();
    } catch (error) {
      console.error('[SameVibe] verifyIdToken error:', error);
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }
  };

  // Telemetry routes
  app.post("/api/telemetry", async (req, res) => {
    try {
      const eventData = insertTelemetryEventSchema.parse(req.body);
      const event = await storage.createTelemetryEvent(eventData);
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
      const allEvents = await storage.getTelemetryEvents();
      
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

      allEvents.forEach(e => {
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
        .filter(e => e.eventType === 'rsvp_intent' && e.metadata && (e.metadata as any).score)
        .map(e => (e.metadata as any).score as number);
      
      const avgWouldYouGo = intentScores.length > 0
        ? intentScores.reduce((a, b) => a + b, 0) / intentScores.length
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

function checkIs18OrOlderInternal(dateOfBirthStr: string): boolean {
  return checkIs18OrOlder(dateOfBirthStr);
}

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      if (userData.dateOfBirth) {
        if (!checkIs18OrOlder(userData.dateOfBirth)) {
          return res.status(400).json({ message: "SameVibe requires members to be at least 18 years old." });
        }
      }

      // Auto-set terms acceptance if version provided or default to current
      if (!userData.termsVersion) {
        userData.termsVersion = CURRENT_TERMS_VERSION;
      }
      userData.termsAcceptedAt = new Date();

      // Enforce default free status at account creation (never trust client-supplied entitlements)
      delete (userData as any).paymentTier;
      delete (userData as any).subscriptionStatus;

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/me/compliance", requireAuth, async (req, res) => {
    try {
      const firebaseUser = (req as any).firebaseUser;
      let reqUser = (req as any).user;

      if (!reqUser && firebaseUser?.uid) {
        const { storage } = await import("./storage.js");
        reqUser = await storage.getUserByFirebaseUid(firebaseUser.uid);
      }

      const { dateOfBirth, termsVersion } = req.body;
      const effectiveTermsVersion = termsVersion || CURRENT_TERMS_VERSION;

      if (dateOfBirth && !checkIs18OrOlder(dateOfBirth)) {
        return res.status(400).json({ message: "SameVibe requires members to be at least 18 years old." });
      }

      const { storage } = await import("./storage.js");
      let updatedUser;

      if (reqUser && reqUser.id) {
        const updates: any = {
          termsVersion: effectiveTermsVersion,
          termsAcceptedAt: new Date(),
        };
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
        updatedUser = await storage.updateUser(Number(reqUser.id), updates);
      } else if (firebaseUser?.uid) {
        // User is authenticated in Firebase but profile row was not yet created in PostgreSQL
        const newUserData = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@samevibe.app`,
          name: firebaseUser.name || firebaseUser.email?.split('@')[0] || 'Member',
          avatar: firebaseUser.picture || null,
          interests: [],
          dateOfBirth: dateOfBirth || null,
          termsVersion: effectiveTermsVersion,
          termsAcceptedAt: new Date(),
        };
        updatedUser = await storage.createUser(newUserData);
      } else {
        return res.status(401).json({ message: "Not authenticated or user profile not found." });
      }

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found." });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error('[SameVibe] compliance update error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── GET /api/users/:id/top-connections ────────────────────────────────────
  app.get("/api/users/:id/top-connections", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { storage } = await import("./storage.js");
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const allUsers = await storage.getAllUsers();
      const otherUsers = allUsers.filter((u) => u.id !== userId);

      // Single query for all active community memberships (eliminates N+1 loop)
      const allMemberships = await db
        .select({ userId: communityMembers.userId, communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(eq(communityMembers.isActive, true));

      const membershipsByUser = new Map<number, Set<number>>();
      for (const row of allMemberships) {
        if (!membershipsByUser.has(row.userId)) {
          membershipsByUser.set(row.userId, new Set());
        }
        membershipsByUser.get(row.userId)!.add(row.communityId);
      }

      const userCommunityIds = membershipsByUser.get(userId) || new Set<number>();
      const userInterests = new Set(currentUser.interests || []);

      const scored = otherUsers.map((other) => {
        const otherCommunityIds = membershipsByUser.get(other.id) || new Set<number>();

        let sharedCommunities = 0;
        for (const cId of Array.from(otherCommunityIds)) {
          if (userCommunityIds.has(cId)) sharedCommunities++;
        }

        const otherInterests = other.interests || [];
        let sharedInterests = 0;
        for (const tag of otherInterests) {
          if (userInterests.has(tag)) sharedInterests++;
        }

        // Calculate honest match score based on shared communities & interests
        let score = 60 + (sharedCommunities * 12) + (sharedInterests * 6);
        if (score > 99) score = 99;

        return {
          id: other.id,
          name: other.name || `Member ${other.id}`,
          avatar: other.avatar,
          bio: other.bio,
          matchPercent: score,
        };
      });

      scored.sort((a, b) => b.matchPercent - a.matchPercent);
      res.json(scored.slice(0, 5));
    } catch (error) {
      console.error("Top connections error:", error);
      res.status(500).json({ message: "Failed to fetch top connections" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // req.user is set by requireAuth. If it is null (edge case: Firebase UID
      // authenticated but not matched in DB during middleware), attempt a second
      // lookup via firebaseUser to keep old client builds working.
      let authenticatedUser = (req as any).user;
      if (!authenticatedUser && (req as any).firebaseUser?.uid) {
        const { storage } = await import("./storage.js");
        authenticatedUser = await storage.getUserByFirebaseUid((req as any).firebaseUser.uid);
      }

      if (!authenticatedUser || Number(authenticatedUser.id) !== id) {
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

      // Optional DOB format check if provided
      if (updates.dateOfBirth) {
        const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dobRegex.test(updates.dateOfBirth)) {
          return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }
      }

      if (updates.termsVersion) {
        if (updates.termsVersion !== CURRENT_TERMS_VERSION) {
          return res.status(400).json({ message: "You must accept the current Terms of Service." });
        }
        updates.termsAcceptedAt = new Date();
      }

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

  // Account deletion — required by Apple App Store and Google Play (since 2023)
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      // F17: Enforce ownership — a user can only delete their own account.
      const actingUser = (req as any).user;
      if (!actingUser?.id || Number(actingUser.id) !== id) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own account." });
      }
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Account and all associated data deleted successfully" });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete account. Please try again." });
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
        await storage.addActivityItem(sourceUserId, "connection_signal", {
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      let communities = await storage.getAllCommunities();

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        const userLoc = { lat, lon: lng };
        const local = communities.filter(c => {
          if (!c.location) return true;
          const coords = resolveEventCoords(c);
          if (coords) {
            return calculateDistanceMiles(userLoc.lat, userLoc.lon, coords.lat, coords.lng) <= radius;
          }
          return true;
        });
        if (local.length > 0) communities = local;
      }

      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/communities/recommended", async (req, res) => {
    try {
      const interests = req.query.interests as string;
      const userId = req.query.userId as string;
      let latitude = req.query.latitude as string;
      let longitude = req.query.longitude as string;
      
      const authUserId = (req as any).user ? (req as any).user.id : undefined;
      const userIdNum = userId ? parseInt(userId) : authUserId;

      if ((!latitude || !longitude) && userIdNum) {
        const currentUser = await storage.getUser(userIdNum);
        if (currentUser?.latitude && currentUser?.longitude) {
          latitude = currentUser.latitude;
          longitude = currentUser.longitude;
        }
      }
      
      const interestsArray = interests ? interests.split(',').filter(i => i.trim()) : [];
      const userLocation = latitude && longitude ? { lat: parseFloat(latitude), lon: parseFloat(longitude) } : undefined;
      
      const communities = await storage.getRecommendedCommunities(interestsArray, userLocation, userIdNum);
      
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

  app.get("/api/communities/trending", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      let allCommunities = await storage.getAllCommunities();
      let active = allCommunities.filter((c) => c.isActive);

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        const userLoc = { lat, lon: lng };
        const local = active.filter(c => {
          if (!c.location) return true;
          const coords = resolveEventCoords(c);
          if (coords) {
            return calculateDistanceMiles(userLoc.lat, userLoc.lon, coords.lat, coords.lng) <= radius;
          }
          return true;
        });
        if (local.length > 0) active = local;
      }

      const trending = active
        .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
        .slice(0, 10);

      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });

      res.json(trending);
    } catch (error) {
      console.error("Error getting trending communities:", error);
      res.status(500).json({ message: "Trending communities temporarily unavailable" });
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

  // ── Monetization Routes ───────────────────────────────────────────────
  /**
   * POST /api/checkout/verify-revenuecat
   *
   * Hardened RevenueCat v2 verification with DB-level idempotency.
   *
   * Flow:
   *   1. Client sends { userId, appUserId, productId, purchaseId } after a
   *      successful native StoreKit / Google Play transaction.
   *   2. Server calls RC API v2 to confirm the purchase exists and is 'owned'.
   *   3. Server inserts (user_id, txn_key=purchaseId) with ON CONFLICT DO NOTHING.
   *      If the row already exists the slot was already granted — return 200 immediately.
   *   4. Only on first insert does the server increment paymentTier.
   *
   * Returns:
   *   200 { success: true, newTier, alreadyGranted? }  — success or duplicate
   *   400  missing params
   *   402  RC verification failed / no matching 'owned' purchase
   *   404  user not found
   *   500  unexpected error
   *
   * Required env vars (server-only, NEVER sent to client):
   *   RC_PROJECT_ID   — RevenueCat project UUID
   *   RC_V2_SECRET_KEY — RevenueCat v2 secret API key (Bearer token)
   */
  app.post("/api/checkout/verify-revenuecat", requireAuth, async (req, res) => {
    try {
      const { userId, appUserId, productId, purchaseId } = req.body as {
        userId?: number;
        appUserId?: string;   // RC customer alias (usually firebaseUid or userId)
        productId?: string;   // e.g. "samevibe_slot_expansion"
        purchaseId?: string;  // RC purchase id — used as idempotency key
      };

      // ── 1. Input validation ───────────────────────────────────
      if (!userId || !appUserId || !productId || !purchaseId) {
        return res.status(400).json({
          message: "Missing required fields: userId, appUserId, productId, purchaseId",
        });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // ── 2. Idempotency check ────────────────────────────────
      // If this purchaseId was already recorded, the slot was already granted.
      // Return success immediately without touching paymentTier again.
      const existing = await db
        .select({ id: slotGrants.id })
        .from(slotGrants)
        .where(drizzleSql`${slotGrants.txnKey} = ${purchaseId}`)
        .limit(1);

      if (existing.length > 0) {
        console.log(`[RevenueCat] Duplicate grant attempt for txn ${purchaseId} — already granted, skipping.`);
        return res.status(200).json({
          success: true,
          newTier: user.paymentTier ?? 0,
          alreadyGranted: true,
        });
      }

      // ── 3. Verify with RevenueCat REST API v2 ────────────────────
      const rcProjectId  = process.env.RC_PROJECT_ID;
      const rcSecretKey  = process.env.RC_V2_SECRET_KEY;

      if (!rcProjectId || !rcSecretKey) {
        console.error("[RevenueCat] RC_PROJECT_ID or RC_V2_SECRET_KEY env vars not set.");
        return res.status(402).json({
          message: "Payment verification service not configured. Contact support.",
        });
      }

      const rcUrl = `https://api.revenuecat.com/v2/projects/${rcProjectId}/customers/${encodeURIComponent(appUserId)}/purchases`;

      let rcResponse: Response;
      try {
        rcResponse = await fetch(rcUrl, {
          headers: {
            Authorization: `Bearer ${rcSecretKey}`,
            "Content-Type": "application/json",
          },
        });
      } catch (networkErr) {
        console.error("[RevenueCat] Network error calling RC API:", networkErr);
        return res.status(402).json({
          message: "Could not reach payment verification service. Please retry.",
        });
      }

      if (!rcResponse.ok) {
        const errorBody = await rcResponse.text().catch(() => "");
        console.error(`[RevenueCat] RC API returned ${rcResponse.status}: ${errorBody}`);
        return res.status(402).json({
          message: "Payment verification failed. Please restore purchases and try again.",
        });
      }

      const rcData = await rcResponse.json() as {
        items?: Array<{
          id: string;
          product_identifier: string;
          status: string; // "owned" | "expired" | "refunded" etc.
        }>;
      };

      // ── 4. Find a matching owned purchase ────────────────────────
      const purchases = rcData.items ?? [];
      const matchingPurchase = purchases.find(
        (p) =>
          p.product_identifier === productId &&
          p.status === "owned"
      );

      if (!matchingPurchase) {
        console.warn(
          `[RevenueCat] No owned purchase found for user ${userId}, product ${productId}. ` +
          `RC returned ${purchases.length} purchases.`
        );
        return res.status(402).json({
          message: "No valid owned purchase found for this product. " +
                   "If you just purchased, please wait a moment and try again.",
        });
      }

      // Use the RC purchase id from the verified response as the canonical txn key.
      // This handles cases where the client sends a local receipt id but RC has
      // normalised it to a different id.
      const canonicalTxnKey = matchingPurchase.id ?? purchaseId;

      // ── 5. Idempotent insert (ON CONFLICT DO NOTHING) ────────────
      // If two concurrent requests race here, the one that wins the unique
      // constraint grants the slot; the loser's result set will be empty.
      const insertResult = await db
        .insert(slotGrants)
        .values({ userId, txnKey: canonicalTxnKey, productId })
        .onConflictDoNothing()
        .returning({ id: slotGrants.id });

      if (insertResult.length === 0) {
        // Concurrent duplicate — another request already recorded this grant
        console.log(`[RevenueCat] Race-condition duplicate for txn ${canonicalTxnKey} — skipping.`);
        const freshUser = await storage.getUser(userId);
        return res.status(200).json({
          success: true,
          newTier: freshUser?.paymentTier ?? 0,
          alreadyGranted: true,
        });
      }

      // ── 6. Grant the slot ───────────────────────────────────
      const currentTier = user.paymentTier ?? 0;
      const newTier = Math.min(currentTier + 1, 2); // max 2 extra slots (5 total)
      await storage.updateUser(userId, { paymentTier: newTier });

      console.log(
        `[RevenueCat] Slot granted: user=${userId} product=${productId} ` +
        `txn=${canonicalTxnKey} newTier=${newTier}`
      );

      return res.status(200).json({ success: true, newTier });

    } catch (error) {
      console.error("[RevenueCat] Unexpected error in verify-revenuecat:", error);
      return res.status(500).json({ message: "Internal server error during verification" });
    }
  });

  /**
   * POST /api/revenuecat/webhook
   *
   * Server-to-server webhook endpoint for RevenueCat subscription events.
   * Hardened with signature/auth verification, DB-level replay protection, and lifecycle handlers.
   */
  app.post("/api/revenuecat/webhook", async (req, res) => {
    try {
      // 1. Authorization check — verify webhook secret header
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
      const authHeader = req.headers.authorization;

      if (webhookSecret && authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        console.warn("[RevenueCat Webhook] Unauthorized webhook attempt.");
        return res.status(401).json({ message: "Unauthorized webhook payload" });
      }

      const event = req.body?.event;
      if (!event || !event.type) {
        return res.status(400).json({ message: "Invalid webhook payload structure" });
      }

      const eventId = event.id || event.transaction_id;
      const appUserId = event.app_user_id;
      const eventType = event.type; // e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, REVOCATION

      if (!appUserId) {
        return res.status(400).json({ message: "Missing app_user_id in event" });
      }

      // 2. Resolve user by firebaseUid or numeric id
      let targetUser = await storage.getUserByFirebaseUid(appUserId);
      if (!targetUser && !isNaN(Number(appUserId))) {
        targetUser = await storage.getUser(Number(appUserId));
      }

      if (!targetUser) {
        console.warn(`[RevenueCat Webhook] User not found for app_user_id: ${appUserId}`);
        return res.status(200).json({ received: true, status: 'user_not_found' });
      }

      // 3. Replay Protection & Idempotency check via slotGrants
      if (eventId) {
        const existing = await db
          .select({ id: slotGrants.id })
          .from(slotGrants)
          .where(drizzleSql`${slotGrants.txnKey} = ${eventId}`)
          .limit(1);

        if (existing.length > 0) {
          console.log(`[RevenueCat Webhook] Replay event ${eventId} already processed — skipping.`);
          return res.status(200).json({ received: true, status: 'already_processed' });
        }

        // Record event ID to prevent future replays
        await db.insert(slotGrants).values({
          userId: targetUser.id,
          txnKey: eventId,
          productId: event.product_id || eventType,
        }).onConflictDoNothing();
      }

      // 4. Lifecycle Event Processing
      console.log(`[RevenueCat Webhook] Processing ${eventType} for user ${targetUser.id}`);

      switch (eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
        case 'PRODUCT_CHANGE':
          await storage.updateUser(targetUser.id, {
            subscriptionStatus: 'active',
            paymentTier: 2, // Grants 5 active community slots
          });
          break;

        case 'CANCELLATION':
        case 'EXPIRATION':
          await storage.updateUser(targetUser.id, {
            subscriptionStatus: 'expired',
            paymentTier: 0, // Downgrades allowance back to 3 free base
          });
          break;

        case 'REVOCATION':
        case 'REFUND':
          await storage.updateUser(targetUser.id, {
            subscriptionStatus: 'revoked',
            paymentTier: 0,
          });
          break;

        default:
          console.log(`[RevenueCat Webhook] Ignored unhandled event type: ${eventType}`);
          break;
      }

      return res.status(200).json({ received: true, eventType, userId: targetUser.id });
    } catch (error) {
      console.error("[RevenueCat Webhook] Processing error:", error);
      return res.status(500).json({ message: "Internal server error processing webhook" });
    }
  });

  app.post("/api/communities", requireAuth, async (req, res) => {
    try {
      const communityData = insertCommunitySchema.parse(req.body);
      const community = await storage.createCommunity(communityData);
      res.status(201).json(community);

      // Fire-and-forget: generate image in background, never blocks the response
      setImmediate(async () => {
        try {
          if (!community.image) {
            const imageUrl = await generateCommunityImage(community);
            await storage.updateCommunity(community.id, { image: imageUrl });
            console.log(`[ImageGen] Generated image for community ${community.id}: ${imageUrl}`);
          }
        } catch (err: any) {
          console.error(`[ImageGen] Background generation failed for community ${community.id}:`, err.message);
        }
      });
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
      const { isReplacement, replaceCommunityId } = req.body || {};

      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(authUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Enforce 3 free vs 5 paid entitlement rules
      const result = await storage.joinCommunityWithRotation(authUserId, communityId, {
        isReplacement: Boolean(isReplacement),
        replaceCommunityId: replaceCommunityId ? parseInt(replaceCommunityId) : undefined,
      });

      res.status(201).json(result);

      // Trigger AI User Agent learning asynchronously on community join
      import("./agent/agent-runner.js").then(({ runAgentForUser }) => {
        runAgentForUser(authUserId).catch(err => console.error("[Agent] Trigger failed on join:", err));
      });
    } catch (error: any) {
      if (error.code === 'ENTITLEMENT_REQUIRED') {
        return res.status(402).json({
          error: 'ENTITLEMENT_REQUIRED',
          code: 'ENTITLEMENT_REQUIRED',
          message: error.message,
          allowedSlots: error.allowedSlots,
          currentCount: error.currentCount,
        });
      }
      if (error.code === 'COMMUNITY_DOWNGRADE_REQUIRED') {
        return res.status(403).json({
          error: 'COMMUNITY_DOWNGRADE_REQUIRED',
          code: 'COMMUNITY_DOWNGRADE_REQUIRED',
          message: error.message,
          allowedSlots: error.allowedSlots,
          currentCount: error.currentCount,
          activeCommunities: error.activeCommunities || [],
        });
      }
      if (error.code === 'COMMUNITY_LIMIT_REACHED') {
        return res.status(409).json({
          error: 'COMMUNITY_LIMIT_REACHED',
          code: 'COMMUNITY_LIMIT_REACHED',
          message: error.message,
          allowedSlots: error.allowedSlots,
          currentCount: error.currentCount,
          activeCommunities: error.activeCommunities || [],
        });
      }
      console.error("Error joining community:", error);
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
  app.post("/api/communities/:id/activity", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      // F10: Use the authenticated user's identity.
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      await storage.updateCommunityActivity(actingUser.id, communityId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update current user's location
  app.patch("/api/users/current/location", requireAuth, async (req, res) => {
    try {
      // F2: Use the authenticated user's identity — never trust a client-provided userId.
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { latitude, longitude, location } = req.body;
      
      const updatedUser = await storage.updateUser(actingUser.id, { 
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

  app.post("/api/communities/:id/leave", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      // F9: Use the authenticated user's identity — never trust a client-provided userId.
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const success = await storage.leaveCommunity(actingUser.id, communityId);
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

  // Event routes — location-confined to user radius
  app.post("/api/events/auto-scrape", async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }
      const result = await eventScraperOrchestrator.scrapeEventsForAllCommunities({ lat, lon });
      res.json({ message: "Scraped successfully", result });
    } catch (error: any) {
      console.error("[AutoScrape] Failed:", error.message);
      res.status(500).json({ message: "Auto scrape failed", error: error.message });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      let eventsList = await storage.getUpcomingEvents(userId, lat, lng, radius);

      // On Vercel serverless, background schedulers don't run continuously.
      // If DB has 0 events for valid user coordinates, trigger an on-demand scrape!
      if (eventsList.length === 0 && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        try {
          console.log(`[EventsAPI] 0 events in DB for (${lat}, ${lng}). Triggering on-demand scrape...`);
          await eventScraperOrchestrator.scrapeEventsForAllCommunities({ lat, lon: lng });
          eventsList = await storage.getUpcomingEvents(userId, lat, lng, radius);
        } catch (scrapeErr: any) {
          console.error('[EventsAPI] On-demand scrape error:', scrapeErr.message);
        }
      }

      res.json(eventsList);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      let eventsList = await storage.getUpcomingEvents(userId, lat, lng, radius);

      // On Vercel serverless, background schedulers don't run continuously.
      // If DB has 0 events for valid user coordinates, trigger an on-demand scrape!
      if (eventsList.length === 0 && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        try {
          console.log(`[UpcomingEventsAPI] 0 events in DB for (${lat}, ${lng}). Triggering on-demand scrape...`);
          await eventScraperOrchestrator.scrapeEventsForAllCommunities({ lat, lon: lng });
          eventsList = await storage.getUpcomingEvents(userId, lat, lng, radius);
        } catch (scrapeErr: any) {
          console.error('[UpcomingEventsAPI] On-demand scrape error:', scrapeErr.message);
        }
      }

      // F16: Single batch query for all attendees — eliminates N+1 pattern.
      const eventIds = eventsList.map(e => e.id);
      const attendeesByEvent = await storage.getEventAttendeesForEvents(eventIds, userId);

      const eventsWithAttendees = eventsList.map((event) => {
        const attendeesList = attendeesByEvent.get(event.id) || [];
        return {
          ...event,
          attendees: attendeesList,
          attendeeCount: event.attendeeCount || attendeesList.length || 0,
        };
      });

      res.json(eventsWithAttendees);
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
      
      const events = await storage.getEventsByLocation(
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
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
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

  app.post("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { status = "interested" } = req.body;
      
      // F3: Derive userId from the verified auth token — never trust the request body.
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const registration = await storage.registerForEvent(actingUser.id, eventId, status);
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/review", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { rating, feltSafe, feedback } = req.body;

      // F5: Derive userId from the verified auth token.
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const actingUserId = actingUser.id;

      if (rating === undefined) {
        return res.status(400).json({ message: "rating is required" });
      }

      const numRating = parseInt(rating);
      if (numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: "rating must be between 1 and 5" });
      }

      // Server-side eligibility: user must have an attendance record for the event.
      const userEvents = await storage.getUserEvents(actingUserId);
      const hasAttended = userEvents.some(e => e.id === eventId);
      if (!hasAttended) {
        return res.status(403).json({ message: "You can only review events you have RSVP'd to or attended." });
      }

      const review = await storage.createEventReview(
        actingUserId,
        eventId,
        numRating,
        feltSafe !== false, // default true unless explicitly false
        feedback
      );

      // Safety guard: if user did not feel safe, auto-file a safety report
      if (feltSafe === false && feedback) {
        await storage.reportEvent(actingUserId, eventId, 'safety_concern', feedback);
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
      // F6: Use the authenticated user as blocker — never trust a client-provided blockerId.
      const actingUser = (req as any).user;
      if (!actingUser?.id || !blockedId) {
        return res.status(400).json({ message: "blockedId is required and user must be authenticated" });
      }
      if (Number(actingUser.id) === parseInt(blockedId)) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }
      const block = await storage.blockUser(actingUser.id, parseInt(blockedId), reason);
      res.status(201).json({ success: true, block });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  // Report a user
  app.post("/api/users/:id/report", requireAuth, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const { reason, details } = req.body;
      // F7: Use the authenticated user as reporter.
      const actingUser = (req as any).user;
      if (!actingUser?.id || !reason) {
        return res.status(400).json({ message: "reason is required and user must be authenticated" });
      }
      const validReasons = ['harassment', 'spam', 'fake_profile', 'inappropriate_content', 'other'];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ message: `reason must be one of: ${validReasons.join(', ')}` });
      }
      const report = await storage.reportUser(actingUser.id, targetUserId, reason, details);
      res.status(201).json({ success: true, report, message: "Report submitted for review" });
    } catch (error) {
      console.error("Report user error:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Report an event
  app.post("/api/events/:id/report", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { reason, details } = req.body;
      // F8: Use the authenticated user as reporter.
      const actingUser = (req as any).user;
      if (!actingUser?.id || !reason) {
        return res.status(400).json({ message: "reason is required and user must be authenticated" });
      }
      const validReasons = ['misleading', 'spam', 'inappropriate', 'cancelled', 'safety_concern', 'other'];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ message: `reason must be one of: ${validReasons.join(', ')}` });
      }
      const report = await storage.reportEvent(actingUser.id, eventId, reason, details);
      res.status(201).json({ success: true, report, message: "Report submitted for review" });
    } catch (error) {
      console.error("Report event error:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // /api/events/feed alias for /api/events/upcoming — requires location to filter properly
  app.get("/api/events/feed", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      // Fall back to user's stored DB coordinates if GPS coords not in query
      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      const events = await storage.getUpcomingEvents(userId, lat, lng, radius);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create global revenue-generating event
  app.post("/api/events/create-global", requireAuth, async (req, res) => {
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

  // Test OpenAI integration — admin only (removed for app store readiness)
  app.post("/api/test-openai", requireAdmin, async (req, res) => {
    res.json({ success: false, message: "OpenAI integration has been removed." });
  });

  app.get("/api/users/:id/events", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      // Only allow users to see their own event list
      const actingUser = (req as any).user;
      if (!actingUser?.id || Number(actingUser.id) !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message routes — F18: DM endpoints require authentication and participant ownership
  app.get("/api/conversations/:userId1/:userId2", requireAuth, async (req, res) => {
    try {
      const userId1 = parseInt(req.params.userId1);
      const userId2 = parseInt(req.params.userId2);
      // F18: The authenticated user must be one of the two participants
      const actingUser = (req as any).user;
      if (!actingUser?.id || (Number(actingUser.id) !== userId1 && Number(actingUser.id) !== userId2)) {
        return res.status(403).json({ message: "Forbidden: You can only read your own conversations." });
      }
      const messages = await storage.getConversation(userId1, userId2);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/conversations", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      // F18: Only the authenticated user can view their own conversation list
      const actingUser = (req as any).user;
      if (!actingUser?.id || Number(actingUser.id) !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only read your own conversations." });
      }
      
      // Batch fetch all conversations with unread counts in 2 constant queries (eliminates N+1 query bottleneck)
      const normalized = await storage.getUserConversationsWithUnread(userId);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  app.post("/api/messages", requireAuth, async (req, res) => {
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

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
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

  app.post("/api/kudos", requireAuth, async (req, res) => {
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

  app.post("/api/auto-populate-events", requireAuth, async (req, res) => {
    try {
      const { userId, latitude, longitude } = req.body;
      
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ message: "User ID and location required" });
      }

      const user = await storage.getUser(userId);
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

  // Event scraping routes
  app.post("/api/communities/:id/scrape-events", requireAuth, async (req, res) => {
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
      
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }
      
      // Get all events for this community
      const eventsList = await storage.getCommunityEvents(communityId);
      let upcomingEvents = eventsList.filter(event => 
        new Date(event.date) >= new Date() // Future events only
      );

      // Geo-filter community events to user's location radius if coordinates are available
      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        upcomingEvents = upcomingEvents.filter(event => {
          if (event.isGlobal) return true;
          const coords = resolveEventCoords(event);
          if (coords) {
            return calculateDistanceMiles(lat!, lng!, coords.lat, coords.lng) <= radius;
          }
          return false;
        });
      }
      
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
      
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;

      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }
      
      // Get events specifically associated with this community
      const eventsList = await storage.getCommunityEvents(communityId);
      let recentEvents = eventsList.filter(event => 
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
  app.post("/api/events/:id/mark-attended", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // F4: Use the authenticated user's identity — never trust a client-provided userId.
      const actingUser = (req as any).user;
      if (!actingUser?.id || isNaN(eventId)) {
        return res.status(400).json({ message: "Event ID required and user must be authenticated" });
      }
      const actingUserId = actingUser.id;
      
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
      
      // Register/update attendance status (idempotent via onConflictDoUpdate)
      const attendance = await storage.registerForEvent(actingUserId, eventId, "attended");
      
      // Add to activity feed for algorithm learning
      await storage.addActivityItem(actingUserId, 'event_attended', {
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
        agentRunner.runAgentForUser(actingUserId).catch(err => console.error("[Agent] Trigger failed:", err));
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
      // Filter to only events that have actually passed (cannot attend future events)
      const confirmedAttended = attendedEvents.filter(event => 
        new Date(event.date) < new Date()
      );
      
      res.json(confirmedAttended);
    } catch (error) {
      console.error("Error fetching attended events:", error);
      res.status(500).json({ message: "Failed to fetch attended events" });
    }
  });

  // ── Vibe Passport Endpoints ──────────────────────────────────────────────────
  app.get("/api/users/:id/passport", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const actingUser = (req as any).user;
      if (!actingUser?.id || Number(actingUser.id) !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const summary = await storage.getPassportSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching passport summary:", error);
      res.status(500).json({ message: "Failed to fetch passport summary" });
    }
  });

  app.post("/api/events/:id/check-in", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { latitude, longitude } = req.body || {};
      const result = await storage.checkInToEvent(actingUser.id, eventId, latitude, longitude);

      res.json({
        success: true,
        message: "Check-in verified! Stamp added to your Vibe Passport.",
        ...result,
      });
    } catch (error: any) {
      console.error("Error performing GPS check-in:", error);
      res.status(500).json({ message: error.message || "Failed to check in" });
    }
  });

  // ── Hobby Discovery Quiz Catalog & Analytics ──────────────────────────────────
  app.get("/api/hobbies/catalog", async (req, res) => {
    try {
      const MAINSTREAM_HOBBIES = [
        { id: "pickleball", label: "Pickleball & Padel", emoji: "🏓", description: "The fastest-growing racquet sports combining quick reflexes, easy rallies, and instant social atmosphere." },
        { id: "specialty-coffee", label: "Specialty Coffee", emoji: "☕", description: "Exploring single-origin pour-overs, artisan espresso, and cozy third places with fellow caffeine enthusiasts." },
        { id: "trail-running", label: "Trail Running & Hiking", emoji: "🥾", description: "Connecting with nature, conquering scenic elevation, and sharing post-hike high-fives on outdoorsy trails." },
        { id: "board-games", label: "Board Games & TTRPGs", emoji: "🎲", description: "Diving into modern strategy board games, D&D campaigns, and game nights packed with laughter and friendly competition." },
        { id: "craft-brewing", label: "Craft Beer & Wine", emoji: "🍺", description: "Sipping microbrews, natural wines, and craft cider while discussing tasting notes with local connoisseurs." },
        { id: "bouldering", label: "Bouldering & Climbing", emoji: "🧗", description: "Solving physical puzzles on indoor walls and outdoor crags alongside an encouraging, high-energy community." },
        { id: "vinyl-records", label: "Vinyl & Hi-Fi Audio", emoji: "🎧", description: "Hunting for rare analog pressings, listening sessions on tube amps, and celebrating full-album deep dives." },
        { id: "sourdough-baking", label: "Artisanal Baking", emoji: "🍞", description: "Fermenting starters, perfecting crusty sourdough loaves, and sharing baked treats with friends." },
        { id: "pottery", label: "Pottery & Ceramics", emoji: "🏺", description: "Getting your hands dirty on the potter's wheel, glazing handmade mugs, and finding mindful creative flow." },
        { id: "houseplants", label: "Indoor Plant Jungle", emoji: "🪴", description: "Propagating rare monsteras, designing indoor jungles, and swapping plant cuttings with green thumbs." },
        { id: "film-photography", label: "Analog Film Photo", emoji: "📷", description: "Shooting 35mm film, developing darkroom prints, and appreciating slow, intentional visual storytelling." },
        { id: "yoga-movement", label: "Yoga & Somatics", emoji: "🧘", description: "Stretching, breathwork, and mindful movement to reset your nervous system in a peaceful group setting." },
        { id: "cycling", label: "Gravel Riding & Cycling", emoji: "🚲", description: "Pedaling scenic backroads, commuting in group rides, and grabbing espresso stops with cycling buddies." },
        { id: "cozy-gaming", label: "Cozy & Indie Gaming", emoji: "🎮", description: "Relaxing with Stardew Valley, indie gems, and chill multiplayer sessions with low-stress gamers." },
        { id: "mocktails", label: "Craft Mocktails", emoji: "🍹", description: "Brewing kombucha, crafting zero-proof botanical cocktails, and hosting alcohol-free social hours." },
      ];

      const EMERGING_HOBBIES = [
        { id: "urban-foraging", label: "Urban Foraging", emoji: "🍄", description: "Discovering edible plants, wild mushrooms, and medicinal herbs growing right in your city's parks." },
        { id: "cold-plunge", label: "Cold Plunge & Sauna", emoji: "🧊", description: "Invigorating ice baths, Finnish saunas, and dopamine-boosting contrast wellness sessions with a tight squad." },
        { id: "zine-making", label: "Zines & Press Art", emoji: "📰", description: "Designing indie mini-magazines, vintage letterpress typography, and printing physical zines by hand." },
        { id: "rucking", label: "Rucking & Endurance", emoji: "🎒", description: "Walking with weighted backpacks to build functional strength, endurance, and outdoor camaraderie." },
        { id: "sound-baths", label: "Sound Baths & Gongs", emoji: "🔔", description: "Floating in deep acoustic resonance with singing bowls, gongs, and immersive sonic meditation." },
        { id: "custom-keyboards", label: "Custom Keyboards", emoji: "⌨️", description: "Soldering switches, lubing stabilizers, and customizing tactile mechanical keyboards with artisan keycaps." },
        { id: "fiber-art", label: "Chunky Fiber Art", emoji: "🧶", description: "Arm-knitting chunky blankets, tufting rugs, and crafting fiber art in cozy community sip-and-stitch circles." },
        { id: "disc-golf", label: "Disc Golf Rounds", emoji: "🥏", description: "Tossing precision discs through park courses and exploring new greenways on casual weekend rounds." },
        { id: "grain-milling", label: "Ancient Grain Milling", emoji: "🌾", description: "Milling heritage grains, heirloom wheat flours, and baking nutrient-dense traditional flatbreads." },
        { id: "astrophotography", label: "Stargazing & Astro", emoji: "🌌", description: "Capturing deep-sky nebulae with portable smart telescopes and camping under dark skies with astronomy buffs." },
      ];

      // Enrich with latest HobbyTrendAgent insights
      const trendReport = await HobbyTrendAgent.getLatestTrendReport();

      const enrichedMainstream = MAINSTREAM_HOBBIES.map(item => {
        const trendData = trendReport.mainstreamTrends[item.id];
        return {
          ...item,
          count: trendData?.count || 0,
          velocityPercent: trendData?.velocityPercent || 0,
          isTrending: trendData?.isTrending || false,
        };
      }).sort((a, b) => (b.count + (b.isTrending ? 10 : 0)) - (a.count + (a.isTrending ? 10 : 0)));

      const enrichedEmerging = EMERGING_HOBBIES.map(item => {
        const trendData = trendReport.emergingTrends[item.id];
        return {
          ...item,
          count: trendData?.count || 0,
          velocityPercent: trendData?.velocityPercent || 0,
          isTrending: trendData?.isTrending || false,
        };
      }).sort((a, b) => (b.count + (b.isTrending ? 10 : 0)) - (a.count + (a.isTrending ? 10 : 0)));

      res.json({ mainstream: enrichedMainstream, emerging: enrichedEmerging });
    } catch (error) {
      console.error("Error building hobby catalog:", error);
      res.status(500).json({ message: "Failed to load hobby catalog" });
    }
  });

  app.post("/api/hobbies/quiz-submit", requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { pickedMainstreamHobbies = [], pickedEmergingHobbies = [], freeformHobby } = req.body || {};

      if (freeformHobby && typeof freeformHobby === "string" && freeformHobby.length > 200) {
        return res.status(400).json({ message: "Freeform hobby entry must be less than 200 characters" });
      }

      // Record analytics entry
      const analyticsEntry = await storage.createHobbyTrendAnalytics({
        userId: actingUser.id,
        pickedMainstreamHobbies: Array.isArray(pickedMainstreamHobbies) ? pickedMainstreamHobbies : [],
        pickedEmergingHobbies: Array.isArray(pickedEmergingHobbies) ? pickedEmergingHobbies : [],
        freeformHobby: freeformHobby ? String(freeformHobby).trim() : null,
      });

      // Update user interests
      const combinedInterests = Array.from(
        new Set([
          ...pickedMainstreamHobbies,
          ...pickedEmergingHobbies,
          ...(freeformHobby ? [String(freeformHobby).trim()] : []),
        ])
      );

      const currentUser = await storage.getUser(actingUser.id);
      if (currentUser) {
        const existingInterests = currentUser.interests || [];
        const updatedInterests = Array.from(new Set([...existingInterests, ...combinedInterests]));
        await storage.updateUser(actingUser.id, { interests: updatedInterests });
      }

      res.json({
        success: true,
        message: "Hobby quiz selections saved successfully!",
        analytics: analyticsEntry,
      });
    } catch (error: any) {
      console.error("Error submitting hobby quiz:", error);
      res.status(500).json({ message: "Failed to submit hobby quiz" });
    }
  });

  // ── Moderation Agent Admin Endpoints ──────────────────────────────────────────
  app.get("/api/admin/moderation/flagged", requireAdmin, async (req, res) => {
    try {
      const flaggedList = await storage.getPendingFlaggedContent();
      res.json(flaggedList);
    } catch (error) {
      console.error("Error fetching flagged content:", error);
      res.status(500).json({ message: "Failed to fetch flagged content" });
    }
  });

  app.post("/api/admin/moderation/:id/action", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { action } = req.body || {}; // 'approved', 'removed', 'warned'

      if (isNaN(id) || !["approved", "removed", "warned"].includes(action)) {
        return res.status(400).json({ message: "Invalid moderation request" });
      }

      const actingAdmin = (req as any).user || { id: 1 };
      const resolved = await storage.resolveFlaggedContent(id, actingAdmin.id, action);

      res.json({
        success: true,
        message: `Content flagged log resolved with status: ${action}`,
        resolved,
      });
    } catch (error) {
      console.error("Error taking moderation action:", error);
      res.status(500).json({ message: "Failed to resolve moderation log" });
    }
  });

  // ── Hobby Trend Analysis Admin Endpoints ─────────────────────────────────────
  app.get("/api/admin/hobbies/trends", requireAdmin, async (req, res) => {
    try {
      const report = await HobbyTrendAgent.analyzeTrends();
      res.json(report);
    } catch (error) {
      console.error("Error analyzing hobby trends:", error);
      res.status(500).json({ message: "Failed to generate hobby trend report" });
    }
  });

  // ── AI Customer Support & Auto-Fix System ────────────────────────────────────
  app.post("/api/support/quick-fix", requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { actionKey } = req.body || {};
      if (!actionKey) {
        return res.status(400).json({ message: "Action key required" });
      }

      const result = await AutoFixAgent.executeFix(actingUser.id, actionKey);

      if (result.applied) {
        await storage.createSupportTicket({
          userId: actingUser.id,
          subject: `Automated Quick-Fix: ${actionKey}`,
          category: "app_fix",
          priority: "low",
          status: "auto_fixed",
          userMessage: `Executed quick-fix action: ${actionKey}`,
          aiResponse: result.userMessage,
          autoFixApplied: result.actionKey,
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error executing quick-fix:", error);
      res.status(500).json({ message: "Failed to execute quick-fix" });
    }
  });

  app.post("/api/support/ai-chat", requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      if (!actingUser?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { subject = "General Support Request", userMessage } = req.body || {};
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Triage and generate AI response
      const triage = SupportFeedbackAgent.triageAndCategorize(userMessage.trim());

      // Create support ticket
      const ticket = await storage.createSupportTicket({
        userId: actingUser.id,
        subject: subject.trim(),
        category: triage.category,
        priority: triage.priority,
        status: "open",
        userMessage: userMessage.trim(),
        aiResponse: triage.aiResponse,
      });

      // Dispatch priority email alert to jarryd@SameVibeapp.com if urgent/high priority
      await SupportFeedbackAgent.processPriorityEmailAlert(ticket);

      // Execute auto-fix if applicable
      let autoFixResult = null;
      if (triage.suggestedActionKey) {
        autoFixResult = await AutoFixAgent.executeFix(actingUser.id, triage.suggestedActionKey);
        if (autoFixResult.applied) {
          await storage.updateSupportTicket(ticket.id, {
            status: "auto_fixed",
            autoFixApplied: autoFixResult.actionKey,
          });
        }
      }

      res.json({
        success: true,
        ticket,
        aiResponse: triage.aiResponse,
        suggestedActionKey: triage.suggestedActionKey,
        autoFixResult,
      });
    } catch (error: any) {
      console.error("Error processing AI support chat:", error);
      res.status(500).json({ message: "Failed to process support request" });
    }
  });

  app.get("/api/admin/support/insights", requireAdmin, async (req, res) => {
    try {
      const digest = await SupportFeedbackAgent.generateAppImprovementDigest();
      const openTickets = await storage.getSupportTickets();
      res.json({ digest, openTickets });
    } catch (error) {
      console.error("Error generating support insights:", error);
      res.status(500).json({ message: "Failed to load support insights" });
    }
  });

  // Global events route for communities page
  app.get("/api/events/global", async (req, res) => {
    try {
      // Get partner/global events only — events explicitly marked isGlobal or type=partner.
      // The previous implementation had an OR clause that matched ALL future events.
      const allEvents = await storage.getAllEvents();
      const globalEvents = allEvents.filter(event => 
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user?.id;
      let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      let lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 50;
      
      if ((lat === undefined || isNaN(lat)) && userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.latitude && currentUser?.longitude) {
          lat = parseFloat(currentUser.latitude);
          lng = parseFloat(currentUser.longitude);
        }
      }

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        const userLocation = { lat, lon: lng };
        const trendingEvents = await storage.getTrendingEventsByLocation(userLocation, radius);
        return res.json(trendingEvents);
      }
      
      // No resolvable location — return empty rather than leaking global events
      res.json([]);
    } catch (error) {
      console.error("Error fetching trending events:", error);
      res.status(500).json({ message: "Failed to fetch trending events" });
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

  app.post("/api/communities/:id/messages", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const { content } = req.body;
      // F11: Use the authenticated user as sender — never trust a client-provided senderId.
      const actingUser = (req as any).user;
      if (!actingUser?.id || !content) {
        return res.status(400).json({ message: "Content is required and user must be authenticated" });
      }

      // Content Safety Agent inspection
      const safetyCheck = await ContentSafetyAgent.inspectAndLog(content.trim(), actingUser.id, "communityMessage");
      if (!safetyCheck.safe) {
        return res.status(422).json({
          message: "Message violates community safety guidelines and has been hidden for review.",
          reason: safetyCheck.reason,
        });
      }
      
      const messageData = {
        content: content.trim(),
        senderId: actingUser.id,
        communityId: communityId
      };
      
      const message = await storage.sendCommunityMessage(messageData);
      res.status(201).json(message);

      // Trigger AI learning
      import("./agent/agent-runner").then(({ agentRunner }) => {
        agentRunner.runAgentForUser(actingUser.id).catch(err => console.error("[Agent] Trigger failed:", err));
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

      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const user = await storage.getUser(parseInt(userId as string));
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
        const dynamicMembers = await storage.getDynamicCommunityMembers(communityId, userLocation, userInterests);
        
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
      const membersWithStatus = await storage.getCommunityMembersWithStatus(communityId, requestingUserId);
      
      // Only return live members (online within last 15 minutes)
      const liveMembers = membersWithStatus.filter(member => member.isOnline);
      
      res.json({
        online: liveMembers,
        offline: membersWithStatus.filter(member => !member.isOnline),
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
      await storage.updateUserActivity(userId);
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
      await storage.setUserOnlineStatus(userId, Boolean(isOnline));
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting user status:", error);
      res.status(500).json({ message: "Failed to set status" });
    }
  });

  // Onboarding completion route for comprehensive 12-step quiz structure
  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const {
        hopingToFind,
        interestSpaces,
        priorityInterestIds,
        preferredGroupSizes,
        socialComfortPreferences,
        experiencePace,
        availability,
        travelRadiusMiles,
        planningHorizon,
        location,
        latitude,
        longitude,
      } = req.body;

      // F19: Use the verified auth token identity exclusively.
      // Any client-provided userId is ignored to prevent cross-user profile writes.
      const targetUserId = (req as any).user?.id;

      if (!targetUserId) {
        return res.status(401).json({ message: "Not authenticated or user ID missing." });
      }

      // Format arrays safely
      const interests = Array.isArray(interestSpaces) ? interestSpaces : (interestSpaces ? [interestSpaces] : []);
      const goals = Array.isArray(hopingToFind) ? hopingToFind : (hopingToFind ? [hopingToFind] : []);
      const priorities = Array.isArray(priorityInterestIds) ? priorityInterestIds : (priorityInterestIds ? [priorityInterestIds] : []);
      const groupSizes = Array.isArray(preferredGroupSizes) ? preferredGroupSizes : (preferredGroupSizes ? [preferredGroupSizes] : []);
      const comfortPrefs = Array.isArray(socialComfortPreferences) ? socialComfortPreferences : (socialComfortPreferences ? [socialComfortPreferences] : []);

      const existingUser = await storage.getUser(parseInt(targetUserId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedQuizAnswers = {
        ...(existingUser.quizAnswers as object || {}),
        goals,
        priorityInterestIds: priorities,
        preferredGroupSizes: groupSizes,
        socialComfortPreferences: comfortPrefs,
        experiencePace: experiencePace || "casual",
        availability: Array.isArray(availability) ? availability : (availability ? [availability] : []),
        travelRadiusMiles: travelRadiusMiles ? Number(travelRadiusMiles) : 25,
        planningHorizon: planningHorizon || "flexible",
        completedAt: new Date().toISOString()
      };

      const updatedUser = await storage.updateUser(parseInt(targetUserId), {
        interests: interests.length > 0 ? interests : existingUser.interests,
        quizAnswers: updatedQuizAnswers,
        location: location || existingUser.location || "Local",
        latitude: latitude ? parseFloat(latitude).toString() : existingUser.latitude,
        longitude: longitude ? parseFloat(longitude).toString() : existingUser.longitude,
        onboardingCompleted: true
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User update failed" });
      }

      // ── Three-community onboarding assignment ──────────────────────────────
      // Founder decision (2026-07-08, confirmed 2026-07-31):
      // Every newly onboarded user is placed into exactly 3 shared communities
      // matched to their questionnaire interests and location.
      // Existing compatible communities are reused; missing ones are created once
      // with a canonical key — two concurrent users never produce duplicate communities.
      // This call is additive-only and idempotent (safe to retry).
      let assignedCommunities: Community[] = [];
      try {
        assignedCommunities = await storage.assignOnboardingCommunities(updatedUser.id);
        console.log(`[Onboarding] User ${updatedUser.id} assigned to ${assignedCommunities.length} communities`);
      } catch (error) {
        console.error('[Onboarding] Community assignment failed (non-fatal):', error);
        // Non-fatal: the user profile is saved. Dashboard will show empty communities.
        // The user can still use the app and join communities manually.
      }

      res.json({
        user: updatedUser,
        communities: assignedCommunities,
        message: `Welcome to SameVibe! You've been matched with ${assignedCommunities.length} communities.`,
      });
    } catch (error) {
      console.error('SameVibe: Error completing onboarding:', error);
      res.status(500).json({ message: 'Failed to complete onboarding' });
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
          await storage.setUserOnlineStatus(userId, true);
          
          // Broadcast online status update to all clients
          broadcastMemberUpdate(userId, true);
        }
        
        if (data.type === 'heartbeat' && userId) {
          activeConnections.set(userId, { ws, lastActivity: new Date() });
          await storage.updateUserActivity(userId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      if (userId) {
        activeConnections.delete(userId);
        await storage.setUserOnlineStatus(userId, false);
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
          await storage.setUserOnlineStatus(userId, false);
          broadcastMemberUpdate(userId, false);
        }
      });
    }, 5 * 60 * 1000);

    // Initialize event scraping scheduler (disabled during load testing to save CPU/memory)
    if (process.env.SAMEVIBE_LOAD_TEST_APPROVED !== 'true') {
      eventScrapingScheduler.startScheduling();
    }
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  app.get("/api/communities/:id/posts", async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const posts = await storage.getCommunityPosts(communityId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  app.post("/api/communities/:id/posts", requireAuth, async (req, res) => {
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

      const post = await storage.createPost(communityId, parseInt(authorId), String(content));
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
      const result = await storage.givePostKudos(postId, parseInt(giverId));
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
      const streak = await storage.getStreak(userId);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.post("/api/users/:id/checkin", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const streak = await storage.checkin(userId);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to checkin" });
    }
  });

  // ── Agent ──────────────────────────────────────────────────────────────────

  app.get("/api/users/:id/agent-insights", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const insights = await storage.getAgentInsights(userId);
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
      const run = await storage.getLatestAgentRun(userId);
      res.json(run ?? { status: "never_run" });
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent status" });
    }
  });

  // POST /api/communities/:id/generate-image
  // Idempotent: skips if image already exists. Safe to call multiple times.
  app.post("/api/communities/:id/generate-image", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) return res.status(400).json({ message: "Invalid ID" });

      const community = await storage.getCommunity(communityId);
      if (!community) return res.status(404).json({ message: "Community not found" });

      // Idempotent — if image already generated, return it immediately
      if (community.image) {
        return res.json({ image: community.image, generated: false });
      }

      const imageUrl = await generateCommunityImage(community);
      await storage.updateCommunity(communityId, { image: imageUrl });

      res.json({ image: imageUrl, generated: true });
    } catch (err: any) {
      console.error("[ImageGen] Failed:", err.message);
      res.status(500).json({ message: "Image generation failed", error: err.message });
    }
  });


  // ─── Manual Event Submission ────────────────────────────────────────────────
  // Users submit events for moderation. Events are saved with status "pending"
  // and only go live after an admin approves them.

  const ADMIN_EMAILS = ['jarryd@SameVibeapp.com', 'jarryd@samevibe.app'];

  // Zod schema for user-submitted events (more forgiving than insertEventSchema)
  const submitEventSchema = z.object({
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(2000),
    date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date' }),
    location: z.string().min(3).max(200),
    address: z.string().min(3).max(200).optional(),
    category: z.string().min(2).max(60),
    price: z.string().optional().default('0'),
    maxAttendees: z.number().int().positive().optional(),
    sourceUrl: z.string().url().optional().or(z.literal('')),
    communityId: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional().default([]),
  });

  /** POST /api/events/submit — authenticated users submit events for review */
  app.post('/api/events/submit', requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      if (!actingUser?.id) return res.status(401).json({ message: 'Unauthorized' });

      const parsed = submitEventSchema.parse(req.body);

      const event = await storage.createEvent({
        title: parsed.title,
        description: parsed.description,
        organizer: actingUser.displayName ?? actingUser.email ?? 'Community Member',
        date: new Date(parsed.date),
        location: parsed.location,
        address: parsed.address ?? parsed.location,
        category: parsed.category,
        price: parsed.price ?? '0',
        maxAttendees: parsed.maxAttendees,
        sourceUrl: parsed.sourceUrl || undefined,
        communityId: parsed.communityId,
        tags: parsed.tags ?? [],
        isExternal: false,
        isGlobal: false,
        creatorId: actingUser.id,
        status: 'pending', // Goes into moderation queue
        isPromoted: false,
        isPremium: false,
      });

      res.status(201).json({
        message: 'Event submitted for review. We\'ll notify you when it goes live.',
        eventId: event.id,
        status: 'pending',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid event data', errors: error.errors });
      }
      console.error('[EventSubmit] Error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /** GET /api/admin/events/pending — admin-only: list events awaiting moderation */
  app.get('/api/admin/events/pending', requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      const userRecord = await storage.getUser(actingUser?.id);
      if (!userRecord || !ADMIN_EMAILS.includes(userRecord.email ?? '')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const pendingEvents = await db
        .select()
        .from((await import('../shared/schema.js')).events)
        .where(drizzleSql`status = 'pending'`)
        .orderBy(drizzleSql`created_at DESC`);

      res.json(pendingEvents);
    } catch (error) {
      console.error('[AdminEvents] Pending list error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /** POST /api/admin/events/:id/approve — admin approves a pending event */
  app.post('/api/admin/events/:id/approve', requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      const userRecord = await storage.getUser(actingUser?.id);
      if (!userRecord || !ADMIN_EMAILS.includes(userRecord.email ?? '')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event ID' });

      const { events: eventsTable } = await import('../shared/schema.js');
      await db
        .update(eventsTable)
        .set({ status: 'active' })
        .where(eq(eventsTable.id, eventId));

      res.json({ message: 'Event approved and now live.', eventId, status: 'active' });
    } catch (error) {
      console.error('[AdminEvents] Approve error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /** POST /api/admin/events/:id/reject — admin rejects a pending event */
  app.post('/api/admin/events/:id/reject', requireAuth, async (req, res) => {
    try {
      const actingUser = (req as any).user;
      const userRecord = await storage.getUser(actingUser?.id);
      if (!userRecord || !ADMIN_EMAILS.includes(userRecord.email ?? '')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event ID' });

      const { events: eventsTable } = await import('../shared/schema.js');
      await db
        .update(eventsTable)
        .set({ status: 'rejected' })
        .where(eq(eventsTable.id, eventId));

      res.json({ message: 'Event rejected.', eventId, status: 'rejected' });
    } catch (error) {
      console.error('[AdminEvents] Reject error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}
