import { eventScraperOrchestrator } from "../scrapers/eventScraperOrchestrator.js";
import { calculateDistanceMiles, storage } from "../storage.js";
import { ScrapedEvent } from "../types/scraperTypes.js";
import { Event } from "@shared/schema";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
}

export class EventScraperAgent {
  private isSyncing = false;
  private lastSyncAt: Date | null = null;

  /**
   * Scrapes, validates, and persists public local events within user's geolocation radius.
   */
  async runLocationScrape(
    coords: LocationCoordinates,
    userId?: number
  ): Promise<{
    added: number;
    events: Event[];
    error?: string;
  }> {
    const radiusMiles = coords.radiusMiles || 50;

    try {
      this.isSyncing = true;
      const userLocation = { lat: coords.latitude, lon: coords.longitude };

      // Orchestrate multi-source public web scraping
      const orchestrateResult = await eventScraperOrchestrator.scrapeEventsForAllCommunities(userLocation);

      // Query database for location-confined upcoming events
      const localEvents = await storage.getEventsByLocation(
        String(coords.latitude),
        String(coords.longitude),
        radiusMiles,
        userId
      );

      this.lastSyncAt = new Date();
      this.isSyncing = false;

      return {
        added: orchestrateResult.totalEvents,
        events: localEvents,
      };
    } catch (error: any) {
      this.isSyncing = false;
      console.error("EventScraperAgent error:", error);
      return {
        added: 0,
        events: [],
        error: error.message || "Failed to execute location scrape",
      };
    }
  }

  /**
   * Status reporter for telemetry and moderation agent monitoring.
   */
  getAgentStatus() {
    return {
      agentName: "EventScraperAgent",
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
    };
  }
}

export const eventScraperAgent = new EventScraperAgent();
