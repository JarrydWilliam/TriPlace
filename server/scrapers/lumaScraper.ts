import { ScrapedEvent } from '../types/scraperTypes.js';

export class LumaScraper {
  async scrapeEvents(
    userLocation: { lat: number; lon: number },
    keywords: string[],
    radius: number = 50
  ): Promise<ScrapedEvent[]> {
    try {
      const radiusKm = radius * 1.60934;
      const url = `https://api.lu.ma/public/v1/event/get-by-location?lat=${userLocation.lat}&lng=${userLocation.lon}&radius_in_km=${radiusKm}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`LumaScraper: API returned ${response.status}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      if (!data || !data.events || !Array.isArray(data.events)) {
        return [];
      }

      const allEvents: ScrapedEvent[] = data.events.map((event: any): ScrapedEvent => {
        return {
          title: event.name,
          description: event.description ?? 'Community event on Luma.',
          date: new Date(event.start_at),
          location: event.geo_address_json?.full_address ?? event.geo_address_json?.city ?? 'Local',
          latitude: event.geo_address_json?.latitude,
          longitude: event.geo_address_json?.longitude,
          category: 'Community',
          sourceUrl: `https://lu.ma/${event.api_id}`,
          sourceName: 'Luma',
          isExternal: true,
          price: event.ticket_info?.is_free ? 0 : (event.ticket_info?.price ?? null),
          imageUrl: event.cover_url,
          source: 'local'
        };
      });

      // Simple keyword relevance pass
      const lowerKeywords = keywords.map(k => k.toLowerCase());
      const filteredEvents = allEvents.filter(ev => {
        if (lowerKeywords.length === 0) return true;
        const searchStr = `${ev.title} ${ev.description}`.toLowerCase();
        return lowerKeywords.some(kw => searchStr.includes(kw));
      });

      return filteredEvents.slice(0, 20);
    } catch (error) {
      console.error('LumaScraper: Error fetching from Luma:', error);
      return [];
    }
  }
}
