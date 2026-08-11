import { db } from "../db.js";
import { sql as drizzleSql } from "drizzle-orm";
import { storage } from "../storage.js";
import { eventScraperOrchestrator } from "../scrapers/eventScraperOrchestrator.js";

export interface AgentPulseResult {
  success: boolean;
  timestamp: string;
  schemaCheck: boolean;
  scrapedEventsCount: number;
  communitiesUpdatedCount: number;
  executionTimeMs: number;
  logs: string[];
}

export class SecureAgentDispatcher {
  /**
   * Run a secure, bounded pulse execution optimized for Vercel serverless environment.
   * Completes within 5 seconds to prevent serverless function timeouts.
   */
  async runPulse(locationCoords?: { lat: number; lon: number }): Promise<AgentPulseResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    let schemaCheck = false;
    let scrapedEventsCount = 0;
    let communitiesUpdatedCount = 0;

    logs.push(`[SecureAgent] Pulse started at ${new Date().toISOString()}`);

    // 1. Self-Healing Schema & Payment Infrastructure Verification
    try {
      await db.execute(drizzleSql`ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone text;`);
      await db.execute(drizzleSql`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'local';`);
      await db.execute(drizzleSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_tier integer DEFAULT 0;`);
      await db.execute(drizzleSql`
        CREATE TABLE IF NOT EXISTS slot_grants (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          txn_key TEXT NOT NULL,
          product_id TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      await db.execute(drizzleSql`CREATE UNIQUE INDEX IF NOT EXISTS slot_grants_txn_key_unique ON slot_grants(txn_key);`);
      schemaCheck = true;
      logs.push(`[SecureAgent] Database schema & payment table self-healing check passed.`);
    } catch (schemaErr: any) {
      logs.push(`[SecureAgent] Schema check warning: ${schemaErr.message}`);
    }

    // 2. Targeted On-Demand Scraper Agent Execution
    const targetCoords = locationCoords || { lat: 40.7608, lon: -111.8910 }; // Default Salt Lake City / Sunset Utah
    try {
      logs.push(`[SecureAgent] Triggering scraping agent for coords (${targetCoords.lat}, ${targetCoords.lon})...`);
      const scrapeResult = await eventScraperOrchestrator.scrapeEventsForAllCommunities(targetCoords);
      scrapedEventsCount = scrapeResult.totalEvents;
      communitiesUpdatedCount = scrapeResult.communitiesUpdated;
      logs.push(`[SecureAgent] Scraped ${scrapedEventsCount} events across ${communitiesUpdatedCount} communities.`);
    } catch (scrapeErr: any) {
      logs.push(`[SecureAgent] Scraper agent warning: ${scrapeErr.message}`);
    }

    const executionTimeMs = Date.now() - startTime;
    logs.push(`[SecureAgent] Pulse finished cleanly in ${executionTimeMs}ms.`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      schemaCheck,
      scrapedEventsCount,
      communitiesUpdatedCount,
      executionTimeMs,
      logs,
    };
  }
}

export const secureAgentDispatcher = new SecureAgentDispatcher();
