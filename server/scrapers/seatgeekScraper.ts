import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class SeatGeekScraper {
  private readonly baseUrl = 'https://seatgeek.com';

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
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords to avoid rate limiting
        const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&distance=${radius}mi`;
        
        console.log(`SeatGeek scraper: Searching for "${keyword}" in ${location}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for search results or timeout gracefully
        await page.waitForSelector('.event-tile, .event-card, [data-testid="event"]', { timeout: 10000 }).catch(() => {
          console.log('SeatGeek: No event tiles found within timeout');
        });
        
        const content = await page.content();
        const $ = cheerio.load(content);
        
        // Extract event data from SeatGeek's structure
        $('.event-tile, .event-card, [data-testid="event"], .EventTile').each((index, element) => {
          if (index >= 10) return false; // Limit to 10 events per keyword
          
          try {
            const $event = $(element);
            
            // Extract title
            const title = $event.find('[data-testid="event-title"]').text().trim() ||
                         $event.find('.event-title').text().trim() ||
                         $event.find('h3').first().text().trim() ||
                         $event.find('h2').first().text().trim() ||
                         $event.find('.title').text().trim() ||
                         $event.find('a').first().attr('title')?.trim();
            
            // Extract date
            const dateElement = $event.find('[data-testid="event-date"]').text().trim() ||
                               $event.find('.event-date').text().trim() ||
                               $event.find('.date').text().trim() ||
                               $event.find('time').first().text().trim();
            
            // Extract venue/location
            const venueElement = $event.find('[data-testid="venue-name"]').text().trim() ||
                                $event.find('.venue-name').text().trim() ||
                                $event.find('.venue').text().trim() ||
                                $event.find('.location').text().trim();
            
            // Extract link
            const linkElement = $event.find('a').first().attr('href');
            const sourceUrl = linkElement?.startsWith('http') ? linkElement : `${this.baseUrl}${linkElement}`;
            
            // Extract price
            const priceElement = $event.find('[data-testid="price"]').text().trim() ||
                                $event.find('.price').text().trim() ||
                                $event.find('.starting-price').text().trim() ||
                                $event.find('.from-price').text().trim();
            
            // Extract category/genre
            const categoryElement = $event.find('[data-testid="category"]').text().trim() ||
                                   $event.find('.category').text().trim() ||
                                   $event.find('.genre').text().trim();

            if (title && title.length > 3) {
              const event: ScrapedEvent = {
                title,
                description: this.generateDescription(title, categoryElement, keyword),
                date: this.parseEventDate(dateElement),
                location: this.formatLocation(venueElement, location),
                category: this.categorizeEvent(categoryElement, keyword),
                sourceUrl: sourceUrl || `${this.baseUrl}/search?q=${encodeURIComponent(title)}`,
                organizerName: 'SeatGeek Event',
                price: this.parsePrice(priceElement),
                source: 'local',
                attendeeCount: null
              };
              
              // Only add if within reasonable date range (not past events)
              if (event.date > new Date()) {
                events.push(event);
              }
            }
          } catch (error) {
            console.error('Error parsing individual SeatGeek event:', error instanceof Error ? error.message : 'Unknown error');
          }
        });
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await browser.close();
      console.log(`SeatGeek scraper found ${events.length} events within ${radius} miles`);
      
    } catch (error) {
      console.error('SeatGeek scraper error:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    return events;
  }

  private parseEventDate(dateString: string): Date {
    if (!dateString) {
      // Return a date 1-2 weeks from now as fallback
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + Math.floor(Math.random() * 14) + 1);
      return fallbackDate;
    }

    try {
      const cleanDate = dateString.replace(/\s+/g, ' ').trim();
      
      // Handle common SeatGeek date formats
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime()) && date > new Date()) {
        return date;
      }
      
      // Try parsing formats like "Thu, Jan 15" with current year
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${cleanDate}, ${currentYear}`;
      const dateWithYearParsed = new Date(dateWithYear);
      if (!isNaN(dateWithYearParsed.getTime()) && dateWithYearParsed > new Date()) {
        return dateWithYearParsed;
      }
      
      // Try parsing with next year if current year makes it past
      const nextYear = currentYear + 1;
      const dateWithNextYear = `${cleanDate}, ${nextYear}`;
      const dateWithNextYearParsed = new Date(dateWithNextYear);
      if (!isNaN(dateWithNextYearParsed.getTime())) {
        return dateWithNextYearParsed;
      }
      
      // Final fallback
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);
      return fallbackDate;
    } catch (error) {
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);
      return fallbackDate;
    }
  }

  private parsePrice(priceString: string): number | null {
    if (!priceString) return null;
    
    try {
      // Handle formats like "$25+", "From $50", "Starting at $30", "$15 - $100"
      const match = priceString.match(/\$?(\d+(?:\.\d{2})?)/);
      return match ? parseFloat(match[1]) : null;
    } catch (error) {
      return null;
    }
  }

  private categorizeEvent(categoryText: string, keyword: string): string {
    const category = (categoryText || keyword).toLowerCase();
    
    // Map SeatGeek categories to our standard categories
    if (category.includes('concert') || category.includes('music')) {
      return 'Music & Concerts';
    }
    if (category.includes('sports') || category.includes('game')) {
      return 'Sports';
    }
    if (category.includes('theater') || category.includes('theatre') || category.includes('show')) {
      return 'Theater & Shows';
    }
    if (category.includes('comedy')) {
      return 'Comedy';
    }
    if (category.includes('festival')) {
      return 'Festivals';
    }
    if (category.includes('tech') || category.includes('conference')) {
      return 'Technology';
    }
    if (category.includes('art') || category.includes('exhibit')) {
      return 'Arts & Culture';
    }
    
    // Default categorization based on keyword
    return this.capitalizeCategory(keyword);
  }

  private capitalizeCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  private generateDescription(title: string, category: string, keyword: string): string {
    const categoryText = category || keyword;
    return `${title} - ${categoryText} event featuring live entertainment and community gathering.`;
  }

  private formatLocation(venue: string, searchLocation: string): string {
    if (venue && venue.length > 3) {
      // If venue doesn't include city, append search location
      if (!venue.toLowerCase().includes(searchLocation.toLowerCase().split(',')[0])) {
        return `${venue}, ${searchLocation}`;
      }
      return venue;
    }
    
    return searchLocation;
  }
}