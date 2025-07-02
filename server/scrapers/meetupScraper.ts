import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class MeetupScraper {
  private readonly baseUrl = 'https://www.meetup.com';

  async scrapeEvents(location: string, keywords: string[], radius: number = 25): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      for (const keyword of keywords) {
        const searchUrl = `${this.baseUrl}/find/events/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&distance=${radius}`;
        
        console.log(`Scraping Meetup: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for events to load
        await page.waitForSelector('[data-testid="event-card-wrapper"]', { timeout: 10000 }).catch(() => {
          console.log('No Meetup events found on this page');
        });
        
        const content = await page.content();
        const $ = cheerio.load(content);
        
        // Extract event data from Meetup's structure
        $('[data-testid="event-card-wrapper"], .event-listing').each((index, element) => {
          try {
            const $event = $(element);
            
            const title = $event.find('[data-testid="event-title"]').text().trim() ||
                         $event.find('h3').first().text().trim() ||
                         $event.find('.event-title').text().trim();
            
            const dateElement = $event.find('time').first().attr('datetime') ||
                               $event.find('[data-testid="event-time"]').text().trim() ||
                               $event.find('.event-time').text().trim();
            
            const locationElement = $event.find('[data-testid="event-location"]').text().trim() ||
                                  $event.find('.event-location').text().trim() ||
                                  $event.find('.venue-name').text().trim();
            
            const linkElement = $event.find('a').first().attr('href');
            const sourceUrl = linkElement?.startsWith('http') ? linkElement : `${this.baseUrl}${linkElement}`;
            
            const organizerElement = $event.find('[data-testid="group-name"]').text().trim() ||
                                   $event.find('.group-name').text().trim();
            
            const attendeeElement = $event.find('[data-testid="attendee-count"]').text().trim() ||
                                  $event.find('.attendee-count').text().trim();

            if (title && dateElement && locationElement) {
              const event: ScrapedEvent = {
                title,
                description: title,
                date: this.parseEventDate(dateElement),
                location: locationElement,
                category: keyword,
                sourceUrl: sourceUrl || '',
                organizerName: organizerElement || 'Meetup Group',
                price: 0, // Most Meetup events are free
                source: 'meetup',
                attendeeCount: this.parseAttendeeCount(attendeeElement)
              };
              
              events.push(event);
            }
          } catch (error) {
            console.error('Error parsing individual Meetup event:', error);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await browser.close();
      console.log(`Meetup scraper found ${events.length} events`);
      
    } catch (error) {
      console.error('Meetup scraper error:', error);
    }
    
    return events;
  }

  private parseEventDate(dateString: string): Date {
    try {
      if (dateString.includes('T')) {
        // ISO format
        return new Date(dateString);
      }
      
      const cleanDate = dateString.replace(/\s+/g, ' ').trim();
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date;
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

  private parseAttendeeCount(attendeeString: string): number | null {
    if (!attendeeString) return null;
    
    try {
      const match = attendeeString.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    } catch (error) {
      return null;
    }
  }
}