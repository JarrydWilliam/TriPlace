import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../../types/scraperTypes';

export class AdvancedEventbriteScraper {
  private readonly baseUrl = 'https://www.eventbrite.com';

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
      const searchTerms = keywords.length > 0 ? keywords.join(' ') : 'events';
      const searchUrl = `${this.baseUrl}/d/${encodeURIComponent(location)}/events/?q=${encodeURIComponent(searchTerms)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for search results to load
      await page.waitForSelector('li.search-event-card', { timeout: 10000 }).catch(() => {
        // Continue if selector not found
      });
      
      // Handle cookie consent if present
      const cookieButton = await page.$('button[data-testid="cookie-consent-accept"]');
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Advanced event extraction
      this.extractEventsFromPage($, events, location);
      
      // Handle pagination - load more results
      const loadMoreButton = await page.$('button[data-testid="load-more-button"]');
      if (loadMoreButton && events.length < 20) {
        await loadMoreButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const moreContent = await page.content();
        const $more = cheerio.load(moreContent);
        this.extractEventsFromPage($more, events, location);
      }
      
      await browser.close();
      
    } catch (error) {
      throw new Error(`Advanced Eventbrite scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 15); // Limit to 15 events
  }

  private extractEventsFromPage($: cheerio.CheerioAPI, events: ScrapedEvent[], location: string): void {
    // Multiple selector strategies for different Eventbrite layouts
    const selectors = [
      'li.search-event-card',
      'article[data-testid="event-card"]',
      '.event-card',
      '[data-testid="organizer-event-card"]',
      '.eds-event-card'
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
    // Enhanced title extraction with multiple fallbacks
    const titleSelectors = [
      '.eds-media-card-content__title',
      '[data-testid="event-title"]',
      'h3.eds-event-card__title',
      '.event-card__title',
      'h2',
      'h3'
    ];

    let title = '';
    for (const selector of titleSelectors) {
      title = $element.find(selector).first().text().trim();
      if (title) break;
    }

    if (!title) return null;

    // Enhanced date extraction
    const dateSelectors = [
      '.eds-text-bs',
      '[data-testid="event-datetime"]',
      '.eds-event-card__formatted-date',
      '.event-card__date',
      'time'
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
      'a[href*="/e/"]',
      'a[data-testid="event-link"]',
      'a[href*="eventbrite.com/e/"]',
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
      '.eds-text-bm',
      '[data-testid="event-description"]',
      '.eds-event-card__description',
      '.event-card__description',
      'p'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      description = $element.find(selector).first().text().trim();
      if (description) break;
    }

    // Enhanced price extraction
    const priceSelectors = [
      '.eds-text-color--primary',
      '[data-testid="event-price"]',
      '.eds-event-card__price',
      '.event-card__price'
    ];

    let priceText = '';
    for (const selector of priceSelectors) {
      priceText = $element.find(selector).first().text().trim();
      if (priceText) break;
    }

    const price = this.parsePrice(priceText);

    // Enhanced organizer extraction
    const organizerSelectors = [
      '.eds-text-color--ui-orange',
      '[data-testid="organizer-name"]',
      '.eds-event-card__organizer',
      '.event-card__organizer'
    ];

    let organizer = '';
    for (const selector of organizerSelectors) {
      organizer = $element.find(selector).first().text().trim();
      if (organizer) break;
    }

    return {
      title: this.cleanTitle(title),
      description: description || `Professional event in ${location}`,
      date: eventDate,
      location: location,
      category: this.categorizeEvent(title, description),
      source: 'eventbrite',
      sourceUrl: eventUrl || this.baseUrl,
      organizerName: organizer || 'Eventbrite Organizer',
      price: price
    };
  }

  private parseEventDate(dateText: string): Date | null {
    if (!dateText) return null;

    // Enhanced date parsing for Eventbrite formats
    const patterns = [
      // "Sun, Dec 22, 2024 7:00 PM"
      /(\w{3}),\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "December 22, 2024 at 7:00 PM"
      /(\w+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Dec 22 • 7:00 PM"
      /(\w{3})\s+(\d{1,2})\s+•\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Tomorrow 7:00 PM"
      /tomorrow\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Today 7:00 PM"
      /today\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
      // "Sat, Dec 21"
      /(\w{3}),\s+(\w{3})\s+(\d{1,2})/i
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

    // Extract numeric price
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
      'business': ['business', 'professional', 'networking', 'conference', 'seminar', 'workshop'],
      'tech': ['tech', 'technology', 'coding', 'programming', 'developer', 'startup', 'ai', 'software'],
      'health': ['health', 'wellness', 'fitness', 'yoga', 'meditation', 'mental health'],
      'education': ['education', 'training', 'class', 'course', 'learning', 'certification'],
      'arts': ['art', 'creative', 'design', 'music', 'photography', 'writing', 'theater'],
      'food': ['food', 'cooking', 'culinary', 'wine', 'beer', 'dining', 'restaurant'],
      'charity': ['charity', 'fundraiser', 'nonprofit', 'volunteer', 'community service'],
      'entertainment': ['entertainment', 'comedy', 'show', 'performance', 'festival']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'business';
  }

  private validateEvent(event: ScrapedEvent): boolean {
    return !!(
      event.title &&
      event.date &&
      event.date > new Date() &&
      event.location &&
      event.title.length > 5 &&
      !event.title.toLowerCase().includes('test')
    );
  }
}