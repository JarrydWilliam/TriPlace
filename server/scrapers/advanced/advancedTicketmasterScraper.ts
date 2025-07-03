import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../../types/scraperTypes';

export class AdvancedTicketmasterScraper {
  private readonly baseUrl = 'https://www.ticketmaster.com';

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
      
      // Enhanced search with location and keywords
      const searchTerms = keywords.length > 0 ? keywords.join(' ') : 'concerts';
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(searchTerms)}&city=${encodeURIComponent(location)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for search results
      await page.waitForSelector('.event-card', { timeout: 10000 }).catch(() => {
        // Continue if selector not found
      });
      
      // Handle location popup if present
      const locationPopup = await page.$('button[data-testid="location-popup-dismiss"]');
      if (locationPopup) {
        await locationPopup.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Advanced event extraction
      this.extractEventsFromPage($, events, location);
      
      // Handle "View More" button for additional results
      const viewMoreButton = await page.$('button[data-testid="view-more-button"]');
      if (viewMoreButton && events.length < 20) {
        await viewMoreButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const moreContent = await page.content();
        const $more = cheerio.load(moreContent);
        this.extractEventsFromPage($more, events, location);
      }
      
      await browser.close();
      
    } catch (error) {
      throw new Error(`Advanced Ticketmaster scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 15); // Limit to 15 events
  }

  private extractEventsFromPage($: cheerio.CheerioAPI, events: ScrapedEvent[], location: string): void {
    // Multiple selector strategies for Ticketmaster layouts
    const selectors = [
      '.event-card',
      'article[data-testid="event-card"]',
      '.search-result-card',
      '[data-testid="event-listing"]',
      '.event-listing'
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
    // Enhanced title extraction
    const titleSelectors = [
      '.event-card-title',
      '[data-testid="event-name"]',
      '.event-name',
      'h3',
      'h2',
      '.title'
    ];

    let title = '';
    for (const selector of titleSelectors) {
      title = $element.find(selector).first().text().trim();
      if (title) break;
    }

    if (!title) return null;

    // Enhanced date extraction
    const dateSelectors = [
      '.event-date',
      '[data-testid="event-date"]',
      '.date-time',
      '.event-datetime',
      'time'
    ];

    let dateText = '';
    for (const selector of dateSelectors) {
      dateText = $element.find(selector).first().text().trim();
      if (dateText) break;
    }

    const eventDate = this.parseEventDate(dateText);
    if (!eventDate || eventDate <= new Date()) return null;

    // Enhanced venue extraction
    const venueSelectors = [
      '.event-venue',
      '[data-testid="venue-name"]',
      '.venue-name',
      '.location',
      '.venue'
    ];

    let venue = '';
    for (const selector of venueSelectors) {
      venue = $element.find(selector).first().text().trim();
      if (venue) break;
    }

    // Enhanced URL extraction
    const urlSelectors = [
      'a[href*="/event/"]',
      'a[data-testid="event-link"]',
      'a[href*="ticketmaster.com/event/"]',
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

    // Enhanced price extraction
    const priceSelectors = [
      '.event-price',
      '[data-testid="price-range"]',
      '.price-range',
      '.price',
      '.starting-price'
    ];

    let priceText = '';
    for (const selector of priceSelectors) {
      priceText = $element.find(selector).first().text().trim();
      if (priceText) break;
    }

    const price = this.parsePrice(priceText);

    // Enhanced artist/performer extraction
    const artistSelectors = [
      '.event-artist',
      '[data-testid="artist-name"]',
      '.artist-name',
      '.performer'
    ];

    let artist = '';
    for (const selector of artistSelectors) {
      artist = $element.find(selector).first().text().trim();
      if (artist) break;
    }

    return {
      title: this.cleanTitle(title),
      description: this.buildDescription(title, venue, artist, location),
      date: eventDate,
      location: venue || location,
      category: this.categorizeEvent(title, artist),
      source: 'ticketmaster',
      sourceUrl: eventUrl || this.baseUrl,
      organizerName: artist || 'Ticketmaster',
      price: price
    };
  }

  private parseEventDate(dateText: string): Date | null {
    if (!dateText) return null;

    // Enhanced date parsing for Ticketmaster formats
    const patterns = [
      // "Sat, Jan 25, 2025 8:00 PM"
      /(\w{3}),\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "January 25, 2025 • 8:00 PM"
      /(\w+)\s+(\d{1,2}),\s+(\d{4})\s+•\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Jan 25 • 8:00 PM"
      /(\w{3})\s+(\d{1,2})\s+•\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Tomorrow 8:00 PM"
      /tomorrow\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Today 8:00 PM"
      /today\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Sat Jan 25"
      /(\w{3})\s+(\w{3})\s+(\d{1,2})/i
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

  private parsePrice(priceText: string): number | null {
    if (!priceText) return null;

    // Extract starting price
    const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1]);
    }

    // Check for free events
    if (priceText.toLowerCase().includes('free')) {
      return 0;
    }

    return null;
  }

  private buildDescription(title: string, venue: string, artist: string, location: string): string {
    const parts = [];
    
    if (artist && artist !== title) {
      parts.push(`Featuring ${artist}`);
    }
    
    if (venue) {
      parts.push(`at ${venue}`);
    }
    
    parts.push(`in ${location}`);
    
    return parts.join(' ') || `Live entertainment event in ${location}`;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^\d+\.\s*/, '')
      .replace(/^-\s*/, '')
      .replace(/\s+\|\s+.*$/, '')
      .replace(/\s+$/, '')
      .trim();
  }

  private categorizeEvent(title: string, artist: string): string {
    const text = `${title} ${artist}`.toLowerCase();
    
    const categories = {
      'music': ['concert', 'tour', 'music', 'band', 'singer', 'orchestra', 'symphony', 'jazz', 'rock', 'pop'],
      'sports': ['game', 'match', 'championship', 'season', 'playoffs', 'tournament', 'league'],
      'theater': ['theater', 'theatre', 'play', 'musical', 'broadway', 'show', 'performance'],
      'comedy': ['comedy', 'comedian', 'stand-up', 'standup', 'funny', 'humor'],
      'family': ['family', 'kids', 'children', 'disney', 'circus', 'magic'],
      'dance': ['dance', 'ballet', 'contemporary', 'hip hop', 'ballroom'],
      'festivals': ['festival', 'fest', 'celebration', 'fair', 'expo']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'entertainment';
  }

  private validateEvent(event: ScrapedEvent): boolean {
    return !!(
      event.title &&
      event.date &&
      event.date > new Date() &&
      event.location &&
      event.title.length > 3 &&
      !event.title.toLowerCase().includes('test') &&
      !event.title.toLowerCase().includes('sample')
    );
  }
}