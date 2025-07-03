import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class GoogleThingsToDoScraper {
  private readonly baseUrl = 'https://www.google.com';

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
      
      // Search for things to do in the area
      const queries = [
        `things to do ${location}`,
        `events ${location}`,
        `activities ${location}`,
        ...keywords.map(keyword => `${keyword} events ${location}`)
      ];
      
      for (const query of queries.slice(0, 3)) { // Limit to 3 queries
        try {
          const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&tbm=&tbs=`;
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          const content = await page.content();
          const $ = cheerio.load(content);
          
          // Extract events from Google search results
          this.extractEventsFromResults($, location, events);
          
          // Small delay between searches
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Continue with next query if one fails
        }
      }
      
      await browser.close();
      
    } catch (error) {
      throw new Error(`Google Things to Do scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 10); // Limit to 10 events
  }

  private extractEventsFromResults($: cheerio.CheerioAPI, location: string, events: ScrapedEvent[]): void {
    // Extract from various Google result structures
    const selectors = [
      '.g', // Standard search results
      '[data-content-feature]', // Featured content
      '.commercial-unit-desktop-top', // Ads (often contain events)
      '.knowledge-panel'
    ];

    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        try {
          const $element = $(element);
          const title = this.extractTitle($element);
          const description = this.extractDescription($element);
          const link = this.extractLink($element);
          
          if (title && this.isEventRelated(title, description)) {
            const eventDate = this.extractDate(title, description);
            if (eventDate && eventDate > new Date()) {
              events.push({
                title: this.cleanTitle(title),
                description: description || `Things to do in ${location}`,
                date: eventDate,
                location: location,
                category: this.categorizeEvent(title, description),
                source: 'google',
                sourceUrl: link || this.baseUrl,
                organizerName: 'Google Things to Do'
              });
            }
          }
        } catch (error) {
          // Skip individual extraction errors
        }
      });
    });
  }

  private extractTitle($element: cheerio.Cheerio<any>): string {
    const titleSelectors = [
      'h3',
      '.LC20lb',
      '[role="heading"]',
      '.title',
      'a[ping]'
    ];

    for (const selector of titleSelectors) {
      const title = $element.find(selector).first().text().trim();
      if (title) return title;
    }

    return '';
  }

  private extractDescription($element: cheerio.Cheerio<any>): string {
    const descSelectors = [
      '.VwiC3b',
      '.IsZvec',
      '.aCOpRe',
      '.s3v9rd',
      '.st'
    ];

    for (const selector of descSelectors) {
      const desc = $element.find(selector).first().text().trim();
      if (desc) return desc.substring(0, 200);
    }

    return '';
  }

  private extractLink($element: cheerio.Cheerio<any>): string {
    const link = $element.find('a').first().attr('href');
    if (link && link.startsWith('/url?q=')) {
      // Extract actual URL from Google redirect
      const match = link.match(/\/url\?q=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : link;
    }
    return link || '';
  }

  private isEventRelated(title: string, description: string): boolean {
    const eventKeywords = [
      'event', 'festival', 'concert', 'show', 'exhibition', 'fair',
      'workshop', 'class', 'seminar', 'conference', 'meetup',
      'happening', 'celebration', 'gathering', 'activity',
      'things to do', 'attractions', 'visit', 'experience'
    ];

    const text = `${title} ${description}`.toLowerCase();
    return eventKeywords.some(keyword => text.includes(keyword));
  }

  private extractDate(title: string, description: string): Date | null {
    const text = `${title} ${description}`;
    
    // Look for date patterns
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i,
      /(today|tonight|tomorrow|this weekend|next week)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let dateStr = match[0];
          
          // Handle relative dates
          if (dateStr.toLowerCase().includes('today') || dateStr.toLowerCase().includes('tonight')) {
            return new Date();
          } else if (dateStr.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          } else if (dateStr.toLowerCase().includes('weekend')) {
            const weekend = new Date();
            weekend.setDate(weekend.getDate() + (6 - weekend.getDay()));
            return weekend;
          }
          
          const parsedDate = new Date(dateStr);
          return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
          continue;
        }
      }
    }
    
    // Default to upcoming events (next week)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/^-\s*/, '') // Remove leading dash
      .replace(/\s+\|\s+.*$/, '') // Remove site name after pipe
      .trim();
  }

  private categorizeEvent(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('music') || text.includes('concert') || text.includes('band')) return 'music';
    if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) return 'food';
    if (text.includes('art') || text.includes('gallery') || text.includes('museum')) return 'arts';
    if (text.includes('tech') || text.includes('technology') || text.includes('startup')) return 'tech';
    if (text.includes('fitness') || text.includes('sports') || text.includes('gym')) return 'fitness';
    if (text.includes('outdoor') || text.includes('nature') || text.includes('park')) return 'outdoor';
    if (text.includes('workshop') || text.includes('class') || text.includes('learn')) return 'education';
    
    return 'social';
  }
}