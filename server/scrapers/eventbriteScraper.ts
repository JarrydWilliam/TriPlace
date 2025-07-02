import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class EventbriteScraper {
  private readonly baseUrl = 'https://www.eventbrite.com';
  private readonly searchUrl = 'https://www.eventbrite.com/d';

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
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      for (const keyword of keywords) {
        const searchQuery = `${keyword} events`;
        const url = `${this.searchUrl}/${encodeURIComponent(location)}/${encodeURIComponent(searchQuery)}/?distance=${radius}mi`;
        
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for events to load
        await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 }).catch(() => {
        });
        
        const content = await page.content();
        const $ = cheerio.load(content);
        
        // Extract event data from Eventbrite's structure
        $('[data-testid="event-card"]').each((index, element) => {
          try {
            const $event = $(element);
            
            const title = $event.find('[data-testid="event-title"]').text().trim() ||
                         $event.find('h3').first().text().trim() ||
                         $event.find('.event-card__title').text().trim();
            
            const dateElement = $event.find('[data-testid="event-date"]').text().trim() ||
                               $event.find('.event-card__date').text().trim() ||
                               $event.find('time').text().trim();
            
            const locationElement = $event.find('[data-testid="event-location"]').text().trim() ||
                                  $event.find('.event-card__location').text().trim() ||
                                  $event.find('.location').text().trim();
            
            const linkElement = $event.find('a').first().attr('href');
            const sourceUrl = linkElement?.startsWith('http') ? linkElement : `${this.baseUrl}${linkElement}`;
            
            const priceElement = $event.find('.event-card__price').text().trim() ||
                                $event.find('[data-testid="event-price"]').text().trim();
            
            const organizerElement = $event.find('.event-card__organizer').text().trim() ||
                                   $event.find('[data-testid="event-organizer"]').text().trim();

            if (title && dateElement && locationElement) {
              const event: ScrapedEvent = {
                title,
                description: title, // Use title as description fallback
                date: this.parseEventDate(dateElement),
                location: locationElement,
                category: keyword,
                sourceUrl: sourceUrl || '',
                organizerName: organizerElement || 'Eventbrite Event',
                price: this.parsePrice(priceElement),
                source: 'eventbrite',
                attendeeCount: null
              };
              
              events.push(event);
            }
          } catch (error) {
            console.error('Error parsing individual event:', error);
          }
        });
        
        // Add small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await browser.close();
      
    } catch (error) {
      console.error('Eventbrite scraper error:', error);
    }
    
    return events;
  }

  private parseEventDate(dateString: string): Date {
    try {
      // Handle various date formats from Eventbrite
      const cleanDate = dateString.replace(/\s+/g, ' ').trim();
      
      // Try to parse common formats
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Fallback to current date + 7 days if parsing fails
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);
      return fallbackDate;
    } catch (error) {
      console.error('Date parsing error:', error);
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);
      return fallbackDate;
    }
  }

  private parsePrice(priceString: string): number | null {
    if (!priceString) return null;
    
    try {
      const match = priceString.match(/\$?(\d+(?:\.\d{2})?)/);
      return match ? parseFloat(match[1]) : null;
    } catch (error) {
      return null;
    }
  }
}