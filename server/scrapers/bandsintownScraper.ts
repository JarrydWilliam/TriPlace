import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class BandsintownScraper {
  private readonly baseUrl = 'https://www.bandsintown.com';

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
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Search for concerts in the area
      const searchUrl = `${this.baseUrl}/concerts?location=${encodeURIComponent(location)}&radius=${radius}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract concert events
      $('.concert-card, .event-card, .concert-item').each((_, element) => {
        try {
          const $event = $(element);
          
          const title = $event.find('.artist-name, .event-title, .concert-title').first().text().trim();
          const venue = $event.find('.venue-name, .location, .venue').first().text().trim();
          const date = $event.find('.date, .event-date, .concert-date').first().text().trim();
          const time = $event.find('.time, .event-time').first().text().trim();
          
          if (title && venue) {
            const eventDate = this.parseEventDate(date, time);
            if (eventDate && eventDate > new Date()) {
              events.push({
                title: title,
                description: `Live music event featuring ${title}`,
                date: eventDate,
                location: venue,
                category: 'music',
                source: 'bandsintown',
                sourceUrl: this.baseUrl,
                organizerName: 'Bandsintown',
                attendeeCount: this.extractAttendeeCount($event)
              });
            }
          }
        } catch (error) {
          // Skip individual event parsing errors
        }
      });
      
      await browser.close();
      
    } catch (error) {
      throw new Error(`Bandsintown scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 20); // Limit to 20 events
  }

  private parseEventDate(dateStr: string, timeStr: string = ''): Date | null {
    try {
      const cleanDate = dateStr.replace(/[^\w\s,]/g, '').trim();
      const cleanTime = timeStr.replace(/[^\w\s:]/g, '').trim();
      
      const dateTimeStr = cleanTime ? `${cleanDate} ${cleanTime}` : cleanDate;
      const parsedDate = new Date(dateTimeStr);
      
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    } catch (error) {
      return null;
    }
  }

  private extractAttendeeCount(element: cheerio.Cheerio<any>): number {
    const attendeeText = element.find('.attendee-count, .interested, .going').first().text();
    const match = attendeeText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}