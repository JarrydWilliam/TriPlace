/**
 * MeetupScraper
 *
 * Meetup.com deprecated all free API access in 2019 and requires OAuth2.
 * This scraper returns [] cleanly rather than attempting Puppeteer scraping
 * that reliably fails due to Cloudflare and login walls.
 *
 * If you have a Meetup API OAuth token, set MEETUP_API_KEY and implement
 * the GraphQL endpoint: https://www.meetup.com/api/guide/
 */
import { ScrapedEvent } from '../types/scraperTypes.js';

export class MeetupScraper {
  async scrapeEvents(_location: string, _keywords: string[], _radius: number = 50): Promise<ScrapedEvent[]> {
    // Meetup API requires OAuth2 — graceful no-op until credentials are configured.
    if (process.env.MEETUP_API_KEY) {
      console.log('MeetupScraper: MEETUP_API_KEY is set but OAuth2 flow is not yet implemented. Skipping.');
    }
    return [];
  }
}