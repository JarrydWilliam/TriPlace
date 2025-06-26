import { Event, Community, InsertEvent } from "@shared/schema";
import { storage } from "./storage";

interface ScrapedEvent {
  title: string;
  description: string;
  date: Date;
  location: string;
  category: string;
  sourceUrl: string;
  organizerName?: string;
  price?: number;
  attendeeCount?: number;
}

export class EventScraper {
  private readonly eventbriteApiKey = process.env.EVENTBRITE_API_KEY;
  private readonly meetupApiKey = process.env.MEETUP_API_KEY;

  async scrapeEventsForCommunity(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Try multiple sources for better coverage
      const eventbriteEvents = await this.scrapeEventbrite(community, userLocation);
      const meetupEvents = await this.scrapeMeetup(community, userLocation);
      
      events.push(...eventbriteEvents, ...meetupEvents);
      
      // Filter and deduplicate events
      return this.filterAndDeduplicateEvents(events, community);
    } catch (error) {
      console.error(`Error scraping events for ${community.name}:`, error);
      return [];
    }
  }

  private async scrapeEventbrite(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.eventbriteApiKey) {
      console.log('No Eventbrite API key found, skipping Eventbrite scraping');
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      const radius = '25mi'; // 25 mile radius
      
      const url = `https://www.eventbriteapi.com/v3/events/search/` +
        `?q=${encodeURIComponent(searchQuery)}` +
        `&location.latitude=${userLocation.lat}` +
        `&location.longitude=${userLocation.lon}` +
        `&location.within=${radius}` +
        `&start_date.range_start=${new Date().toISOString()}` +
        `&sort_by=date` +
        `&token=${this.eventbriteApiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Eventbrite API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.events?.map((event: any) => ({
        title: event.name?.text || 'Untitled Event',
        description: event.description?.text || '',
        date: new Date(event.start?.utc),
        location: event.venue?.address?.localized_address_display || 'Location TBD',
        category: community.category,
        sourceUrl: event.url,
        organizerName: event.organizer?.name,
        price: event.ticket_availability?.minimum_ticket_price?.major_value || 0,
        attendeeCount: event.capacity || 0
      })) || [];
    } catch (error) {
      console.error('Eventbrite scraping failed:', error);
      return [];
    }
  }

  private async scrapeMeetup(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.meetupApiKey) {
      console.log('No Meetup API key found, skipping Meetup scraping');
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      const radius = 25; // 25 miles
      
      const url = `https://api.meetup.com/find/events` +
        `?lat=${userLocation.lat}` +
        `&lon=${userLocation.lon}` +
        `&radius=${radius}` +
        `&text=${encodeURIComponent(searchQuery)}` +
        `&key=${this.meetupApiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Meetup API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((event: any) => ({
        title: event.name || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.time),
        location: event.venue?.name || event.venue?.address_1 || 'Location TBD',
        category: community.category,
        sourceUrl: event.link,
        organizerName: event.group?.name,
        price: event.fee?.amount || 0,
        attendeeCount: event.yes_rsvp_count || 0
      }));
    } catch (error) {
      console.error('Meetup scraping failed:', error);
      return [];
    }
  }

  private buildSearchQuery(community: Community): string {
    // Build search query based on community name and category
    const keywords = [
      community.name.toLowerCase(),
      community.category.toLowerCase()
    ];
    
    // Remove common words and duplicates
    const filteredKeywords = keywords
      .filter(keyword => !['community', 'group', 'club', 'society'].includes(keyword))
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index);
    
    return filteredKeywords.slice(0, 3).join(' '); // Use top 3 keywords
  }

  private filterAndDeduplicateEvents(events: ScrapedEvent[], community: Community): ScrapedEvent[] {
    // Remove duplicates based on title and date
    const seen = new Set<string>();
    const uniqueEvents = events.filter(event => {
      const key = `${event.title.toLowerCase()}-${event.date.toDateString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter events that match community interests
    const relevantEvents = uniqueEvents.filter(event => 
      this.isEventRelevantToCommunity(event, community)
    );

    // Sort by date and limit to 10 most relevant events
    return relevantEvents
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }

  private isEventRelevantToCommunity(event: ScrapedEvent, community: Community): boolean {
    const eventText = `${event.title} ${event.description}`.toLowerCase();
    const communityKeywords = [
      community.name.toLowerCase(),
      community.category.toLowerCase()
    ];

    // Check if event contains any community keywords
    return communityKeywords.some(keyword => 
      eventText.includes(keyword) || 
      this.calculateRelevanceScore(eventText, keyword) > 0.7
    );
  }

  private calculateRelevanceScore(text: string, keyword: string): number {
    // Simple relevance scoring based on keyword presence and proximity
    const words = text.split(' ');
    const keywordWords = keyword.split(' ');
    
    let score = 0;
    keywordWords.forEach(kw => {
      if (words.some(word => word.includes(kw) || kw.includes(word))) {
        score += 1;
      }
    });
    
    return score / keywordWords.length;
  }

  async populateCommunityEvents(community: Community, userLocation: { lat: number, lon: number }): Promise<Event[]> {
    const scrapedEvents = await this.scrapeEventsForCommunity(community, userLocation);
    const createdEvents: Event[] = [];

    for (const scrapedEvent of scrapedEvents) {
      try {
        // Check if event already exists
        const existingEvents = await storage.getEventsByLocation(
          userLocation.lat.toString(),
          userLocation.lon.toString(),
          25
        );
        
        const eventExists = existingEvents.some(existing => 
          existing.title === scrapedEvent.title && 
          Math.abs(new Date(existing.date).getTime() - scrapedEvent.date.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        );

        if (!eventExists) {
          const newEvent: InsertEvent = {
            title: scrapedEvent.title,
            description: scrapedEvent.description,
            organizer: scrapedEvent.organizerName || 'Event Organizer',
            date: scrapedEvent.date,
            location: scrapedEvent.location,
            address: scrapedEvent.location,
            latitude: userLocation.lat.toString(),
            longitude: userLocation.lon.toString(),
            category: scrapedEvent.category,
            maxAttendees: scrapedEvent.attendeeCount || 50,
            price: (scrapedEvent.price || 0).toString()
          };

          const createdEvent = await storage.createEvent(newEvent);
          createdEvents.push(createdEvent);
          console.log(`Created event: ${createdEvent.title} for community ${community.name}`);
        }
      } catch (error) {
        console.error(`Error creating event ${scrapedEvent.title}:`, error);
      }
    }

    return createdEvents;
  }
}

export const eventScraper = new EventScraper();