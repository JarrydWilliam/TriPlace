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
  private readonly ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
  private readonly facebookApiKey = process.env.FACEBOOK_API_KEY;
  private readonly stubhubApiKey = process.env.STUBHUB_API_KEY;
  private readonly eventfulApiKey = process.env.EVENTFUL_API_KEY;
  private readonly universeApiKey = process.env.UNIVERSE_API_KEY;
  private readonly seatgeekApiKey = process.env.SEATGEEK_API_KEY;

  async scrapeEventsForCommunity(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // Try multiple sources for comprehensive coverage
      const [
        eventbriteEvents,
        meetupEvents,
        ticketmasterEvents,
        facebookEvents,
        stubhubEvents,
        eventfulEvents,
        universeEvents,
        seatgeekEvents
      ] = await Promise.allSettled([
        this.scrapeEventbrite(community, userLocation),
        this.scrapeMeetup(community, userLocation),
        this.scrapeTicketmaster(community, userLocation),
        this.scrapeFacebook(community, userLocation),
        this.scrapeStubHub(community, userLocation),
        this.scrapeEventful(community, userLocation),
        this.scrapeUniverse(community, userLocation),
        this.scrapeSeatGeek(community, userLocation)
      ]);

      // Add successful results
      if (eventbriteEvents.status === 'fulfilled') events.push(...eventbriteEvents.value);
      if (meetupEvents.status === 'fulfilled') events.push(...meetupEvents.value);
      if (ticketmasterEvents.status === 'fulfilled') events.push(...ticketmasterEvents.value);
      if (facebookEvents.status === 'fulfilled') events.push(...facebookEvents.value);
      if (stubhubEvents.status === 'fulfilled') events.push(...stubhubEvents.value);
      if (eventfulEvents.status === 'fulfilled') events.push(...eventfulEvents.value);
      if (universeEvents.status === 'fulfilled') events.push(...universeEvents.value);
      if (seatgeekEvents.status === 'fulfilled') events.push(...seatgeekEvents.value);
      
      // Filter and deduplicate events
      return this.filterAndDeduplicateEvents(events, community);
    } catch (error) {
      return [];
    }
  }

  private async scrapeEventbrite(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.eventbriteApiKey) {
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
      return [];
    }
  }

  private async scrapeMeetup(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.meetupApiKey) {
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
      return [];
    }
  }

  private async scrapeTicketmaster(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.ticketmasterApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      const radius = '25'; // 25 miles
      
      const url = `https://app.ticketmaster.com/discovery/v2/events.json` +
        `?apikey=${this.ticketmasterApiKey}` +
        `&keyword=${encodeURIComponent(searchQuery)}` +
        `&latlong=${userLocation.lat},${userLocation.lon}` +
        `&radius=${radius}` +
        `&unit=miles` +
        `&size=50`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data._embedded?.events || [];
      
      return events.map((event: any) => ({
        title: event.name || 'Untitled Event',
        description: event.info || event.pleaseNote || '',
        date: new Date(event.dates?.start?.dateTime || event.dates?.start?.localDate),
        location: event._embedded?.venues?.[0]?.name || event._embedded?.venues?.[0]?.address?.line1 || 'Location TBD',
        category: community.category,
        sourceUrl: event.url,
        organizerName: event.promoter?.name || event._embedded?.attractions?.[0]?.name,
        price: event.priceRanges?.[0]?.min || 0,
        attendeeCount: 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async scrapeFacebook(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.facebookApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      
      // Facebook Graph API for events
      const url = `https://graph.facebook.com/v18.0/search` +
        `?type=event` +
        `&q=${encodeURIComponent(searchQuery)}` +
        `&center=${userLocation.lat},${userLocation.lon}` +
        `&distance=25000` + // 25 miles in meters
        `&access_token=${this.facebookApiKey}` +
        `&fields=id,name,description,start_time,place,cover`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.data || [];
      
      return events.map((event: any) => ({
        title: event.name || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.start_time),
        location: event.place?.name || event.place?.location?.street || 'Location TBD',
        category: community.category,
        sourceUrl: `https://facebook.com/events/${event.id}`,
        organizerName: event.place?.name,
        price: 0, // Facebook events typically don't have price info via API
        attendeeCount: 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async scrapeStubHub(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.stubhubApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      
      // StubHub API for events
      const url = `https://api.stubhub.com/search/catalog/events/v3` +
        `?q=${encodeURIComponent(searchQuery)}` +
        `&geoHash=${this.getGeoHash(userLocation.lat, userLocation.lon)}` +
        `&radius=25mi` +
        `&rows=50`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.stubhubApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`StubHub API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.events || [];
      
      return events.map((event: any) => ({
        title: event.name || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.eventDateLocal),
        location: event.venue?.name || event.venue?.address1 || 'Location TBD',
        category: community.category,
        sourceUrl: `https://stubhub.com/event/${event.id}`,
        organizerName: event.performers?.[0]?.name,
        price: event.ticketInfo?.minPrice || 0,
        attendeeCount: 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async scrapeEventful(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.eventfulApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      
      // Eventful API for events
      const url = `https://api.eventful.com/json/events/search` +
        `?app_key=${this.eventfulApiKey}` +
        `&keywords=${encodeURIComponent(searchQuery)}` +
        `&location=${userLocation.lat},${userLocation.lon}` +
        `&within=25` +
        `&units=mi` +
        `&page_size=50`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Eventful API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.events?.event || [];
      
      return events.map((event: any) => ({
        title: event.title || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.start_time),
        location: event.venue_name || event.city_name || 'Location TBD',
        category: community.category,
        sourceUrl: event.url || '',
        organizerName: event.owner || 'Unknown',
        price: 0,
        attendeeCount: parseInt(event.going_count) || 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async scrapeUniverse(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.universeApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      
      // Universe API for events
      const url = `https://www.universe.com/api/v2/events` +
        `?q=${encodeURIComponent(searchQuery)}` +
        `&lat=${userLocation.lat}` +
        `&lng=${userLocation.lon}` +
        `&radius=25`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.universeApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Universe API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.events || [];
      
      return events.map((event: any) => ({
        title: event.title || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.start_at),
        location: event.venue?.name || event.venue?.address || 'Location TBD',
        category: community.category,
        sourceUrl: event.url || '',
        organizerName: event.organizer?.name || 'Unknown',
        price: event.min_price || 0,
        attendeeCount: event.attendee_count || 0
      }));
    } catch (error) {
      return [];
    }
  }

  private async scrapeSeatGeek(community: Community, userLocation: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.seatgeekApiKey) {
      return [];
    }

    try {
      const searchQuery = this.buildSearchQuery(community);
      
      // SeatGeek API for events
      const url = `https://api.seatgeek.com/2/events` +
        `?client_id=${this.seatgeekApiKey}` +
        `&q=${encodeURIComponent(searchQuery)}` +
        `&lat=${userLocation.lat}` +
        `&lon=${userLocation.lon}` +
        `&range=25mi` +
        `&per_page=50`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`SeatGeek API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.events || [];
      
      return events.map((event: any) => ({
        title: event.title || 'Untitled Event',
        description: event.short_title || '',
        date: new Date(event.datetime_local),
        location: event.venue?.name || event.venue?.address || 'Location TBD',
        category: community.category,
        sourceUrl: event.url || '',
        organizerName: event.performers?.[0]?.name || 'Unknown',
        price: event.stats?.lowest_price || 0,
        attendeeCount: 0
      }));
    } catch (error) {
      return [];
    }
  }

  private getGeoHash(lat: number, lon: number): string {
    // Simple geohash implementation for StubHub API
    // In production, you'd use a proper geohash library
    return `${Math.round(lat * 100)}_${Math.round(lon * 100)}`;
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
        }
      } catch (error) {
        // console.error(`Error creating event ${scrapedEvent.title}:`, error);
      }
    }

    return createdEvents;
  }
}

export const eventScraper = new EventScraper();