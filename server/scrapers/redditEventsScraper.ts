import * as cheerio from 'cheerio';
import { ScrapedEvent } from '../types/scraperTypes';

export class RedditEventsScraper {
  private readonly baseUrl = 'https://www.reddit.com';

  async scrapeEvents(location: string, keywords: string[], radius: number = 50): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Search for local subreddits and event-related posts
      const cityName = this.extractCityName(location);
      const subreddits = this.generateLocalSubreddits(cityName);
      
      for (const subreddit of subreddits) {
        try {
          const subredditEvents = await this.scrapeSubredditEvents(subreddit, keywords);
          events.push(...subredditEvents);
        } catch (error) {
          // Continue with other subreddits if one fails
        }
      }
      
    } catch (error) {
      throw new Error(`Reddit scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return events.slice(0, 15); // Limit to 15 events
  }

  private async scrapeSubredditEvents(subreddit: string, keywords: string[]): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Use Reddit's JSON API (public, no auth required)
      const response = await fetch(`${this.baseUrl}/r/${subreddit}/search.json?q=${keywords.join(' OR ')}&restrict_sr=1&sort=new&limit=25`, {
        headers: {
          'User-Agent': 'TriPlace Event Aggregator 1.0'
        }
      });
      
      if (!response.ok) return events;
      
      const data = await response.json();
      const posts = data.data?.children || [];
      
      for (const post of posts) {
        try {
          const postData = post.data;
          if (this.isEventPost(postData.title, postData.selftext)) {
            const event = this.parseEventFromPost(postData, subreddit);
            if (event) events.push(event);
          }
        } catch (error) {
          // Skip individual post parsing errors
        }
      }
      
    } catch (error) {
      // Return empty array if subreddit scraping fails
    }
    
    return events;
  }

  private isEventPost(title: string, content: string): boolean {
    const eventKeywords = [
      'event', 'meetup', 'gathering', 'concert', 'show', 'festival',
      'workshop', 'class', 'seminar', 'conference', 'party', 'celebration',
      'happening', 'tonight', 'this weekend', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const text = `${title} ${content}`.toLowerCase();
    return eventKeywords.some(keyword => text.includes(keyword)) &&
           (text.includes('pm') || text.includes('am') || text.includes(':') || text.includes('date'));
  }

  private parseEventFromPost(postData: any, subreddit: string): ScrapedEvent | null {
    try {
      const title = postData.title;
      const content = postData.selftext || '';
      const url = `${this.baseUrl}${postData.permalink}`;
      
      // Extract date from title or content
      const eventDate = this.extractDate(title, content);
      if (!eventDate || eventDate <= new Date()) return null;
      
      // Extract location
      const location = this.extractLocation(title, content, subreddit);
      
      return {
        title: this.cleanTitle(title),
        description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        date: eventDate,
        location: location,
        category: this.categorizeEvent(title, content),
        source: 'reddit',
        sourceUrl: url,
        organizerName: `r/${subreddit}`,
        attendeeCount: postData.ups || 0 // Use upvotes as interest indicator
      };
    } catch (error) {
      return null;
    }
  }

  private extractDate(title: string, content: string): Date | null {
    const text = `${title} ${content}`;
    
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
    
    return null;
  }

  private extractLocation(title: string, content: string, subreddit: string): string {
    const text = `${title} ${content}`;
    
    // Look for location indicators
    const locationPatterns = [
      /at\s+([^,\n]+)/i,
      /location:\s*([^,\n]+)/i,
      /venue:\s*([^,\n]+)/i,
      /address:\s*([^,\n]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Fallback to subreddit name as location
    return subreddit.replace(/\d+/g, '').replace(/events?/i, '').trim() || 'Local';
  }

  private cleanTitle(title: string): string {
    // Remove common Reddit prefixes and clean up
    return title
      .replace(/^\[.*?\]\s*/, '')
      .replace(/^(Event|Meetup|Show|Concert):\s*/i, '')
      .trim();
  }

  private categorizeEvent(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('music') || text.includes('concert') || text.includes('band') || text.includes('dj')) return 'music';
    if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) return 'food';
    if (text.includes('art') || text.includes('gallery') || text.includes('exhibition')) return 'arts';
    if (text.includes('tech') || text.includes('coding') || text.includes('startup')) return 'tech';
    if (text.includes('fitness') || text.includes('workout') || text.includes('yoga')) return 'fitness';
    if (text.includes('outdoor') || text.includes('hiking') || text.includes('park')) return 'outdoor';
    if (text.includes('social') || text.includes('networking') || text.includes('meetup')) return 'social';
    
    return 'social';
  }

  private extractCityName(location: string): string {
    // Extract city name from location string
    const parts = location.split(',');
    return parts[0].trim().toLowerCase().replace(/\s+/g, '');
  }

  private generateLocalSubreddits(cityName: string): string[] {
    // Generate common subreddit naming patterns for cities
    const patterns = [
      cityName,
      `${cityName}events`,
      `${cityName}social`,
      `${cityName}meetups`,
      `${cityName}activities`,
      `r${cityName}`,
      `${cityName}reddit`
    ];
    
    return patterns;
  }
}