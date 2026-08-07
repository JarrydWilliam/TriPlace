/**
 * SeatGeekScraper
 *
 * Uses the SeatGeek API v2 (free with client_id).
 * Key: SEATGEEK_CLIENT_ID environment variable.
 * Falls back to a public read-only dev client_id for basic queries.
 * Docs: https://platform.seatgeek.com/
 */
import { ScrapedEvent } from '../types/scraperTypes.js';

const SG_BASE = 'https://api.seatgeek.com/2';
// Public rate-limited dev client_id — safe for low-volume reads
const SG_PUBLIC_CLIENT_ID = 'MjM4MDMzMjd8MTY3OTUwOTM0Ni4zNTMwMzQ';

interface SgVenue {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: { lat?: number; lon?: number };
}

interface SgEvent {
  title?: string;
  url?: string;
  short_title?: string;
  datetime_utc?: string;
  venue?: SgVenue;
  type?: string;
  lowest_price?: number | null;
  performers?: Array<{ name?: string }>;
}

export class SeatGeekScraper {
  private readonly clientId = process.env.SEATGEEK_CLIENT_ID ?? SG_PUBLIC_CLIENT_ID;

  async scrapeEvents(location: string, keywords: string[], radius: number = 50, coords?: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];

    try {
      // SeatGeek doesn't support keyword search well, so we use city + type
      for (const keyword of keywords.slice(0, 2)) {
        // Prefer lat/lon for precise geo-search; fall back to venue.city string
        const geoParams: Record<string, string> = coords
          ? { lat: String(coords.lat), lon: String(coords.lon) }
          : { 'venue.city': location };

        const params = new URLSearchParams({
          client_id: this.clientId,
          q: keyword,
          ...geoParams,
          range: `${radius}mi`,
          sort: 'datetime_utc.asc',
          per_page: '10',
          'datetime_utc.gte': new Date().toISOString().split('.')[0],
        });

        const url = `${SG_BASE}/events?${params}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

        if (!res.ok) {
          console.warn(`SeatGeek API returned ${res.status} for keyword "${keyword}"`);
          continue;
        }

        const data = await res.json() as { events?: SgEvent[] };
        const sgEvents = data.events ?? [];

        for (const sgEvent of sgEvents) {
          try {
            const title = sgEvent.title ?? sgEvent.short_title;
            if (!title || !sgEvent.datetime_utc) continue;

            const date = new Date(sgEvent.datetime_utc + 'Z');
            if (isNaN(date.getTime()) || date < new Date()) continue;

            const venue = sgEvent.venue;
            const locationStr = [venue?.name, venue?.city, venue?.state]
              .filter(Boolean).join(', ') || location;

            events.push({
              title,
              description: `${sgEvent.type ?? 'Event'} featuring ${
                sgEvent.performers?.slice(0, 2).map(p => p.name).join(' & ') ?? title
              }.`,
              date,
              location: locationStr,
              latitude: venue?.location?.lat,
              longitude: venue?.location?.lon,
              category: sgEvent.type ? this.mapType(sgEvent.type) : 'Entertainment',
              sourceUrl: sgEvent.url ?? 'https://seatgeek.com',
              sourceName: 'SeatGeek',
              isExternal: true,
              organizerName: 'SeatGeek',
              price: sgEvent.lowest_price ?? null,
              attendeeCount: null,
              source: 'seatgeek',
            });
          } catch (err) {
            console.error('SeatGeek: Failed to parse event:', err);
          }
        }
      }
    } catch (err) {
      console.error('SeatGeekScraper error:', err);
    }

    return events;
  }

  private mapType(type: string): string {
    const map: Record<string, string> = {
      concert: 'Music',
      sports: 'Sports',
      theater: 'Arts & Culture',
      comedy: 'Entertainment',
      family: 'Family',
      festival: 'Entertainment',
    };
    return map[type.toLowerCase()] ?? 'Entertainment';
  }
}