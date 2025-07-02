import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class TicketmasterScraper {
  private readonly baseUrl = 'https://www.ticketmaster.com';

  async scrapeEvents(location: string, keywords: string[], radius: number = 25): Promise<ScrapedEvent[]> {
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
      
      for (const keyword of keywords) {
        const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&radius=${radius}`;
        
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for search results
        await page.waitForSelector('[data-testid="search-result-card"]', { timeout: 10000 }).catch(() => {
        });
        
        const content = await page.content();
        const $ = cheerio.load(content);
        
        // Extract event data from Ticketmaster's structure
        $('[data-testid="search-result-card"], .search-result-card').each((index, element) => {
          try {
            const $event = $(element);
            
            const title = $event.find('[data-testid="event-name"]').text().trim() ||
                         $event.find('h3').first().text().trim() ||
                         $event.find('.event-name').text().trim() ||
                         $event.find('.artist-name').text().trim();
            
            const dateElement = $event.find('[data-testid="event-date"]').text().trim() ||
                               $event.find('.event-date').text().trim() ||
                               $event.find('time').first().text().trim();
            
            const locationElement = $event.find('[data-testid="venue-name"]').text().trim() ||
                                  $event.find('.venue-name').text().trim() ||
                                  $event.find('.location').text().trim();
            
            const linkElement = $event.find('a').first().attr('href');
            const sourceUrl = linkElement?.startsWith('http') ? linkElement : `${this.baseUrl}${linkElement}`;
            
            const priceElement = $event.find('[data-testid="price"]').text().trim() ||
                                $event.find('.price').text().trim() ||
                                $event.find('.starting-price').text().trim();
            
            const venueElement = $event.find('[data-testid="venue"]').text().trim() ||
                               $event.find('.venue').text().trim();

            if (title && dateElement && (locationElement || venueElement)) {
              const event: ScrapedEvent = {
                title,
                description: title,
                date: this.parseEventDate(dateElement),
                location: locationElement || venueElement || location,
                category: keyword,
                sourceUrl: sourceUrl || '',
                organizerName: 'Ticketmaster Event',
                price: this.parsePrice(priceElement),
                source: 'ticketmaster',
                attendeeCount: null
              };
              
              events.push(event);
            }
          } catch (error) {
            console.error('Error parsing individual Ticketmaster event:', error);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await browser.close();
      
    } catch (error) {
      console.error('Ticketmaster scraper error:', error);
    }
    
    return events;
  }

  private parseEventDate(dateString: string): Date {
    try {
      const cleanDate = dateString.replace(/\s+/g, ' ').trim();
      
      // Handle common Ticketmaster date formats
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try parsing formats like "Sat, Jan 15" with current year
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${cleanDate}, ${currentYear}`;
      const dateWithYearParsed = new Date(dateWithYear);
      if (!isNaN(dateWithYearParsed.getTime())) {
        return dateWithYearParsed;
      }
      
      // Fallback
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
      // Handle formats like "$25+", "From $50", "Starting at $30"
      const match = priceString.match(/\$?(\d+(?:\.\d{2})?)/);
      return match ? parseFloat(match[1]) : null;
    } catch (error) {
      return null;
    }
  }
}