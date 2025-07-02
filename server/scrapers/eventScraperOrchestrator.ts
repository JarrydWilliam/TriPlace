import { EventbriteScraper } from './eventbriteScraper';
import { MeetupScraper } from './meetupScraper';
import { TicketmasterScraper } from './ticketmasterScraper';
import { FallbackEventScraper } from './fallbackEventScraper';
import { CommunityMatcher } from '../filters/matchCommunityCriteria';
import { DeduplicationUtils } from '../utils/dedupe';
import { GeolocationUtils } from '../utils/geolocation';
import { ScrapedEvent } from '../types/scraperTypes';
import { Community, InsertEvent } from '@shared/schema';
import { storage } from '../storage';

export class EventScraperOrchestrator {
  private eventbriteScraper = new EventbriteScraper();
  private meetupScraper = new MeetupScraper();
  private ticketmasterScraper = new TicketmasterScraper();
  private communityMatcher = new CommunityMatcher();

  /**
   * Main orchestration method - scrapes events for all communities
   */
  async scrapeEventsForAllCommunities(userLocation: { lat: number, lon: number }): Promise<{
    totalEvents: number;
    communitiesUpdated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalEvents = 0;
    let communitiesUpdated = 0;

    try {
      // Get all active communities
      const communities = await storage.getAllCommunities();
      const locationName = await this.getLocationName(userLocation);

      console.log(`Starting event scraping for ${communities.length} communities near ${locationName}`);

      // Extract unique keywords from all communities
      const allKeywords = this.extractCommunityKeywords(communities);
      
      // Scrape events from all sources
      const allScrapedEvents = await this.scrapeFromAllSources(locationName, allKeywords);
      
      if (allScrapedEvents.length === 0) {
        console.log('No events found from any scraping source');
        return { totalEvents: 0, communitiesUpdated: 0, errors: ['No events found from scraping sources'] };
      }

      // Filter and process events
      const processedEvents = await this.processScrapedEvents(allScrapedEvents, userLocation);
      
      // Match events to communities
      const communityMatches = this.communityMatcher.matchEventsTocommunities(processedEvents, communities);
      
      // Save events to database for each community
      for (const match of communityMatches) {
        try {
          const savedCount = await this.saveEventsForCommunity(match.communityId, match.events);
          totalEvents += savedCount;
          if (savedCount > 0) {
            communitiesUpdated++;
          }
          console.log(`Saved ${savedCount} events for community ${match.communityId}`);
        } catch (error) {
          const errorMsg = `Failed to save events for community ${match.communityId}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Event scraping completed: ${totalEvents} total events across ${communitiesUpdated} communities`);

    } catch (error) {
      const errorMsg = `Event scraping orchestration failed: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    return { totalEvents, communitiesUpdated, errors };
  }

  /**
   * Scrape events from all available sources
   */
  private async scrapeFromAllSources(location: string, keywords: string[]): Promise<ScrapedEvent[]> {
    const allEvents: ScrapedEvent[] = [];
    
    console.log(`Scraping with keywords: ${keywords.join(', ')}`);

    // Scrape from all sources in parallel
    const scrapingPromises = [
      this.eventbriteScraper.scrapeEvents(location, keywords).catch(error => {
        console.error('Eventbrite scraping failed:', error);
        return [];
      }),
      this.meetupScraper.scrapeEvents(location, keywords).catch(error => {
        console.error('Meetup scraping failed:', error);
        return [];
      }),
      this.ticketmasterScraper.scrapeEvents(location, keywords).catch(error => {
        console.error('Ticketmaster scraping failed:', error);
        return [];
      })
    ];

    const results = await Promise.allSettled(scrapingPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      }
    }

    console.log(`Scraped ${allEvents.length} total events from all sources`);
    return allEvents;
  }

  /**
   * Process and filter scraped events
   */
  private async processScrapedEvents(events: ScrapedEvent[], userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    console.log(`Processing ${events.length} scraped events`);
    
    // Remove duplicates
    const uniqueEvents = DeduplicationUtils.deduplicateEvents(events);
    console.log(`After deduplication: ${uniqueEvents.length} events`);
    
    // Filter upcoming events only
    const upcomingEvents = this.communityMatcher.filterUpcomingEvents(uniqueEvents);
    console.log(`After filtering upcoming: ${upcomingEvents.length} events`);
    
    // Filter by location proximity (40km radius)
    const nearbyEvents = this.communityMatcher.filterByLocation(upcomingEvents, userLocation, 40);
    console.log(`After location filtering: ${nearbyEvents.length} events`);
    
    return nearbyEvents;
  }

  /**
   * Extract relevant keywords from communities
   */
  private extractCommunityKeywords(communities: Community[]): string[] {
    const keywords = new Set<string>();
    
    for (const community of communities) {
      // Add community category
      keywords.add(community.category);
      
      // Extract keywords from community name
      const nameWords = community.name.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['club', 'group', 'community', 'forum', 'network'].includes(word)
      );
      nameWords.forEach(word => keywords.add(word));
      
      // Add predefined keywords based on category
      const categoryKeywords = this.getCategoryKeywords(community.category);
      categoryKeywords.forEach(keyword => keywords.add(keyword));
    }
    
    return Array.from(keywords).slice(0, 10); // Limit to top 10 keywords to avoid too many requests
  }

  /**
   * Get relevant keywords for a community category
   */
  private getCategoryKeywords(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'technology': ['tech', 'coding', 'programming', 'startup', 'ai'],
      'fitness': ['fitness', 'workout', 'health', 'yoga', 'running'],
      'art': ['art', 'creative', 'music', 'design', 'culture'],
      'food': ['food', 'cooking', 'culinary', 'dining'],
      'business': ['business', 'networking', 'professional', 'entrepreneur'],
      'education': ['education', 'learning', 'workshop', 'seminar'],
      'social': ['social', 'meetup', 'community', 'networking'],
      'outdoors': ['outdoor', 'hiking', 'nature', 'adventure'],
      'entertainment': ['entertainment', 'music', 'comedy', 'festival'],
      'lifestyle': ['lifestyle', 'wellness', 'personal', 'growth']
    };
    
    return keywordMap[category.toLowerCase()] || [category];
  }

  /**
   * Save events for a specific community
   */
  private async saveEventsForCommunity(communityId: number, events: ScrapedEvent[]): Promise<number> {
    let savedCount = 0;
    
    for (const scrapedEvent of events) {
      try {
        // Check if event already exists
        const existingEvents = await storage.getCommunityEvents(communityId);
        const isDuplicate = existingEvents.some((existing: any) => 
          existing.title.toLowerCase() === scrapedEvent.title.toLowerCase() &&
          existing.date.toDateString() === scrapedEvent.date.toDateString()
        );
        
        if (!isDuplicate) {
          const insertEvent: InsertEvent = {
            title: scrapedEvent.title,
            description: scrapedEvent.description,
            organizer: scrapedEvent.organizerName || 'External Event',
            date: scrapedEvent.date,
            location: scrapedEvent.location,
            address: scrapedEvent.location, // Use location as address fallback
            category: scrapedEvent.category,
            price: (scrapedEvent.price || 0).toString(),
            isGlobal: false
          };
          
          await storage.createEvent(insertEvent);
          savedCount++;
        }
      } catch (error) {
        console.error(`Error saving event "${scrapedEvent.title}":`, error);
      }
    }
    
    return savedCount;
  }

  /**
   * Get location name from coordinates
   */
  private async getLocationName(location: { lat: number, lon: number }): Promise<string> {
    // In production, you'd use a reverse geocoding service
    // For now, return a placeholder based on major cities
    const majorCities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
      { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
      { name: 'Houston', lat: 29.7604, lon: -95.3698 },
      { name: 'Phoenix', lat: 33.4484, lon: -112.0740 },
      { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
      { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
      { name: 'Denver', lat: 39.7392, lon: -104.9903 },
      { name: 'Austin', lat: 30.2672, lon: -97.7431 },
      { name: 'Salt Lake City', lat: 40.7608, lon: -111.8910 }
    ];
    
    let closestCity = 'Unknown Location';
    let minDistance = Infinity;
    
    for (const city of majorCities) {
      const distance = GeolocationUtils.calculateDistance(location, city);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city.name;
      }
    }
    
    return closestCity;
  }

  /**
   * Manual trigger for immediate scraping
   */
  async triggerManualScrape(communityId: number, userLocation: { lat: number, lon: number }): Promise<number> {
    try {
      const community = await storage.getCommunity(communityId);
      if (!community) {
        throw new Error(`Community ${communityId} not found`);
      }

      const locationName = await this.getLocationName(userLocation);
      const keywords = this.getCategoryKeywords(community.category);
      
      const scrapedEvents = await this.scrapeFromAllSources(locationName, keywords);
      const processedEvents = await this.processScrapedEvents(scrapedEvents, userLocation);
      
      // Filter events relevant to this specific community
      const relevantEvents = processedEvents.filter(event => {
        const score = this.calculateSimpleRelevance(event, community);
        return score >= 0.5;
      });
      
      return await this.saveEventsForCommunity(communityId, relevantEvents);
    } catch (error) {
      console.error(`Manual scrape failed for community ${communityId}:`, error);
      return 0;
    }
  }

  /**
   * Simple relevance calculation for individual community
   */
  private calculateSimpleRelevance(event: ScrapedEvent, community: Community): number {
    const eventText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
    const communityText = `${community.name} ${community.description} ${community.category}`.toLowerCase();
    
    const communityWords = communityText.split(' ').filter(word => word.length > 3);
    let matches = 0;
    
    for (const word of communityWords) {
      if (eventText.includes(word)) {
        matches++;
      }
    }
    
    return matches / Math.max(communityWords.length, 1);
  }
}

export const eventScraperOrchestrator = new EventScraperOrchestrator();