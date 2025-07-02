import puppeteer from 'puppeteer';
import { ScrapedEvent } from '../types/scraperTypes';

export class InstagramScraper {
  
  async scrapeEvents(searchQuery: string, location: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Instagram requires authentication for most content
      // Using public hashtag search as a starting point
      const hashtag = searchQuery.toLowerCase().replace(/\s+/g, '');
      const url = `https://www.instagram.com/explore/tags/${hashtag}/`;
      
      console.log(`Scraping Instagram hashtag: #${hashtag}`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Set user agent to appear as regular browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract posts that might contain event information
      const posts = await page.evaluate(() => {
        const postElements = document.querySelectorAll('article a[href*="/p/"]');
        const results: Array<{
          link: string;
          image: string;
          altText: string;
        }> = [];
        
        postElements.forEach((element, index) => {
          if (index < 10) { // Limit to first 10 posts
            const link = element.getAttribute('href') || '';
            const img = element.querySelector('img');
            const altText = img?.getAttribute('alt') || '';
            const imageSrc = img?.getAttribute('src') || '';
            
            if (altText && (
              altText.toLowerCase().includes('event') ||
              altText.toLowerCase().includes('meetup') ||
              altText.toLowerCase().includes('workshop') ||
              altText.toLowerCase().includes('conference') ||
              altText.toLowerCase().includes('gathering')
            )) {
              results.push({
                link: `https://www.instagram.com${link}`,
                image: imageSrc,
                altText
              });
            }
          }
        });
        
        return results;
      });
      
      // Process found posts into events
      for (const post of posts) {
        const event = this.parsePostIntoEvent(post, searchQuery, location);
        if (event) {
          events.push(event);
        }
      }
      
      await browser.close();
      
      console.log(`Instagram scraper found ${events.length} potential events`);
      
    } catch (error) {
      console.log(`Instagram scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return empty array on error - don't crash the system
    }
    
    return events;
  }
  
  private parsePostIntoEvent(post: any, searchQuery: string, location: { lat: number, lon: number }): ScrapedEvent | null {
    try {
      // Extract potential event information from Instagram post
      const title = this.extractEventTitle(post.altText);
      const description = post.altText;
      
      if (!title || title.length < 5) {
        return null;
      }
      
      // Estimate date (Instagram posts don't always have clear dates)
      const estimatedDate = this.estimateEventDate(post.altText);
      
      return {
        title,
        description,
        date: estimatedDate,
        location: this.extractLocation(post.altText, location),
        category: this.categorizeEvent(post.altText, searchQuery),
        source: 'instagram',
        sourceUrl: post.link,
        organizerName: 'Instagram Event',
        imageUrl: post.image,
        attendeeCount: this.estimateAttendeeCount(post.altText)
      };
      
    } catch (error) {
      console.log(`Error parsing Instagram post: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  private extractEventTitle(altText: string): string {
    // Extract likely event title from alt text
    const sentences = altText.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const cleaned = sentence.trim();
      if (cleaned.length > 10 && cleaned.length < 100) {
        // Look for event-like phrases
        if (cleaned.toLowerCase().includes('event') ||
            cleaned.toLowerCase().includes('meetup') ||
            cleaned.toLowerCase().includes('workshop') ||
            cleaned.toLowerCase().includes('conference')) {
          return cleaned;
        }
      }
    }
    
    // Fallback to first reasonable sentence
    return sentences[0]?.trim().substring(0, 80) || '';
  }
  
  private estimateEventDate(altText: string): Date {
    // Look for date patterns in the text
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,  // MM/DD/YYYY
      /\b(\d{1,2}\/\d{1,2})\b/,         // MM/DD
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/i
    ];
    
    for (const pattern of datePatterns) {
      const match = altText.match(pattern);
      if (match) {
        const dateStr = match[1];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          return parsed;
        }
      }
    }
    
    // Default to next week if no date found
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  
  private extractLocation(altText: string, userLocation: { lat: number, lon: number }): string {
    // Look for location indicators in the text
    const locationKeywords = ['at ', 'in ', 'venue:', 'location:', '@'];
    
    for (const keyword of locationKeywords) {
      const index = altText.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const locationPart = altText.substring(index + keyword.length, index + keyword.length + 50);
        const location = locationPart.split(/[,.\n]/)[0]?.trim();
        if (location && location.length > 3) {
          return location;
        }
      }
    }
    
    // Fallback to user's general location
    return `Near ${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`;
  }
  
  private categorizeEvent(altText: string, searchQuery: string): string {
    const text = altText.toLowerCase();
    
    // Category detection based on content
    if (text.includes('tech') || text.includes('coding') || text.includes('programming')) {
      return 'Technology';
    }
    if (text.includes('art') || text.includes('music') || text.includes('creative')) {
      return 'Arts & Culture';
    }
    if (text.includes('fitness') || text.includes('workout') || text.includes('yoga')) {
      return 'Health & Fitness';
    }
    if (text.includes('food') || text.includes('cooking') || text.includes('restaurant')) {
      return 'Food & Drink';
    }
    if (text.includes('business') || text.includes('networking') || text.includes('startup')) {
      return 'Business & Professional';
    }
    
    // Use search query as category fallback
    return this.capitalizeCategory(searchQuery);
  }
  
  private capitalizeCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  
  private estimateAttendeeCount(altText: string): number | undefined {
    // Look for attendee count hints
    const countPatterns = [
      /(\d+)\s*(people|attendees|guests|participants)/i,
      /(\d+)\s*going/i,
      /(\d+)\s*interested/i
    ];
    
    for (const pattern of countPatterns) {
      const match = altText.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 10000) {
          return count;
        }
      }
    }
    
    return undefined;
  }
}