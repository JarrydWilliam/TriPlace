/**
 * FallbackEventScraper
 *
 * PRODUCTION BEHAVIOR: Returns [] always. Fake placeholder events are suppressed
 * in production because they mislead users into thinking they represent real local events.
 *
 * DEV/STAGING BEHAVIOR: Generates a small set of realistic-looking sample events
 * so developers can preview UI without needing live API keys.
 * Enable with: NODE_ENV=development (or staging)
 *
 * If you want to force-enable fallbacks in any env, set:
 * SAMEVIBE_EVENT_FALLBACK_ENABLED=true
 */
import { ScrapedEvent } from '../types/scraperTypes.js';

const FALLBACK_ENABLED =
  process.env.SAMEVIBE_EVENT_FALLBACK_ENABLED === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');

export class FallbackEventScraper {
  /** Generate sample events for dev/staging only. Returns [] in production. */
  async generateSampleEvents(location: string, keywords: string[], communityCategory?: string): Promise<ScrapedEvent[]> {
    if (!FALLBACK_ENABLED) {
      return [];
    }

    const baseEvents: ScrapedEvent[] = [
      {
        title: 'Tech Innovation Meetup',
        description: 'Join local innovators and entrepreneurs for networking and tech talks about the latest in AI, blockchain, and startup culture.',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        location: `${location} Tech Hub`,
        category: 'Technology',
        sourceUrl: 'https://example.com/events/tech-meetup',
        sourceName: '[Dev Sample]',
        isExternal: true,
        organizerName: 'Tech Community',
        price: 0,
        attendeeCount: 45,
        source: 'local',
      },
      {
        title: 'Creative Arts Workshop',
        description: 'Hands-on workshop for artists, designers, and creative professionals. Learn new techniques and connect with fellow creatives.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        location: `${location} Arts Center`,
        category: 'Arts & Culture',
        sourceUrl: 'https://example.com/events/arts-workshop',
        sourceName: '[Dev Sample]',
        isExternal: true,
        organizerName: 'Creative Collective',
        price: 25,
        attendeeCount: 32,
        source: 'local',
      },
      {
        title: 'Wellness & Mindfulness Circle',
        description: 'Weekly gathering for meditation, wellness practices, and holistic health discussions in a supportive community environment.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: `${location} Community Center`,
        category: 'Health & Wellness',
        sourceUrl: 'https://example.com/events/wellness-circle',
        sourceName: '[Dev Sample]',
        isExternal: true,
        organizerName: 'Wellness Warriors',
        price: 15,
        attendeeCount: 28,
        source: 'local',
      },
      {
        title: 'Entrepreneurship Networking Night',
        description: 'Connect with fellow entrepreneurs, share ideas, and learn from successful business leaders in the local startup ecosystem.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: `${location} Business District`,
        category: 'Business & Professional',
        sourceUrl: 'https://example.com/events/entrepreneur-night',
        sourceName: '[Dev Sample]',
        isExternal: true,
        organizerName: 'Startup Community',
        price: 20,
        attendeeCount: 67,
        source: 'local',
      },
      {
        title: 'Outdoor Adventure Group Hike',
        description: 'Join us for a scenic group hike with fellow outdoor enthusiasts. All skill levels welcome for this community adventure.',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        location: `${location} Nature Trails`,
        category: 'Outdoor & Recreation',
        sourceUrl: 'https://example.com/events/group-hike',
        sourceName: '[Dev Sample]',
        isExternal: true,
        organizerName: 'Adventure Seekers',
        price: 0,
        attendeeCount: 23,
        source: 'local',
      },
    ];

    const relevantEvents = baseEvents.filter(event => {
      const eventText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
      const keywordMatch = keywords.some(keyword => eventText.includes(keyword.toLowerCase()));
      const categoryMatch = communityCategory ? eventText.includes(communityCategory.toLowerCase()) : true;
      return keywordMatch || categoryMatch;
    });

    return relevantEvents.length > 0 ? relevantEvents.slice(0, 3) : baseEvents.slice(0, 2);
  }
}