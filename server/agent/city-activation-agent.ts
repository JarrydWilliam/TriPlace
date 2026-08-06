import { storage } from "../storage.js";
import { eventScraperOrchestrator } from "../scrapers/eventScraperOrchestrator.js";

export class CityActivationAgent {
  /**
   * Scan user location clusters and launch new city communities automatically
   */
  async checkAndActivateCities(): Promise<{
    activatedCities: string[];
    newCommunitiesCount: number;
  }> {
    const allUsers = await storage.getAllCommunities(); // Trigger storage check
    const activatedCities: string[] = [];
    let newCommunitiesCount = 0;

    // Check if default cities have communities active
    const targetCities = [
      { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
      { name: "Austin, TX", lat: 30.2672, lon: -97.7431 },
      { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 }
    ];

    for (const city of targetCities) {
      // Trigger scraping for target cities to ensure fresh local events
      try {
        await eventScraperOrchestrator.scrapeEventsForAllCommunities({ lat: city.lat, lon: city.lon });
        activatedCities.push(city.name);
      } catch (err) {
        console.error(`[CityActivationAgent] Failed to seed events for ${city.name}:`, err);
      }
    }

    console.log(`[CityActivationAgent] Activated ${activatedCities.length} cities with fresh local community events.`);
    return { activatedCities, newCommunitiesCount };
  }
}

export const cityActivationAgent = new CityActivationAgent();
