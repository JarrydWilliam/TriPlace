/**
 * EventbriteScraper
 *
 * Uses the Eventbrite API v3 (free with a private token).
 * API key: EVENTBRITE_API_KEY environment variable.
 * If the key is absent, this scraper returns [] gracefully.
 * Docs: https://www.eventbrite.com/platform/api
 */
import { ScrapedEvent } from '../types/scraperTypes.js';

const EB_BASE = 'https://www.eventbriteapi.com/v3';

interface EbVenueDetail {
  name?: string;
  address?: { localized_address_display?: string; city?: string; region?: string };
  latitude?: string;
  longitude?: string;
}

interface EbEvent {
  id?: string;
  name?: { text?: string };
  description?: { text?: string };
  url?: string;
  start?: { utc?: string };
  end?: { utc?: string };
  is_free?: boolean;
  ticket_availability?: { minimum_ticket_price?: { major_value?: string } };
  category_id?: string;
  venue_id?: string;
  logo?: { url?: string };
}

const EB_CATEGORY_MAP: Record<string, string> = {
  '101': 'Business',
  '102': 'Science & Technology',
  '103': 'Music',
  '104': 'Film & Media',
  '105': 'Arts & Culture',
  '106': 'Fashion',
  '107': 'Health & Wellness',
  '108': 'Sports & Fitness',
  '109': 'Travel & Outdoor',
  '110': 'Food & Drink',
  '111': 'Charity & Causes',
  '112': 'Government & Politics',
  '113': 'Community & Culture',
  '114': 'Spirituality',
  '115': 'Family & Education',
  '116': 'Holiday',
  '117': 'Home & Lifestyle',
  '118': 'Auto Boat & Air',
  '119': 'Hobbies',
  '120': 'School Activities',
};

export class EventbriteScraper {
  private readonly apiKey = process.env.EVENTBRITE_API_KEY;

  async scrapeEvents(location: string, keywords: string[], radius: number = 50, coords?: { lat: number, lon: number }): Promise<ScrapedEvent[]> {
    if (!this.apiKey) {
      return [];
    }

    const events: ScrapedEvent[] = [];

    try {
      for (const keyword of keywords.slice(0, 3)) {
        // Prefer lat/lng for precise geo-search; fall back to city name address
        const geoParams: Record<string, string> = coords
          ? {
              'location.latitude': String(coords.lat),
              'location.longitude': String(coords.lon),
              'location.within': `${radius}mi`,
            }
          : {
              'location.address': location,
              'location.within': `${radius}mi`,
            };

        const params = new URLSearchParams({
          q: keyword,
          ...geoParams,
          'start_date.range_start': new Date().toISOString(),
          sort_by: 'date',
          expand: 'venue',
          page_size: '10',
        });

        const url = `${EB_BASE}/events/search/?${params}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          console.warn(`Eventbrite API returned ${res.status} for keyword "${keyword}"`);
          continue;
        }

        const data = await res.json() as { events?: (EbEvent & { venue?: EbVenueDetail })[] };
        const ebEvents = data.events ?? [];

        for (const ebEvent of ebEvents) {
          try {
            if (!ebEvent.name?.text || !ebEvent.start?.utc) continue;

            const date = new Date(ebEvent.start.utc);
            if (isNaN(date.getTime()) || date < new Date()) continue;

            const venue = ebEvent.venue;
            const locationStr = venue?.address?.localized_address_display ??
              [venue?.address?.city, venue?.address?.region].filter(Boolean).join(', ') ??
              location;

            const lat = parseFloat(venue?.latitude ?? '');
            const lon = parseFloat(venue?.longitude ?? '');

            const categoryId = ebEvent.category_id ?? '';
            const category = EB_CATEGORY_MAP[categoryId] ?? 'Community & Culture';

            const rawPrice = ebEvent.ticket_availability?.minimum_ticket_price?.major_value;
            const price = ebEvent.is_free ? 0 : (rawPrice ? parseFloat(rawPrice) : null);

            events.push({
              title: ebEvent.name.text,
              description: ebEvent.description?.text ?? `${category} event via Eventbrite.`,
              date,
              location: locationStr,
              latitude: isNaN(lat) ? undefined : lat,
              longitude: isNaN(lon) ? undefined : lon,
              category,
              sourceUrl: ebEvent.url ?? 'https://www.eventbrite.com',
              sourceName: 'Eventbrite',
              isExternal: true,
              organizerName: 'Eventbrite',
              price,
              attendeeCount: null,
              source: 'eventbrite',
              imageUrl: ebEvent.logo?.url,
            });
          } catch (err) {
            console.error('Eventbrite: Failed to parse event:', err);
          }
        }
      }
    } catch (err) {
      console.error('EventbriteScraper error:', err);
    }

    return events;
  }
}