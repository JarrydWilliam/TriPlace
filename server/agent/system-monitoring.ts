import { db } from "../db";
import { users, events, communities, posts } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "../vite";

/**
 * SystemMonitoringAgent
 * Periodically scans the database for anomalies (e.g. failed scraped events, 
 * sudden drop in active users, empty communities) and logs them.
 * In a fully production system, this could send an email or Slack alert.
 */
export class SystemMonitoringAgent {
  async runAudit() {
    try {
      log("[SystemMonitoringAgent] Starting system audit...");
      
      // 1. Check for Events missing dates or locations (Scraper failures)
      const invalidEvents = await db.select({ count: sql<number>`count(*)` })
        .from(events)
        .where(sql`${events.date} IS NULL OR ${events.location} IS NULL`);
        
      const invalidCount = Number(invalidEvents[0]?.count || 0);
      if (invalidCount > 0) {
        log(`[SystemMonitoringAgent] WARNING: Found ${invalidCount} events with missing date or location.`);
      }

      // 2. Check for empty communities
      const emptyCommunities = await db.select({ count: sql<number>`count(*)` })
        .from(communities)
        .where(sql`${communities.memberCount} = 0`);
        
      const emptyCount = Number(emptyCommunities[0]?.count || 0);
      if (emptyCount > 0) {
        log(`[SystemMonitoringAgent] INFO: Found ${emptyCount} empty communities.`);
      }

      // 3. User growth summary
      const newUsers24h = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} > NOW() - INTERVAL '1 day'`);
      
      log(`[SystemMonitoringAgent] INFO: ${Number(newUsers24h[0]?.count || 0)} new users in the last 24 hours.`);

      log("[SystemMonitoringAgent] System audit complete.");
    } catch (error) {
      log(`[SystemMonitoringAgent] ERROR during audit: ${error}`);
    }
  }
}
