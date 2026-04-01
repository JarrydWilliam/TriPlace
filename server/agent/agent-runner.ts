/**
 * AgentRunner — Orchestrates the full background intelligence pipeline.
 * Scheduled every 30 minutes using node-cron.
 * Also exposes runAgentForUser(userId) for on-demand triggering.
 */

import cron from "node-cron";
import { db } from "../db";
import { users } from "@shared/schema";
import { interestLearner } from "./interest-learner";
import { localActivityScanner } from "./local-activity-scanner";
import { preferenceUpdater } from "./preference-updater";
import { matchOptimizer } from "./match-optimizer";
import { storage } from "../storage";
import { gt } from "drizzle-orm";

let isRunning = false;

export interface AgentRunSummary {
  userId: number;
  status: "completed" | "skipped" | "failed";
  added?: string[];
  trendingTopics?: number;
  communityRefreshTriggered?: boolean;
  error?: string;
}

/**
 * Run the full intelligence pipeline for a single user.
 */
export async function runAgentForUser(userId: number): Promise<AgentRunSummary> {
  let learned: any[] = [];
  let trending: any[] = [];
  let topEvents: any[] = [];
  let errorLog: string[] = [];

  try {
    // Fetch user location
    const allUsers = await db.select().from(users);
    const targetUser = allUsers.find(u => u.id === userId);

    if (!targetUser) return { userId, status: "skipped", error: "User not found" };
    if (!targetUser.latitude || !targetUser.longitude) return { userId, status: "skipped", error: "No location data" };

    const userLat = parseFloat(targetUser.latitude);
    const userLon = parseFloat(targetUser.longitude);

    // Step 1: Learn from engagement history (Robust)
    try {
      learned = await interestLearner.learnInterests(userId);
    } catch (e) {
      console.error(`[Agent] Interest learning failed for ${userId}:`, e);
      errorLog.push("Interest learning failed");
    }

    // Step 2: Scan local activity (Robust)
    try {
      trending = await localActivityScanner.scanLocalActivity(userLat, userLon, 50);
    } catch (e) {
      console.error(`[Agent] Local scan failed for ${userId}:`, e);
      errorLog.push("Local scan failed");
    }

    // Step 3: Social Event Matching (Robust + Guaranteed Items)
    try {
      const allEvents = await storage.getUpcomingEvents();
      const recommendedEvents = [];
      const dist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 3959; // miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      };

      for (const event of allEvents) {
        if (!event.latitude || !event.longitude) continue;
        const d = dist(userLat, userLon, parseFloat(event.latitude), parseFloat(event.longitude));
        
        // Primary Filter: 50 mile radius
        if (d > 50) continue;

        try {
          const prediction = await matchOptimizer.predictEventSocialValue(userId, event.id);
          if (prediction.matchCount > 0) {
            recommendedEvents.push({
              ...prediction,
              reason: `Connect with ${prediction.matchCount} compatible members`
            });
          } else {
             // Low match but still valid candidate for fallback
             recommendedEvents.push({
               ...prediction,
               totalMatchStrength: 0.1, // Low base score
               reason: "Popular in your area"
             });
          }
        } catch (err) {
           // If match optimizer fails for one event, just skip it
        }
      }

      // Sort by match strength
      recommendedEvents.sort((a, b) => b.totalMatchStrength - a.totalMatchStrength);
      topEvents = recommendedEvents.slice(0, 5);

      // FALLBACK: If absolutely no events found (e.g. strict radius), try wider radius
      if (topEvents.length === 0) {
        // Just grab nearest 3 events regardless of 50 mile limit (up to 500 miles)
        const nearby = allEvents
          .map(e => ({ ...e, dist: dist(userLat, userLon, parseFloat(e.latitude!), parseFloat(e.longitude!)) }))
          .filter(e => e.dist < 500)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);
        
        topEvents = nearby.map(e => ({
          eventId: e.id,
          matchCount: 0,
          totalMatchStrength: 0,
          topSharedInterests: [],
          reason: "Nearest available event"
        }));
      }

    } catch (e) {
      console.error(`[Agent] Matching failed for ${userId}:`, e);
      errorLog.push("Event matching failed");
    }

    // Step 4: Update preferences (Robust)
    // Run this even if previous steps partially failed, to log what we have
    const result = await preferenceUpdater.updatePreferences(userId, learned, trending, topEvents);

    console.log(
      `[Agent] User ${userId}: Success` + 
      (errorLog.length ? ` (with errors: ${errorLog.join(", ")})` : "")
    );

    return {
      userId,
      status: errorLog.length > 0 ? "completed" : "completed", // Still completed, just partial
      added: result.added,
      trendingTopics: trending.length,
      communityRefreshTriggered: result.communityRefreshTriggered,
      error: errorLog.length > 0 ? errorLog.join("; ") : undefined
    };

  } catch (fatalError) {
    console.error(`[Agent] FETAL error for user ${userId}:`, fatalError);
    return { userId, status: "failed", error: String(fatalError) };
  }
}

/**
 * Run the agent pipeline for ALL active users (last active within 7 days).
 */
async function runAgentForAllUsers(): Promise<void> {
  if (isRunning) {
    console.log("[Agent] Previous run still in progress, skipping.");
    return;
  }

  isRunning = true;
  console.log("[Agent] Starting scheduled run...");

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(gt(users.lastActiveAt, sevenDaysAgo));

    console.log(`[Agent] Processing ${activeUsers.length} active users`);

    // Process in batches of 5 to be gentle on DB
    const batchSize = 5;
    for (let i = 0; i < activeUsers.length; i += batchSize) {
      const batch = activeUsers.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(u => runAgentForUser(u.id)));

      // Brief pause between batches
      if (i + batchSize < activeUsers.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log("[Agent] Scheduled run complete.");
  } catch (err) {
    console.error("[Agent] Scheduled run failed:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the background agent scheduler.
 * Call once from server/index.ts at startup.
 */
import { communityMonitor } from "./community-monitor";

// ... existing code ...

export function startAgentScheduler(): void {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", runAgentForAllUsers);
  
  // Run Community Health Monitor every day at 3 AM
  cron.schedule("0 3 * * *", async () => {
    console.log("[Agent] Running Community Health Monitor...");
    const reports = await communityMonitor.scanCommunityHealth();
    console.log(`[Agent] Found ${reports.length} communities needing attention.`);
    // In a real app, we'd act on these reports (e.g., alert admins or auto-post)
  });

  console.log("[Agent] Background intelligence scheduler started (User: 30m, Community: Daily)");

  // Also run once on startup after 60 seconds (let server fully boot first)
  setTimeout(runAgentForAllUsers, 60_000);
}

export const agentRunner = { runAgentForUser, startAgentScheduler };
