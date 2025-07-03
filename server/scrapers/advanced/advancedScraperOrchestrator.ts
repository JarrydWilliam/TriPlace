import { AdvancedMeetupScraper } from './advancedMeetupScraper';
import { AdvancedEventbriteScraper } from './advancedEventbriteScraper';
import { AdvancedTicketmasterScraper } from './advancedTicketmasterScraper';
import { ScrapedEvent } from '../../types/scraperTypes';

export class AdvancedScraperOrchestrator {
  private readonly RADIUS_MILES = 50;
  private readonly MAX_EVENTS_PER_SOURCE = 15;
  private readonly RELEVANCE_THRESHOLD = 0.7;

  private advancedMeetupScraper = new AdvancedMeetupScraper();
  private advancedEventbriteScraper = new AdvancedEventbriteScraper();
  private advancedTicketmasterScraper = new AdvancedTicketmasterScraper();

  async scrapeAllAdvancedSources(
    location: string,
    keywords: string[]
  ): Promise<{
    events: ScrapedEvent[];
    totalEvents: number;
    sourceBreakdown: Record<string, number>;
    errors: string[];
  }> {
    const allEvents: ScrapedEvent[] = [];
    const sourceBreakdown: Record<string, number> = {};
    const errors: string[] = [];

    // Define advanced scraping sources with enhanced capabilities
    const scrapingSources = [
      {
        name: 'Advanced Meetup',
        scraper: () => this.advancedMeetupScraper.scrapeEvents(location, keywords, this.RADIUS_MILES),
        priority: 1,
        reliability: 0.95
      },
      {
        name: 'Advanced Eventbrite',
        scraper: () => this.advancedEventbriteScraper.scrapeEvents(location, keywords, this.RADIUS_MILES),
        priority: 2,
        reliability: 0.90
      },
      {
        name: 'Advanced Ticketmaster',
        scraper: () => this.advancedTicketmasterScraper.scrapeEvents(location, keywords, this.RADIUS_MILES),
        priority: 3,
        reliability: 0.85
      }
    ];

    // Execute all scrapers with enhanced error handling
    const results = await Promise.allSettled(
      scrapingSources.map(async (source) => {
        try {
          const events = await source.scraper();
          sourceBreakdown[source.name] = events.length;
          return {
            sourceName: source.name,
            events: events,
            reliability: source.reliability
          };
        } catch (error) {
          const errorMessage = `${source.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          sourceBreakdown[source.name] = 0;
          return {
            sourceName: source.name,
            events: [],
            reliability: source.reliability
          };
        }
      })
    );

    // Process successful results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value.events);
      }
    });

    // Enhanced deduplication with advanced matching
    const deduplicatedEvents = this.advancedDeduplication(allEvents);

    // Enhanced filtering and validation
    const validatedEvents = this.validateAndFilterEvents(deduplicatedEvents, location);

    return {
      events: validatedEvents.slice(0, 50), // Limit to top 50 events
      totalEvents: validatedEvents.length,
      sourceBreakdown,
      errors
    };
  }

  async scrapeForCommunityKeywords(
    location: string,
    communityKeywords: string[]
  ): Promise<ScrapedEvent[]> {
    // Enhanced community-specific scraping
    const results = await this.scrapeAllAdvancedSources(location, communityKeywords);
    
    // Filter events specifically for community relevance
    const relevantEvents = results.events.filter(event => {
      const relevanceScore = this.calculateKeywordRelevance(event, communityKeywords);
      return relevanceScore >= this.RELEVANCE_THRESHOLD;
    });

    // Sort by relevance and quality
    return relevantEvents
      .sort((a, b) => {
        const scoreA = this.calculateEventQualityScore(a, communityKeywords);
        const scoreB = this.calculateEventQualityScore(b, communityKeywords);
        return scoreB - scoreA;
      })
      .slice(0, 20); // Top 20 most relevant events
  }

  private calculateKeywordRelevance(event: ScrapedEvent, keywords: string[]): number {
    const eventText = `${event.title} ${event.description || ''} ${event.category}`.toLowerCase();
    let relevance = 0;
    let keywordMatches = 0;

    keywords.forEach(keyword => {
      if (eventText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        relevance += 1;
      }
    });

    return keywords.length > 0 ? keywordMatches / keywords.length : 0;
  }

  private advancedDeduplication(events: ScrapedEvent[]): ScrapedEvent[] {
    // Simple but effective deduplication
    const eventMap = new Map<string, ScrapedEvent>();
    
    events.forEach((event: ScrapedEvent) => {
      const key = this.generateAdvancedEventKey(event);
      const existing = eventMap.get(key);
      
      if (!existing || this.isEventBetter(event, existing)) {
        eventMap.set(key, event);
      }
    });
    
    return Array.from(eventMap.values());
  }

  private generateAdvancedEventKey(event: ScrapedEvent): string {
    // Create sophisticated key for deduplication
    const normalizedTitle = event.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const dateKey = event.date.toISOString().split('T')[0];
    const locationKey = event.location.toLowerCase().replace(/[^\w]/g, '');
    
    return `${normalizedTitle}_${dateKey}_${locationKey}`;
  }

  private isEventBetter(newEvent: ScrapedEvent, existingEvent: ScrapedEvent): boolean {
    // Determine which event has better quality indicators
    const sourceReliability = {
      'meetup': 0.95,
      'eventbrite': 0.90,
      'ticketmaster': 0.85
    };
    
    const newScore = sourceReliability[newEvent.source] || 0.5;
    const existingScore = sourceReliability[existingEvent.source] || 0.5;
    
    // Prefer events with more detailed information
    const newDetails = (newEvent.description?.length || 0) + (newEvent.organizerName ? 10 : 0);
    const existingDetails = (existingEvent.description?.length || 0) + (existingEvent.organizerName ? 10 : 0);
    
    return (newScore + newDetails * 0.001) > (existingScore + existingDetails * 0.001);
  }

  private validateAndFilterEvents(events: ScrapedEvent[], location: string): ScrapedEvent[] {
    return events.filter(event => {
      // Enhanced validation criteria
      return (
        event.title &&
        event.title.length >= 5 &&
        event.date &&
        event.date > new Date() &&
        event.location &&
        !this.isTestEvent(event) &&
        this.isLocationRelevant(event, location) &&
        this.isDateReasonable(event)
      );
    });
  }

  private isTestEvent(event: ScrapedEvent): boolean {
    const testKeywords = ['test', 'sample', 'demo', 'placeholder', 'example'];
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    return testKeywords.some(keyword => text.includes(keyword));
  }

  private isLocationRelevant(event: ScrapedEvent, userLocation: string): boolean {
    // Enhanced location relevance checking
    const eventLocation = event.location.toLowerCase();
    const userLocationLower = userLocation.toLowerCase();
    
    // Check if locations share common elements
    const eventParts = eventLocation.split(',').map(part => part.trim());
    const userParts = userLocationLower.split(',').map(part => part.trim());
    
    return eventParts.some(part => 
      userParts.some(userPart => 
        part.includes(userPart) || userPart.includes(part)
      )
    );
  }

  private isDateReasonable(event: ScrapedEvent): boolean {
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 1); // Events within next year
    
    return event.date > now && event.date <= maxFutureDate;
  }

  private calculateEventQualityScore(event: ScrapedEvent, keywords: string[]): number {
    let score = 0;
    
    // Source reliability score
    const sourceScores = {
      'meetup': 0.95,
      'eventbrite': 0.90,
      'ticketmaster': 0.85
    };
    score += (sourceScores[event.source] || 0.5) * 40;
    
    // Content quality score
    if (event.description && event.description.length > 50) score += 20;
    if (event.organizerName) score += 15;
    if (event.price !== undefined) score += 10;
    
    // Keyword relevance score
    const relevanceScore = this.communityMatcher.calculateRelevanceScore(event, keywords);
    score += relevanceScore * 25;
    
    return score;
  }

  // Static method for easy integration
  static async quickScrape(location: string, keywords: string[]): Promise<ScrapedEvent[]> {
    const orchestrator = new AdvancedScraperOrchestrator();
    const results = await orchestrator.scrapeForCommunityKeywords(location, keywords);
    return results;
  }
}