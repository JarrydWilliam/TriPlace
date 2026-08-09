import { ScrapedEvent } from '../types/scraperTypes.js';

export class BandsintownScraper {
  async scrapeEvents(location: string, keywords: string[], radius: number = 50): Promise<ScrapedEvent[]> {
    console.log('BandsintownScraper: using Luma for music events (requires lat/lon — delegated to InstagramScraper/LocalEventsScraper)');
    return [];
  }
}