/**
 * TicketmasterScraper
 *
 * Uses the Ticketmaster Discovery API v2 (free tier, 1000 req/day).
 * API key: TICKETMASTER_API_KEY environment variable.
 * If the key is absent, this scraper returns [] gracefully.
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
import { ScrapedEvent } from '../types/scraperTypes.js';

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2';

interface TmVenue {
  name?: string;
  city?: { name?: string };
  state?: { name?: string };
  location?: { latitude?: string; longitude?: string };
  address?: { line1?: string };
}

interface TmEvent {
  name?: string;
  url?: string;
  info?: string;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  priceRanges?: Array<{ min?: number; max?: number }>;
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  _embedded?: { venues?: TmVenue[] };
  images?: Array<{ url?: string; width?: number }>;
}

export class TicketmasterScraper {
  private readonly apiKey = process.env.TICKETMASTER_API_KEY || 'q0MzGPO1DLbpp3IXVoSNoGKrQLw8ui36';

  async scrapeEvents(location: string, keywords: string[], radius: number = 50, coords?: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.apiKey) {
      return [];
    }

    const events: ScrapedEvent[] = [];

    try {
      const searchKeywords = keywords && keywords.length > 0
        ? Array.from(new Set([...keywords.slice(0, 3), 'music', 'sports', 'arts']))
        : ['music', 'sports', 'arts'];

      for (const keyword of searchKeywords) {
        // Build geo params: lat/lng for precision, city name as fallback
        const params = new URLSearchParams({
          apikey: this.apiKey,
          keyword,
          radius: radius.toString(),
          unit: 'miles',
          size: '10',
          sort: 'date,asc',
          startDateTime: new Date().toISOString().split('.')[0] + 'Z',
        });
        if (coords) {
          params.set('latlong', `${coords.lat},${coords.lon}`);
        } else {
          params.set('city', location);
        }

        const url = `${TM_BASE}/events.json?${params}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

        if (!res.ok) {
          console.warn(`Ticketmaster API returned ${res.status} for keyword "${keyword}"`);
          continue;
        }

        const data = await res.json() as {
          _embedded?: { events?: TmEvent[] };
          page?: { totalElements?: number };
        };

        const tmEvents = data._embedded?.events ?? [];

        for (const tmEvent of tmEvents) {
          try {
            const venue = tmEvent._embedded?.venues?.[0];
            const dateStr = tmEvent.dates?.start?.dateTime ?? tmEvent.dates?.start?.localDate;
            if (!dateStr || !tmEvent.name) continue;

            const date = new Date(dateStr);
            if (isNaN(date.getTime()) || date < new Date()) continue;

            const locationStr = [
              venue?.name,
              venue?.address?.line1,
              venue?.city?.name,
              venue?.state?.name,
            ].filter(Boolean).join(', ') || location;

            const lat = parseFloat(venue?.location?.latitude ?? '');
            const lon = parseFloat(venue?.location?.longitude ?? '');

            const category = tmEvent.classifications?.[0]?.segment?.name ?? 'Entertainment';
            const price = tmEvent.priceRanges?.[0]?.min ?? null;
            const imageUrl = tmEvent.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;

            events.push({
              title: tmEvent.name,
              description: tmEvent.info ?? `${category} event in ${venue?.city?.name ?? location}.`,
              date,
              location: locationStr,
              latitude: isNaN(lat) ? undefined : lat,
              longitude: isNaN(lon) ? undefined : lon,
              category,
              sourceUrl: tmEvent.url ?? 'https://www.ticketmaster.com',
              sourceName: 'Ticketmaster',
              isExternal: true,
              organizerName: 'Ticketmaster',
              price,
              attendeeCount: null,
              source: 'ticketmaster',
              imageUrl,
            });
          } catch (err) {
            console.error('Ticketmaster: Failed to parse event:', err);
          }
        }
      }
    } catch (err) {
      console.error('TicketmasterScraper error:', err);
    }

    return events;
  }
}