import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../../types/scraperTypes';

export class AdvancedMeetupScraper {
  private readonly baseUrl = 'https://www.meetup.com';

  async scrapeEvents(location: string, keywords: string[], radius: number = 50): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      // Enhanced location-based search
      const searchUrl = `${this.baseUrl}/find/?location=${encodeURIComponent(location)}&source=EVENTS`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for dynamic content to load
      await page.waitForSelector('div[data-testid="event-card"]', { timeout: 10000 }).catch(() => {
        // Continue if selector not found
      });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Advanced event extraction with multiple selectors
      this.extractEventsFromPage($, events, location);
      
      // Handle pagination if exists
      const hasNextPage = await page.$('button[aria-label="Next"]');
      if (hasNextPage && events.length < 20) {
        await page.click('button[aria-label="Next"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const nextContent = await page.content();
        const $next = cheerio.load(nextContent);
        this.extractEventsFromPage($next, events, location);
      }
      
      await browser.close();
      
    } catch (error) {
      throw new Error(`Advanced Meetup scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 15); // Limit to 15 events
  }

  private extractEventsFromPage($: cheerio.CheerioAPI, events: ScrapedEvent[], location: string): void {
    // Multiple selector strategies for different page layouts
    const selectors = [
      'div[data-testid="event-card"]',
      'a.event-listing',
      '.event-card',
      '[data-event-id]',
      '.ds-event-card'
    ];

    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        try {
          const $element = $(element);
          const event = this.extractEventData($element, location);
          if (event && this.validateEvent(event)) {
            events.push(event);
          }
        } catch (error) {
          // Skip individual extraction errors
        }
      });
    });
  }

  private extractEventData($element: cheerio.Cheerio<any>, location: string): ScrapedEvent | null {
    // Enhanced title extraction with fallbacks
    const titleSelectors = [
      '.event-card__title',
      '[data-testid="event-title"]',
      'h3',
      '.ds-event-card__title',
      'a[href*="/events/"]'
    ];

    let title = '';
    for (const selector of titleSelectors) {
      title = $element.find(selector).first().text().trim();
      if (title) break;
    }

    if (!title) return null;

    // Enhanced date extraction
    const dateSelectors = [
      '.event-card__meta',
      '[data-testid="event-datetime"]',
      '.ds-event-card__meta-item',
      '.event-card__time'
    ];

    let dateText = '';
    for (const selector of dateSelectors) {
      dateText = $element.find(selector).first().text().trim();
      if (dateText) break;
    }

    const eventDate = this.parseEventDate(dateText);
    if (!eventDate || eventDate <= new Date()) return null;

    // Enhanced URL extraction
    const urlSelectors = [
      'a[href*="/events/"]',
      'a[data-event-id]',
      'a'
    ];

    let eventUrl = '';
    for (const selector of urlSelectors) {
      const href = $element.find(selector).first().attr('href');
      if (href) {
        eventUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        break;
      }
    }

    // Enhanced description extraction
    const descriptionSelectors = [
      '.event-card__description',
      '[data-testid="event-description"]',
      '.ds-event-card__description',
      'p'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      description = $element.find(selector).first().text().trim();
      if (description) break;
    }

    return {
      title: this.cleanTitle(title),
      description: description || `Meetup event in ${location}`,
      date: eventDate,
      location: location,
      category: this.categorizeEvent(title, description),
      source: 'meetup',
      sourceUrl: eventUrl || this.baseUrl,
      organizerName: 'Meetup'
    };
  }

  private parseEventDate(dateText: string): Date | null {
    if (!dateText) return null;

    // Enhanced date parsing patterns
    const patterns = [
      // "Mon, Dec 23, 2024 at 7:00 PM"
      /(\w{3}),\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "December 23, 2024 • 7:00 PM"
      /(\w+)\s+(\d{1,2}),\s+(\d{4})\s+•\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Dec 23 • 7:00 PM"
      /(\w{3})\s+(\d{1,2})\s+•\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Tomorrow at 7:00 PM"
      /tomorrow\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Today at 7:00 PM"
      /today\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i
    ];

    for (const pattern of patterns) {
      const match = dateText.match(pattern);
      if (match) {
        try {
          if (dateText.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const hour = parseInt(match[1]);
            const minute = parseInt(match[2]);
            const isPM = match[3].toUpperCase() === 'PM';
            tomorrow.setHours(isPM && hour !== 12 ? hour + 12 : hour, minute, 0, 0);
            return tomorrow;
          } else if (dateText.toLowerCase().includes('today')) {
            const today = new Date();
            const hour = parseInt(match[1]);
            const minute = parseInt(match[2]);
            const isPM = match[3].toUpperCase() === 'PM';
            today.setHours(isPM && hour !== 12 ? hour + 12 : hour, minute, 0, 0);
            return today;
          }
          
          const parsedDate = new Date(dateText);
          return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
          continue;
        }
      }
    }

    // Fallback to simple date parsing
    try {
      const parsed = new Date(dateText);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^\d+\.\s*/, '')
      .replace(/^-\s*/, '')
      .replace(/\s+\|\s+.*$/, '')
      .replace(/\s+$/, '')
      .trim();
  }

  private categorizeEvent(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    const categories = {
      'tech': ['tech', 'technology', 'coding', 'programming', 'developer', 'startup', 'ai', 'software'],
      'networking': ['networking', 'professional', 'career', 'business', 'entrepreneur'],
      'fitness': ['fitness', 'yoga', 'workout', 'health', 'running', 'cycling', 'gym'],
      'social': ['social', 'meetup', 'drinks', 'coffee', 'happy hour', 'party'],
      'education': ['workshop', 'class', 'training', 'seminar', 'conference', 'learning'],
      'arts': ['art', 'creative', 'design', 'music', 'photography', 'writing'],
      'food': ['food', 'cooking', 'restaurant', 'wine', 'beer', 'dining'],
      'outdoor': ['hiking', 'outdoor', 'nature', 'camping', 'climbing', 'adventure']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'social';
  }

  private validateEvent(event: ScrapedEvent): boolean {
    return !!(
      event.title &&
      event.date &&
      event.date > new Date() &&
      event.location &&
      event.title.length > 3
    );
  }
}