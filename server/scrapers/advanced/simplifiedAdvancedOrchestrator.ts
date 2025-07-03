import { AdvancedMeetupScraper } from './advancedMeetupScraper';
import { AdvancedEventbriteScraper } from './advancedEventbriteScraper';
import { AdvancedTicketmasterScraper } from './advancedTicketmasterScraper';
import { ScrapedEvent } from '../../types/scraperTypes';

export class SimplifiedAdvancedOrchestrator {
  private readonly RADIUS_MILES = 50;
  private readonly RELEVANCE_THRESHOLD = 0.7;

  private meetupScraper = new AdvancedMeetupScraper();
  private eventbriteScraper = new AdvancedEventbriteScraper();
  private ticketmasterScraper = new AdvancedTicketmasterScraper();

  async scrapeAllSources(
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

    // Define scraping sources
    const sources = [
      {
        name: 'Advanced Meetup',
        scraper: () => this.meetupScraper.scrapeEvents(location, keywords, this.RADIUS_MILES)
      },
      {
        name: 'Advanced Eventbrite',
        scraper: () => this.eventbriteScraper.scrapeEvents(location, keywords, this.RADIUS_MILES)
      },
      {
        name: 'Advanced Ticketmaster',
        scraper: () => this.ticketmasterScraper.scrapeEvents(location, keywords, this.RADIUS_MILES)
      }
    ];

    // Execute all scrapers
    const results = await Promise.allSettled(
      sources.map(async (source) => {
        try {
          const events = await source.scraper();
          sourceBreakdown[source.name] = events.length;
          return { sourceName: source.name, events };
        } catch (error) {
          const errorMessage = `${source.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          sourceBreakdown[source.name] = 0;
          return { sourceName: source.name, events: [] };
        }
      })
    );

    // Process results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value.events);
      }
    });

    // Deduplicate and validate
    const deduplicatedEvents = this.deduplicateEvents(allEvents);
    const validatedEvents = this.validateEvents(deduplicatedEvents, location);

    return {
      events: validatedEvents.slice(0, 30),
      totalEvents: validatedEvents.length,
      sourceBreakdown,
      errors
    };
  }

  async scrapeForCommunity(
    location: string,
    communityKeywords: string[]
  ): Promise<ScrapedEvent[]> {
    const results = await this.scrapeAllSources(location, communityKeywords);
    
    // Filter for community relevance
    const relevantEvents = results.events.filter(event => {
      const relevanceScore = this.calculateRelevance(event, communityKeywords);
      return relevanceScore >= this.RELEVANCE_THRESHOLD;
    });

    // Sort by quality and relevance
    return relevantEvents
      .sort((a, b) => {
        const scoreA = this.calculateQualityScore(a, communityKeywords);
        const scoreB = this.calculateQualityScore(b, communityKeywords);
        return scoreB - scoreA;
      })
      .slice(0, 15);
  }

  private deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const eventMap = new Map<string, ScrapedEvent>();
    
    events.forEach(event => {
      const key = this.generateEventKey(event);
      const existing = eventMap.get(key);
      
      if (!existing || this.isEventBetter(event, existing)) {
        eventMap.set(key, event);
      }
    });
    
    return Array.from(eventMap.values());
  }

  private generateEventKey(event: ScrapedEvent): string {
    const normalizedTitle = event.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const dateKey = event.date.toISOString().split('T')[0];
    const locationKey = event.location.toLowerCase().replace(/[^\w]/g, '');
    
    return `${normalizedTitle}_${dateKey}_${locationKey}`;
  }

  private isEventBetter(newEvent: ScrapedEvent, existingEvent: ScrapedEvent): boolean {
    const sourceReliability: Record<string, number> = {
      'meetup': 0.95,
      'eventbrite': 0.90,
      'ticketmaster': 0.85
    };
    
    const newScore = sourceReliability[newEvent.source] || 0.5;
    const existingScore = sourceReliability[existingEvent.source] || 0.5;
    
    return newScore > existingScore;
  }

  private validateEvents(events: ScrapedEvent[], location: string): ScrapedEvent[] {
    return events.filter(event => {
      return (
        event.title &&
        event.title.length >= 5 &&
        event.date &&
        event.date > new Date() &&
        event.location &&
        !this.isTestEvent(event) &&
        this.isDateReasonable(event)
      );
    });
  }

  private isTestEvent(event: ScrapedEvent): boolean {
    const testKeywords = ['test', 'sample', 'demo', 'placeholder'];
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    return testKeywords.some(keyword => text.includes(keyword));
  }

  private isDateReasonable(event: ScrapedEvent): boolean {
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 1);
    
    return event.date > now && event.date <= maxFutureDate;
  }

  private calculateRelevance(event: ScrapedEvent, keywords: string[]): number {
    const eventText = `${event.title} ${event.description || ''} ${event.category}`.toLowerCase();
    let matches = 0;

    keywords.forEach(keyword => {
      if (eventText.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  private calculateQualityScore(event: ScrapedEvent, keywords: string[]): number {
    let score = 0;
    
    // Source reliability
    const sourceScores: Record<string, number> = {
      'meetup': 40,
      'eventbrite': 38,
      'ticketmaster': 35
    };
    score += sourceScores[event.source] || 20;
    
    // Content quality
    if (event.description && event.description.length > 50) score += 20;
    if (event.organizerName) score += 15;
    if (event.price !== undefined) score += 10;
    
    // Keyword relevance
    const relevanceScore = this.calculateRelevance(event, keywords);
    score += relevanceScore * 25;
    
    return score;
  }

  // Static method for easy usage
  static async quickScrape(location: string, keywords: string[]): Promise<ScrapedEvent[]> {
    const orchestrator = new SimplifiedAdvancedOrchestrator();
    return await orchestrator.scrapeForCommunity(location, keywords);
  }
}